import { resolve } from "node:path";
import type { StackConfig } from "@fcalell/config";
import { ensureDeps } from "#drizzle/deps";

export async function loadConfig(configPath: string): Promise<StackConfig> {
	const resolved = resolve(configPath);

	ensureDeps(resolved);

	const mod = await import(resolved);
	const config: unknown = mod.default;

	if (!isStackConfig(config)) {
		console.error(`Invalid config at ${resolved}`);
		process.exit(1);
	}

	return config;
}

function isStackConfig(value: unknown): value is StackConfig {
	if (typeof value !== "object" || value === null) return false;
	if (!("db" in value) || typeof value.db !== "object" || value.db === null)
		return false;
	if (!("dialect" in value.db)) return false;
	return value.db.dialect === "d1" || value.db.dialect === "sqlite";
}
