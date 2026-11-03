import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	type FtsDefinition,
	ftsConvergeStatements,
	ftsDropMigrationSql,
	ftsMigrationSql,
	ftsResyncSql,
	ftsShadowTables,
} from "../fts.ts";
import { runCommand } from "./exec.ts";

// The full-text indexes the consumer's schema declares, read in a fresh node
// process: the schema is user code that a long-running `stack dev` must see
// again after each save, which an in-process import (cached) would not.
const LOADER = `
const [file, key] = process.argv.slice(1);
const mod = await import(file);
const defs = [];
for (const value of Object.values(mod)) {
	const def = value?.[Symbol.for(key)];
	if (def && !defs.some((d) => d.name === def.name)) defs.push(def);
}
process.stdout.write("\\n@@stack-fts@@" + JSON.stringify(defs));
`;

export function loadFtsDefinitions(cwd: string): FtsDefinition[] {
	const schema = join(cwd, "src", "schema", "index.ts");
	if (!existsSync(schema)) return [];
	const { stdout } = runCommand(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			LOADER,
			pathToFileURL(schema).href,
			"@fcalell/plugin-db/fts",
		],
		cwd,
	);
	const at = stdout.lastIndexOf("@@stack-fts@@");
	if (at < 0) return [];
	return JSON.parse(
		stdout.slice(at + "@@stack-fts@@".length),
	) as FtsDefinition[];
}

// The declared indexes after checking they can coexist.
function assertUnique(defs: FtsDefinition[]): void {
	const seen = new Set<string>();
	for (const def of defs) {
		if (seen.has(def.name)) {
			throw new Error(`Two full-text indexes are named "${def.name}"`);
		}
		seen.add(def.name);
	}
}

// What the committed migrations leave behind, per index: the hash of the
// newest definition migrated, or gone once a drop migration followed it.
export function migratedFts(migrationsDir: string): Map<string, string> {
	const state = new Map<string, string>();
	if (!existsSync(migrationsDir)) return state;
	const files = readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();
	for (const file of files) {
		const sql = readFileSync(join(migrationsDir, file), "utf-8");
		for (const m of sql.matchAll(/^-- stack:fts (\S+) (\S+)$/gm)) {
			state.set(m[1] as string, m[2] as string);
		}
		for (const m of sql.matchAll(/^-- stack:fts-drop (\S+)$/gm)) {
			state.delete(m[1] as string);
		}
	}
	return state;
}

export interface FtsMigration {
	name: string;
	sql: string;
}

// The custom migrations the declared indexes still need: one per index that is
// new, changed or no longer declared.
export function pendingFtsMigrations(
	declared: FtsDefinition[],
	migrated: Map<string, string>,
): FtsMigration[] {
	assertUnique(declared);
	const out: FtsMigration[] = [];
	for (const def of declared) {
		const prior = migrated.get(def.name);
		if (prior === def.hash) continue;
		out.push({
			name: `fts_${def.name}`,
			sql: ftsMigrationSql(def, { replace: prior !== undefined }),
		});
	}
	const names = new Set(declared.map((d) => d.name));
	for (const name of migrated.keys()) {
		if (!names.has(name)) {
			out.push({ name: `fts_drop_${name}`, sql: ftsDropMigrationSql(name) });
		}
	}
	return out;
}

// A generated migration that rebuilds a content table (SQLite's copy, drop and
// rename) takes its triggers with it and may renumber the rows; the index is
// re-synced after it.
export function resyncRecreatedContent(
	sql: string,
	declared: FtsDefinition[],
): string {
	let out = sql;
	for (const def of declared) {
		const drops = new RegExp(`DROP TABLE \`${def.content}\`;`);
		if (drops.test(sql)) {
			out = `${out.trimEnd()}\n--> statement-breakpoint\n${ftsResyncSql(def)}`;
		}
	}
	return out;
}

interface Row {
	name: string;
	sql: string | null;
}

// The full-text indexes a database holds, declared or not: drizzle-kit must
// not offer to drop them.
export async function existingFtsNames(file: string): Promise<string[]> {
	if (!existsSync(file)) return [];
	const { default: Database } = await import("better-sqlite3");
	const db = new Database(file, { readonly: true });
	try {
		const rows = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE 'CREATE VIRTUAL TABLE%USING fts5%'",
			)
			.all() as Row[];
		return rows.map((r) => r.name);
	} finally {
		db.close();
	}
}

// The tables drizzle-kit must leave alone: each index and its shadow tables.
export function ftsTablesFilter(names: string[]): string[] {
	return names.flatMap((n) => [n, ...ftsShadowTables(n)]).map((t) => `!${t}`);
}

// Brings the database's indexes to the declared ones, after drizzle-kit has
// pushed the tables: a missing index is created and filled, a changed one is
// replaced, one that lost its triggers (a pushed table copy drops them) gets
// them back and is rebuilt. An index the schema no longer declares is left in
// place (it may be hand-written SQL); its drop migration removes it elsewhere.
// Idempotent, so a push that changed nothing here changes nothing.
export async function applyFtsLocal(
	cwd: string,
	file: string,
	declared: FtsDefinition[],
): Promise<void> {
	assertUnique(declared);
	const path = resolve(cwd, file);
	const { default: Database } = await import("better-sqlite3");
	const db = new Database(path);
	try {
		const rows = db
			.prepare(
				"SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'trigger')",
			)
			.all() as Array<Row & { type: string }>;
		const statements: string[] = [];
		for (const def of declared) {
			const table = rows.find((r) => r.type === "table" && r.name === def.name);
			const triggers = new Map(
				rows
					.filter((r) => r.type === "trigger" && r.sql !== null)
					.map((r) => [r.name, r.sql as string]),
			);
			statements.push(
				...ftsConvergeStatements(def, {
					table: table?.sql ?? null,
					triggers,
				}),
			);
		}
		if (statements.length === 0) return;
		db.transaction(() => {
			for (const statement of statements) db.exec(statement);
		})();
	} finally {
		db.close();
	}
}
