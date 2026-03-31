import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { authSchemaPath, generateAuthSchema } from "#auth/generate";
import { getLocalD1Path } from "#d1/miniflare";
import type { DatabaseConfig } from "#kit/config";

const DB_KIT_DIR = ".db-kit";
const DRIZZLE_CONFIG = "drizzle.config.mjs";

function ensureDir(): void {
	const dir = join(process.cwd(), DB_KIT_DIR);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function configPath(): string {
	return join(DB_KIT_DIR, DRIZZLE_CONFIG);
}

function writeConfig(obj: Record<string, unknown>): void {
	ensureDir();
	writeFileSync(
		join(process.cwd(), DB_KIT_DIR, DRIZZLE_CONFIG),
		`export default ${JSON.stringify(obj, null, 2)};\n`,
	);
}

function drizzleKit(...args: string[]): boolean {
	const result = spawnSync("npx", ["drizzle-kit", ...args], {
		stdio: "inherit",
	});
	return result.status === 0;
}

function schemaList(config: DatabaseConfig): string[] {
	const schemas = [config.schema];
	if (config.auth) {
		const path = authSchemaPath();
		if (existsSync(path)) schemas.push(path);
	}
	return schemas;
}

export function localDbUrl(config: DatabaseConfig): string {
	if (config.dialect === "sqlite") return resolve(config.path);
	return getLocalD1Path(config.databaseId, config.wranglerDir);
}

export function ensureAuthSchema(config: DatabaseConfig): boolean {
	if (!config.auth) return true;
	console.log("Generating auth schema...");
	return generateAuthSchema(config.auth);
}

export function push(config: DatabaseConfig): boolean {
	writeConfig({
		dialect: "sqlite",
		schema: schemaList(config),
		dbCredentials: { url: localDbUrl(config) },
	});
	return drizzleKit("push", "--config", configPath(), "--force");
}

export function generate(config: DatabaseConfig): boolean {
	writeConfig({
		dialect: "sqlite",
		schema: schemaList(config),
		out: config.migrations,
	});
	return drizzleKit("generate", "--config", configPath());
}

export function migrate(config: DatabaseConfig): boolean {
	let dbCredentials: Record<string, string>;

	if (config.dialect === "d1") {
		const creds = d1RemoteCredentials(config);
		if (!creds) return false;
		dbCredentials = creds;
	} else {
		dbCredentials = { url: resolve(config.path) };
	}

	writeConfig({
		dialect: "sqlite",
		...(config.dialect === "d1" && { driver: "d1-http" }),
		out: config.migrations,
		dbCredentials,
	});

	return drizzleKit("migrate", "--config", configPath());
}

export function startStudio(config: DatabaseConfig): ChildProcess {
	writeConfig({
		dialect: "sqlite",
		schema: schemaList(config),
		dbCredentials: { url: localDbUrl(config) },
	});

	const port = String(config.studioPort ?? 4983);

	return spawn(
		"npx",
		["drizzle-kit", "studio", "--config", configPath(), "--port", port],
		{ stdio: "inherit" },
	);
}

function d1RemoteCredentials(
	config: Extract<DatabaseConfig, { dialect: "d1" }>,
): Record<string, string> | null {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const token = process.env.CLOUDFLARE_D1_TOKEN;
	if (!accountId || !token) {
		console.error(
			"Required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN",
		);
		return null;
	}
	return { accountId, databaseId: config.databaseId, token };
}
