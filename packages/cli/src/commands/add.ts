import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { log, outro } from "@clack/prompts";
import { Init } from "#events";
import { editConfig } from "#lib/config-writer";
import { dependencyNames, loadAvailablePlugins } from "#lib/discovery";
import { createEventBus } from "#lib/event-bus";
import { createRegisterContext } from "#lib/registration";
import { scaffoldFiles } from "#lib/scaffold";

export async function add(
	pluginName: string,
	configPath: string,
): Promise<void> {
	const available = await loadAvailablePlugins();
	const pluginInfo = available.find((p) => p.name === pluginName);
	if (!pluginInfo) {
		log.error(`Unknown plugin: "${pluginName}"`);
		log.info(
			`Available plugins: ${available
				.filter((p) => !p.cli.implicit)
				.map((p) => p.name)
				.join(", ")}`,
		);
		process.exit(1);
	}

	const packageName = `@fcalell/plugin-${pluginName}`;
	const cwd = process.cwd();

	// Check if plugin already exists in config
	let hasPlugin = false;
	try {
		const { loadConfig } = await import("#lib/config");
		const config = await loadConfig(configPath);
		hasPlugin = config.plugins.some((p) => p.__plugin === pluginName);

		for (const req of dependencyNames(pluginInfo)) {
			if (!config.plugins.some((p) => p.__plugin === req)) {
				log.error(
					`${pluginInfo.cli.label} requires "${req}". Run: stack add ${req}`,
				);
				process.exit(1);
			}
		}
	} catch {
		// Config may not exist yet
	}

	if (hasPlugin) {
		log.info(`${pluginInfo.cli.label} is already configured.`);
		return;
	}

	// Register plugin and scaffold files
	try {
		const bus = createEventBus();
		const ctx = createRegisterContext({
			cwd,
			options: {},
			hasPlugin: (name) => {
				try {
					const configFile = readFileSync(join(cwd, configPath), "utf-8");
					return configFile.includes(`${name}(`) || name === pluginName;
				} catch {
					return name === pluginName;
				}
			},
		});

		pluginInfo.cli.register(ctx, bus, pluginInfo.events);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		for (const file of scaffold.files) {
			scaffoldFiles([[file.path, file.content]]);
		}
	} catch {
		log.warn(
			`Could not load ${packageName} — it will be set up after install.`,
		);
	}

	// Add plugin to config file
	const fullConfigPath = join(cwd, configPath);
	const importName = pluginName.replace(/-([a-z])/g, (_, c: string) =>
		c.toUpperCase(),
	);
	if (existsSync(fullConfigPath)) {
		await editConfig(fullConfigPath, ({ mod, config: ast }) => {
			mod.imports.$append({
				from: packageName,
				imported: importName,
				local: importName,
			});

			if (!ast.plugins) {
				ast.plugins = [];
			}
		});
	}

	const { generate } = await import("#commands/generate");
	try {
		await generate(configPath);
	} catch {
		log.warn("Could not run generate — run `stack generate` after install.");
	}

	outro(`Added ${pluginInfo.cli.label}`);
}
