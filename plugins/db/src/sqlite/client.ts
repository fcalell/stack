import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const cache = new Map<string, unknown>();

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
