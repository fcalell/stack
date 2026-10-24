import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { StackConfig } from "../config.ts";
import { ConfigLoadError } from "./errors.ts";

let reloads = 0;

// The config file's import URL. ESM caches a module by URL, so a reload adds a
// query the cache has not seen; the config's own imports stay cached.
export function configUrl(configPath: string, reload = false): string {
	const url = pathToFileURL(resolve(configPath)).href;
	return reload ? `${url}?t=${Date.now()}-${reloads++}` : url;
}

// `reload` re-evaluates the config file instead of answering the cached
// module, for a config edited while the process lives (`stack dev`).
export async function loadConfig(
	configPath: string,
	{ reload = false }: { reload?: boolean } = {},
): Promise<StackConfig> {
	const resolved = resolve(configPath);

	let mod: Record<string, unknown>;
	try {
		mod = await import(configUrl(configPath, reload));
	} catch (err) {
		throw new ConfigLoadError(
			`Could not load config at ${resolved}: ${err instanceof Error ? err.message : String(err)}`,
			err,
		);
	}

	const config: unknown = mod.default;

	if (!isStackConfig(config)) {
		throw new ConfigLoadError(`Invalid config at ${resolved}`);
	}

	return config;
}

function isStackConfig(value: unknown): value is StackConfig {
	if (typeof value !== "object" || value === null) return false;
	if (!("plugins" in value) || !Array.isArray(value.plugins)) return false;
	if (!("validate" in value) || typeof value.validate !== "function")
		return false;
	return true;
}
