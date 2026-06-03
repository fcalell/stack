import { spawn } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrationLockPath, withMigrationLock } from "./lock";

let tmpRoot = "";

beforeEach(() => {
	tmpRoot = mkdtempSync(join(tmpdir(), "plugin-db-lock-"));
});

afterEach(() => {
	rmSync(tmpRoot, { recursive: true, force: true });
});

// ── same-process serialization ─────────────────────────────────────

describe("withMigrationLock — same-process serialization", () => {
	it("serializes overlapping invocations against one lockPath", async () => {
		const lockPath = migrationLockPath(tmpRoot);

		let active = 0;
		let maxActive = 0;
		const order: string[] = [];

		const task = (id: string) =>
			withMigrationLock(lockPath, async () => {
				active++;
				maxActive = Math.max(maxActive, active);
				order.push(`enter-${id}`);
				await new Promise((r) => setTimeout(r, 30));
				order.push(`exit-${id}`);
				active--;
			});

		await Promise.all([task("A"), task("B"), task("C")]);

		expect(maxActive).toBe(1);
		expect(order).toEqual([
			"enter-A",
			"exit-A",
			"enter-B",
			"exit-B",
			"enter-C",
			"exit-C",
		]);
	});

	it("releases the lock when the task throws", async () => {
		const lockPath = migrationLockPath(tmpRoot);

		await expect(
			withMigrationLock(lockPath, async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		let entered = false;
		await withMigrationLock(lockPath, async () => {
			entered = true;
		});
		expect(entered).toBe(true);
	});

	it("does not block independent lockPaths", async () => {
		const lockA = migrationLockPath(join(tmpRoot, "a"));
		const lockB = migrationLockPath(join(tmpRoot, "b"));

		let releaseA!: () => void;
		const aReady = new Promise<void>((r) => {
			releaseA = r;
		});

		const aPromise = withMigrationLock(lockA, async () => {
			await aReady;
		});

		// B uses a different lockPath — must not wait on A.
		let bDone = false;
		await withMigrationLock(lockB, async () => {
			bDone = true;
		});
		expect(bDone).toBe(true);

		releaseA();
		await aPromise;
	});

	it("removes the lock file on release", async () => {
		const lockPath = migrationLockPath(tmpRoot);

		await withMigrationLock(lockPath, async () => {
			expect(existsSync(lockPath)).toBe(true);
		});

		expect(existsSync(lockPath)).toBe(false);
	});
});

// ── cross-process exclusion ────────────────────────────────────────
//
// Child scripts are emitted as plain CommonJS so `node <path>` runs them
// directly — no TS loader gymnastics, no path-mapping headaches. The
// child uses the same exclusive-create + PID-write protocol as our
// primitive in `lock.ts`, so the parent's `withMigrationLock` and the
// child fight for the same file via the same contract. A real
// cross-process race, not two impls pretending to share one.

interface ChildScriptOpts {
	lockPath: string;
	holdMs: number;
	work?: string;
	// File markers — vitest's worker-thread pool can swallow child stdout
	// in unpredictable ways, so we signal lifecycle by file existence
	// instead. Polling on the parent side is reliable across pools.
	acquiredMarker?: string;
	releasedMarker?: string;
	logFile?: string;
}

function childAcquireScript(opts: ChildScriptOpts): string {
	return `
const { openSync, closeSync, writeSync, rmSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } = require("node:fs");
const { dirname } = require("node:path");
const lockPath = ${JSON.stringify(opts.lockPath)};
const holdMs = ${opts.holdMs};
const acquiredMarker = ${JSON.stringify(opts.acquiredMarker ?? "")};
const releasedMarker = ${JSON.stringify(opts.releasedMarker ?? "")};
const logFile = ${JSON.stringify(opts.logFile ?? "")};
function log(msg) { if (logFile) { try { appendFileSync(logFile, msg + "\\n"); } catch {} } }
function pidIsAlive(pid) {
	if (!Number.isFinite(pid) || pid <= 0) return false;
	try { process.kill(pid, 0); return true; }
	catch (e) { return e.code === "EPERM"; }
}
async function acquire() {
	mkdirSync(dirname(lockPath), { recursive: true });
	const start = Date.now();
	while (true) {
		try {
			const fd = openSync(lockPath, "wx");
			writeSync(fd, String(process.pid));
			closeSync(fd);
			return;
		} catch (e) {
			if (e.code !== "EEXIST") throw e;
			try {
				const pid = Number.parseInt(readFileSync(lockPath, "utf-8").trim(), 10);
				if (!pidIsAlive(pid)) { rmSync(lockPath, { force: true }); continue; }
			} catch {}
			if (Date.now() - start > 30000) throw new Error("child timed out acquiring lock");
			await new Promise((r) => setTimeout(r, 25));
		}
	}
}
(async () => {
	log("starting");
	await acquire();
	log("acquired");
	if (acquiredMarker) writeFileSync(acquiredMarker, "1", "utf-8");
	${opts.work ?? ""}
	await new Promise((r) => setTimeout(r, holdMs));
	log("releasing");
	rmSync(lockPath, { force: true });
	if (releasedMarker) writeFileSync(releasedMarker, "1", "utf-8");
	log("released");
})().catch((e) => { log("error: " + e.message); console.error(e); process.exit(1); });
`;
}

async function waitForFile(path: string, timeoutMs: number): Promise<void> {
	const start = Date.now();
	while (!existsSync(path)) {
		if (Date.now() - start > timeoutMs) {
			throw new Error(`waitForFile: ${path} never appeared`);
		}
		await new Promise((r) => setTimeout(r, 25));
	}
}

describe("withMigrationLock — cross-process exclusion", () => {
	it("waits for a child process to release the lock", async () => {
		const lockPath = migrationLockPath(tmpRoot);
		const acquiredMarker = join(tmpRoot, "child-acquired");
		const releasedMarker = join(tmpRoot, "child-released");

		const childPath = join(tmpRoot, "child.cjs");
		writeFileSync(
			childPath,
			childAcquireScript({
				lockPath,
				holdMs: 300,
				acquiredMarker,
				releasedMarker,
				logFile: join(tmpRoot, "child.log"),
			}),
			"utf-8",
		);

		const child = spawn("node", [childPath], {
			cwd: process.cwd(),
			stdio: "ignore",
			detached: false,
		});
		child.on("error", (e) => {
			throw new Error(`spawn error: ${e.message}`);
		});

		try {
			// Wait for the child to acquire (file marker, not stdout — vitest
			// pools can swallow child stdio in unpredictable ways).
			await waitForFile(acquiredMarker, 5_000);

			// Now the parent attempts to acquire; it must block until the
			// child finishes. Measure elapsed time around the acquisition.
			const start = Date.now();
			let parentEntered = 0;
			await withMigrationLock(
				lockPath,
				async () => {
					parentEntered = Date.now();
				},
				{ timeoutMs: 5_000 },
			);
			const waited = parentEntered - start;

			// Child held the lock ~300ms after the marker; parent kicked off
			// immediately on seeing the marker. Allow scheduling slack but
			// require we waited a meaningful slice of the child's hold.
			expect(waited).toBeGreaterThanOrEqual(100);
			expect(existsSync(releasedMarker)).toBe(true);
		} finally {
			if (!child.killed) child.kill("SIGTERM");
		}
	}, 15_000);

	// Headline regression: a concurrent writer dropping a file into the
	// migrations dir while `generateMigrations` is mid-flight used to leak
	// into the "new migration" set. With the lock in place, the writer
	// blocks until generate finishes; the snapshot diff is exact.
	it("prevents concurrent writers from leaking into the migrations dir snapshot", async () => {
		const cwd = tmpRoot;
		const lockPath = migrationLockPath(cwd);
		const migrationsDir = join(cwd, "src", "migrations");
		mkdirSync(migrationsDir, { recursive: true });
		writeFileSync(
			join(migrationsDir, "0000_initial.sql"),
			"-- existing\n",
			"utf-8",
		);

		const concurrentFile = join(migrationsDir, "9999_concurrent.sql");
		const writerPath = join(tmpRoot, "writer.cjs");
		const writerReleasedMarker = join(tmpRoot, "writer-released");
		writeFileSync(
			writerPath,
			childAcquireScript({
				lockPath,
				holdMs: 1,
				work: `require("node:fs").writeFileSync(${JSON.stringify(concurrentFile)}, "-- concurrent", "utf-8");`,
				releasedMarker: writerReleasedMarker,
				logFile: join(tmpRoot, "writer.log"),
			}),
			"utf-8",
		);

		let snapshotBefore: string[] = [];
		let snapshotAfter: string[] = [];
		let writerSpawnedAt = 0;
		let child: ReturnType<typeof spawn> | null = null;

		try {
			await withMigrationLock(
				lockPath,
				async () => {
					const { readdirSync } = await import("node:fs");
					snapshotBefore = readdirSync(migrationsDir);

					// Launch the concurrent writer. With the lock held, it
					// must block until we exit this critical section.
					child = spawn("node", [writerPath], {
						cwd: process.cwd(),
						stdio: "ignore",
					});
					writerSpawnedAt = Date.now();

					// Simulate drizzle-kit generate's in-critical-section work.
					await new Promise((r) => setTimeout(r, 400));

					// Snapshot again — the concurrent writer's file must NOT
					// be visible here because the lock blocks it.
					snapshotAfter = readdirSync(migrationsDir);

					// While we're still inside the critical section, the
					// writer must NOT have completed yet (no released marker
					// since the writer can't even acquire).
					expect(existsSync(writerReleasedMarker)).toBe(false);
				},
				{ timeoutMs: 10_000 },
			);

			// After release, the writer's file landed.
			await waitForFile(writerReleasedMarker, 5_000);
			const { readdirSync } = await import("node:fs");
			const finalSnapshot = readdirSync(migrationsDir);
			expect(finalSnapshot).toContain("9999_concurrent.sql");
		} finally {
			if (child && !(child as { killed: boolean }).killed) {
				(child as { kill: (s?: string) => void }).kill("SIGTERM");
			}
		}

		// No leak inside the critical section.
		expect(snapshotBefore.sort()).toEqual(snapshotAfter.sort());
		expect(snapshotAfter).not.toContain("9999_concurrent.sql");
		expect(writerSpawnedAt).toBeGreaterThan(0);
	}, 20_000);
});

// ── path helper ────────────────────────────────────────────────────

describe("migrationLockPath", () => {
	it("places the lock under .stack/dev", () => {
		expect(migrationLockPath("/tmp/proj")).toBe(
			"/tmp/proj/.stack/dev/migration.lock",
		);
	});
});

// ── stale-lock reclamation ─────────────────────────────────────────

describe("stale-lock reclamation", () => {
	it("reclaims a lock owned by a non-existent PID", async () => {
		const lockPath = migrationLockPath(tmpRoot);
		mkdirSync(join(tmpRoot, ".stack", "dev"), { recursive: true });
		writeFileSync(lockPath, "999999999", "utf-8");

		let entered = false;
		await withMigrationLock(lockPath, async () => {
			entered = true;
		});
		expect(entered).toBe(true);
		expect(existsSync(lockPath)).toBe(false);
	});

	it("does NOT reclaim a lock owned by a live PID", async () => {
		const lockPath = migrationLockPath(tmpRoot);
		mkdirSync(join(tmpRoot, ".stack", "dev"), { recursive: true });
		// Use the parent's own PID — guaranteed to be alive. The acquire
		// path will see an alive PID and refuse to reclaim, so the call
		// times out with the actionable error.
		writeFileSync(lockPath, String(process.pid), "utf-8");

		await expect(
			withMigrationLock(lockPath, async () => {}, { timeoutMs: 200 }),
		).rejects.toThrow(/timed out/i);

		// We didn't steal the lock.
		expect(readFileSync(lockPath, "utf-8")).toBe(String(process.pid));
	});
});
