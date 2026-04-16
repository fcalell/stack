import { log, outro } from "@clack/prompts";
import { loadConfig } from "#lib/config";
import {
	OFFICIAL_PLUGINS,
	discoverPlugins,
} from "#lib/discovery";
import { createPluginContext } from "#lib/plugin-context";

export async function add(
	pluginName: string,
	configPath: string,
): Promise<void> {
	const pluginInfo = OFFICIAL_PLUGINS.find((p) => p.name === pluginName);
	if (!pluginInfo) {
		log.error(`Unknown plugin: "${pluginName}"`);
		log.info(
			`Available plugins: ${OFFICIAL_PLUGINS.map((p) => p.name).join(", ")}`,
		);
		process.exit(1);
	}

	const packageName = pluginInfo.packageName;

	let cli: Awaited<ReturnType<typeof discoverPlugins>>[number]["cli"];
	try {
		const mod = await import(`${packageName}/cli`);
		cli = mod.default ?? mod;
	} catch {
		log.error(
			`Plugin package "${packageName}" not found. Run: pnpm add ${packageName}`,
		);
		process.exit(1);
	}

	let config: Awaited<ReturnType<typeof loadConfig>> | null = null;
	try {
		config = await loadConfig(configPath);
	} catch {
		// Config may not exist yet — that's OK for some plugins
	}

	const cwd = process.cwd();
	const ctx = createPluginContext({ cwd, config });

	const alreadyConfigured = await cli.detect(ctx);
	if (alreadyConfigured) {
		log.info(`${pluginInfo.label} is already configured.`);
		return;
	}

	if (pluginInfo.requires) {
		for (const req of pluginInfo.requires) {
			if (!ctx.hasPlugin(req)) {
				log.error(
					`${pluginInfo.label} requires "${req}". Run: stack add ${req}`,
				);
				process.exit(1);
			}
		}
	}

	let answers: Record<string, unknown> = {};
	if (process.stdin.isTTY && cli.prompt) {
		answers = await cli.prompt(ctx);
	}

	await cli.scaffold(ctx, answers);

	await ctx.addPluginToConfig({
		importSource: packageName,
		importName: pluginName,
		options: answers,
	});

	const { generate } = await import("#commands/generate");
	try {
		await generate(configPath);
	} catch {
		// Generate may fail if not all plugins are installed yet
		log.warn("Could not run generate — run `stack generate` after install.");
	}

	outro(`Added ${pluginInfo.label}`);
}
