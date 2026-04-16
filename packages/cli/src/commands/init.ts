import { existsSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { intro, log, note, outro } from "@clack/prompts";
import type { CliPlugin } from "@fcalell/config/plugin";
import { OFFICIAL_PLUGINS } from "#lib/discovery";
import { ask, multi } from "#lib/prompt";
import { createPluginContext } from "#lib/plugin-context";
import { announceCreated, scaffoldFiles } from "#lib/scaffold";
import { biomeTemplate } from "#templates/biome";
import { gitignoreTemplate } from "#templates/gitignore";
import { packageJsonTemplate } from "#templates/package-json";
import { stackConfigTemplate } from "#templates/stack-config";
import { tsconfigTemplate } from "#templates/tsconfig";

export async function init(dir: string): Promise<void> {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const original = process.cwd();
	process.chdir(dir);

	try {
		await run(dir);
	} finally {
		process.chdir(original);
	}
}

async function run(dir: string): Promise<void> {
	intro(`stack init ${basename(dir)}`);

	let selectedPlugins: string[] = [];
	let domain = "example.com";

	if (process.stdin.isTTY) {
		selectedPlugins = await multi("Which plugins do you want?", [
			...OFFICIAL_PLUGINS.map((p) => ({
				label: `${p.label}  (@fcalell/plugin-${p.name})`,
				value: p.name,
			})),
		]);

		// Auto-select required dependencies
		for (const name of [...selectedPlugins]) {
			const info = OFFICIAL_PLUGINS.find((p) => p.name === name);
			if (info?.requires) {
				for (const req of info.requires) {
					if (!selectedPlugins.includes(req)) {
						log.warn(
							`${info.label} requires ${req} — adding automatically.`,
						);
						selectedPlugins.unshift(req);
					}
				}
			}
		}

		domain = await ask("Domain", "example.com");
	}

	const name = basename(dir);
	const hasApp = selectedPlugins.includes("app");

	// Scaffold base files
	const created = scaffoldFiles([
		[
			"package.json",
			packageJsonTemplate({
				name,
				plugins: selectedPlugins,
			}),
		],
		["tsconfig.json", tsconfigTemplate({ app: hasApp })],
		["biome.json", biomeTemplate()],
		[".gitignore", gitignoreTemplate({ plugins: selectedPlugins })],
	]);
	announceCreated(created);

	// Load and run prompts + scaffold for each selected plugin
	const pluginAnswers = new Map<string, Record<string, unknown>>();

	for (const pluginName of selectedPlugins) {
		const info = OFFICIAL_PLUGINS.find((p) => p.name === pluginName);
		if (!info) continue;

		let cli: CliPlugin;
		try {
			const mod = await import(`${info.packageName}/cli`);
			cli = mod.default ?? mod;
		} catch {
			log.warn(
				`Could not load ${info.packageName} — it will be set up after install.`,
			);
			continue;
		}

		const ctx = createPluginContext({ cwd: dir, config: null });

		let answers: Record<string, unknown> = {};
		if (process.stdin.isTTY && cli.prompt) {
			answers = await cli.prompt(ctx);
		}
		pluginAnswers.set(pluginName, answers);

		await cli.scaffold(ctx, answers);
	}

	// Generate stack.config.ts
	const configContent = stackConfigTemplate({
		domain,
		plugins: selectedPlugins,
		pluginAnswers,
	});
	scaffoldFiles([["stack.config.ts", configContent]]);

	// Run generate if possible
	try {
		const { generate } = await import("#commands/generate");
		await generate("stack.config.ts");
	} catch {
		// May fail if plugin packages aren't installed yet
	}

	const nextSteps = ["pnpm install", "stack dev"];
	note(nextSteps.join("\n"), "Next steps");
	outro("Done!");
}
