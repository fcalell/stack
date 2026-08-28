import { createHash, createHmac } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { DbOptions } from "../types";
import { runCommand } from "./exec";
import { migrationLockPath, withMigrationLock } from "./lock";
import { executeSql, migrationsApply } from "./wrangler";

function sqliteLocalUrl(options: DbOptions): string {
	return options.dialect === "sqlite" && options.path
		? options.path
		: ".stack/dev/local.db";
}

// Where miniflare persists a local D1 under `--persist-to .stack/dev`: one
// sqlite file per database id, named by miniflare's deterministic
// durable-object id (`durableObjectNamespaceIdFromName`): HMAC-SHA256 keyed
// on sha256("miniflare-D1DatabaseObject"), first 16 bytes over the database
// id, then 16 bytes over that digest. Deriving the exact filename (instead
// of globbing the dir) stays correct when old persist state holds databases
// from a previous `databaseId`.
const MINIFLARE_D1_DIR = ".stack/dev/v3/d1/miniflare-D1DatabaseObject";

function miniflareD1Path(cwd: string, databaseId: string): string {
	const key = createHash("sha256")
		.update("miniflare-D1DatabaseObject")
		.digest();
	const nameHmac = createHmac("sha256", key)
		.update(databaseId)
		.digest()
		.subarray(0, 16);
	const hmac = createHmac("sha256", key)
		.update(nameHmac)
		.digest()
		.subarray(0, 16);
	const id = Buffer.concat([nameHmac, hmac]).toString("hex");
	return join(cwd, MINIFLARE_D1_DIR, `${id}.sqlite`);
}

// The sqlite file the running `wrangler dev` worker reads. Miniflare creates
// it lazily, so a fresh project materializes it with a no-op query first.
function ensureMiniflareD1(cwd: string, databaseId: string): string {
	const path = miniflareD1Path(cwd, databaseId);
	if (existsSync(path)) return path;
	executeSql(cwd, databaseId, "local", "SELECT 1");
	if (!existsSync(path)) {
		throw new Error(
			"Could not materialize the local D1 database. Run `stack dev` once, then retry.",
		);
	}
	return path;
}

// The committed `.sql` migrations, sorted so listings are deterministic.
export function listMigrationFiles(cwd: string, options: DbOptions): string[] {
	const dir = join(cwd, options.migrations ?? "./src/migrations");
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith(".sql"))
		.sort();
}

// Whether the migrations dir holds at least one `.sql` file. Used to skip the
// local d1 migrations-apply when the consumer hasn't generated a migration yet.
export function migrationsExist(cwd: string, options: DbOptions): boolean {
	return listMigrationFiles(cwd, options).length > 0;
}

// drizzle-kit exits 0 even when its sqlite driver fails to load (the
// better-sqlite3 native addon builds in a postinstall script that pnpm v10
// blocks unless approved), so a broken push would report success. Load the
// consumer's copy up front and fail with the fix instead.
function assertSqliteDriver(cwd: string): void {
	const requireFromConsumer = createRequire(join(cwd, "package.json"));
	try {
		// Constructing a Database is the real probe — v12 loads its native
		// binding lazily, so a bare require() passes even when unbuilt.
		const Database = requireFromConsumer("better-sqlite3");
		new Database(":memory:").close();
	} catch (err) {
		const detail =
			err instanceof Error ? err.message.split("\n")[0] : String(err);
		throw new Error(
			`better-sqlite3 failed to load (${detail}). Build it first: \`pnpm rebuild better-sqlite3\` (pnpm may need the build approved via \`pnpm approve-builds\` or a pnpm.onlyBuiltDependencies entry), then retry.`,
		);
	}
}

function writeDrizzleConfig(configPath: string, content: string): void {
	const dir = join(configPath, "..");
	mkdirSync(dir, { recursive: true });
	writeFileSync(configPath, content, "utf-8");
}

export async function pushSchemaLocal(
	cwd: string,
	options: DbOptions,
): Promise<void> {
	// `drizzle-kit push` writes to the dev SQLite file; serialize cross-process
	// to avoid SQLite's per-file lock surfacing as "database is locked" when
	// `stack db push` is run while `stack dev`'s schema watcher fires.
	assertSqliteDriver(cwd);
	return withMigrationLock(migrationLockPath(cwd), async () => {
		const configDir = join(cwd, ".stack", "dev");
		mkdirSync(configDir, { recursive: true });

		// The d1 dialect pushes into the exact miniflare sqlite the running
		// `wrangler dev` worker reads (WS2.3), so a schema change is live
		// without a restart. Migrations stay the remote deploy path; the local
		// database is disposable (`stack db reset`).
		const dbUrl =
			options.dialect === "d1"
				? ensureMiniflareD1(cwd, options.databaseId ?? "")
				: sqliteLocalUrl(options);

		const configPath = join(configDir, "drizzle.config.ts");
		const configContent = `import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  dbCredentials: { url: ${JSON.stringify(dbUrl)} },
});
`;
		writeDrizzleConfig(configPath, configContent);

		runCommand("npx", ["drizzle-kit", "push", "--config", configPath], cwd);
	});
}

