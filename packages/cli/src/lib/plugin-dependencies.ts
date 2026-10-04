import { cliSlots } from "./cli-slots.ts";
import type { Graph } from "./graph.ts";
import { stackPluginSpecs } from "./stack-packages.ts";

export interface PluginDependencies {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}

// The dependencies `stack init` and `stack add` write: every contribution to
// `initDeps` (those a plugin's options derive among them, as expo's config
// plugins') plus each named plugin's own package as a dependency, and every
// contribution to `initDevDeps` as a devDependency.
export async function pluginDependencies(
	graph: Graph,
	plugins: readonly string[],
): Promise<PluginDependencies> {
	const [deps, devDependencies] = await Promise.all([
		graph.resolve(cliSlots.initDeps),
		graph.resolve(cliSlots.initDevDeps),
	]);
	return {
		dependencies: { ...deps, ...stackPluginSpecs(plugins) },
		devDependencies,
	};
}
