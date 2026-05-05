import { type ChildProcess, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { ProcessExit, ProcessSpec } from "#specs";

export interface ManagedProcess {
	name: string;
	child: ChildProcess;
	kill(): void;
}

export function spawnPrefixed(opts: {
	name: string;
	color: (s: string) => string;
	command: string;
	args: string[];
	cwd?: string;
}): ManagedProcess {
	const prefix = opts.color(`[${opts.name}]`);

	const child = spawn(opts.command, opts.args, {
		stdio: ["ignore", "pipe", "pipe"],
		cwd: opts.cwd,
	});

	if (child.stdout) {
		const rl = createInterface({ input: child.stdout });
		rl.on("line", (line) => {
			process.stdout.write(`${prefix} ${line}\n`);
		});
	}

	if (child.stderr) {
		const rl = createInterface({ input: child.stderr });
		rl.on("line", (line) => {
			process.stderr.write(`${prefix} ${line}\n`);
		});
	}

	return {
		name: opts.name,
		child,
		kill() {
			if (!child.killed) child.kill("SIGTERM");
		},
	};
}

export function killAll(processes: ManagedProcess[]): void {
	for (const proc of processes) proc.kill();
}

export function onExit(
	processes: ManagedProcess[],
	cleanup?: () => void,
): void {
	const handler = () => {
		try {
			cleanup?.();
		} catch {
			// Never let cleanup errors block process shutdown.
		}
		killAll(processes);
		process.exit(0);
	};
	process.on("SIGINT", handler);
	process.on("SIGTERM", handler);
}

// ── supervise() ────────────────────────────────────────────────────────────

// Default port-in-use detection. Captures the port number when present so
// callers can surface it. Covers Node `EADDRINUSE`, wrangler, vite, and bun.
//   - "EADDRINUSE: address already in use :::3000"
//   - "Error: Port 3000 is already in use"
//   - "Port 8787 is unavailable"
const DEFAULT_PORT_CONFLICT =
	/(?:EADDRINUSE|already in use|unavailable).*?(?::|port\s+)(\d{2,5})/i;

const DEFAULT_MAX_RESTARTS = 3;
const STDERR_TAIL_BYTES = 4 * 1024;

export interface SuperviseOptions {
	spec: ProcessSpec;
	color: (s: string) => string;
	cwd?: string;
	// Called for every lifecycle event: each exit (initial + restarts). Use
	// this for logging or telemetry — it does NOT affect restart policy.
	// Use `spec.onExit` to veto restarts.
	onLifecycle?: (event: ProcessExit) => void;
}

export interface SupervisedProcess {
	name: string;
	// The currently-running child. Reassigned on each restart; callers that
	// need stable identity should listen via `onLifecycle`.
	current(): ChildProcess | null;
	// Resolves with the final exit (after all restarts are exhausted or vetoed,
	// or after a clean exit with policy "never"/"on-crash").
	done: Promise<ProcessExit>;
	// Permanent stop: cancels any pending restart and kills the live child.
	stop(signal?: NodeJS.Signals): void;
}

// Exponential backoff capped at 10s. Exposed for tests + plugins that want
// to reproduce supervisor timing without re-implementing it.
//   attempt=1 -> 250ms, 2 -> 500ms, 3 -> 1000ms, 4 -> 2000ms ... cap 10000ms
export function restartBackoffMs(attempt: number): number {
	if (attempt <= 0) return 0;
	const ms = 250 * 2 ** (attempt - 1);
	return Math.min(ms, 10_000);
}

// Spawn a child process with prefixed stdio + restart supervision +
// port-in-use classification + onExit veto. The single primitive that
// `dev.ts` and downstream plugins build on. Returns immediately; the caller
// awaits `done` for terminal completion or calls `stop()` to teardown.
export function supervise(opts: SuperviseOptions): SupervisedProcess {
	const { spec, color, cwd } = opts;
	const policy = spec.restart ?? "never";
	const maxRestarts = spec.maxRestarts ?? DEFAULT_MAX_RESTARTS;
	const portPattern =
		spec.portConflictPattern === undefined
			? DEFAULT_PORT_CONFLICT
			: spec.portConflictPattern;
	const prefix = color(`[${spec.name}]`);

	let attempt = 0;
	let stopped = false;
	let pendingRestart: ReturnType<typeof setTimeout> | null = null;
	let currentChild: ChildProcess | null = null;
	let resolveDone!: (e: ProcessExit) => void;
	const done = new Promise<ProcessExit>((resolve) => {
		resolveDone = resolve;
	});

	const launch = () => {
		const stderrChunks: Buffer[] = [];
		let stderrSize = 0;

		const child = spawn(spec.command, spec.args, {
			stdio: ["ignore", "pipe", "pipe"],
			cwd,
		});
		currentChild = child;

		if (child.stdout) {
			const rl = createInterface({ input: child.stdout });
			rl.on("line", (line) => {
				process.stdout.write(`${prefix} ${line}\n`);
			});
		}

		if (child.stderr) {
			child.stderr.on("data", (chunk: Buffer) => {
				stderrChunks.push(chunk);
				stderrSize += chunk.length;
				while (stderrSize > STDERR_TAIL_BYTES && stderrChunks.length > 1) {
					const head = stderrChunks.shift();
					if (head) stderrSize -= head.length;
				}
			});
			const rl = createInterface({ input: child.stderr });
			rl.on("line", (line) => {
				process.stderr.write(`${prefix} ${line}\n`);
			});
		}

		const settle = (
			code: number | null,
			signal: NodeJS.Signals | null,
		): void => {
			const stderrText = Buffer.concat(stderrChunks).toString("utf-8");
			const stderrTail =
				stderrText.length > STDERR_TAIL_BYTES
					? stderrText.slice(-STDERR_TAIL_BYTES)
					: stderrText;

			let portInUse = false;
			let detectedPort: number | null = null;
			if (portPattern) {
				const match = portPattern.exec(stderrTail);
				if (match) {
					portInUse = true;
					const captured = match[1];
					if (captured) {
						const n = Number.parseInt(captured, 10);
						if (Number.isFinite(n)) detectedPort = n;
					}
					if (detectedPort === null && spec.defaultPort !== undefined) {
						detectedPort = spec.defaultPort;
					}
				}
			}

			const event: ProcessExit = {
				code,
				signal,
				restartAttempt: attempt,
				portInUse,
				detectedPort,
				stderrTail,
			};

			opts.onLifecycle?.(event);

			let vetoed = false;
			if (spec.onExit) {
				try {
					const decision = spec.onExit(event);
					if (decision && decision.restart === false) vetoed = true;
				} catch {
					// Hooks must not block supervision; treat throws as veto.
					vetoed = true;
				}
			}

			if (stopped) {
				resolveDone(event);
				return;
			}

			const policyAllows =
				policy === "always" ||
				(policy === "on-crash" && (code === null || code !== 0));
			const restart = !vetoed && policyAllows && attempt < maxRestarts;

			if (!restart) {
				resolveDone(event);
				return;
			}

			attempt++;
			const delay = restartBackoffMs(attempt);
			pendingRestart = setTimeout(() => {
				pendingRestart = null;
				if (stopped) return;
				launch();
			}, delay);
		};

		child.once("exit", (code, signal) => {
			settle(code, signal);
		});
		child.once("error", () => {
			// `spawn` errors surface on the next tick as `exit` with `code=null`;
			// no separate handling needed beyond suppressing the default throw.
		});
	};

	launch();

	return {
		name: spec.name,
		current: () => currentChild,
		done,
		stop(signal) {
			stopped = true;
			if (pendingRestart) {
				clearTimeout(pendingRestart);
				pendingRestart = null;
			}
			const child = currentChild;
			if (child && !child.killed) child.kill(signal ?? "SIGTERM");
		},
	};
}
