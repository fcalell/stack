import { existsSync } from "node:fs";
import { join } from "node:path";
import { log, outro } from "@clack/prompts";
import { builders } from "magicast";
import { defineConfig } from "../config.ts";
import { buildGraphFromDiscovered } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import { loadConfig } from "../lib/config.ts";
import { editConfig } from "../lib/config-writer.ts";
import {
	type DiscoveredPlugin,
	loadInstalledPlugins,
	PLUGIN_NAMES,
	resolveRequiresClosure,
} from "../lib/discovery.ts";
import { ConfigLoadError, MissingPluginError } from "../lib/errors.ts";
import type { Graph } from "../lib/graph.ts";
import { installStack } from "../lib/install.ts";
import { toCamelCase } from "../lib/naming.ts";
import { createPromptContext } from "../lib/prompt.ts";
import {
	announceCreated,
	ensureGitignore,
	patchPackageJson,
	writeScaffoldSpecs,
} from "../lib/scaffold.ts";
import { stackPluginSpecs } from "../lib/stack-packages.ts";
import { syntheticConfigFromSelection } from "./init.ts";

// The dependencies `stack add` writes, as `stack init` does: every
// contribution to `initDeps` and `initDevDeps`, those a plugin's options
// derive among them (expo's config plugins'), plus each added plugin's own
// package. `patchPackageJson` writes only the names the manifest lacks.
export async function addDependencies(
	graph: Graph,
	added: readonly string[],
): Promise<Record<string, string>> {
	const [deps, devDeps] = await Promise.all([
		graph.resolve(cliSlots.initDeps),
		graph.resolve(cliSlots.initDevDeps),
	]);
	return { ...deps, ...devDeps, ...stackPluginSpecs(added) };
}

