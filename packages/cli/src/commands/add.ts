import { existsSync } from "node:fs";
import { join } from "node:path";
import { log, outro } from "@clack/prompts";
import { builders } from "magicast";
import { syntheticConfigFromSelection } from "#commands/init";
import { defineConfig } from "#config";
import { buildGraphFromDiscovered } from "#lib/build-graph";
import { cliSlots } from "#lib/cli-slots";
import { loadConfig } from "#lib/config";
import { editConfig } from "#lib/config-writer";
import {
	type DiscoveredPlugin,
	loadAvailablePlugins,
	resolveRequiresClosure,
} from "#lib/discovery";
import { ConfigLoadError, MissingPluginError } from "#lib/errors";
import { toCamelCase } from "#lib/naming";
import { createPromptContext } from "#lib/prompt";
import {
	announceCreated,
	ensureGitignore,
	patchPackageJson,
	writeScaffoldSpecs,
} from "#lib/scaffold";

export async function add(
	pluginName: string,
	configPath: string,
): Promise<void> {
	const available = await loadAvailablePlugins();
	const pluginInfo = available.find((p) => p.name === pluginName);
	if (!pluginInfo) {
		const availableNames = available.map((p) => p.name).join(", ");
		throw new MissingPluginError(
			pluginName,
			`Unknown plugin: "${pluginName}". Available plugins: ${availableNames}`,
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
		log.info(`${pluginInfo.cli.label} is already configured.`);
		return;
	}

	// Auto-pull the transitive `requires` closure — adding `auth` also adds
	// db/api/cloudflare when absent (and their requirements in turn), instead of
	// erroring one missing sibling at a time. Mirrors `stack init`'s auto-add.
	// The closure orders each plugin's dependencies before it; the requested
	// plugin lands last.
	const pluginsToAdd = resolveRequiresClosure([pluginName], available).filter(
		(n) => !existingNames.has(n),
	);
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

		// Scaffolds / deps / gitignore — for every added plugin (target + pulled
		// siblings), matched by the contributing plugin's name.
		const [scaffolds, _initDeps, _initDevDeps, gitignore, packageJsonFields] =
			await Promise.all([
				graph.resolve(cliSlots.initScaffolds),
				graph.resolve(cliSlots.initDeps),
				graph.resolve(cliSlots.initDevDeps),
				graph.resolve(cliSlots.gitignore),
				graph.resolve(cliSlots.packageJsonFields),
			]);

		const toAdd = new Set(pluginsToAdd);
		const created = await writeScaffoldSpecs(
			scaffolds.filter((s) => toAdd.has(s.plugin)),
			cwd,
		);
		announceCreated(created);

		const scopedDeps: Record<string, string> = {};
		for (const info of addedInfos) {
			Object.assign(
				scopedDeps,
				info.cli.dependencies,
				info.cli.devDependencies,
			);
			scopedDeps[info.cli.package] ??= "latest";
		}
		patchPackageJson(cwd, {
			dependencies: scopedDeps,
			fields: packageJsonFields,
		});

		const gitignoreEntries = addedInfos.flatMap((info) => [
			...info.cli.gitignore,
		]);
		if (gitignore.length > 0 && gitignoreEntries.length > 0) {
			ensureGitignore(...gitignoreEntries);
		}
	} catch (err) {
		log.warn(
			`Could not load plugins — they will be set up after install: ${err instanceof Error ? err.message : String(err)}`,
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

	const { generate } = await import("#commands/generate");
	try {
		await generate(configPath);
	} catch {
		log.warn("Could not run generate — run `stack generate` after install.");
	}

	outro(
		addedInfos.length <= 1
			? `Added ${pluginInfo.cli.label}`
			: `Added ${addedInfos.map((i) => i.cli.label).join(", ")}`,
	);
}

// Helper re-export used by init; kept import-local for readability.
export { defineConfig };
