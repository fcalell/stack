import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { log } from "@clack/prompts";
import type { StackConfig } from "@fcalell/config";
import { getMigrationsPath, getSchemaPath } from "@fcalell/db";
import { authSchemaPath, generateAuthSchema } from "#drizzle/auth-schema";
import { getLocalD1Path } from "#drizzle/miniflare";

const DB_KIT_DIR = ".db-kit";
const DRIZZLE_CONFIG = "drizzle.config.mjs";

function ensureDir(): void {
	const dir = join(process.cwd(), DB_KIT_DIR);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
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

function schemaList(config: StackConfig): string[] {
	const schemas = [getSchemaPath(config.db)];
	if (config.auth) {
		const path = authSchemaPath();
		if (existsSync(path)) schemas.push(path);
	}
	return schemas;
}

function discoverWranglerDir(): string {
	const cwd = process.cwd();

	if (existsSync(join(cwd, ".wrangler"))) return cwd;

	const parent = resolve(cwd, "..");
	if (existsSync(parent)) {
		for (const entry of readdirSync(parent, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const candidate = join(parent, entry.name, ".wrangler");
			if (existsSync(candidate)) return join(parent, entry.name);
		}
	}

	if (existsSync(join(parent, ".wrangler"))) return parent;

	// Fall back to cwd — getLocalD1Path will create the directory structure
	return cwd;
}

export function localDbUrl(config: StackConfig): string {
	if (config.db.dialect === "sqlite") return resolve(config.db.path);
	const wranglerDir = discoverWranglerDir();
	return getLocalD1Path(config.db.databaseId, wranglerDir);
}

export function ensureAuthSchema(config: StackConfig): boolean {
	if (!config.auth) return true;
	log.step("Generating auth schema...");
	return generateAuthSchema(config.auth);
}

export function push(config: StackConfig): boolean {
	writeConfig({
		dialect: "sqlite",
		schema: schemaList(config),
		dbCredentials: { url: localDbUrl(config) },
	});
	return drizzleKit("push", "--config", configPath(), "--force");
}

export function generate(config: StackConfig): boolean {
	writeConfig({
		dialect: "sqlite",
		schema: schemaList(config),
		out: getMigrationsPath(config.db),
	});
	return drizzleKit("generate", "--config", configPath());
}

export function migrate(config: StackConfig): boolean {
	let dbCredentials: Record<string, string>;

	if (config.db.dialect === "d1") {
		const creds = d1RemoteCredentials(config.db);
		if (!creds) return false;
		dbCredentials = creds;
	} else {
		dbCredentials = { url: resolve(config.db.path) };
	}

	writeConfig({
		dialect: "sqlite",
		...(config.db.dialect === "d1" && { driver: "d1-http" }),
		out: getMigrationsPath(config.db),
		dbCredentials,
	});

	return drizzleKit("migrate", "--config", configPath());
}

export function writeStudioConfig(config: StackConfig): string[] {
	writeConfig({
		dialect: "sqlite",
		schema: schemaList(config),
		dbCredentials: { url: localDbUrl(config) },
	});
	const port = String(config.dev?.studioPort ?? 4983);
	return ["drizzle-kit", "studio", "--config", configPath(), "--port", port];
}

function d1RemoteCredentials(
	db: Extract<StackConfig["db"], { dialect: "d1" }>,
): Record<string, string> | null {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const token = process.env.CLOUDFLARE_D1_TOKEN;
	if (!accountId || !token) {
		log.error("Required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN");
		return null;
	}
	return { accountId, databaseId: db.databaseId, token };
}
