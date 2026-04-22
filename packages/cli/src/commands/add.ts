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
	dependencyNames,
	loadAvailablePlugins,
} from "#lib/discovery";
import { ConfigLoadError, MissingPluginError } from "#lib/errors";
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

	const packageName = pluginInfo.cli.package;
	const cwd = process.cwd();

	let existingConfig: Awaited<ReturnType<typeof loadConfig>> | null = null;
	try {
		existingConfig = await loadConfig(configPath);
	} catch (err) {
		if (!(err instanceof ConfigLoadError)) throw err;
	}

	let hasPlugin = false;
	if (existingConfig) {
		hasPlugin = existingConfig.plugins.some((p) => p.__plugin === pluginName);
		for (const req of dependencyNames(pluginInfo)) {
			if (!existingConfig.plugins.some((p) => p.__plugin === req)) {
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

	let answers: Record<string, unknown> = {};

	// Build a synthetic config that contains the existing plugins PLUS the
	// new target plugin. This matches what the consumer's config will look
	// like after `add` completes, so slot resolution sees real siblings.
	const existingPluginNames = existingConfig
		? existingConfig.plugins.map((p) => p.__plugin)
		: [];
	const mergedSelection = [...existingPluginNames];
	if (!mergedSelection.includes(pluginName)) mergedSelection.push(pluginName);

	const existingOptions = new Map<string, Record<string, unknown>>();
	if (existingConfig) {
		for (const p of existingConfig.plugins) {
			existingOptions.set(
				p.__plugin,
				(p.options as Record<string, unknown>) ?? {},
			);
		}
	}

	const nonInteractive = !process.stdin.isTTY;
	const app = existingConfig?.app ?? {
		name: "app",
		domain: "example.com",
	};

	// Build the graph against the merged selection. Every plugin runs — but
	// we filter prompts / scaffolds / deps to the target plugin.
	try {
		const synthetic = syntheticConfigFromSelection({
			selectedPlugins: mergedSelection,
			available: [
				...available,
				// The consumer config may have plugins not in `loadAvailablePlugins`
				// (third-party). Fall through to the factory on those — but without
				// loading them we can't contribute, so stick to first-party here.
			],
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

		// Prompts — run only the target plugin's contributions.
		const allPrompts = await graph.resolve(cliSlots.initPrompts);
		for (const spec of allPrompts) {
			if (spec.plugin !== pluginName) continue;
			answers = nonInteractive ? {} : await spec.ask({}, {});
		}

		// Scaffolds / deps / gitignore — target plugin only (by spec.plugin).
		const [scaffolds, _initDeps, _initDevDeps, gitignore] = await Promise.all([
			graph.resolve(cliSlots.initScaffolds),
			graph.resolve(cliSlots.initDeps),
			graph.resolve(cliSlots.initDevDeps),
			graph.resolve(cliSlots.gitignore),
		]);

		const scopedScaffolds = scaffolds.filter((s) => s.plugin === pluginName);
		const created = await writeScaffoldSpecs(scopedScaffolds, cwd);
		announceCreated(created);

		// Only add deps contributed by the target plugin. `auto-contributions`
		// on `plugin()` stamps these from `definition.dependencies` /
		// `devDependencies`, so deps from sibling plugins would accidentally
		// get re-added if we didn't filter. We match by walking the target's
		// contributions explicitly.
		const targetDeps = pluginInfo.cli.dependencies;
		const targetDevDeps = pluginInfo.cli.devDependencies;
		const scopedDeps: Record<string, string> = {
			...targetDeps,
			...targetDevDeps,
		};
		// Ensure the plugin package itself is listed.
		scopedDeps[packageName] ??= "latest";
		patchPackageJson(cwd, { dependencies: scopedDeps });

		if (gitignore.length > 0) {
			// Scoped-ish: every plugin that wanted gitignore adds its own
			// entries. Unioned entries are fine — `ensureGitignore` dedupes.
			ensureGitignore(...pluginInfo.cli.gitignore);
		}
	} catch (err) {
		log.warn(
			`Could not load ${packageName} — it will be set up after install: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	// Mutate stack.config.ts via magicast — preserves comments/formatting.
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

// Helper re-export used by init; kept import-local for readability.
export { defineConfig };
