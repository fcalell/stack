import { watch } from "node:fs";
import { join } from "node:path";
import { intro, log, note } from "@clack/prompts";
import pc from "picocolors";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { generateApiRouteBarrel } from "#lib/generate";
import {
	createDevContext,
	createPluginContext,
} from "#lib/plugin-context";
import { type ManagedProcess, onExit, spawnPrefixed } from "#lib/proc";

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

	const { generate } = await import("#commands/generate");
	await generate(options.config);

	const config = await loadConfig(options.config);
	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered, config);
	const cwd = process.cwd();
	const baseCtx = createPluginContext({ cwd, config });

	const ports = new Map<string, number>();
	let nextPort = 8787;

	for (const p of sorted) {
		if (!p.cli.dev) continue;
		const tempCtx = createDevContext(baseCtx, ports);
		const contribution = await p.cli.dev(tempCtx);
		if (contribution.processes) {
			for (const proc of contribution.processes) {
				if (proc.defaultPort && !ports.has(proc.name)) {
					ports.set(proc.name, proc.defaultPort);
				} else if (!ports.has(proc.name)) {
					ports.set(proc.name, nextPort++);
				}
			}
		}
	}

	const ctx = createDevContext(baseCtx, ports);
	const allProcesses: ManagedProcess[] = [];
	const bannerLines: string[] = [];
	let colorIndex = 0;

	for (const p of sorted) {
		if (!p.cli.dev) continue;

		const contribution = await p.cli.dev(ctx);

		if (contribution.setup) {
			await contribution.setup();
		}

		if (contribution.banner) {
			bannerLines.push(...contribution.banner);
		}

		if (contribution.processes) {
			for (const proc of contribution.processes) {
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
		}

		if (contribution.watchers) {
			for (const w of contribution.watchers) {
				for (const watchPath of w.paths) {
					const fullPath = join(cwd, watchPath);
					let debounceTimer: ReturnType<typeof setTimeout>;
					watch(
						fullPath,
						{ recursive: true },
						(_event, filename) => {
							if (!filename) return;
							if (w.ignore?.some((p) => filename.includes(p)))
								return;
							clearTimeout(debounceTimer);
							debounceTimer = setTimeout(async () => {
								await w.onChange({
									type: "change",
									path: filename,
								});
							}, w.debounce ?? 300);
						},
					);
				}
			}
		}
	}

	// Route barrel watcher (built-in)
	const routesDir = join(cwd, "src", "worker", "routes");
	const { existsSync } = await import("node:fs");
	if (existsSync(routesDir)) {
		let routesDebounce: ReturnType<typeof setTimeout>;
		watch(routesDir, (_event, filename) => {
			if (!filename?.endsWith(".ts") || filename === "index.ts") return;
			clearTimeout(routesDebounce);
			routesDebounce = setTimeout(() => {
				log.step("Route change detected, regenerating barrel...");
				generateApiRouteBarrel(cwd);
			}, 300);
		});
	}

	if (options.studio) {
		bannerLines.push(
			`Studio:    port ${config.dev?.studioPort ?? 4983}`,
		);
	}

	if (bannerLines.length > 0) {
		note(bannerLines.join("\n"), "Configuration");
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
	});

	onExit(allProcesses);
}
