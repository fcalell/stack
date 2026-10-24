import { existsSync, type FSWatcher, statSync, watch } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { intro, log } from "@clack/prompts";
import pc from "picocolors";
import type { StackConfig } from "../config.ts";
import { buildGraphFromConfig } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import { loadConfig } from "../lib/config.ts";
import { type SupervisedProcess, supervise } from "../lib/proc.ts";
import type { DevReadyTask, ProcessSpec, WatcherSpec } from "../specs.ts";
import { generateFromConfig } from "./generate.ts";

interface DevOptions {
	config: string;
}

const COLORS: Array<(s: string) => string> = [
	pc.yellow,
	pc.cyan,
	pc.magenta,
	pc.green,
	pc.blue,
];

export interface DevPlan {
	processes: ProcessSpec[];
	readySetup: DevReadyTask[];
	watchers: WatcherSpec[];
}

export async function devPlanFromConfig(
	config: StackConfig,
	cwd: string,
): Promise<DevPlan> {
	const { graph } = await buildGraphFromConfig({ config, cwd });
	const [processes, readySetup, watchers] = await Promise.all([
		graph.resolve(cliSlots.devProcesses),
		graph.resolve(cliSlots.devReadySetup),
		graph.resolve(cliSlots.devWatchers),
	]);
	return { processes, readySetup, watchers };
}

// Attach an fs.watch handle for a single WatcherSpec, with debounce state
// scoped to this watcher only. Each watcher coalesces its own bursts of FS
// events; concurrent activity on a sibling watcher must not cancel this
// watcher's pending fire (the previous "single shared timer" implementation
// had every watcher's closure capture the same variable, so two watchers
// firing within the debounce window would drop the first handler).
//
// Returns an array (possibly empty) so the caller can splat into its
// FSWatcher list — empty when the watch path doesn't exist.
export function attachWatcher(args: {
	spec: WatcherSpec;
	cwd: string;
}): FSWatcher[] {
	const { spec, cwd } = args;
	const fullPath = join(cwd, spec.paths);
	if (!existsSync(fullPath)) return [];
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingFilename: string | null = null;
	const handle = watch(fullPath, { recursive: true }, (_event, filename) => {
		if (!filename) return;
		// macOS FSEvents emits a directory-level event, keyed by the directory's
		// name (the watch root reports under its own basename), alongside every
		// per-file event. A directory name carries no file identity, so the
		// `ignore` filter can't apply to it — a watcher whose handler writes into
		// an ignored path would loop. Skip directory events; the per-file event
		// they accompany still fires the handler.
		try {
			if (statSync(join(fullPath, filename)).isDirectory()) return;
		} catch {
			// Target doesn't exist: a real unlink (fire), or the watch root
			// aliased to its own basename (skip).
			if (filename === basename(fullPath)) return;
		}
		if (spec.ignore?.some((pattern: string) => filename.includes(pattern)))
			return;
		// Fire on the most recent filename in the burst — matches user intent
		// (a flurry of saves across a directory should resolve to the latest
		// touched file, not whichever happened to start the timer).
		pendingFilename = filename;
		if (debounceTimer !== null) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const fname = pendingFilename;
			debounceTimer = null;
			pendingFilename = null;
			if (fname === null) return;
			// Handler may be async; surface rejections instead of swallowing
			// them as unhandled promise rejections at the runtime level.
			Promise.resolve(spec.handler(fname, "change")).catch((err) => {
				log.warn(
					`[${spec.name}] watcher handler failed: ${
						err instanceof Error ? err.message : String(err)
					}`,
				);
			});
		}, spec.debounce ?? 300);
	});
	return [handle];
}

// Wait until the supervised child prints a line matching `readyPattern` on
// stdout/stderr or the child exits. Resolves `true` on match, `false` if the
// process exits before signaling ready. Re-attached to the new child after
// each restart so `dev` doesn't get stuck on a stale handle.
function waitForReady(
	proc: SupervisedProcess,
	pattern: RegExp,
): Promise<boolean> {
	return new Promise((resolve) => {
		let settled = false;
		const settle = (matched: boolean) => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(matched);
		};
		const onLine = (buf: Buffer) => {
			if (pattern.test(buf.toString("utf-8"))) settle(true);
		};
		const child = proc.current();
		const onExitEvent = () => settle(false);
		const cleanup = () => {
			child?.stdout?.off("data", onLine);
			child?.stderr?.off("data", onLine);
			child?.off("exit", onExitEvent);
			child?.off("error", onExitEvent);
		};
		if (!child) {
			settle(false);
			return;
		}
		child.stdout?.on("data", onLine);
		child.stderr?.on("data", onLine);
		child.on("exit", onExitEvent);
		// A spawn failure emits `error` and never `exit`.
		child.on("error", onExitEvent);
	});
}

