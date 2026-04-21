import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { StackConfig } from "#config";
import type { InternalCliPlugin } from "#lib/create-plugin";
import type { Event } from "#lib/event-bus";

export interface DiscoveredPlugin {
	name: string;
	cli: InternalCliPlugin<unknown>;
	events: Record<string, Event<void>>;
	options: unknown;
}

// First-party plugins published under `@fcalell/plugin-*`. This list exists
// only for discovery commands (e.g. `stack init` and `stack add`) that need to
// offer a picker before any consumer config exists. Third-party plugins
// appear via the consumer's `stack.config.ts` and its `__package` fields, not
// here — discovery cannot enumerate them ahead of config load.
export const FIRST_PARTY_PLUGINS = [
	{ name: "db", package: "@fcalell/plugin-db" },
	{ name: "auth", package: "@fcalell/plugin-auth" },
	{ name: "api", package: "@fcalell/plugin-api" },
	{ name: "vite", package: "@fcalell/plugin-vite" },
	{ name: "solid", package: "@fcalell/plugin-solid" },
	{ name: "solid-ui", package: "@fcalell/plugin-solid-ui" },
] as const satisfies ReadonlyArray<{ name: string; package: string }>;

export const PLUGIN_NAMES = FIRST_PARTY_PLUGINS.map(
	(p) => p.name,
) as unknown as readonly ["db", "auth", "api", "vite", "solid", "solid-ui"];

export type PluginName = (typeof PLUGIN_NAMES)[number];

async function loadPlugin(
	name: string,
	packageName: string,
	options: unknown,
): Promise<DiscoveredPlugin> {
	let mod: Record<string, unknown>;
	try {
		mod = await import(packageName);
	} catch (cause) {
		// Fallback: resolve the package from the consumer's cwd. ESM `import()`
		// resolves relative to this file's location, so when the CLI is run via
		// its symlinked bin and the plugin lives only in the consumer's
		// `node_modules` (not the CLI's), the primary import fails. Retrying
		// via `createRequire(cwd)` follows the consumer's resolution tree.
		try {
			const cwdRequire = createRequire(join(process.cwd(), "package.json"));
			const resolved = cwdRequire.resolve(packageName);
			mod = await import(pathToFileURL(resolved).href);
		} catch {
			const detail = cause instanceof Error ? cause.message : String(cause);
			throw new Error(
				`Failed to load CLI plugin for "${name}" (${detail}). ` +
					`Run: pnpm add ${packageName}`,
			);
		}
	}
	const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
	const pluginExport = (mod[camelName] ?? mod[name] ?? mod.default) as
		| { cli?: InternalCliPlugin<unknown>; events?: Record<string, Event<void>> }
		| undefined;
	if (!pluginExport?.cli) {
		throw new Error(
			`Plugin "${name}" (${packageName}) does not export a valid plugin. ` +
				`Expected an export named "${camelName}", "${name}", or a default export ` +
				`created with createPlugin().`,
		);
	}
	const cli = pluginExport.cli;
	const events = pluginExport.events ?? {};
	return { name, cli, events, options };
}

export async function loadAvailablePlugins(): Promise<DiscoveredPlugin[]> {
	const results: DiscoveredPlugin[] = [];
	for (const entry of FIRST_PARTY_PLUGINS) {
		try {
			results.push(await loadPlugin(entry.name, entry.package, {}));
		} catch {
			// Plugin not available in this workspace
		}
	}
	return results;
}

export function dependencyNames(plugin: DiscoveredPlugin): string[] {
	return plugin.cli.after
		.filter((d) => d.source !== "core")
		.map((d) => d.source)
		.filter((s, i, a) => a.indexOf(s) === i);
}

export async function discoverPlugins(
	config: StackConfig,
): Promise<DiscoveredPlugin[]> {
	const plugins: DiscoveredPlugin[] = [];

	for (const pluginConfig of config.plugins) {
		const name = pluginConfig.__plugin;
		// Prefer the explicit `__package` stamped by `createPlugin` so
		// third-party plugins published under any npm namespace resolve.
		// Fall back to the first-party convention for older configs.
		const packageName = pluginConfig.__package ?? `@fcalell/plugin-${name}`;
		plugins.push(await loadPlugin(name, packageName, pluginConfig.options));
	}

	validateDependencies(plugins);

	return plugins;
}

export function validateDependencies(plugins: DiscoveredPlugin[]): void {
	const available = new Set(plugins.map((p) => p.name));

	for (const plugin of plugins) {
		for (const dep of plugin.cli.after) {
			if (dep.source === "core") continue;
			if (!available.has(dep.source)) {
				throw new Error(
					`[${plugin.name}] must run after event '${dep.name}' from plugin '${dep.source}', ` +
						`but plugin '${dep.source}' is not in your config. ` +
						`Add ${dep.source}() to plugins array.`,
				);
			}
		}
	}
}

export function sortByDependencies(
	plugins: DiscoveredPlugin[],
): DiscoveredPlugin[] {
	const pluginMap = new Map(plugins.map((p) => [p.name, p]));
	const sorted: DiscoveredPlugin[] = [];
	// 3-color DFS: WHITE = unvisited (not in either set),
	// GRAY = currently on the stack (in `visiting`),
	// BLACK = fully processed (in `visited`).
	const visited = new Set<string>();
	const visiting = new Set<string>();

	function visit(name: string, path: string[]): void {
		if (visited.has(name)) return;
		if (visiting.has(name)) {
			const cycleStart = path.indexOf(name);
			const cycle = [...path.slice(cycleStart), name].join(" -> ");
			throw new Error(
				`Circular plugin dependency: ${cycle}. ` +
					`Break the cycle by removing one of the 'after' entries.`,
			);
		}

		const plugin = pluginMap.get(name);
		if (!plugin) return;

		visiting.add(name);
		const nextPath = [...path, name];
		for (const dep of plugin.cli.after) {
			if (dep.source !== "core") {
				visit(dep.source, nextPath);
			}
		}
		visiting.delete(name);
		visited.add(name);
		sorted.push(plugin);
	}

	for (const p of plugins) {
		visit(p.name, []);
	}

	return sorted;
}