export async function add(
	pluginName: string,
	configPath: string,
): Promise<void> {
	if (!new Set<string>(PLUGIN_NAMES).has(pluginName)) {
		throw new MissingPluginError(
			pluginName,
			`Unknown plugin: "${pluginName}". Available plugins: ${PLUGIN_NAMES.join(", ")}`,
		);
	}

	const cwd = process.cwd();

	let existingConfig: Awaited<ReturnType<typeof loadConfig>> | null = null;
	try {
		existingConfig = await loadConfig(configPath);
	} catch (err) {
		if (!(err instanceof ConfigLoadError)) throw err;
	}

	const existingPluginNames = existingConfig
		? existingConfig.plugins.map((p) => p.__plugin)
		: [];
	const existingNames = new Set(existingPluginNames);

	if (existingNames.has(pluginName)) {
		log.info(`${pluginName} is already configured.`);
		return;
	}

	// Install the plugin, then each plugin it requires that the app lacks: a
	// plugin's `requires` is known only once it is loaded. The closure starts
	// from the app's plugins so a one-of the app already meets adds nothing,
	// and an unmet one-of takes its first plugin.
	let pluginsToAdd = [pluginName];
	let available: DiscoveredPlugin[];
	for (;;) {
		patchPackageJson(cwd, { dependencies: stackPluginSpecs(pluginsToAdd) });
		installStack(cwd);
		available = await loadInstalledPlugins([
			...existingPluginNames,
			...pluginsToAdd,
		]);
		const closure = (
			await resolveRequiresClosure(
				[...existingPluginNames, pluginName],
				available,
			)
		).filter((n) => !existingNames.has(n));
		const grew = closure.length !== pluginsToAdd.length;
		pluginsToAdd = closure;
		if (!grew) break;
	}
	const pluginInfo = available.find((p) => p.name === pluginName);
	if (!pluginInfo) {
		throw new MissingPluginError(
			pluginName,
			`"${pluginName}" is installed but does not load.`,
		);
	}
	const addedInfos = pluginsToAdd
		.map((n) => available.find((p) => p.name === n))
		.filter((p): p is DiscoveredPlugin => p !== undefined);
	const siblings = pluginsToAdd.filter((n) => n !== pluginName);
	if (siblings.length > 0) {
		log.info(
			`${pluginInfo.cli.label} requires ${siblings.join(", ")} — ` +
				`adding ${siblings.length === 1 ? "it" : "them"} automatically.`,
		);
	}

	const nonInteractive = !process.stdin.isTTY;
	const app = existingConfig?.app ?? { name: "app", domain: "example.com" };

	// Synthetic config = existing plugins + everything we're about to add, so
	// slot resolution sees the real, complete sibling set.
	const mergedSelection = [...existingPluginNames, ...pluginsToAdd];

	const existingOptions = new Map<string, Record<string, unknown>>();
	if (existingConfig) {
		for (const p of existingConfig.plugins) {
			existingOptions.set(
				p.__plugin,
				(p.options as Record<string, unknown>) ?? {},
			);
		}
	}

	// Answers collected per newly-added plugin, keyed by plugin name.
	const answersByPlugin = new Map<string, Record<string, unknown>>();
	for (const n of pluginsToAdd) answersByPlugin.set(n, {});

	try {
		const synthetic = syntheticConfigFromSelection({
			selectedPlugins: mergedSelection,
			available,
			app,
			perPluginOptions: existingOptions,
		});

		const discovered = synthetic.plugins
			.map((cfg) => {
				const avail = available.find((a) => a.name === cfg.__plugin);
				if (!avail) return null;
				return { ...avail, options: cfg.options } satisfies DiscoveredPlugin;
			})
			.filter((d): d is DiscoveredPlugin => d !== null);

		const { graph } = buildGraphFromDiscovered({
			discovered,
			app: synthetic.app,
			cwd,
		});

		// Prompts — run each added plugin's spec through the proper adapter so
		// non-interactive mode resolves to sensible defaults (e.g. db's
		// placeholder databaseId), exactly like `stack init`.
		const promptAdapter = createPromptContext({ nonInteractive });
		const allPrompts = await graph.resolve(cliSlots.initPrompts);
		for (const spec of allPrompts) {
			if (!answersByPlugin.has(spec.plugin)) continue;
			const priors: Record<string, unknown> = {};
			for (const [p, a] of answersByPlugin.entries()) priors[p] = a;
			answersByPlugin.set(
				spec.plugin,
				await spec.ask({ prompt: promptAdapter }, priors),
			);
		}

		// Scaffolds / gitignore — for every added plugin (target + pulled
		// siblings), matched by the contributing plugin's name.
		const [scaffolds, dependencies, gitignore, packageJsonFields] =
			await Promise.all([
				graph.resolve(cliSlots.initScaffolds),
				addDependencies(graph, pluginsToAdd),
				graph.resolve(cliSlots.gitignore),
				graph.resolve(cliSlots.packageJsonFields),
			]);

		const toAdd = new Set(pluginsToAdd);
		const created = await writeScaffoldSpecs(
			scaffolds.filter((s) => toAdd.has(s.plugin)),
			cwd,
		);
		announceCreated(created);

		patchPackageJson(cwd, { dependencies, fields: packageJsonFields });
		installStack(cwd);

		const gitignoreEntries = addedInfos.flatMap((info) => [
			...info.cli.gitignore,
		]);
		if (gitignore.length > 0 && gitignoreEntries.length > 0) {
			ensureGitignore(...gitignoreEntries);
		}
	} catch (err) {
		log.warn(
			`Could not set up the plugins: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	// Mutate stack.config.ts via magicast — preserves comments/formatting.
	// Append an import + factory call for each newly-added plugin.
	const fullConfigPath = join(cwd, configPath);
	if (existsSync(fullConfigPath)) {
		await editConfig(fullConfigPath, ({ mod, config: ast }) => {
			if (!ast.plugins) ast.plugins = [];
			for (const n of pluginsToAdd) {
				const info = available.find((p) => p.name === n);
				if (!info) continue;
				const importName = toCamelCase(n);
				mod.imports.$append({
					from: info.cli.package,
					imported: importName,
					local: importName,
				});
				const answers = answersByPlugin.get(n) ?? {};
				const call =
					Object.keys(answers).length > 0
						? builders.functionCall(importName, answers)
						: builders.functionCall(importName);
				ast.plugins.push(call);
			}
		});
	}

	const { generate } = await import("./generate.ts");
	try {
		await generate(configPath);
	} catch {
		log.warn(
			"Could not run generate — fix the error, then run `stack generate`.",
		);
	}

	outro(
		addedInfos.length <= 1
			? `Added ${pluginInfo.cli.label}`
			: `Added ${addedInfos.map((i) => i.cli.label).join(", ")}`,
	);
}

// Helper re-export used by init; kept import-local for readability.
export { defineConfig };
