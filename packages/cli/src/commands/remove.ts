import { join } from "node:path";
import { log, outro } from "@clack/prompts";
import { Remove } from "#events";
import { loadConfig } from "#lib/config";
import { removePluginCall } from "#lib/config-writer";
import { discoverPlugins } from "#lib/discovery";
import { MissingPluginError, StackError } from "#lib/errors";
import { createEventBus } from "#lib/event-bus";
import { createRegisterContext } from "#lib/registration";

export async function remove(
	pluginName: string,
	configPath: string,
): Promise<void> {
	const config = await loadConfig(configPath);
	const cwd = process.cwd();

	const hasPlugin = config.plugins.some((p) => p.__plugin === pluginName);
	if (!hasPlugin) {
		throw new MissingPluginError(
			pluginName,
			`Plugin "${pluginName}" is not in your config.`,
		);
	}

	const discovered = await discoverPlugins(config);

	// Check if any other plugin depends on this one
	const dependents = discovered.filter((p) =>
		p.cli.after.some((d) => d.source === pluginName),
	);
	if (dependents.length > 0) {
		const names = dependents.map((p) => p.name).join(", ");
		throw new StackError(
			`Cannot remove "${pluginName}" — required by: ${names}. Remove those first.`,
			"PLUGIN_HAS_DEPENDENTS",
		);
	}

	const plugin = discovered.find((p) => p.name === pluginName);

	if (plugin) {
		const bus = createEventBus();
		const ctx = createRegisterContext({
			cwd,
			options: plugin.options,
			app: config.app,
			hasPlugin: (name) => config.plugins.some((pl) => pl.__plugin === name),
		});

		plugin.cli.register(ctx, bus, plugin.events);

		const result = await bus.emit(Remove, {
			files: [],
			dependencies: [],
			devDependencies: [],
		});

		if (result.files.length > 0) {
			log.info(`Files to remove: ${result.files.join(", ")}`);
		}
		if (result.dependencies.length > 0) {
			log.info(`Packages to remove: ${result.dependencies.join(", ")}`);
		}
		if (result.devDependencies.length > 0) {
			log.info(`Dev packages to remove: ${result.devDependencies.join(", ")}`);
		}
	}

	// Remove plugin from config file
	const fullConfigPath = join(cwd, configPath);
	await removePluginCall(fullConfigPath, pluginName);

	const label = plugin?.cli.label ?? pluginName;

	const { generate } = await import("#commands/generate");
	try {
		await generate(configPath);
	} catch {
		log.warn("Could not regenerate — run `stack generate` manually.");
	}

	outro(`Removed ${label}`);
}
