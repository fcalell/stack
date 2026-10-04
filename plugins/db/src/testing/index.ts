import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestingPlugin } from "@fcalell/plugin-api/testing";
import type { AnyD1Database, DrizzleD1Database } from "drizzle-orm/d1";
import { getPlatformProxy, unstable_splitSqlQuery } from "wrangler";
import { createClient } from "../d1/client.ts";
import { listMigrationFiles } from "../node/push.ts";
import { MIGRATIONS_TABLE } from "../node/wrangler.ts";

// The test entry's local D1: one in-memory database per boot, behind
// miniflare's D1 binding, with the consumer's migrations applied the way
// `wrangler d1 migrations apply` applies them at deploy. Node-only.

// The statements `wrangler d1 migrations apply` writes.
const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;

function recordMigration(name: string): string {
	return `INSERT INTO "${MIGRATIONS_TABLE}" (name)
values ('${name.replace(/'/g, "''")}');`;
}

// With `persist: false` the id addresses nothing on disk, so every proxy
// gets its own database whatever the id.
function wranglerToml(binding: string, compatibilityDate: string): string {
	return [
		'name = "stack-test"',
		`compatibility_date = ${JSON.stringify(compatibilityDate)}`,
		"",
		"[[d1_databases]]",
		`binding = ${JSON.stringify(binding)}`,
		'database_name = "stack-test"',
		'database_id = "00000000-0000-0000-0000-000000000000"',
		"",
	].join("\n");
}

// One file and its record land in one batch, as wrangler's local apply runs
// them, so a failing file leaves no record.
async function applyMigrations(
	d1: AnyD1Database,
	dir: string,
	files: readonly string[],
): Promise<void> {
	await d1.prepare(CREATE_MIGRATIONS_TABLE).run();
	for (const file of files) {
		const text = await readFile(join(dir, file), "utf8");
		const queries = unstable_splitSqlQuery(`${text}\n${recordMigration(file)}`);
		try {
			await d1.batch(queries.map((query) => d1.prepare(query)));
		} catch (error) {
			const cause = (error as { cause?: unknown }).cause ?? error;
			const message = cause instanceof Error ? cause.message : String(cause);
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
	compatibilityDate: string;
	schema?: TSchema;
	// Where the temporary config directory is made; `os.tmpdir()` by default.
	tempRoot?: string;
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

			const temp = await mkdtemp(
				join(options.tempRoot ?? tmpdir(), "stack-d1-"),
			);
			let proxy: { dispose(): Promise<void> } | undefined;
			try {
				const configPath = join(temp, "wrangler.toml");
				await writeFile(
					configPath,
					wranglerToml(options.binding, options.compatibilityDate),
				);
				const platform = await getPlatformProxy<Record<string, AnyD1Database>>({
					configPath,
					persist: false,
					remoteBindings: false,
				});
				proxy = platform;
				const d1 = platform.env[options.binding];
				if (!d1) {
					throw new Error(
						`dbTesting: the local D1 proxy has no ${options.binding} binding.`,
					);
				}
				await applyMigrations(d1, dir, files);
				const db = createClient(d1, schema);
				return {
					env: { [options.binding]: d1 },
					provides: { db },
					async dispose() {
						try {
							await platform.dispose();
						} finally {
							await rm(temp, { recursive: true, force: true });
						}
					},
				};
			} catch (error) {
				// The entry runs only the disposers already returned, so a setup
				// that throws closes its own proxy: an open one keeps workerd, and
				// the test process, alive.
				const cleanup = await Promise.allSettled([
					(async () => {
						try {
							await proxy?.dispose();
						} finally {
							await rm(temp, { recursive: true, force: true });
						}
					})(),
				]);
				const failure = cleanup[0];
				if (failure?.status !== "rejected") throw error;
				throw new AggregateError(
					[error, failure.reason],
					"dbTesting: setup failed and closing its local D1 failed too",
				);
			}
		},
	};
}
