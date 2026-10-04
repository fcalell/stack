import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { intro, log, note, outro } from "@clack/prompts";
import {
	defineConfig,
	type PluginConfig,
	type StackConfig,
} from "../config.ts";
import { buildGraphFromDiscovered } from "../lib/build-graph.ts";
import { cliSlots } from "../lib/cli-slots.ts";
import {
	type ChooseRequirement,
	type DiscoveredPlugin,
	FIRST_PARTY_PLUGINS,
	loadInstalledPlugins,
	PLUGIN_NAMES,
	resolveRequiresClosure,
	validateDependencies,
} from "../lib/discovery.ts";
import { MissingPluginError, StackError } from "../lib/errors.ts";
import { installStack, stackWorkspaceRoot } from "../lib/install.ts";
import { pluginDependencies } from "../lib/plugin-dependencies.ts";
import { ask, choose, createPromptContext, multi } from "../lib/prompt.ts";
import {
	announceCreated,
	ensureGitignore,
	patchPackageJson,
	writeIfMissingString,
	writeScaffoldSpecs,
} from "../lib/scaffold.ts";
import { stackPluginSpecs } from "../lib/stack-packages.ts";
import { biomeTemplate } from "../templates/biome.ts";
import { claudeMdTemplate } from "../templates/claude-md.ts";
import { editorconfigTemplate } from "../templates/editorconfig.ts";
import { gitignoreTemplate } from "../templates/gitignore.ts";
import { packageJsonTemplate } from "../templates/package-json.ts";
import { stackConfigTemplate } from "../templates/stack-config.ts";
import { tsconfigLayout, tsconfigTemplate } from "../templates/tsconfig.ts";

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

interface Selection {
	plugins: string[];
	appName: string;
	domain: string;
	nonInteractive: boolean;
}

async function run(dir: string, options: InitOptions): Promise<void> {
	intro(`stack init ${basename(dir)}`);

	const flagDriven =
		options.plugins !== undefined ||
		options.domain !== undefined ||
		options.name !== undefined ||
		options.yes === true;
	const nonInteractive = flagDriven || !process.stdin.isTTY;

	let picked: string[] = [];
	let appName = options.name ?? basename(dir);
	let domain = options.domain ?? "example.com";

	if (options.plugins !== undefined) {
		picked = validatePluginNames(options.plugins);
	} else if (!nonInteractive) {
		picked = await multi(
			"Which plugins do you want?",
			FIRST_PARTY_PLUGINS.map((p) => ({
				label: `${p.name}  (${p.package})`,
				value: p.name,
			})),
		);
		appName = await ask("App name", basename(dir));
		domain = await ask("Domain", "example.com");
	}

	const plugins = await installPlugins(
		dir,
		picked,
		nonInteractive ? undefined : chooseRequirement,
	);

	// Slots are matched by identity and the installed plugins import the
	// app's own `@fcalell/cli`, so the scaffold runs in that copy, which is
	// this one whenever the app's `stack` runs init.
	const installedCli = createRequire(join(dir, "package.json")).resolve(
		"@fcalell/cli",
	);
	const { scaffold } = (await import(
		new URL("./commands/init.js", pathToFileURL(installedCli)).href
	)) as typeof import("./init.ts");
	await scaffold(dir, { plugins, appName, domain, nonInteractive });
}

// Writes `package.json` with the picked plugins and installs, until every
// plugin a picked one requires is installed too: a plugin's `requires` is
// known only once it is loaded. A one-of requirement the selection does not
// meet is asked when `pick` is given and takes its first plugin otherwise;
// the finished closure is validated, so a selection with two of a one-of
// fails before the scaffold.
async function installPlugins(
	dir: string,
	picked: string[],
	pick?: ChooseRequirement,
): Promise<string[]> {
	const ownsManifest = !existsSync("package.json");
	const workspace = stackWorkspaceRoot(dir) !== null;
	let plugins = picked;
	for (;;) {
		if (ownsManifest) {
			writeFileSync(
				"package.json",
				packageJsonTemplate({ name: basename(dir), plugins, workspace }),
			);
		} else {
			patchPackageJson(dir, { dependencies: stackPluginSpecs(plugins) });
		}
		installStack(dir);
		const installed = await loadInstalledPlugins(plugins);
		const closure = await resolveRequiresClosure(plugins, installed, pick);
		if (closure.length === plugins.length) {
			validateDependencies(installed);
			if (ownsManifest) announceCreated(["package.json"]);
			return closure;
		}
		for (const name of closure) {
			if (!plugins.includes(name)) {
				log.warn(`${name} added automatically (required by your selection).`);
			}
		}
		plugins = closure;
	}
}

