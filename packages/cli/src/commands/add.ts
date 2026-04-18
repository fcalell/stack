import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { log, outro } from "@clack/prompts";
import { builders } from "magicast";
import { Init } from "#events";
import { editConfig, hasPluginCall } from "#lib/config-writer";
import { dependencyNames, loadAvailablePlugins } from "#lib/discovery";
import { ConfigLoadError, MissingPluginError } from "#lib/errors";
import { createEventBus } from "#lib/event-bus";
import { createRegisterContext, syntheticAppConfig } from "#lib/registration";
import { announceCreated, writeScaffoldSpecs } from "#lib/scaffold";

export async function add(
	pluginName: string,
	configPath: string,
): Promise<void> {
	const available = await loadAvailablePlugins();
	const pluginInfo = available.find((p) => p.name === pluginName);
	if (!pluginInfo) {
		const availableNames = available
			.filter((p) => !p.cli.implicit)
			.map((p) => p.name)
			.join(", ");
		throw new MissingPluginError(
			pluginName,
			`Unknown plugin: "${pluginName}". Available plugins: ${availableNames}`,
		);
	}

	const packageName = pluginInfo.cli.package;
	const cwd = process.cwd();

	// Check if plugin already exists in config
	let hasPlugin = false;
	const { loadConfig } = await import("#lib/config");
	let config: Awaited<ReturnType<typeof loadConfig>> | null = null;
	try {
		config = await loadConfig(configPath);
	} catch (err) {
		// Config may not exist yet — only swallow load errors
		if (!(err instanceof ConfigLoadError)) throw err;
	}

	if (config) {
		hasPlugin = config.plugins.some((p) => p.__plugin === pluginName);

		for (const req of dependencyNames(pluginInfo)) {
			if (!config.plugins.some((p) => p.__plugin === req)) {
				throw new MissingPluginError(
					req,
					`${pluginInfo.cli.label} requires "${req}". Run: stack add ${req}`,
				);
			}
		}
	}

	if (hasPlugin) {
		log.info(`${pluginInfo.cli.label} is already configured.`);
		return;
	}

	// Register plugin, collect prompt answers, scaffold files
	let answers: Record<string, unknown> = {};
	const nonInteractive = !process.stdin.isTTY;
	try {
		const bus = createEventBus();
		const ctx = createRegisterContext({
			cwd,
			options: {},
			app: config?.app ?? syntheticAppConfig(cwd),
			hasPlugin: (name) => {
				if (name === pluginName) return true;
				try {
					const configFile = readFileSync(join(cwd, configPath), "utf-8");
					return hasPluginCall(configFile, name);
				} catch {
					return false;
				}
			},
			nonInteractive,
		});

		pluginInfo.cli.register(ctx, bus, pluginInfo.events);

		const promptPayload = await bus.emit(Init.Prompt, { configOptions: {} });
		answers = promptPayload.configOptions[pluginName] ?? {};

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const created = await writeScaffoldSpecs(scaffold.files, cwd);
		announceCreated(created);
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

			const call =
				Object.keys(answers).length > 0
					? builders.functionCall(importName, answers)
					: builders.functionCall(importName);
			ast.plugins.push(call);
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
