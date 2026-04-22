import { existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import { intro, log, note, outro } from "@clack/prompts";
import { defineConfig, type PluginConfig, type StackConfig } from "#config";
import { buildGraphFromDiscovered } from "#lib/build-graph";
import { cliSlots } from "#lib/cli-slots";
import {
	type DiscoveredPlugin,
	dependencyNames,
	loadAvailablePlugins,
} from "#lib/discovery";
import { MissingPluginError, StackError } from "#lib/errors";
import { ask, createPromptContext, multi } from "#lib/prompt";
import {
	announceCreated,
	ensureGitignore,
	patchPackageJson,
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

	// Scaffold base files — CLI-owned, not plugin-contributed.
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

	const pluginAnswers = new Map<string, Record<string, unknown>>();
	for (const p of selectedPlugins) pluginAnswers.set(p, {});

	// Discovered plugins carry the factory + an `options: {}` placeholder.
	// We don't yet have per-plugin options — prompts produce them. The
	// slot graph reads `options` from `discovered`, not from a StackConfig,
	// so skipping the synthetic factory call here avoids Zod errors for
	// plugins whose options can't default to `{}` (e.g. db requires a
	// dialect).
	const selectedDiscovered = available.filter((p) =>
		selectedPlugins.includes(p.name),
	);

	// Resolve prompts via the slot graph. Each PromptSpec returns an answers
	// object keyed by the plugin's own namespace.
	const { graph: promptGraph } = buildGraphFromDiscovered({
		discovered: selectedDiscovered,
		app: { name: appName, domain },
		cwd: dir,
	});
	const promptSpecs = await promptGraph.resolve(cliSlots.initPrompts);

	const promptAdapter = createPromptContext({ nonInteractive });
	for (const spec of promptSpecs) {
		const priors: Record<string, unknown> = {};
		for (const [plugin, answers] of pluginAnswers.entries()) {
			priors[plugin] = answers;
		}
		// Pass a minimal ctx exposing `prompt`; plugin-auth / plugin-db read it
		// from there. Non-interactive mode resolves every prompt to a sensible
		// default (see createPromptContext).
		const answers = await spec.ask({ prompt: promptAdapter }, priors);
		pluginAnswers.set(spec.plugin, answers);
	}

	// Render stack.config.ts with the collected answers, then reload so the
	// second graph pass sees the plugin's real options.
	const configContent = stackConfigTemplate({
		name: appName,
		domain,
		plugins: selectedPlugins,
		pluginAnswers,
	});
	if (writeIfMissingString("stack.config.ts", configContent)) {
		announceCreated(["stack.config.ts"]);
	}

	// Rebuild graph with the rendered options (each plugin's factory validates
	// them via Zod) and resolve the init-time scaffold/dep/gitignore slots.
	const configured = syntheticConfigFromSelection({
		selectedPlugins,
		available,
		app: { name: appName, domain },
		perPluginOptions: pluginAnswers,
	});
	const configuredDiscovered = configured.plugins.map((cfg) => {
		const avail = available.find((a) => a.name === cfg.__plugin);
		if (!avail) {
			throw new StackError(
				`Selected plugin '${cfg.__plugin}' went missing between passes.`,
				"INIT_PLUGIN_MISSING",
			);
		}
		return { ...avail, options: cfg.options } satisfies DiscoveredPlugin;
	});
	const { graph: initGraph } = buildGraphFromDiscovered({
		discovered: configuredDiscovered,
		app: configured.app,
		cwd: dir,
	});

	const [scaffolds, deps, devDeps, gitignore] = await Promise.all([
		initGraph.resolve(cliSlots.initScaffolds),
		initGraph.resolve(cliSlots.initDeps),
		initGraph.resolve(cliSlots.initDevDeps),
		initGraph.resolve(cliSlots.gitignore),
	]);

	const created = await writeScaffoldSpecs(scaffolds, dir);
	announceCreated(created);

	patchPackageJson(dir, { dependencies: { ...deps, ...devDeps } });
	if (gitignore.length > 0) ensureGitignore(...gitignore);

	// Run the real generate path against the config we just wrote — this is
	// the same code `stack generate` runs.
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

// Build a StackConfig by calling each plugin's factory — the factory stamps
// __plugin/__package and validates options against the plugin's schema.
export function syntheticConfigFromSelection(opts: {
	selectedPlugins: string[];
	available: DiscoveredPlugin[];
	app: { name: string; domain: string };
	perPluginOptions?: Map<string, Record<string, unknown>>;
}): StackConfig {
	const configs: PluginConfig[] = [];
	for (const name of opts.selectedPlugins) {
		const info = opts.available.find((p) => p.name === name);
		if (!info) continue;
		const pluginOpts = opts.perPluginOptions?.get(name) ?? {};
		// factory is callable — invoking it validates options and returns
		// the PluginConfig entry defineConfig expects.
		const cfg = info.factory(pluginOpts);
		configs.push(cfg);
	}
	return defineConfig({
		app: { name: opts.app.name, domain: opts.app.domain },
		plugins: configs,
	});
}