export async function scaffold(
	dir: string,
	{ plugins: selectedPlugins, appName, domain, nonInteractive }: Selection,
): Promise<void> {
	const available = await loadInstalledPlugins(selectedPlugins);

	// Discovered plugins carry the factory + an `options: {}` placeholder.
	// We don't yet have per-plugin options — prompts produce them. The
	// slot graph reads `options` from `discovered`, not from a StackConfig,
	// so skipping the synthetic factory call here avoids Zod errors for
	// plugins whose options can't default to `{}` (e.g. db requires a
	// dialect).
	const selectedDiscovered = available.filter((p) =>
		selectedPlugins.includes(p.name),
	);

	// Resolve prompts + the CLI-owned tsconfig contributions via the slot
	// graph before writing any base scaffold. Per-plugin options aren't known
	// yet (prompts produce them below), but `cliSlots.tsconfigPaths` /
	// `cliSlots.tsconfigTypes` contributions never read `ctx.options` — a
	// plugin's own presence in the graph is the gate — so resolving off the
	// pre-prompt graph is safe. `tsconfigTemplate` itself stays domain-agnostic:
	// it only decides *where* the contributed paths/types land (single config
	// vs. the split's app/worker projects), never *what* they contain.
	const { graph: promptGraph } = buildGraphFromDiscovered({
		discovered: selectedDiscovered,
		app: { name: appName, domain },
		cwd: dir,
	});
	const promptSpecs = await promptGraph.resolve(cliSlots.initPrompts);
	const tsconfigPaths = await promptGraph.resolve(cliSlots.tsconfigPaths);
	const tsconfigTypes = await promptGraph.resolve(cliSlots.tsconfigTypes);

	// Scaffold base files — CLI-owned, not plugin-contributed.
	const baseEntries: Array<[string, string]> = [
		...tsconfigTemplate({
			...tsconfigLayout(selectedPlugins),
			procedurePaths: tsconfigPaths,
			nativeTypes: tsconfigTypes,
		}),
		[".gitignore", gitignoreTemplate({ plugins: selectedPlugins })],
	];
	// An app in stack's own workspace lints and formats under the checkout's
	// root configs: Biome refuses a second root config below it.
	if (!stackWorkspaceRoot(dir)) {
		baseEntries.push(
			["biome.json", biomeTemplate()],
			[".editorconfig", editorconfigTemplate()],
		);
	}
	const createdBase: string[] = [];
	for (const [path, content] of baseEntries) {
		if (writeIfMissingString(path, content)) createdBase.push(path);
	}
	announceCreated(createdBase);
	const written = [...createdBase];
	writeClaudeMd();

	const pluginAnswers = new Map<string, Record<string, unknown>>();
	for (const p of selectedPlugins) pluginAnswers.set(p, {});

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
		written.push("stack.config.ts");
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

	const [scaffolds, dependencies, gitignore, packageJsonFields] =
		await Promise.all([
			initGraph.resolve(cliSlots.initScaffolds),
			pluginDependencies(initGraph, selectedPlugins),
			initGraph.resolve(cliSlots.gitignore),
			initGraph.resolve(cliSlots.packageJsonFields),
		]);

	const created = await writeScaffoldSpecs(scaffolds, dir);
	announceCreated(created);
	written.push(...created);

	patchPackageJson(dir, { ...dependencies, fields: packageJsonFields });
	if (gitignore.length > 0) ensureGitignore(...gitignore);
	installStack(dir);
	formatWritten(dir, written);

	// Run the real generate path against the config we just wrote — this is
	// the same code `stack generate` runs.
	try {
		const { generate } = await import("./generate.ts");
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

	note("stack dev", "Next steps");
	outro("Done!");
}

const chooseRequirement: ChooseRequirement = (req, plugin) =>
	choose(`${plugin} requires exactly one of these plugins`, req.oneOf);

function validatePluginNames(requested: string[]): string[] {
	const valid = new Set<string>(PLUGIN_NAMES);
	const unknown = requested.filter((n) => !valid.has(n));
	if (unknown.length > 0) {
		throw new MissingPluginError(
			unknown[0] ?? "",
			`Unknown plugin(s): ${unknown.join(", ")}. Available: ${PLUGIN_NAMES.join(", ")}`,
		);
	}
	return requested;
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

// The templates write plain `JSON.stringify` and unsorted imports; the
// app's own Biome lays out what init wrote, so its first check changes
// nothing. A file type Biome does not handle (Markdown, YAML) is skipped.
function formatWritten(dir: string, files: string[]): void {
	if (files.length === 0) return;
	const result = spawnSync(
		"pnpm",
		[
			"exec",
			"biome",
			"check",
			"--write",
			"--files-ignore-unknown=true",
			"--no-errors-on-unmatched",
			...files,
		],
		{ cwd: dir, stdio: "inherit" },
	);
	if (result.status !== 0) {
		throw new StackError(
			`biome check failed on the scaffold (exit ${result.status ?? "signal"}).`,
			"INIT_FORMAT_FAILED",
		);
	}
}

// The consumer's `CLAUDE.md` imports the guide's index.
function writeClaudeMd(): void {
	const path = "CLAUDE.md";
	const content = claudeMdTemplate(
		existsSync(path) ? readFileSync(path, "utf8") : null,
	);
	if (content === null) return;
	writeFileSync(path, content);
	log.success(`Imported stack's guide in ${path}`);
}
