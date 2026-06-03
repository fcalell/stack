import { existsSync, type FSWatcher, watch } from "node:fs";
import { join } from "node:path";
import { intro, log } from "@clack/prompts";
import pc from "picocolors";
import { generateFromConfig } from "#commands/generate";
import type { StackConfig } from "#config";
import { buildGraphFromConfig } from "#lib/build-graph";
import { cliSlots } from "#lib/cli-slots";
import { loadConfig } from "#lib/config";
import { type SupervisedProcess, supervise } from "#lib/proc";
import type { DevReadyTask, ProcessSpec, WatcherSpec } from "#specs";

interface DevOptions {
	studio: boolean;
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
		};
		if (!child) {
			settle(false);
			return;
		}
		child.stdout?.on("data", onLine);
		child.stderr?.on("data", onLine);
		child.on("exit", onExitEvent);
	});
}

export async function dev(options: DevOptions): Promise<void> {
	intro("stack dev");

	const cwd = process.cwd();
	const regenerate = async () => {
		const config = await loadConfig(options.config);
		await generateFromConfig(config, cwd, { writeToDisk: true });
	};

	await regenerate();

	const config = await loadConfig(options.config);
	const { processes, readySetup, watchers } = await devPlanFromConfig(
		config,
		cwd,
	);

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
				if (event.portInUse) {
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

	for (const task of readySetup) {
		log.step(`Setup: ${task.name}`);
		await task.run();
	}

	const fsWatchers: FSWatcher[] = [];
	for (const w of watchers) {
		fsWatchers.push(...attachWatcher({ spec: w, cwd }));
	}

	log.info("Watching for changes...");

	let configDebounce: ReturnType<typeof setTimeout>;
	fsWatchers.push(
		watch(cwd, (_event, filename) => {
			if (filename !== "stack.config.ts") return;
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

	const shutdown = () => {
		for (const w of fsWatchers) {
			try {
				w.close();
			} catch {}
		}
		for (const p of supervised) p.stop();
		process.exit(0);
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}
