import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig, StackConfig } from "#config";
import { type DiscoveredPlugin, discoverPlugins } from "#lib/discovery";
import { ConfigValidationError } from "#lib/errors";
import { buildGraph, type Graph } from "#lib/graph";
import { createLogContext } from "#lib/prompt";
import type { Contribution, LogContext, Slot } from "#lib/slots";

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
	sorted: DiscoveredPlugin[];
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

	const graph = buildGraph(
		collected.map((c) => ({
			name: c.discovered.name,
			slots: c.slots,
			contributes: c.contributes,
		})),
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
		sorted: opts.discovered,
		app: opts.app,
	};
}
