import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { StackConfig } from "#config";
import type { InternalCliPlugin, PluginFactory } from "#lib/create-plugin";
import { toCamelCase } from "#lib/naming";
import type { Slot } from "#lib/slots";

// A loaded plugin tied to its per-config options. `factory` is the
// `plugin()` result — commands call `factory.cli.collect(ctx)` to gather
// the plugin's slots + contributions for the graph.
export interface DiscoveredPlugin {
	name: string;
	cli: InternalCliPlugin<unknown, Record<string, Slot<unknown>>, unknown>;
	factory: PluginFactory<
		string,
		unknown,
		Record<string, Slot<unknown>>,
		Record<string, never>
	>;
	options: unknown;
}

// First-party plugins published under `@fcalell/plugin-*`. This list exists
// only for discovery commands (e.g. `stack init` and `stack add`) that need
// to offer a picker before any consumer config exists. Third-party plugins
// appear via the consumer's `stack.config.ts` and its `__package` fields,
// not here — discovery cannot enumerate them ahead of config load.
export const FIRST_PARTY_PLUGINS = [
	{ name: "cloudflare", package: "@fcalell/plugin-cloudflare" },
	{ name: "db", package: "@fcalell/plugin-db" },
	{ name: "auth", package: "@fcalell/plugin-auth" },
	{ name: "api", package: "@fcalell/plugin-api" },
	{ name: "vite", package: "@fcalell/plugin-vite" },
	{ name: "expo", package: "@fcalell/plugin-expo" },
	{ name: "native-ui", package: "@fcalell/plugin-native-ui" },
	{ name: "solid", package: "@fcalell/plugin-solid" },
	{ name: "solid-ui", package: "@fcalell/plugin-solid-ui" },
] as const satisfies ReadonlyArray<{ name: string; package: string }>;

// Derive both the value and the type straight from `FIRST_PARTY_PLUGINS` so a
// new plugin added to that array flows through automatically — no hand-kept
// tuple to drift out of sync.
export type PluginName = (typeof FIRST_PARTY_PLUGINS)[number]["name"];

export const PLUGIN_NAMES = FIRST_PARTY_PLUGINS.map(
	(p) => p.name,
) as readonly PluginName[];

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
	const camelName = toCamelCase(name);
	const pluginExport = (mod[camelName] ?? mod[name] ?? mod.default) as
		| PluginFactory<
				string,
				unknown,
				Record<string, Slot<unknown>>,
				Record<string, never>
		  >
		| undefined;
	if (!pluginExport?.cli) {
		throw new Error(
			`Plugin "${name}" (${packageName}) does not export a valid plugin. ` +
				`Expected an export named "${camelName}", "${name}", or a default export ` +
				`created with plugin().`,
		);
	}
	return { name, cli: pluginExport.cli, factory: pluginExport, options };
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

// Presence-only dependencies. Used by `stack add` / init for nicer error
// messages when a required sibling plugin is missing from the config.
export function dependencyNames(plugin: DiscoveredPlugin): string[] {
	return [...plugin.cli.requires];
}

// Transitive `requires` closure for a set of selected plugin names, resolved
// against the available (first-party) plugins. Returns the selected names PLUS
// every transitively-required sibling, deduped, with each plugin's requirements
// ordered before it (post-order). Shared by `stack init` and `stack add` so
// both auto-pull the *full* dependency chain, not just one level — picking
// `auth` pulls `db`, and `db`'s own requirements in turn. Unknown names (e.g.
// third-party plugins not in `available`) pass through as leaves.
export function resolveRequiresClosure(
	names: readonly string[],
	available: readonly DiscoveredPlugin[],
): string[] {
	const byName = new Map(available.map((p) => [p.name, p]));
	const ordered: string[] = [];
	const seen = new Set<string>();

	const visit = (name: string): void => {
		if (seen.has(name)) return;
		seen.add(name);
		const plugin = byName.get(name);
		if (plugin) {
			for (const req of plugin.cli.requires) visit(req);
		}
		ordered.push(name);
	};

	for (const name of names) visit(name);
	return ordered;
}

export async function discoverPlugins(
	config: StackConfig,
): Promise<DiscoveredPlugin[]> {
	const plugins: DiscoveredPlugin[] = [];

	for (const pluginConfig of config.plugins) {
		const name = pluginConfig.__plugin;
		// Prefer the explicit `__package` stamped by `plugin()` so third-party
		// plugins published under any npm namespace resolve. Fall back to the
		// first-party convention for older configs.
		const packageName = pluginConfig.__package ?? `@fcalell/plugin-${name}`;
		plugins.push(await loadPlugin(name, packageName, pluginConfig.options));
	}

	validateDependencies(plugins);

	return plugins;
}

// Presence check only. Ordering is derived by the slot graph from data
// dependencies — a plugin that reads `otherPlugin.slots.foo` as a derived
// input is implicitly ordered after it. `requires` exists so a missing
// dependency surfaces an actionable error rather than a cryptic slot-lookup
// failure.
export function validateDependencies(plugins: DiscoveredPlugin[]): void {
	const available = new Set(plugins.map((p) => p.name));

	for (const plugin of plugins) {
		for (const req of plugin.cli.requires) {
			if (!available.has(req)) {
				throw new Error(
					`[${plugin.name}] requires plugin '${req}', ` +
						`but it is not in your config. Add ${req}() to plugins array.`,
				);
			}
		}
	}
}
