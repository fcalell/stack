import { intro, log, outro } from "@clack/prompts";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import {
	createDeployContext,
	createPluginContext,
} from "#lib/plugin-context";

interface DeployOptions {
	config: string;
}

export async function deploy(options: DeployOptions): Promise<void> {
	intro("stack deploy");

	const { build } = await import("#commands/build");
	await build(options.config);

	const config = await loadConfig(options.config);
	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered, config);
	const cwd = process.cwd();
	const baseCtx = createPluginContext({ cwd, config });
	const ctx = createDeployContext(baseCtx);

	for (const p of sorted) {
		if (!p.cli.deploy) continue;
		log.step(`Deploying ${p.name}...`);
		await p.cli.deploy(ctx);
		log.success(`${p.name} deployed`);
	}

	outro("Deployed");
}
