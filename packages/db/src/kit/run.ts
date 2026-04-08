import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { authSchemaPath, generateAuthSchema } from "#auth/generate";
import { getLocalD1Path } from "#d1/miniflare";
import {
	type AuthPolicy,
	type DatabaseConfig,
	getMigrationsPath,
	getSchemaPath,
} from "#kit/config";

const DB_KIT_DIR = ".db-kit";
const DRIZZLE_CONFIG = "drizzle.config.mjs";

function ensureDir(): void {
	const dir = join(process.cwd(), DB_KIT_DIR);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
		ensureGitignore();
	}
}

export function ensureGitignore(): boolean {
	const gitignorePath = join(process.cwd(), ".gitignore");
	const entry = ".db-kit";

	if (existsSync(gitignorePath)) {
		const content = readFileSync(gitignorePath, "utf-8");
		if (content.includes(entry)) return false;
		appendFileSync(gitignorePath, `\n${entry}\n`);
	} else {
		writeFileSync(gitignorePath, `${entry}\n`);
	}
	return true;
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
	const schemas = [getSchemaPath(config)];
	if (config.auth) {
		const path = authSchemaPath();
		if (existsSync(path)) schemas.push(path);
	}
	return schemas;
}

function discoverWranglerDir(): string {
	const cwd = process.cwd();

	// Check current directory
	if (existsSync(join(cwd, ".wrangler"))) return cwd;

	// Check sibling directories
	const parent = resolve(cwd, "..");
	if (existsSync(parent)) {
		for (const entry of readdirSync(parent, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const candidate = join(parent, entry.name, ".wrangler");
			if (existsSync(candidate)) return join(parent, entry.name);
		}
	}

	// Check parent directory
	if (existsSync(join(parent, ".wrangler"))) return parent;

	throw new Error(
		"Could not find .wrangler directory. Run wrangler dev first, or ensure .wrangler exists in a sibling/parent directory.",
	);
}

export function localDbUrl(config: DatabaseConfig): string {
	if (config.dialect === "sqlite") return resolve(config.path);
	const wranglerDir = discoverWranglerDir();
	return getLocalD1Path(config.databaseId, wranglerDir);
}

function getAuthPolicy(config: DatabaseConfig): AuthPolicy | null {
	return config.auth ?? null;
}

export function ensureAuthSchema(config: DatabaseConfig): boolean {
	const policy = getAuthPolicy(config);
	if (!policy) return true;
	console.log("Generating auth schema...");
	return generateAuthSchema(policy);
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
		out: getMigrationsPath(config),
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
		out: getMigrationsPath(config),
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
