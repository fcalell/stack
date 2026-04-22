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

		// Strip package.json dependencies contributed by the plugin.
		const pkgPath = join(cwd, "package.json");
		try {
			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<
				string,
				unknown
			>;
			let changed = false;
			for (const [field, names] of [
				["dependencies", deps],
				["devDependencies", devDeps],
			] as const) {
				const current = (pkg[field] ?? {}) as Record<string, string>;
				for (const name of names) {
					if (name in current) {
						delete current[name];
						changed = true;
					}
				}
				if (Object.keys(current).length > 0) pkg[field] = current;
			}
			// Always drop the plugin package itself.
			for (const field of ["dependencies", "devDependencies"] as const) {
				const current = (pkg[field] ?? {}) as Record<string, string>;
				if (plugin.cli.package in current) {
					delete current[plugin.cli.package];
					changed = true;
				}
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
