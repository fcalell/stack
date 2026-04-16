import { intro, log, outro } from "@clack/prompts";
import { loadConfig } from "#lib/config";
import { discoverPlugins } from "#lib/discovery";
import { confirm } from "#lib/prompt";
import { createPluginContext } from "#lib/plugin-context";

interface ResetOptions {
	config: string;
}

export async function reset(options: ResetOptions): Promise<void> {
	intro("stack db reset");

	let config: Awaited<ReturnType<typeof loadConfig>>;
	try {
		config = await loadConfig(options.config);
	} catch {
		log.error("No config found. Run `stack init` first.");
		process.exit(1);
	}

	if (!config.plugins.some((p) => p.__plugin === "db")) {
		log.error("No database plugin configured.");
		process.exit(1);
	}

	if (process.stdin.isTTY) {
		const ok = await confirm("Reset local database? All data will be lost.");
		if (!ok) {
			outro("Aborted.");
			return;
		}
	}

	const discovered = await discoverPlugins(config);
	const dbPlugin = discovered.find((p) => p.name === "db");

	if (!dbPlugin) {
		log.error("Database plugin not found. Run: pnpm add @fcalell/plugin-db");
		process.exit(1);
	}

	// Delegate to the plugin's dev hook or a dedicated reset method
	// For now, look for a reset function on the CLI plugin
	const cli = dbPlugin.cli as unknown as Record<string, unknown>;
	if (typeof cli.reset === "function") {
		const cwd = process.cwd();
		const ctx = createPluginContext({ cwd, config });
		await (cli.reset as (ctx: unknown) => Promise<void>)(ctx);
	} else {
		log.warn(
			"The database plugin does not support `db reset`. " +
				"Delete your local database manually and run `stack dev` to recreate.",
		);
	}

	outro("Database reset complete");
}
