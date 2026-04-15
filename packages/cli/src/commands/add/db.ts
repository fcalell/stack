import { basename, join } from "node:path";
import { spinner } from "@clack/prompts";
import { detect } from "#lib/detect";
import { ask, choose, confirm } from "#lib/prompt";
import {
	announceCreated,
	ensureDir,
	ensureGitignore,
	scaffoldFiles,
	skipIfConfigured,
} from "#lib/scaffold";
import { createD1Database } from "#lib/wrangler";
import { schemaTemplate } from "#templates/schema";
import { stackConfigTemplate } from "#templates/stack-config";

interface DbOptions {
	dialect?: "d1" | "sqlite";
	databaseId?: string;
	sqlitePath?: string;
	auth?: boolean;
	org?: boolean;
}

export async function add(options?: DbOptions): Promise<void> {
	const state = detect();
	if (skipIfConfigured("Database", state.hasConfig)) return;

	let dialect = options?.dialect;
	let databaseId = options?.databaseId;
	let sqlitePath = options?.sqlitePath;
	let auth = options?.auth;
	let org = options?.org;

	if (dialect === undefined && process.stdin.isTTY) {
		dialect = await choose<"d1" | "sqlite">("Database dialect:", [
			"d1",
			"sqlite",
		]);

		if (dialect === "d1") {
			databaseId = await acquireD1Id();
		} else {
			sqlitePath = await ask("SQLite file path", "./data/app.sqlite");
		}

		auth = await confirm("Include authentication?");
		org = auth ? await confirm("Include organizations?") : false;
	}

	dialect ??= "d1";
	auth ??= false;
	org ??= false;

	const created = scaffoldFiles([
		[
			"stack.config.ts",
			stackConfigTemplate({ dialect, databaseId, sqlitePath, auth, org }),
		],
		[join("src", "schema", "index.ts"), schemaTemplate()],
	]);

	if (ensureDir(join("src", "migrations"))) created.push("src/migrations/");
	if (ensureGitignore(".db-kit")) created.push(".gitignore");

	announceCreated(created);
}

async function acquireD1Id(): Promise<string | undefined> {
	const createNew = await confirm("Create a new D1 database?");

	if (!createNew) {
		return await ask("D1 database ID");
	}

	const defaultName = `${basename(process.cwd())}-db`;
	const name = await ask("Database name", defaultName);

	const s = spinner();
	s.start("Creating D1 database...");
	const result = createD1Database(name);

	if (result) {
		s.stop(`Created D1 database: ${result.name} (${result.id})`);
		return result.id;
	}

	s.stop("Failed to create D1 database.");
	return await ask("D1 database ID (enter manually)");
}
