import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { DbOptions } from "../types";
import { runCommand } from "./exec";
import { migrationLockPath, withMigrationLock } from "./lock";
import { migrationsApply } from "./wrangler";

function sqliteLocalUrl(options: DbOptions): string {
	return options.dialect === "sqlite" && options.path
		? options.path
		: ".stack/dev/local.db";
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
	return withMigrationLock(migrationLockPath(cwd), async () => {
		const configDir = join(cwd, ".stack", "dev");
		mkdirSync(configDir, { recursive: true });

		const dbUrl = sqliteLocalUrl(options);

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
