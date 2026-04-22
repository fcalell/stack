import { existsSync, type FSWatcher, watch } from "node:fs";
import { join } from "node:path";
import { intro, log } from "@clack/prompts";
import pc from "picocolors";
import { generateFromConfig } from "#commands/generate";
import type { StackConfig } from "#config";
import { buildGraphFromConfig } from "#lib/build-graph";
import { cliSlots } from "#lib/cli-slots";
import { loadConfig } from "#lib/config";
import { type ManagedProcess, onExit, spawnPrefixed } from "#lib/proc";
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

// Wait until `proc.stdout` prints a line matching `readyPattern` or the
// process exits. Resolves `true` on match, `false` if the process exits
// first. Only called when a ProcessSpec declares a readyPattern.
function waitForReady(proc: ManagedProcess, pattern: RegExp): Promise<boolean> {
	return new Promise((resolve) => {
		let settled = false;
		const onLine = (buf: Buffer) => {
			if (settled) return;
			const text = buf.toString("utf-8");
			if (pattern.test(text)) {
				settled = true;
				cleanup();
				resolve(true);
			}
		};
		const onExit = () => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(false);
		};
		const cleanup = () => {
			proc.child.stdout?.off("data", onLine);
			proc.child.stderr?.off("data", onLine);
			proc.child.off("exit", onExit);
		};
		proc.child.stdout?.on("data", onLine);
		proc.child.stderr?.on("data", onLine);
		proc.child.on("exit", onExit);
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
	const managed: ManagedProcess[] = [];
	const readyWaits: Array<Promise<boolean>> = [];

	for (const spec of processes) {
		const color = COLORS[colorIndex % COLORS.length];
		if (color) colorIndex++;
		const proc = spawnPrefixed({
			name: spec.name,
			color: color ?? pc.white,
			command: spec.command,
			args: spec.args,
			cwd,
		});
		managed.push(proc);
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
		const fullPath = join(cwd, w.paths);
		if (!existsSync(fullPath)) continue;
		let debounceTimer: ReturnType<typeof setTimeout>;
		fsWatchers.push(
			watch(fullPath, { recursive: true }, (_event, filename) => {
				if (!filename) return;
				if (w.ignore?.some((pattern: string) => filename.includes(pattern)))
					return;
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(async () => {
					await w.handler(filename, "change");
				}, w.debounce ?? 300);
			}),
		);
	}

	log.info("Watching for changes...");

	for (const proc of managed) {
		proc.child.on("exit", (code) => {
			if (code !== 0 && code !== null) {
				log.warn(`[${proc.name}] exited with code ${code}`);
			}
		});
	}

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

	onExit(managed, () => {
		for (const w of fsWatchers) w.close();
	});
}
