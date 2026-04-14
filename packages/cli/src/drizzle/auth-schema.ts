import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AuthPolicy } from "@fcalell/db";

const DB_KIT_DIR = ".db-kit";
const AUTH_CONFIG_FILE = "auth-config.ts";
const AUTH_SCHEMA_FILE = "auth-schema.ts";

export function authSchemaPath(): string {
	return join(process.cwd(), DB_KIT_DIR, AUTH_SCHEMA_FILE);
}

export function generateAuthSchema(auth: AuthPolicy): boolean {
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

function buildConfigFile(auth: AuthPolicy): string {
	const imports = [
		'import { betterAuth } from "better-auth";',
		'import { drizzleAdapter } from "better-auth/adapters/drizzle";',
		'import Database from "better-sqlite3";',
		'import { drizzle } from "drizzle-orm/better-sqlite3";',
	];

	const pluginNames: string[] = [];
	const plugins: string[] = [];

	pluginNames.push("emailOTP");
	plugins.push("emailOTP({ sendVerificationOTP: async () => {} })");

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

	const sessionArg = auth.session?.additionalFields
		? `\n\tsession: ${JSON.stringify({ additionalFields: auth.session.additionalFields })},`
		: "";
	const userArg = auth.user ? `\n\tuser: ${JSON.stringify(auth.user)},` : "";

	return `${imports.join("\n")}

const sqlite = new Database(":memory:");
const db = drizzle(sqlite);

export const auth = betterAuth({
\tdatabase: drizzleAdapter(db, { provider: "sqlite", usePlural: true }),
\tbaseURL: "http://localhost",
\tsecret: "schema-generation",${sessionArg}${userArg}
\tplugins: [${plugins.join(", ")}],
});
`;
}
