import { readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { log, outro } from "@clack/prompts";
import { buildGraphFromDiscovered } from "#lib/build-graph";
import { cliSlots } from "#lib/cli-slots";
import { loadConfig } from "#lib/config";
import { removePluginCall } from "#lib/config-writer";
import { type DiscoveredPlugin, discoverPlugins } from "#lib/discovery";
import { MissingPluginError, StackError } from "#lib/errors";

// Remove `keys` from `pkg[field]` (when it's a plain object). Returns true if
// `pkg` was modified at all (any key removal AND/OR a whole-field deletion
// when pruning empties the object). The caller uses the boolean to decide
// whether to write package.json back — so it must capture every modification,
// including the case where the field was already an empty `{}` we cleaned up.
//
// Non-object fields are left untouched (we only know how to prune
// plugin-contributed records of names→strings; lists, scalars, etc. aren't
// our domain here).
export function pruneObjectField(
	pkg: Record<string, unknown>,
	field: string,
	keys: ReadonlySet<string>,
): boolean {
	const current = pkg[field];
	if (!current || typeof current !== "object" || Array.isArray(current)) {
		return false;
	}
	const obj = current as Record<string, string>;
	let changed = false;
	for (const key of keys) {
		if (key in obj) {
			delete obj[key];
			changed = true;
		}
	}
	if (Object.keys(obj).length === 0) {
		delete pkg[field];
		// Whole-field deletion is itself a change worth persisting, even when
		// no key matched (e.g. a stray empty `"dependencies": {}` left behind
		// by a previous tool).
		return true;
	}
	return changed;
}

export async function remove(
	pluginName: string,
	configPath: string,
): Promise<void> {
	const config = await loadConfig(configPath);
	const cwd = process.cwd();

	const targetEntry = config.plugins.find((p) => p.__plugin === pluginName);
	if (!targetEntry) {
		throw new MissingPluginError(
			pluginName,
			`Plugin "${pluginName}" is not in your config.`,
		);
	}

	// We try to load every plugin in the config so we can (a) check for
	// dependents and (b) resolve the target's removeFiles / removeDeps
	// contributions through the slot graph. Discovery may fail for one of
	// two reasons: the target itself isn't installed (the user is trying to
	// remove a broken plugin — should still succeed), or some *other*
	// plugin isn't installed (a degraded environment we can still remove
	// from). In both cases we fall back to a "minimal" path that knows only
	// what the consumer's `stack.config.ts` directly tells us.
	let discovered: DiscoveredPlugin[] | null = null;
	try {
		discovered = await discoverPlugins(config);
	} catch (err) {
		log.warn(
			`Could not load all plugins for dependency check: ${
				err instanceof Error ? err.message : String(err)
			}`,
		);
		log.warn(
			`Proceeding with a degraded removal of "${pluginName}" — only the package and the config call will be cleaned up. Run \`stack generate\` after fixing the workspace.`,
		);
	}

	// Any sibling that declares `requires: [pluginName]` blocks removal.
	// Only enforceable when discovery succeeded; in the degraded path we
	// can't see plugin metadata, so we trust the consumer.
	if (discovered) {
		const dependents = discovered.filter((p) =>
			p.cli.requires.includes(pluginName),
		);
		if (dependents.length > 0) {
			const names = dependents.map((p) => p.name).join(", ");
			throw new StackError(
				`Cannot remove "${pluginName}" — required by: ${names}. Remove those first.`,
				"PLUGIN_HAS_DEPENDENTS",
			);
		}
	}

	const plugin = discovered?.find((p) => p.name === pluginName) ?? null;

	// Two sources of "what to remove":
	//   1. The slot graph (when the plugin loaded) — gives us the plugin's
	//      contributed removeFiles / removeDeps / removeDevDeps.
	//   2. The plugin's __package — always known from the consumer's config,
	//      even when the module failed to load. We always prune this from
	//      package.json as a baseline so the package itself goes away.
	const packageName =
		plugin?.cli.package ??
		targetEntry.__package ??
		`@fcalell/plugin-${pluginName}`;

	let files: string[] = [];
	let contributedDeps: string[] = [];
	let contributedDevDeps: string[] = [];

	if (plugin) {
		// Build a graph with ONLY the target plugin so removeFiles / removeDeps
		// are scoped to its contributions. Other plugins can still contribute
		// removals for OTHER plugins, but the common case is self-scoped.
		const single = [plugin] satisfies DiscoveredPlugin[];
		const { graph } = buildGraphFromDiscovered({
			discovered: single,
			app: config.app,
			cwd,
		});

		[files, contributedDeps, contributedDevDeps] = await Promise.all([
			graph.resolve(cliSlots.removeFiles),
			graph.resolve(cliSlots.removeDeps),
			graph.resolve(cliSlots.removeDevDeps),
		]);
	}

	// Delete files (directories too — `rm -rf` semantics). Empty in the
	// degraded path; that's OK — the user can clean up by hand once their
	// workspace is fixed.
	for (const path of files) {
		try {
			await rm(resolve(cwd, path), { recursive: true, force: true });
		} catch {}
	}
	if (files.length > 0) {
		log.info(`Removed files: ${files.join(", ")}`);
	}

	// Strip package.json dependencies contributed by the plugin in a single
	// pass per field: gather every key to remove (plugin's contributed
	// removals + the plugin package itself), prune them, and drop the field
	// entirely if it ends up empty. The same shape applies to any other
	// plugin-contributed object on package.json (e.g. `scripts`) — pruning
	// must always be idempotent and never leave behind empty `{}`.
	const pkgPath = join(cwd, "package.json");
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<
			string,
			unknown
		>;
		let changed = false;
		const removalsByField: Record<string, ReadonlySet<string>> = {
			dependencies: new Set([...contributedDeps, packageName]),
			devDependencies: new Set([...contributedDevDeps, packageName]),
		};
		for (const [field, removals] of Object.entries(removalsByField)) {
			if (pruneObjectField(pkg, field, removals)) changed = true;
		}
		if (changed) {
			writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
		}
	} catch {}

	const fullConfigPath = join(cwd, configPath);
	await removePluginCall(fullConfigPath, pluginName);

	const label = plugin?.cli.label ?? pluginName;

	// Skip the regenerate pass when we couldn't fully discover the workspace —
	// `generate` would just hit the same load error and overwrite our useful
	// log line with a confusing "could not regenerate" warning.
	if (discovered) {
		const { generate } = await import("#commands/generate");
		try {
			await generate(configPath);
		} catch {
			log.warn("Could not regenerate — run `stack generate` manually.");
		}
	}

	outro(`Removed ${label}`);
}
