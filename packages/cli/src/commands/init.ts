import { existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import { intro, log, note, outro } from "@clack/prompts";
import { Init } from "#events";
import { dependencyNames, loadAvailablePlugins } from "#lib/discovery";
import { createEventBus } from "#lib/event-bus";
import { ask, multi } from "#lib/prompt";
import { createRegisterContext } from "#lib/registration";
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

	const available = await loadAvailablePlugins();
	const selectablePlugins = available.filter((p) => !p.cli.implicit);

	if (process.stdin.isTTY) {
		selectedPlugins = await multi("Which plugins do you want?", [
			...selectablePlugins.map((p) => ({
				label: `${p.cli.label}  (@fcalell/plugin-${p.name})`,
				value: p.name,
			})),
		]);

		// Auto-select required dependencies
		for (const name of [...selectedPlugins]) {
			const info = available.find((p) => p.name === name);
			if (info) {
				for (const req of dependencyNames(info)) {
					if (!selectedPlugins.includes(req)) {
						log.warn(
							`${info.cli.label} requires ${req} — adding automatically.`,
						);
						selectedPlugins.unshift(req);
					}
				}
			}
		}

		domain = await ask("Domain", "example.com");
	}

	const name = basename(dir);
	const hasSolid =
		selectedPlugins.includes("solid") || selectedPlugins.includes("solid-ui");

	// Scaffold base files
	const created = scaffoldFiles([
		[
			"package.json",
			packageJsonTemplate({
				name,
				plugins: selectedPlugins,
			}),
		],
		["tsconfig.json", tsconfigTemplate({ app: hasSolid })],
		["biome.json", biomeTemplate()],
		[".gitignore", gitignoreTemplate({ plugins: selectedPlugins })],
	]);
	announceCreated(created);

	// Load and register each selected plugin via the event bus
	const bus = createEventBus();
	const pluginAnswers = new Map<string, Record<string, unknown>>();

	for (const pluginName of selectedPlugins) {
		const plugin = available.find((p) => p.name === pluginName);
		if (!plugin) continue;

		const ctx = createRegisterContext({
			cwd: dir,
			options: {},
			hasPlugin: (n) => selectedPlugins.includes(n),
		});

		plugin.cli.register(ctx, bus, plugin.events);
		pluginAnswers.set(pluginName, {});
	}

	// Emit scaffold event to let plugins contribute files
	const scaffold = await bus.emit(Init.Scaffold, {
		files: [],
		dependencies: {},
		devDependencies: {},
		gitignore: [],
	});

	// Write plugin-contributed scaffold files
	for (const file of scaffold.files) {
		scaffoldFiles([[file.path, file.content]]);
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
