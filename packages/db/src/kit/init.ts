import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { ensureGitignore } from "#kit/run";

async function ask(prompt: string, defaultValue?: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const suffix = defaultValue ? ` (${defaultValue})` : "";
	const answer = await rl.question(`${prompt}${suffix}: `);
	rl.close();
	return answer.trim() || defaultValue || "";
}

async function confirm(prompt: string): Promise<boolean> {
	const answer = await ask(`${prompt} [y/N]`);
	return answer.toLowerCase() === "y";
}

async function choose<T extends string>(
	prompt: string,
	options: T[],
): Promise<T> {
	console.log(prompt);
	for (let i = 0; i < options.length; i++) {
		console.log(`  ${i + 1}. ${options[i]}`);
	}
	const answer = await ask("Choice", "1");
	const index = Number.parseInt(answer, 10) - 1;
	return options[index] ?? options[0] ?? ("" as T);
}

interface InitOptions {
	dialect: "d1" | "sqlite";
	auth: boolean;
	organization: boolean;
	databaseId?: string;
	sqlitePath?: string;
}

export async function init(): Promise<void> {
	const created: string[] = [];

	let options: InitOptions;

	if (process.stdin.isTTY) {
		options = await promptOptions();
	} else {
		options = { dialect: "d1", auth: false, organization: false };
	}

	if (!existsSync("db.config.ts")) {
		writeFileSync("db.config.ts", buildConfigTemplate(options));
		created.push("db.config.ts");
	} else {
		console.log("db.config.ts already exists, skipping");
	}

	const schemaDir = join("src", "schema");
	const schemaFile = join(schemaDir, "index.ts");
	if (!existsSync(schemaFile)) {
		mkdirSync(schemaDir, { recursive: true });
		writeFileSync(schemaFile, SCHEMA_TEMPLATE);
		created.push("src/schema/index.ts");
	}

	const migrationsDir = join("src", "migrations");
	if (!existsSync(migrationsDir)) {
		mkdirSync(migrationsDir, { recursive: true });
		created.push("src/migrations/");
	}

	if (ensureGitignore()) created.push(".gitignore (.db-kit entry)");

	if (created.length > 0) {
		console.log(`\nCreated: ${created.join(", ")}`);
	} else {
		console.log("Everything already exists.");
	}
}

async function promptOptions(): Promise<InitOptions> {
	const dialect = await choose("Database dialect:", ["d1", "sqlite"]);

	let databaseId: string | undefined;
	let sqlitePath: string | undefined;

	if (dialect === "d1") {
		databaseId = await ask("D1 database ID");
	} else {
		sqlitePath = await ask("SQLite file path", "./data/app.sqlite");
	}

	const auth = await confirm("Enable authentication?");
	const organization = auth ? await confirm("Enable organizations?") : false;

	return { dialect, auth, organization, databaseId, sqlitePath };
}

function buildConfigTemplate(options: InitOptions): string {
	const imports = ['import { defineDatabase } from "@fcalell/db";'];
	const lines: string[] = [];

	if (options.auth) {
		imports.push('import { defineAuth } from "@fcalell/db/auth";');
		if (options.organization) {
			imports.push(
				'import { createAccessControl } from "@fcalell/db/auth/access";',
			);
		}
	}

	imports.push('import * as schema from "./src/schema";');

	if (options.organization) {
		lines.push("");
		lines.push("const ac = createAccessControl({");
		lines.push('\torganization: ["update", "delete"],');
		lines.push('\tmember: ["create", "update", "delete"],');
		lines.push('\tinvitation: ["create", "cancel"],');
		lines.push("});");
	}

	if (options.auth) {
		lines.push("");
		lines.push("const auth = defineAuth({");
		lines.push('\tcookies: { prefix: "app" },');

		if (options.organization) {
			lines.push("\torganization: { ac },");
		}

		lines.push("});");
	}

	lines.push("");
	lines.push("export default defineDatabase({");

	if (options.dialect === "d1") {
		lines.push('\tdialect: "d1",');
		lines.push(
			`\tdatabaseId: "${options.databaseId || "YOUR_D1_DATABASE_ID"}",`,
		);
	} else {
		lines.push('\tdialect: "sqlite",');
		lines.push(`\tpath: "${options.sqlitePath || "./data/app.sqlite"}",`);
	}

	lines.push("\tschema,");

	if (options.auth) {
		lines.push("\tauth,");
	}

	lines.push("});");
	lines.push("");

	return `${imports.join("\n")}\n${lines.join("\n")}`;
}

const SCHEMA_TEMPLATE = `import { sqliteTable, text, integer } from "@fcalell/db/orm";

export const examples = sqliteTable("examples", {
\tid: text("id").primaryKey(),
\tname: text("name").notNull(),
\tcreatedAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
`;