const SHUTDOWN_GRACE_MS = 3000;

// Stops every supervised process and waits for each to finish, so a child's
// own children are gone before `dev` exits. A process still running after
// `graceMs` is killed.
export async function stopAll(
	procs: SupervisedProcess[],
	graceMs = SHUTDOWN_GRACE_MS,
): Promise<void> {
	for (const p of procs) p.stop();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<"timeout">((resolve) => {
		timer = setTimeout(() => resolve("timeout"), graceMs);
	});
	const outcome = await Promise.race([
		Promise.all(procs.map((p) => p.done)).then(() => "done" as const),
		timedOut,
	]);
	clearTimeout(timer);
	if (outcome === "timeout") {
		for (const p of procs) p.current()?.kill("SIGKILL");
	}
}

export async function dev(options: DevOptions): Promise<void> {
	intro("stack dev");

	const cwd = process.cwd();
	const configFile = resolve(options.config);
	const regenerate = async () => {
		// Reload: ESM caches the config module by URL, so a plain import would
		// regenerate from the config as it was at startup.
		const config = await loadConfig(options.config, { reload: true });
		await generateFromConfig(config, cwd, { writeToDisk: true });
	};

	await regenerate();

	const config = await loadConfig(options.config);
	const { processes, readySetup, watchers } = await devPlanFromConfig(
		config,
		cwd,
	);

	const fsWatchers: FSWatcher[] = [];
	let shuttingDown = false;
	const shutdown = async (exitCode: number) => {
		if (shuttingDown) return;
		shuttingDown = true;
		for (const w of fsWatchers) {
			try {
				w.close();
			} catch {}
		}
		await stopAll(supervised);
		process.exit(exitCode);
	};
	process.on("SIGINT", () => void shutdown(0));
	process.on("SIGTERM", () => void shutdown(0));

	let colorIndex = 0;
	const supervised: SupervisedProcess[] = [];
	const readyWaits: Array<Promise<boolean>> = [];

	for (const spec of processes) {
		const color = COLORS[colorIndex % COLORS.length];
		if (color) colorIndex++;
		const proc = supervise({
			spec,
			color: color ?? pc.white,
			cwd,
			onLifecycle: (event) => {
				if (event.code === null && event.signal === null) {
					// Neither a code nor a signal: the process never started (the
					// supervisor puts the spawn error in the stderr tail).
					log.error(`could not start ${spec.name}: ${event.stderrTail.trim()}`);
					void shutdown(1);
				} else if (event.portInUse) {
					log.warn(
						`[${spec.name}] port ${event.detectedPort ?? "unknown"} already in use; ` +
							`see stderr for details.`,
					);
				} else if (event.code !== 0 && event.code !== null) {
					log.warn(
						`[${spec.name}] exited with code ${event.code}` +
							(event.restartAttempt > 0
								? ` (restart attempt ${event.restartAttempt})`
								: ""),
					);
				}
			},
		});
		supervised.push(proc);
		if (spec.readyPattern) {
			readyWaits.push(waitForReady(proc, spec.readyPattern));
		}
	}

	if (readyWaits.length > 0) {
		await Promise.all(readyWaits);
	}
	// A process that never started has begun the shutdown.
	if (shuttingDown) return;

	for (const task of readySetup) {
		log.step(`Setup: ${task.name}`);
		await task.run();
	}

	for (const w of watchers) {
		fsWatchers.push(...attachWatcher({ spec: w, cwd }));
	}

	log.info("Watching for changes...");

	let configDebounce: ReturnType<typeof setTimeout>;
	fsWatchers.push(
		watch(dirname(configFile), (_event, filename) => {
			if (filename !== basename(configFile)) return;
			clearTimeout(configDebounce);
			configDebounce = setTimeout(async () => {
				log.step("Config changed, regenerating...");
				try {
					await regenerate();
				} catch (err) {
					log.warn(
						`Regeneration failed: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			}, 500);
		}),
	);
}
