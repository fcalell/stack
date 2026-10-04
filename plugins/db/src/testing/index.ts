import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type { TestingPlugin } from "@fcalell/plugin-api/testing";
import type { AnyD1Database, DrizzleD1Database } from "drizzle-orm/d1";
import { createClient } from "../d1/client.ts";
import { listMigrationFiles } from "../node/push.ts";
import { MIGRATIONS_TABLE } from "../node/wrangler.ts";
import { testD1, transaction } from "./d1.ts";

// The test entry's local D1: one in-memory sqlite database per boot, in the
// test's own process behind the D1 binding's surface, with the consumer's
// migrations applied and recorded the way `wrangler d1 migrations apply`
// applies and records them at deploy. Node-only.

// The table `wrangler d1 migrations apply` records each applied file in.
const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;

// One file and its record land in one transaction, as wrangler's apply runs
// them, so a failing file leaves no record.
function applyMigrations(
	db: DatabaseSync,
	dir: string,
	files: readonly string[],
): void {
	db.exec(CREATE_MIGRATIONS_TABLE);
	const record = db.prepare(
		`INSERT INTO "${MIGRATIONS_TABLE}" (name) VALUES (?)`,
	);
	for (const file of files) {
		const text = readFileSync(join(dir, file), "utf8");
		try {
			transaction(db, () => {
				db.exec(text);
				record.run(file);
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`dbTesting: migration ${file} failed: ${message}`, {
				cause: error,
			});
		}
	}
}

export interface DbTestingOptions<TSchema> {
	binding: string;
	// Relative to the consumer root (`ctx.root`).
	migrations: string;
	schema?: TSchema;
}

export default function dbTesting<
	TSchema extends Record<string, unknown> = Record<string, unknown>,
>(
	options: DbTestingOptions<TSchema>,
): TestingPlugin<"db", object, { db: DrizzleD1Database<TSchema> }> {
	const schema = (options.schema ?? {}) as TSchema;
	return {
		name: "db",
		async setup(ctx) {
			const root = fileURLToPath(ctx.root);
			const dir = join(root, options.migrations);
			const files = listMigrationFiles(root, {
				dialect: "d1",
				migrations: options.migrations,
			});
			if (files.length === 0) {
				throw new Error(
					`dbTesting: no migration in ${dir}. \`stack db generate\` writes the migrations the test database is built from.`,
				);
			}
			const sqlite = new DatabaseSync(":memory:");
			try {
				applyMigrations(sqlite, dir, files);
			} catch (error) {
				sqlite.close();
				throw error;
			}
			// drizzle's d1 driver calls only the statement surface `testD1` serves.
			const d1 = testD1(sqlite) as unknown as AnyD1Database;
			return {
				env: { [options.binding]: d1 },
				provides: { db: createClient(d1, schema) },
				async dispose() {
					sqlite.close();
				},
			};
		},
	};
}
