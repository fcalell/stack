import { resolve } from "node:path";
import { log } from "@clack/prompts";
import type { StackConfig } from "#config";

export async function loadConfig(configPath: string): Promise<StackConfig> {
	const resolved = resolve(configPath);

	let mod: Record<string, unknown>;
	try {
		mod = await import(resolved);
	} catch (err) {
		log.error(
			`Could not load config at ${resolved}: ${err instanceof Error ? err.message : String(err)}`,
		);
		process.exit(1);
	}

	const config: unknown = mod.default;

	if (!isStackConfig(config)) {
		log.error(`Invalid config at ${resolved}`);
		process.exit(1);
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
