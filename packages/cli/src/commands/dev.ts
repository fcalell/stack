import { existsSync, type FSWatcher, statSync, watch } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { intro } from "@clack/prompts";
import type { StackConfig } from "../config.ts";
import { buildGraphFromConfig } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import { loadConfig } from "../lib/config.ts";
import {
	createScreenView,
	createStreamView,
	type DevView,
} from "../lib/dev-view.ts";
import { type SupervisedProcess, supervise } from "../lib/proc.ts";
import type { LogContext } from "../lib/slots.ts";
import type { DevReadyTask, ProcessSpec, WatcherSpec } from "../specs.ts";
import { generateFromConfig } from "./generate.ts";

interface DevOptions {
	config: string;
}

export interface DevPlan {
	processes: ProcessSpec[];
	readySetup: DevReadyTask[];
	watchers: WatcherSpec[];
}

export async function devPlanFromConfig(
	config: StackConfig,
	cwd: string,
	log?: LogContext,
): Promise<DevPlan> {
	const { graph } = await buildGraphFromConfig({ config, cwd, log });
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
	log: LogContext;
}): FSWatcher[] {
	const { spec, cwd, log } = args;
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

const SHUTDOWN_GRACE_MS = 3000;

const URL_IN_TEXT = /https?:\/\/[^\s'"<>]+/;

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
		for (const p of procs) p.stop("SIGKILL");
	}
}

export async function dev(options: DevOptions): Promise<void> {
	const cwd = process.cwd();
	const configFile = resolve(options.config);
	const fsWatchers: FSWatcher[] = [];
	const supervised: SupervisedProcess[] = [];
	// Runs once, whichever asks first: a signal, the quit key, a process that
	// never started, or a step that throws.
	let stopping: Promise<void> | undefined;
	const stop = () => {
		stopping ??= (async () => {
			for (const w of fsWatchers) {
				try {
					w.close();
				} catch {}
			}
			await stopAll(supervised);
		})();
		return stopping;
	};
	const shutdown = async (exitCode: number) => {
		await stop();
		view.close();
		process.exit(exitCode);
	};
	// The screen needs a terminal to draw on and keys to read; CI, an agent or
	// a pipe gets the prefixed stream.
	const screen =
		process.stdin.isTTY === true &&
		process.stdout.isTTY === true &&
		process.env.TERM !== "dumb";
	// The screen's `r`, by process name.
	const restarts = new Map<string, () => void>();
	const view: DevView = screen
		? createScreenView({
				onQuit: () => void shutdown(0),
				onRestart: (name) => restarts.get(name)?.(),
			})
		: createStreamView();
	const { log } = view;
	if (!screen) intro("stack dev");
	// The processes lead process groups of their own, so the terminal's signals
	// (Ctrl+C, a closed terminal's SIGHUP) reach them only through `dev`.
	for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
		process.on(signal, () => void shutdown(0));
	}

	const regenerate = async () => {
		// Reload: ESM caches the config module by URL, so a plain import would
		// regenerate from the config as it was at startup.
		const config = await loadConfig(options.config, { reload: true });
		await generateFromConfig(config, cwd, { writeToDisk: true, log });
	};
	// A piped child sees no terminal and prints no colour; the screen draws
	// colour, so it asks the children for it.
	const forceColor =
		screen &&
		process.env.NO_COLOR === undefined &&
		process.env.FORCE_COLOR === undefined;

	// The CLI exits on a thrown error without waiting for anything, so a step
	// that throws stops the processes and gives the terminal back first.
	try {
		await regenerate();
		const config = await loadConfig(options.config);
		const { processes, readySetup, watchers } = await devPlanFromConfig(
			config,
			cwd,
			log,
		);

		const readyWaits: Array<Promise<boolean>> = [];
		for (const spec of processes) {
			const { readyPattern } = spec;
			// Whether the running launch has printed its ready line.
			let ready = false;
			// Whether a child is running, and whether its exit is a restart `r`
			// asked for, which is no failure to report.
			let live = false;
			let restarting = false;
			const portUrl =
				spec.defaultPort === undefined
					? undefined
					: `http://localhost:${spec.defaultPort}`;
			// Settles once: true at the first launch's ready line, false at its
			// exit. A restart is not waited for.
			let settleReady: ((matched: boolean) => void) | undefined;
			if (readyPattern) {
				readyWaits.push(
					new Promise((resolve) => {
						settleReady = resolve;
					}),
				);
			}
			const proc = supervise({
				spec: forceColor
					? { ...spec, env: { FORCE_COLOR: "1", ...spec.env } }
					: spec,
				cwd,
				onLaunch: (attempt) => {
					live = true;
					ready = readyPattern === undefined;
					view.status(
						spec.name,
						ready
							? { kind: "ready", url: portUrl }
							: { kind: "starting", attempt },
					);
				},
				onOutput: (stream, line) => {
					view.output(spec.name, stream, line);
					// Colour codes can split the words a pattern looks for.
					const text = stripVTControlCharacters(line);
					if (ready || !readyPattern?.test(text)) return;
					ready = true;
					// A ready line names where the process serves (vite's moves when
					// its port is taken); the declared port stands in when it names none.
					const url = URL_IN_TEXT.exec(text)?.[0] ?? portUrl;
					view.status(spec.name, { kind: "ready", url });
					settleReady?.(true);
				},
				onLifecycle: (event) => {
					live = false;
					ready = false;
					view.status(spec.name, {
						kind: "exited",
						code: event.code,
						signal: event.signal,
					});
					settleReady?.(false);
					// An exit during a stop is the stop working.
					if (stopping) return;
					if (restarting) {
						restarting = false;
						return;
					}
					if (event.code === null && event.signal === null) {
						// Neither a code nor a signal: the process never started (the
						// supervisor puts the spawn error in the stderr tail).
						log.error(
							`could not start ${spec.name}: ${event.stderrTail.trim()}`,
						);
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
			restarts.set(spec.name, () => {
				log.step(`Restarting ${spec.name}`);
				if (live) restarting = true;
				proc.restart();
			});
		}

		if (readyWaits.length > 0) {
			await Promise.all(readyWaits);
		}
		// A process that never started has begun the shutdown.
		if (stopping) return;

		for (const task of readySetup) {
			log.step(`Setup: ${task.name}`);
			await task.run();
		}

		for (const w of watchers) {
			fsWatchers.push(...attachWatcher({ spec: w, cwd, log }));
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
	} catch (error) {
		await stop();
		view.close();
		throw error;
	}
}
