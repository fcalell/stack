import { runCommand } from "./exec";

// The generated wrangler config and the dev persistence dir. Every local
// wrangler invocation (dev, migrations apply, d1 execute) must agree on BOTH so
// schema, seed, and the running worker share one miniflare D1. `wrangler dev`
// is spawned with the same `--config`/`--persist-to` in plugin-cloudflare.
export const WRANGLER_CONFIG = ".stack/wrangler.toml";
export const LOCAL_PERSIST = ".stack/dev";

// Flags that target the local miniflare-backed D1 that `wrangler dev` reads.
export function localD1Flags(): string[] {
	return [
		"--local",
		"--persist-to",
		LOCAL_PERSIST,
		"--config",
		WRANGLER_CONFIG,
	];
}

// Flags that target the deployed remote D1.
export function remoteD1Flags(): string[] {
	return ["--remote", "--config", WRANGLER_CONFIG];
}

export function migrationsApply(
	cwd: string,
	databaseName: string,
	target: "local" | "remote",
): void {
	const flags = target === "local" ? localD1Flags() : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "migrations", "apply", databaseName, ...flags],
		cwd,
	);
}

export function executeSql(
	cwd: string,
	databaseName: string,
	target: "local" | "remote",
	command: string,
): void {
	const flags = target === "local" ? localD1Flags() : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "execute", databaseName, ...flags, "--command", command],
		cwd,
	);
}

export function executeSqlFile(
	cwd: string,
	databaseName: string,
	target: "local" | "remote",
	file: string,
): void {
	const flags = target === "local" ? localD1Flags() : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "execute", databaseName, ...flags, "--file", file],
		cwd,
	);
}
