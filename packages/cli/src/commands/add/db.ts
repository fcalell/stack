import { join } from "node:path";
import { detect } from "#lib/detect";
import { ask, choose, confirm } from "#lib/prompt";
import {
	announceCreated,
	ensureDir,
	ensureGitignore,
	scaffoldFiles,
	skipIfConfigured,
} from "#lib/scaffold";
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
			databaseId = await ask("D1 database ID");
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
