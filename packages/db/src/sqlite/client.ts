import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const cache = new Map<string, unknown>();

/**
 * Creates a Drizzle ORM client backed by a local SQLite file via better-sqlite3.
 *
 * Clients are cached per file path — safe for long-running Node.js processes.
 * Use for scripts, seeds, tests, or any Node.js context where a file-based
 * SQLite database is needed.
 *
 * @param filePath - Absolute or relative path to the SQLite database file
 * @param schema - Drizzle schema object with table definitions
 */
export function createClient<TSchema extends Record<string, unknown>>(
	filePath: string,
	schema: TSchema,
): BetterSQLite3Database<TSchema> {
	if (cache.has(filePath))
		return cache.get(filePath) as BetterSQLite3Database<TSchema>;

	const sqlite = new Database(filePath);
	const db = drizzle(sqlite, { schema });
	cache.set(filePath, db);
	return db;
}
