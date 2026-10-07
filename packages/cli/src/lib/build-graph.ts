import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig, StackConfig } from "../config.ts";
import { LINT_PATH, lintConfig } from "../templates/biome.ts";
import { tsconfigLayout, workerTsconfig } from "../templates/tsconfig.ts";
import { cliSlots } from "./cli-slots.ts";
import { type DiscoveredPlugin, discoverPlugins } from "./discovery.ts";
import { ConfigValidationError } from "./errors.ts";
import { buildGraph, type Graph } from "./graph.ts";
import { cliGuide, GUIDE_PATH, renderGuide } from "./guide.ts";
import { cliManifest } from "./manifest.ts";
import { createLogContext } from "./prompt.ts";
import type { Contribution, LogContext, Slot } from "./slots.ts";

export interface CollectedPlugin {
	discovered: DiscoveredPlugin;
	slots: Record<string, Slot<unknown>>;
	contributes: Contribution<unknown>[];
}

export interface BuildGraphFromConfigOptions {
	config: StackConfig;
	cwd: string;
	log?: LogContext;
}

export interface BuildGraphFromConfigResult {
	graph: Graph;
	collected: CollectedPlugin[];
	// The discovered plugins in `config.plugins` order. No sort is applied —
	// ordering is derived per-slot from data dependencies, so consumers here do
	// only order-independent lookups (find-by-name, map-to-cli).
	plugins: DiscoveredPlugin[];
	app: AppConfig;
}

// Validate → discover → per-plugin `.cli.collect()` → buildGraph. Every
// command that needs the slot graph funnels through this helper; keeps the
// wiring in one place so new commands don't re-invent the path.
export async function buildGraphFromConfig(
	opts: BuildGraphFromConfigOptions,
): Promise<BuildGraphFromConfigResult> {
	const validation = opts.config.validate();
	if (!validation.valid) throw new ConfigValidationError(validation.errors);

	const discovered = await discoverPlugins(opts.config);
	return buildGraphFromDiscovered({
		discovered,
		app: opts.config.app,
		cwd: opts.cwd,
		log: opts.log,
	});
}

export interface BuildGraphFromDiscoveredOptions {
	discovered: DiscoveredPlugin[];
	app: AppConfig;
	cwd: string;
	log?: LogContext;
}

export function buildGraphFromDiscovered(
	opts: BuildGraphFromDiscoveredOptions,
): BuildGraphFromConfigResult {
	const collected: CollectedPlugin[] = opts.discovered.map((d) => {
		const { slots, contributes } = d.cli.collect({
			app: opts.app,
			options: d.options,
		});
		return { discovered: d, slots, contributes };
	});

	const log = opts.log ?? createLogContext();
	const cwd = opts.cwd;

	// The CLI's own contributions: facts only core knows (which tsconfig
	// `stack init` wrote for the worker), its guide pages, and the guide's index.
	const layout = tsconfigLayout(opts.discovered.map((d) => d.name));
	const core = {
		name: "cli",
		contributes: [
			cliSlots.workerTsconfig.contribute(() => workerTsconfig(layout)),
			cliSlots.guide.contribute(() =>
				cliGuide.map((e) => ({
					domain: "cli",
					package: cliManifest.name,
					...e,
				})),
			),
			cliSlots.artifactFiles.contribute(async (ctx) => ({
				path: GUIDE_PATH,
				content: renderGuide(await ctx.resolve(cliSlots.guide)),
			})),
			cliSlots.artifactFiles.contribute(async (ctx) => ({
				path: LINT_PATH,
				content: lintConfig(await ctx.resolve(cliSlots.lintPlugins)),
			})),
		],
	};

	const graph = buildGraph(
		[
			...collected.map((c) => ({
				name: c.discovered.name,
				slots: c.slots,
				contributes: c.contributes,
			})),
			core,
		],
		{
			app: opts.app,
			cwd,
			log,
			ctxForPlugin: (pluginName) => {
				const plugin = collected.find((c) => c.discovered.name === pluginName);
				return {
					options: plugin?.discovered.options ?? {},
					fileExists: async (path: string) => {
						try {
							await access(join(cwd, path));
							return true;
						} catch {
							return false;
						}
					},
					readFile: async (path: string) => readFile(join(cwd, path), "utf-8"),
					template: plugin?.discovered.cli.template
						? plugin.discovered.cli.template
						: (n: string) =>
								new URL(`file:///__synthetic__/${pluginName}/${n}`),
					scaffold: plugin?.discovered.cli.scaffold
						? plugin.discovered.cli.scaffold
						: (n: string, target: string) => ({
								source: new URL(`file:///__synthetic__/${pluginName}/${n}`),
								target,
								plugin: pluginName,
							}),
				};
			},
		},
	);

	return {
		graph,
		collected,
		plugins: opts.discovered,
		app: opts.app,
	};
}
