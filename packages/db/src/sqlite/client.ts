import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

/**
 * Creates a Drizzle ORM client backed by a local SQLite file via better-sqlite3.
 *
 * Use for scripts, seeds, tests, or any Node.js context where a file-based
 * SQLite database is needed.
 *
 * @param filePath - Absolute or relative path to the SQLite database file
 * @param schema - Drizzle schema object with table definitions
 */
export function createClient<TSchema extends Record<string, unknown>>(
	filePath: string,
	schema: TSchema,
) {
	const sqlite = new Database(filePath);
	return drizzle(sqlite, { schema });
}
