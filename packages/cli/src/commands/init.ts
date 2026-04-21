import { existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import { intro, log, note, outro } from "@clack/prompts";
import { Init } from "#events";
import {
	type DiscoveredPlugin,
	dependencyNames,
	loadAvailablePlugins,
} from "#lib/discovery";
import { MissingPluginError, StackError } from "#lib/errors";
import { createEventBus } from "#lib/event-bus";
import { ask, multi } from "#lib/prompt";
import { createRegisterContext, syntheticAppConfig } from "#lib/registration";
import {
	announceCreated,
	writeIfMissingString,
	writeScaffoldSpecs,
} from "#lib/scaffold";
import { biomeTemplate } from "#templates/biome";
import { gitignoreTemplate } from "#templates/gitignore";
import { packageJsonTemplate } from "#templates/package-json";
import { stackConfigTemplate } from "#templates/stack-config";
import { tsconfigTemplate } from "#templates/tsconfig";

export interface InitOptions {
	plugins?: string[];
	name?: string;
	domain?: string;
	yes?: boolean;
}

export async function init(
	dir: string,
	options: InitOptions = {},
): Promise<void> {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const original = process.cwd();
	process.chdir(dir);

	try {
		await run(dir, options);
	} finally {
		process.chdir(original);
	}
}

async function run(dir: string, options: InitOptions): Promise<void> {
	intro(`stack init ${basename(dir)}`);

	const available = await loadAvailablePlugins();

	// Non-interactive mode triggers when any flag is provided OR stdin is not a TTY.
	// This keeps interactive `stack init` behaviour unchanged while letting CI and
	// scripted flows drive scaffolding via flags.
	const flagDriven =
		options.plugins !== undefined ||
		options.domain !== undefined ||
		options.name !== undefined ||
		options.yes === true;
	const nonInteractive = flagDriven || !process.stdin.isTTY;

	let selectedPlugins: string[] = [];
	let appName = options.name ?? basename(dir);
	let domain = options.domain ?? "example.com";

	if (options.plugins !== undefined) {
		selectedPlugins = resolvePluginSelection(options.plugins, available);
	} else if (!nonInteractive) {
		selectedPlugins = await multi("Which plugins do you want?", [
			...available.map((p) => ({
				label: `${p.cli.label}  (${p.cli.package})`,
				value: p.name,
			})),
		]);

		// Auto-select required dependencies for interactive flow. Non-interactive
		// selection already runs dependency resolution in resolvePluginSelection.
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

		appName = await ask("App name", basename(dir));
		domain = await ask("Domain", "example.com");
	}

	const name = basename(dir);
	const hasSolid =
		selectedPlugins.includes("solid") || selectedPlugins.includes("solid-ui");

	// Scaffold base files
	const baseEntries: Array<[string, string]> = [
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
	];
	const createdBase: string[] = [];
	for (const [path, content] of baseEntries) {
		if (writeIfMissingString(path, content)) createdBase.push(path);
	}
	announceCreated(createdBase);

	// Load and register each selected plugin via the event bus
	const bus = createEventBus();
	const pluginAnswers = new Map<string, Record<string, unknown>>();

	for (const pluginName of selectedPlugins) {
		const plugin = available.find((p) => p.name === pluginName);
		if (!plugin) continue;

		const ctx = createRegisterContext({
			cwd: dir,
			options: {},
			app: { ...syntheticAppConfig(dir), name: appName, domain },
			hasPlugin: (n) => selectedPlugins.includes(n),
			nonInteractive,
		});

		plugin.cli.register(ctx, bus, plugin.events);
		pluginAnswers.set(pluginName, {});
	}

	// Emit Init.Prompt so plugins can collect plugin-specific answers (dialect,
	// cookie prefix, etc.) into `configOptions`. In non-interactive mode the
	// prompt context resolves each call with defaults, so handlers still run.
	const promptPayload = await bus.emit(Init.Prompt, {
		configOptions: {},
	});

	for (const [pluginName, answers] of Object.entries(
		promptPayload.configOptions,
	)) {
		if (!pluginAnswers.has(pluginName)) {
			throw new StackError(
				`Plugin "${pluginName}" emitted Init.Prompt answers but is not in the selected plugins. ` +
					`Selected: ${[...pluginAnswers.keys()].join(", ")}. ` +
					`Check the plugin's register() for a typo on configOptions.`,
				"INIT_UNKNOWN_PLUGIN_ANSWERS",
			);
		}
		pluginAnswers.set(pluginName, answers);
	}

	// Emit scaffold event to let plugins contribute files
	const scaffold = await bus.emit(Init.Scaffold, {
		files: [],
		dependencies: {},
		devDependencies: {},
		gitignore: [],
	});

	// Write plugin-contributed scaffold files (URL-sourced, no placeholder subst).
	const createdPluginFiles = await writeScaffoldSpecs(scaffold.files, dir);
	announceCreated(createdPluginFiles);

	// Generate stack.config.ts
	const configContent = stackConfigTemplate({
		name: appName,
		domain,
		plugins: selectedPlugins,
		pluginAnswers,
	});
	if (writeIfMissingString("stack.config.ts", configContent)) {
		announceCreated(["stack.config.ts"]);
	}

	// Run generate — failures here leave a broken .stack/, so surface them
	// loudly rather than silently continuing into misleading "Next steps".
	try {
		const { generate } = await import("#commands/generate");
		await generate("stack.config.ts");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		log.info(
			"Your scaffolded files were written, but generation did not complete. " +
				"Fix the error above, then run `stack generate` to finish setup.",
		);
		throw new StackError(
			`Failed to generate .stack/ files: ${message}`,
			"INIT_GENERATE_FAILED",
		);
	}

	const nextSteps = ["pnpm install", "stack dev"];
	note(nextSteps.join("\n"), "Next steps");
	outro("Done!");
}

// Resolve `--plugins` CSV input into a valid, dependency-closed plugin list.
// Unknown names exit with an error rather than getting silently dropped — the
// consumer asked for something specific and we should not quietly ignore it.
function resolvePluginSelection(
	requested: string[],
	available: DiscoveredPlugin[],
): string[] {
	const validNames = new Set(available.map((p) => p.name));

	const unknown = requested.filter((n) => !validNames.has(n));
	if (unknown.length > 0) {
		throw new MissingPluginError(
			unknown[0] ?? "",
			`Unknown plugin(s): ${unknown.join(", ")}. Available: ${[...validNames].join(", ")}`,
		);
	}

	const selected = [...requested];
	for (const name of [...selected]) {
		const info = available.find((p) => p.name === name);
		if (!info) continue;
		for (const req of dependencyNames(info)) {
			if (!selected.includes(req)) {
				selected.unshift(req);
			}
		}
	}
	return selected;
}
