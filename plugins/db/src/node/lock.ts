import {
	closeSync,
	mkdirSync,
	openSync,
	readFileSync,
	rmSync,
	writeSync,
} from "node:fs";
import { dirname } from "node:path";

// Cross-process + in-process exclusion for migration-writing operations.
//
// Why: `drizzle-kit generate` writes timestamp-prefixed SQL files into
// `src/migrations/`. Two writers running concurrently — e.g. `stack
// generate` invoked manually while `stack dev`'s schema watcher is also
// pushing — leak each other's output into a "snapshot diff" computation
// or, worse, produce duplicate-timestamp files. The dir-snapshot diff in
// `generateMigrations` was the pre-fix race window.
//
// Strategy: a process-level lock file (cross-process) layered on top of
// an in-process Promise mutex (same-process). Both must be acquired
// before any code touches the migrations dir.
//
//   • Cross-process: `fs.openSync(path, "wx")` with O_EXCL semantics.
//     Atomic on POSIX; second writer fails with EEXIST. Handle stale
//     locks from crashed processes by inspecting the PID.
//   • In-process: a Map<lockPath, Promise> keyed on the lock file path.
//     Sequencer for any code in the same Node process.
//   • Cleanup: lock file deleted on release; process exit handler clears
//     leftover locks owned by this PID.
//
// Lives inside `plugins/db/src/node/` because it's plugin-internal —
// per the "core stays domain-agnostic" rule, this is not a candidate
// for `@fcalell/cli`.

interface LockHandle {
	readonly path: string;
	release(): void;
}

// In-process serialization. Keyed on the absolute lock path so two
// concurrent operations targeting different cwds don't queue against
// each other.
const inProcessQueue = new Map<string, Promise<unknown>>();

// Track lock files this process holds so a crash/SIGINT/SIGTERM doesn't
// leave a stale file blocking the next run.
const heldLocks = new Set<string>();
let exitHandlersInstalled = false;

function installExitHandlers(): void {
	if (exitHandlersInstalled) return;
	exitHandlersInstalled = true;
	const cleanup = () => {
		for (const path of heldLocks) {
			try {
				rmSync(path, { force: true });
			} catch {
				// Best-effort: nothing else we can do during shutdown.
			}
		}
		heldLocks.clear();
	};
	process.once("exit", cleanup);
	process.once("SIGINT", () => {
		cleanup();
		process.exit(130);
	});
	process.once("SIGTERM", () => {
		cleanup();
		process.exit(143);
	});
	process.once("uncaughtException", (err) => {
		cleanup();
		// Re-throw so the default handler still prints + exits non-zero.
		throw err;
	});
}

function pidIsAlive(pid: number): boolean {
	if (!Number.isFinite(pid) || pid <= 0) return false;
	try {
		// `kill(pid, 0)` is the POSIX-portable liveness check. ESRCH means
		// the process is gone; EPERM means it's alive but we can't signal
		// it (still counts as alive for our purposes — don't steal).
		process.kill(pid, 0);
		return true;
	} catch (err) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code === "EPERM") return true;
		return false;
	}
}

function tryAcquire(path: string): LockHandle | null {
	mkdirSync(dirname(path), { recursive: true });
	let fd: number;
	try {
		fd = openSync(path, "wx");
	} catch (err) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code !== "EEXIST") throw err;
		// Stale-lock inspection: if the file's PID is dead, reclaim it.
		// Atomicity: this read-then-rm-then-create window is protected by
		// the in-process queue (any same-process contender waits on the
		// promise chain) and by the fact that EEXIST + "owner is alive"
		// means a real other-process holder we should wait for.
		try {
			const contents = readFileSync(path, "utf-8").trim();
			const pid = Number.parseInt(contents, 10);
			if (Number.isFinite(pid) && !pidIsAlive(pid)) {
				rmSync(path, { force: true });
				try {
					fd = openSync(path, "wx");
				} catch {
					return null;
				}
			} else {
				return null;
			}
		} catch {
			return null;
		}
	}
	writeSync(fd, String(process.pid));
	closeSync(fd);
	heldLocks.add(path);
	return {
		path,
		release() {
			if (!heldLocks.has(path)) return;
			heldLocks.delete(path);
			try {
				rmSync(path, { force: true });
			} catch {
				// Already gone; nothing to do.
			}
		},
	};
}

// Poll the lock file with exponential-ish backoff, capped. The cap is
// short enough to keep `stack dev` responsive and long enough to avoid
// busy-spin under contention. No lock should normally be held more than
// a few seconds (drizzle-kit generate is fast); the timeout guards
// against a wedged process leaving the lock file behind.
async function waitFor(path: string, timeoutMs: number): Promise<LockHandle> {
	const start = Date.now();
	let delay = 25;
	while (true) {
		const handle = tryAcquire(path);
		if (handle) return handle;
		if (Date.now() - start > timeoutMs) {
			throw new Error(
				`plugin-db: timed out after ${timeoutMs}ms waiting for migration lock at \`${path}\`. ` +
					`Another process appears to be holding it. If you're sure no other migration writer is running, ` +
					`delete the file and retry.`,
			);
		}
		await new Promise((r) => setTimeout(r, delay));
		delay = Math.min(delay * 2, 250);
	}
}

export interface MigrationLockOptions {
	// Default 30s — covers a slow `drizzle-kit generate` on a large schema
	// while still surfacing a wedged lock within a single CI step.
	timeoutMs?: number;
}

// Run `task` while holding the migration lock at `lockPath`. Acquires the
// in-process queue first (same-process serialization) and the file lock
// second (cross-process exclusion). Both must be released, in reverse
// order, even if the task throws.
export async function withMigrationLock<T>(
	lockPath: string,
	task: () => Promise<T>,
	opts: MigrationLockOptions = {},
): Promise<T> {
	installExitHandlers();
	const timeoutMs = opts.timeoutMs ?? 30_000;

	// In-process queue: chain off the prior promise for this lockPath so
	// same-process callers serialize without spinning on the file lock.
	const prior = inProcessQueue.get(lockPath) ?? Promise.resolve();
	const run = async () => {
		const handle = await waitFor(lockPath, timeoutMs);
		try {
			return await task();
		} finally {
			handle.release();
		}
	};
	// Wrap with a `.catch()` so a single rejected operation doesn't poison
	// the queue for every later caller — they should each be free to retry.
	const tailMarker: Promise<unknown> = prior.then(run, run);
	inProcessQueue.set(lockPath, tailMarker);
	try {
		return (await tailMarker) as T;
	} finally {
		// Clear the entry only if we're still the tail; otherwise a later
		// caller has already chained on top of us and we'd evict their
		// place in line. Bounds the Map for long-lived processes (`stack
		// dev`) without breaking serialization.
		if (inProcessQueue.get(lockPath) === tailMarker) {
			inProcessQueue.delete(lockPath);
		}
	}
}

// Default lock path for the migrations directory. Lives under `.stack/dev`
// so it's gitignored alongside other generated dev artifacts.
export function migrationLockPath(cwd: string): string {
	return `${cwd}/.stack/dev/migration.lock`;
}