export async function generateMigrations(
	cwd: string,
	options: DbOptions,
): Promise<Array<{ name: string; sql: string }>> {
	// The pre-fix race: this function snapshots the migrations dir, runs
	// drizzle-kit generate, then snapshots again. A concurrent writer (e.g.
	// `stack dev`'s schema watcher pushing schema, which can also trigger a
	// migration write, or a parallel `stack db generate`) can drop a file
	// into the dir mid-flight — the dir-snapshot diff would then attribute
	// that file to *this* generate call's "new" set. Wrap the entire
	// snapshot/generate/snapshot triple in an exclusive lock so no other
	// migration-writing operation can interleave.
	return withMigrationLock(migrationLockPath(cwd), async () => {
		const migrationsDir = join(cwd, options.migrations ?? "./src/migrations");
		const existingFiles = new Set<string>();
		if (existsSync(migrationsDir)) {
			for (const f of readdirSync(migrationsDir)) {
				existingFiles.add(f);
			}
		}

		const configDir = join(cwd, ".stack", "dev");
		mkdirSync(configDir, { recursive: true });

		const configPath = join(configDir, "drizzle-generate.config.ts");
		const configContent = `import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  out: ${JSON.stringify(options.migrations ?? "./src/migrations")},
});
`;
		writeDrizzleConfig(configPath, configContent);

		runCommand("npx", ["drizzle-kit", "generate", "--config", configPath], cwd);

		const newMigrations: Array<{ name: string; sql: string }> = [];
		if (existsSync(migrationsDir)) {
			for (const entry of readdirSync(migrationsDir)) {
				if (existingFiles.has(entry)) continue;
				const sqlPath = join(migrationsDir, entry);
				if (entry.endsWith(".sql")) {
					newMigrations.push({
						name: entry,
						sql: readFileSync(sqlPath, "utf-8"),
					});
				}
			}
		}

		return newMigrations;
	});
}

export async function applyMigrationsRemote(
	cwd: string,
	options: DbOptions,
): Promise<void> {
	if (options.dialect === "sqlite") {
		throw new Error("Remote migrations not supported for sqlite dialect");
	}

	const databaseName = options.databaseId;
	if (!databaseName) {
		throw new Error("Cannot apply remote migrations: no databaseId configured");
	}

	// Wrangler reads every file under `migrations_dir` to compute the
	// pending list. Hold the lock so a concurrent `generateMigrations` can't
	// write a half-flushed file into the dir while wrangler is enumerating.
	return withMigrationLock(migrationLockPath(cwd), async () => {
		migrationsApply(cwd, databaseName, "remote");
	});
}

export async function applyMigrationsLocal(
	cwd: string,
	options: DbOptions,
): Promise<void> {
	// Both branches read the migrations dir; the sqlite branch additionally
	// writes journal entries against the local DB. Serialize against any
	// other migration-writing path under the same lock.
	return withMigrationLock(migrationLockPath(cwd), async () => {
		if (options.dialect === "sqlite") {
			assertSqliteDriver(cwd);
			const configDir = join(cwd, ".stack", "dev");
			mkdirSync(configDir, { recursive: true });

			const configPath = join(configDir, "drizzle-migrate.config.ts");
			const configContent = `import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  out: ${JSON.stringify(options.migrations ?? "./src/migrations")},
  dbCredentials: { url: ${JSON.stringify(sqliteLocalUrl(options))} },
});
`;
			writeDrizzleConfig(configPath, configContent);

			runCommand(
				"npx",
				["drizzle-kit", "migrate", "--config", configPath],
				cwd,
			);
			return;
		}

		const databaseName = options.databaseId;
		if (!databaseName) {
			throw new Error(
				"Cannot apply local migrations: no databaseId configured",
			);
		}

		// `--local --persist-to .stack/dev --config .stack/wrangler.toml` so the
		// migration lands in the exact miniflare D1 that `wrangler dev` reads.
		migrationsApply(cwd, databaseName, "local");
	});
}
