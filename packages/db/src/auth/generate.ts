import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AuthConfig } from "#kit/config";

const DB_KIT_DIR = ".db-kit";
const AUTH_CONFIG_FILE = "auth-config.ts";
const AUTH_SCHEMA_FILE = "auth-schema.ts";

export function authSchemaPath(): string {
	return join(process.cwd(), DB_KIT_DIR, AUTH_SCHEMA_FILE);
}

export function generateAuthSchema(auth: AuthConfig): boolean {
	const dir = join(process.cwd(), DB_KIT_DIR);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	const configPath = join(dir, AUTH_CONFIG_FILE);
	writeFileSync(configPath, buildConfigFile(auth));

	const result = spawnSync(
		"npx",
		[
			"@better-auth/cli",
			"generate",
			"--config",
			configPath,
			"--output",
			join(dir, AUTH_SCHEMA_FILE),
			"-y",
		],
		{ stdio: "inherit" },
	);

	return result.status === 0;
}

function buildConfigFile(auth: AuthConfig): string {
	const imports = [
		'import { betterAuth } from "better-auth";',
		'import { drizzleAdapter } from "better-auth/adapters/drizzle";',
		'import Database from "better-sqlite3";',
		'import { drizzle } from "drizzle-orm/better-sqlite3";',
	];

	const pluginNames: string[] = [];
	const plugins: string[] = [];

	if (auth.emailOTP) {
		pluginNames.push("emailOTP");
		plugins.push(
			"emailOTP({ sendVerificationOTP: async () => {} })",
		);
	}

	if (auth.organization) {
		pluginNames.push("organization");
		const schemaArg =
			auth.organization !== true && auth.organization.additionalFields
				? `, schema: { organization: { additionalFields: ${JSON.stringify(auth.organization.additionalFields)} } }`
				: "";
		plugins.push(
			`organization({ sendInvitationEmail: async () => {}${schemaArg} })`,
		);
	}

	if (pluginNames.length > 0) {
		imports.push(
			`import { ${pluginNames.join(", ")} } from "better-auth/plugins";`,
		);
	}

	const sessionArg = auth.session
		? `\n\tsession: ${JSON.stringify(auth.session)},`
		: "";
	const userArg = auth.user
		? `\n\tuser: ${JSON.stringify(auth.user)},`
		: "";

	return `${imports.join("\n")}

const sqlite = new Database(":memory:");
const db = drizzle(sqlite);

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "sqlite", usePlural: true }),
	baseURL: "http://localhost",
	secret: "schema-generation",${sessionArg}${userArg}
	plugins: [${plugins.join(", ")}],
});
`;
}
