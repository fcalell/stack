import type { CliPlugin } from "@fcalell/config/plugin";
import type { StackConfig } from "@fcalell/config";
import { log } from "@clack/prompts";

export interface DiscoveredPlugin {
	name: string;
	cli: CliPlugin;
	options: unknown;
}

export async function discoverPlugins(
	config: StackConfig,
): Promise<DiscoveredPlugin[]> {
	const plugins: DiscoveredPlugin[] = [];

	for (const pluginConfig of config.plugins) {
		const name = pluginConfig.__plugin;
		const packageName = `@fcalell/plugin-${name}`;

		try {
			const mod = await import(`${packageName}/cli`);
			const cli = (mod.default ?? mod) as CliPlugin;
			plugins.push({ name, cli, options: pluginConfig.options });
		} catch {
			log.error(
				`Failed to load CLI plugin for "${name}". Run: pnpm add ${packageName}`,
			);
			process.exit(1);
		}
	}

	return plugins;
}

export function sortByDependencies(
	plugins: DiscoveredPlugin[],
	config: StackConfig,
): DiscoveredPlugin[] {
	const pluginMap = new Map(plugins.map((p) => [p.name, p]));
	const sorted: DiscoveredPlugin[] = [];
	const visited = new Set<string>();

	function visit(name: string): void {
		if (visited.has(name)) return;
		visited.add(name);

		const pc = config.plugins.find((p) => p.__plugin === name);
		if (pc?.requires) {
			for (const dep of pc.requires) {
				visit(dep);
			}
		}

		const plugin = pluginMap.get(name);
		if (plugin) sorted.push(plugin);
	}

	for (const p of plugins) {
		visit(p.name);
	}

	return sorted;
}

export interface AvailablePlugin {
	name: string;
	label: string;
	packageName: string;
	requires?: string[];
}

export const OFFICIAL_PLUGINS: AvailablePlugin[] = [
	{
		name: "db",
		packageName: "@fcalell/plugin-db",
		label: "Database",
	},
	{
		name: "auth",
		packageName: "@fcalell/plugin-auth",
		label: "Auth",
		requires: ["db"],
	},
	{
		name: "api",
		packageName: "@fcalell/plugin-api",
		label: "API",
	},
	{
		name: "app",
		packageName: "@fcalell/plugin-app",
		label: "App",
	},
];
