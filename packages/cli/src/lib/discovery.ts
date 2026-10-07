import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { StackConfig } from "../config.ts";
import type {
	InternalCliPlugin,
	OneOfRequirement,
	PluginFactory,
	Requirement,
} from "./create-plugin.ts";
import { toCamelCase } from "./naming.ts";
import type { Slot } from "./slots.ts";

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
	{ name: "node", package: "@fcalell/plugin-node" },
	{ name: "vite", package: "@fcalell/plugin-vite" },
	{ name: "react", package: "@fcalell/plugin-react" },
	{ name: "react-ui", package: "@fcalell/plugin-react-ui" },
	{ name: "expo", package: "@fcalell/plugin-expo" },
	{ name: "native-ui", package: "@fcalell/plugin-native-ui" },
	{ name: "screens", package: "@fcalell/plugin-screens" },
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

// The named first-party plugins, each installed already. Node caches a
// failed resolution for the rest of the process, so a plugin probed before
// its install stays unresolvable after it: never load an absent one.
export async function loadInstalledPlugins(
	names: readonly string[],
): Promise<DiscoveredPlugin[]> {
	const results: DiscoveredPlugin[] = [];
	for (const entry of FIRST_PARTY_PLUGINS) {
		if (!names.includes(entry.name)) continue;
		results.push(await loadPlugin(entry.name, entry.package, {}));
	}
	return results;
}

// The plugins any one of which satisfies a requirement.
export function requirementOptions(req: Requirement): readonly string[] {
	return typeof req === "string" ? [req] : req.oneOf;
}

// The app's plugins that `name` replaces: each one meeting a one-of
// requirement `name` also meets, since a one-of is met by exactly one plugin.
export function displacedBy(
	name: string,
	plugins: readonly DiscoveredPlugin[],
): string[] {
	const present = new Set(plugins.map((p) => p.name));
	const displaced = new Set<string>();
	for (const plugin of plugins) {
		for (const req of plugin.cli.requires) {
			if (typeof req === "string" || !req.oneOf.includes(name)) continue;
			for (const option of req.oneOf) {
				if (option !== name && present.has(option)) displaced.add(option);
			}
		}
	}
	return [...displaced];
}

// Picks the plugin that meets a one-of requirement the selection does not;
// `plugin` is the plugin that declares it.
export type ChooseRequirement = (
	req: OneOfRequirement,
	plugin: string,
) => Promise<string>;

const chooseFirst: ChooseRequirement = async (req) => req.oneOf[0];

// Transitive `requires` closure for a set of selected plugin names, resolved
// against the available (first-party) plugins. Returns the selected names PLUS
// every transitively-required sibling, deduped, with each plugin's named
// requirements ordered before it (post-order). Shared by `stack init` and
// `stack add` so both auto-pull the *full* dependency chain, not just one
// level — picking `auth` pulls `db`, and `db`'s own requirements in turn.
// One-of requirements settle after the named closure, so a plugin pulled by
// name anywhere meets them whatever the visit order; one still unmet adds the
// plugin `choose` picks, the first of `oneOf` unless told otherwise. Unknown
// names (e.g. third-party plugins not in `available`) pass through as leaves.
export async function resolveRequiresClosure(
	names: readonly string[],
	available: readonly DiscoveredPlugin[],
	choose: ChooseRequirement = chooseFirst,
): Promise<string[]> {
	const byName = new Map(available.map((p) => [p.name, p]));
	const ordered: string[] = [];
	const seen = new Set<string>();
	const oneOfs: { req: OneOfRequirement; plugin: string }[] = [];

	const visit = (name: string): void => {
		if (seen.has(name)) return;
		seen.add(name);
		for (const req of byName.get(name)?.cli.requires ?? []) {
			if (typeof req === "string") visit(req);
			else oneOfs.push({ req, plugin: name });
		}
		ordered.push(name);
	};

	for (const name of names) visit(name);
	for (let next = oneOfs.shift(); next; next = oneOfs.shift()) {
		if (next.req.oneOf.some((name) => seen.has(name))) continue;
		visit(await choose(next.req, next.plugin));
	}
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
			const options = requirementOptions(req);
			const present = options.filter((name) => available.has(name));
			if (present.length === 1) continue;
			const quoted = options.map((name) => `'${name}'`).join(", ");
			const calls = options.map((name) => `${toCamelCase(name)}()`);
			if (present.length > 1) {
				throw new Error(
					`[${plugin.name}] requires exactly one of ${quoted}, but your config has ${present.join(", ")}. Remove all but one.`,
				);
			}
			throw new Error(
				typeof req === "string"
					? `[${plugin.name}] requires plugin '${req}', but it is not in your config. Add ${calls[0]} to plugins array.`
					: `[${plugin.name}] requires one of ${quoted}, but none is in your config. Add ${calls.join(" or ")} to plugins array.`,
			);
		}
	}
}
