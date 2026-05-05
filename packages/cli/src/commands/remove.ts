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
// anything changed. If pruning empties the object, the field is deleted from
// `pkg` so we never leave a `"dependencies": {}` orphan behind. Non-object
// fields are left untouched (we only know how to prune plugin-contributed
// records of names→strings; lists, scalars, etc. aren't our domain here).
function pruneObjectField(
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
		return changed || field in pkg;
	}
	return changed;
}

export async function remove(
	pluginName: string,
	configPath: string,
): Promise<void> {
	const config = await loadConfig(configPath);
	const cwd = process.cwd();

	const hasPlugin = config.plugins.some((p) => p.__plugin === pluginName);
	if (!hasPlugin) {
		throw new MissingPluginError(
			pluginName,
			`Plugin "${pluginName}" is not in your config.`,
		);
	}

	const discovered = await discoverPlugins(config);

	// Any sibling that declares `requires: [pluginName]` blocks removal.
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

	const plugin = discovered.find((p) => p.name === pluginName);

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

		const [files, deps, devDeps] = await Promise.all([
			graph.resolve(cliSlots.removeFiles),
			graph.resolve(cliSlots.removeDeps),
			graph.resolve(cliSlots.removeDevDeps),
		]);

		// Delete files (directories too — `rm -rf` semantics).
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
				dependencies: new Set([...deps, plugin.cli.package]),
				devDependencies: new Set([...devDeps, plugin.cli.package]),
			};
			for (const [field, removals] of Object.entries(removalsByField)) {
				if (pruneObjectField(pkg, field, removals)) changed = true;
			}
			if (changed) {
				writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
			}
		} catch {}
	}

	const fullConfigPath = join(cwd, configPath);
	await removePluginCall(fullConfigPath, pluginName);

	const label = plugin?.cli.label ?? pluginName;

	const { generate } = await import("#commands/generate");
	try {
		await generate(configPath);
	} catch {
		log.warn("Could not regenerate — run `stack generate` manually.");
	}

	outro(`Removed ${label}`);
}
