import { existsSync, type FSWatcher, watch } from "node:fs";
import { join } from "node:path";
import { intro, log } from "@clack/prompts";
import pc from "picocolors";
import { Dev } from "#events";
import { hasRuntimeExport } from "#lib/codegen";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { type ManagedProcess, onExit, spawnPrefixed } from "#lib/proc";
import { registerPlugins } from "#lib/registration";

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

export async function dev(options: DevOptions): Promise<void> {
	intro("stack dev");

	// Generate
	const { generate } = await import("#commands/generate");
	await generate(options.config);

	const config = await loadConfig(options.config);
	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered);
	const cwd = process.cwd();

	const bus = registerPlugins(sorted, config, cwd);

	// Check if any plugin has a worker runtime
	const hasWorker = sorted.some((p) => hasRuntimeExport(p.cli.package));

	// Dev.Start — collect processes and watchers
	const devStart = await bus.emit(Dev.Start, {
		processes: [],
		watchers: [],
	});

	const allProcesses: ManagedProcess[] = [];
	let colorIndex = 0;

	// Spawn wrangler if any plugin has a worker
	if (hasWorker) {
		const wranglerConfig = join(cwd, ".stack", "wrangler.toml");
		const color = COLORS[colorIndex % COLORS.length];
		if (color) colorIndex++;
		allProcesses.push(
			spawnPrefixed({
				name: "wrangler",
				color: color ?? pc.white,
				command: "npx",
				args: [
					"wrangler",
					"dev",
					"--config",
					wranglerConfig,
					"--persist-to",
					".stack/dev",
				],
				cwd,
			}),
		);
	}

	// Spawn plugin-contributed processes
	for (const proc of devStart.processes) {
		const color = COLORS[colorIndex % COLORS.length];
		if (color) colorIndex++;
		allProcesses.push(
			spawnPrefixed({
				name: proc.name,
				color: color ?? pc.white,
				command: proc.command,
				args: proc.args,
				cwd,
			}),
		);
	}

	// Dev.Ready — collect setup tasks and post-ready watchers
	const devReady = await bus.emit(Dev.Ready, {
		url: "",
		port: 0,
		setup: [],
		watchers: [],
	});

	// Run setup tasks sequentially
	for (const task of devReady.setup) {
		log.step(`Setup: ${task.name}`);
		await task.run();
	}

	const fsWatchers: FSWatcher[] = [];

	// Start all watchers (from both Dev.Start and Dev.Ready)
	const allWatchers = [...devStart.watchers, ...devReady.watchers];
	for (const w of allWatchers) {
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

	for (const proc of allProcesses) {
		proc.child.on("exit", (code) => {
			if (code !== 0 && code !== null) {
				log.warn(`[${proc.name}] exited with code ${code}`);
			}
		});
	}

	// Config watcher — re-generate on change
	let configDebounce: ReturnType<typeof setTimeout>;
	fsWatchers.push(
		watch(cwd, (_event, filename) => {
			if (filename !== "stack.config.ts") return;
			clearTimeout(configDebounce);
			configDebounce = setTimeout(async () => {
				log.step("Config changed, regenerating...");
				try {
					await generate(options.config);
				} catch (err) {
					log.warn(
						`Regeneration failed: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			}, 500);
		}),
	);

	onExit(allProcesses, () => {
		for (const w of fsWatchers) w.close();
	});
}
