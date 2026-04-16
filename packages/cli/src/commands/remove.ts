import { log, outro } from "@clack/prompts";
import { loadConfig } from "#lib/config";
import { OFFICIAL_PLUGINS, discoverPlugins } from "#lib/discovery";
import { createPluginContext } from "#lib/plugin-context";

export async function remove(
	pluginName: string,
	configPath: string,
): Promise<void> {
	const config = await loadConfig(configPath);
	const cwd = process.cwd();
	const ctx = createPluginContext({ cwd, config });

	if (!ctx.hasPlugin(pluginName)) {
		log.error(`Plugin "${pluginName}" is not in your config.`);
		process.exit(1);
	}

	const dependents = config.plugins.filter((p) =>
		p.requires?.includes(pluginName),
	);
	if (dependents.length > 0) {
		const names = dependents.map((p) => p.__plugin).join(", ");
		log.error(
			`Cannot remove "${pluginName}" — required by: ${names}. Remove those first.`,
		);
		process.exit(1);
	}

	const discovered = await discoverPlugins(config);
	const plugin = discovered.find((p) => p.name === pluginName);

	if (plugin?.cli.remove) {
		const result = await plugin.cli.remove(ctx);

		if (result.filesToDelete?.length) {
			log.info(`Files to remove: ${result.filesToDelete.join(", ")}`);
		}
		if (result.packagesToRemove?.length) {
			log.info(
				`Packages to remove: ${result.packagesToRemove.join(", ")}`,
			);
		}
		if (result.notes?.length) {
			for (const note of result.notes) {
				log.info(note);
			}
		}
	}

	await ctx.removePluginFromConfig(pluginName);

	const pluginInfo = OFFICIAL_PLUGINS.find((p) => p.name === pluginName);
	const label = pluginInfo?.label ?? pluginName;

	const { generate } = await import("#commands/generate");
	try {
		await generate(configPath);
	} catch {
		log.warn("Could not regenerate — run `stack generate` manually.");
	}

	outro(`Removed ${label}`);
}
