import { resolve } from "node:path";
import type { StackConfig } from "#config";
import { ConfigLoadError } from "#lib/errors";

export async function loadConfig(configPath: string): Promise<StackConfig> {
	const resolved = resolve(configPath);

	let mod: Record<string, unknown>;
	try {
		mod = await import(resolved);
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
