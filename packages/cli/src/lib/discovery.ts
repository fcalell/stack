import { log } from "@clack/prompts";
import type { StackConfig } from "#config";
import type { InternalCliPlugin } from "#lib/create-plugin";
import type { Event } from "#lib/event-bus";

export interface DiscoveredPlugin {
	name: string;
	cli: InternalCliPlugin<unknown>;
	events: Record<string, Event<void>>;
	options: unknown;
}

// All known plugin names — metadata comes from the modules themselves
export const PLUGIN_NAMES = [
	"db",
	"auth",
	"api",
	"vite",
	"solid",
	"solid-ui",
] as const;

export type PluginName = (typeof PLUGIN_NAMES)[number];

async function loadPlugin(
	name: string,
	options: unknown,
): Promise<DiscoveredPlugin> {
	const packageName = `@fcalell/plugin-${name}`;
	try {
		const mod = await import(packageName);
		const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
		const pluginExport = mod[camelName] ?? mod[name] ?? mod.default;
		const cli = pluginExport.cli as InternalCliPlugin<unknown>;
		const events = (pluginExport.events ?? {}) as Record<string, Event<void>>;
		return { name, cli, events, options };
	} catch {
		log.error(
			`Failed to load CLI plugin for "${name}". Run: pnpm add ${packageName}`,
		);
		process.exit(1);
	}
}

export async function loadAvailablePlugins(): Promise<DiscoveredPlugin[]> {
	const results: DiscoveredPlugin[] = [];
	for (const name of PLUGIN_NAMES) {
		try {
			results.push(await loadPlugin(name, {}));
		} catch {
			// Plugin not available in this workspace
		}
	}
	return results;
}

export function dependencyNames(plugin: DiscoveredPlugin): string[] {
	return plugin.cli.depends
		.filter((d) => d.source !== "core")
		.map((d) => d.source)
		.filter((s, i, a) => a.indexOf(s) === i);
}

export async function discoverPlugins(
	config: StackConfig,
): Promise<DiscoveredPlugin[]> {
	const plugins: DiscoveredPlugin[] = [];
	const loaded = new Set<string>();

	for (const pluginConfig of config.plugins) {
		const name = pluginConfig.__plugin;
		plugins.push(await loadPlugin(name, pluginConfig.options));
		loaded.add(name);
	}

	// Auto-resolve implicit plugins required by dependencies
	let added = true;
	while (added) {
		added = false;
		for (const p of plugins) {
			for (const dep of p.cli.depends) {
				if (dep.source !== "core" && !loaded.has(dep.source)) {
					const resolved = await loadPlugin(dep.source, {});
					if (resolved.cli.implicit) {
						plugins.push(resolved);
						loaded.add(dep.source);
						added = true;
					}
				}
			}
		}
	}

	return plugins;
}

export function sortByDependencies(
	plugins: DiscoveredPlugin[],
): DiscoveredPlugin[] {
	const pluginMap = new Map(plugins.map((p) => [p.name, p]));
	const sorted: DiscoveredPlugin[] = [];
	const visited = new Set<string>();

	function visit(name: string): void {
		if (visited.has(name)) return;
		visited.add(name);

		const plugin = pluginMap.get(name);
		if (plugin) {
			for (const dep of plugin.cli.depends) {
				if (dep.source !== "core") {
					visit(dep.source);
				}
			}
		}

		if (plugin) sorted.push(plugin);
	}

	for (const p of plugins) {
		visit(p.name);
	}

	return sorted;
}
