import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RuntimePlugin } from "@fcalell/cli/runtime";
import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { BUSY_TIMEOUT_MS, createClient } from "../sqlite/client.ts";

// The sqlite dialect's runtime, for the node target. The file path comes from
// the env var `fileVar` names, so the installation decides where it lives;
// `createClient` opens each path once per process.
export default function dbRuntime<
	TSchema extends Record<string, unknown> = Record<string, unknown>,
>(options: {
	fileVar: string;
	schema?: TSchema;
}): RuntimePlugin<"db", object, { db: BetterSQLite3Database<TSchema> }> {
	const schema = (options.schema ?? {}) as TSchema;
	// `context` checks too: better-sqlite3 opens an anonymous temporary
	// database for an undefined path instead of failing.
	const file = (env: unknown): string => {
		const value = (env as Record<string, unknown>)[options.fileVar];
		if (typeof value !== "string" || value === "") {
			throw new Error(`Missing env var: ${options.fileVar}`);
		}
		return value;
	};
	return {
		name: "db",
		validateEnv(env: unknown) {
			file(env);
		},
		context(env) {
			return { db: createClient(file(env), schema) };
		},
	};
}

/** The task the production bundle runs before it listens: applies the committed migrations (`folder`, copied beside the bundle) to the database file the env var `fileVar` names, the ones `stack db apply` would, in the same journal, so a bundle needs no CLI on its box. Run twice it changes nothing. With the var unset it does nothing: the worker's env check names it. */
export function migrateSqlite(options: {
	fileVar: string;
	folder: URL;
}): () => void {
	return () => {
		const file = process.env[options.fileVar];
		const folder = fileURLToPath(options.folder);
		// No migration has been generated: there is nothing to apply.
		if (!file || !existsSync(join(folder, "meta", "_journal.json"))) return;
		mkdirSync(dirname(file), { recursive: true });
		// Its own connection: the app's (`createClient`) is cached by path and
		// carries the app's schema, which a connection opened here must not claim.
		const sqlite = new Database(file);
		try {
			sqlite.pragma("journal_mode = WAL");
			sqlite.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
			migrate(drizzle(sqlite), { migrationsFolder: folder });
		} finally {
			sqlite.close();
		}
	};
}
