import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import type { SeedEntry } from "../orm";
import type { DbOptions } from "../types";
import { executeSqlFile } from "./wrangler";

// D1 caps a single prepared statement at 100 bound parameters. We inline
// literals (wrangler `d1 execute --file` takes no bound params), so the cap
// doesn't bind us directly, but we still chunk multi-row inserts by the same
// budget to keep each statement small and well within D1's limits.
const MAX_PARAMS_PER_STATEMENT = 100;

type SqlPrimitive = string | number | bigint | boolean | null | Uint8Array;

// A table's seed data, already introspected: DB table/column names and driver
// values (drizzle's `mapToDriverValue` applied). Rows carry only the columns a
// consumer provided (omitted columns fall to their SQL DEFAULT); primary-key
// columns are always present.
export interface TableSeedSpec {
	table: string;
	pkColumns: string[];
	rows: Array<Record<string, SqlPrimitive>>;
}

function ident(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

function literal(value: SqlPrimitive): string {
	if (value === null) return "NULL";
	if (typeof value === "boolean") return value ? "1" : "0";
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error(`Cannot serialize non-finite number in seed: ${value}`);
		}
		return String(value);
	}
	if (typeof value === "bigint") return value.toString();
	if (value instanceof Uint8Array) {
		let hex = "";
		for (const byte of value) hex += byte.toString(16).padStart(2, "0");
		return `X'${hex}'`;
	}
	return `'${value.replace(/'/g, "''")}'`;
}

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size)
		out.push(items.slice(i, i + size));
	return out;
}

// One or more INSERT statements for `rows`, grouped by which columns each row
// provides (so a row omitting a defaulted column keeps its DEFAULT rather than
// being forced to NULL). When `pkColumns` is set, each statement upserts on the
// primary key; otherwise it's a plain insert (the caller has already cleared
// the table).
function cell(row: Record<string, SqlPrimitive>, column: string): SqlPrimitive {
	const value = row[column];
	return value === undefined ? null : value;
}

function insertStatements(
	table: string,
	rows: Array<Record<string, SqlPrimitive>>,
	pkColumns: string[] | null,
): string[] {
	const groups = new Map<
		string,
		{ columns: string[]; rows: Array<Record<string, SqlPrimitive>> }
	>();
	for (const row of rows) {
		const columns = Object.keys(row).sort();
		const key = columns.join(",");
		const group = groups.get(key);
		if (group) group.rows.push(row);
		else groups.set(key, { columns, rows: [row] });
	}

	const statements: string[] = [];
	for (const { columns, rows: groupRows } of groups.values()) {
		const rowsPerStatement = Math.max(
			1,
			Math.floor(MAX_PARAMS_PER_STATEMENT / columns.length),
		);
		const columnList = columns.map(ident).join(", ");

		let conflict = "";
		if (pkColumns) {
			const updatable = columns.filter((c) => !pkColumns.includes(c));
			const target = pkColumns.map(ident).join(", ");
			conflict = updatable.length
				? ` ON CONFLICT(${target}) DO UPDATE SET ${updatable
						.map((c) => `${ident(c)} = excluded.${ident(c)}`)
						.join(", ")}`
				: ` ON CONFLICT(${target}) DO NOTHING`;
		}

		for (const batch of chunk(groupRows, rowsPerStatement)) {
			const values = batch
				.map(
					(row) => `(${columns.map((c) => literal(cell(row, c))).join(", ")})`,
				)
				.join(", ");
			statements.push(
				`INSERT INTO ${ident(table)} (${columnList}) VALUES ${values}${conflict};`,
			);
		}
	}
	return statements;
}

// `DELETE` of rows whose primary key is no longer in the seed. Kept as a
// `NOT IN` so FK links pointing at surviving rows are untouched and rows
// deleted here rely on the schema's `ON DELETE SET NULL` to spare user data.
function pruneStatement(
	table: string,
	pkColumns: string[],
	rows: Array<Record<string, SqlPrimitive>>,
): string {
	const [single] = pkColumns;
	if (pkColumns.length === 1 && single !== undefined) {
		const keep = rows.map((r) => literal(cell(r, single))).join(", ");
		return `DELETE FROM ${ident(table)} WHERE ${ident(single)} NOT IN (${keep});`;
	}
	const target = pkColumns.map(ident).join(", ");
	const keep = rows
		.map((r) => `(${pkColumns.map((c) => literal(cell(r, c))).join(", ")})`)
		.join(", ");
	return `DELETE FROM ${ident(table)} WHERE (${target}) NOT IN (${keep});`;
}

// Pure SQL builder — the whole seed as idempotent statements. Tables with a
// primary key upsert-then-prune; tables without one are replaced wholesale; an
// empty seed for a table prunes it. Fully unit-testable without a database.
export function buildSeedSql(specs: TableSeedSpec[]): string {
	const statements: string[] = [];
	for (const spec of specs) {
		const { table, pkColumns, rows } = spec;
		if (rows.length === 0) {
			statements.push(`DELETE FROM ${ident(table)};`);
			continue;
		}
		if (pkColumns.length === 0) {
			statements.push(`DELETE FROM ${ident(table)};`);
			statements.push(...insertStatements(table, rows, null));
			continue;
		}
		statements.push(...insertStatements(table, rows, pkColumns));
		statements.push(pruneStatement(table, pkColumns, rows));
	}
	return statements.length ? `${statements.join("\n")}\n` : "";
}

// Introspect a drizzle table + its seed rows into a `TableSeedSpec`. Maps JS
// property names to DB column names and applies each column's driver mapping
// (Date → epoch, boolean → 0/1, json → text). Cross-instance-safe: drizzle keys
// its internals with `Symbol.for`, so the consumer's tables read correctly here.
export function tableToSpec(
	table: SQLiteTable,
	rows: Array<Record<string, unknown>>,
): TableSeedSpec {
	const columns = getTableColumns(table);
	const config = getTableConfig(table);
	const tableName = getTableName(table);

	const byJsKey = new Map<string, (typeof columns)[string]>(
		Object.entries(columns),
	);

	const pkNames = new Set<string>();
	for (const column of Object.values(columns)) {
		if (column.primary) pkNames.add(column.name);
	}
	for (const pk of config.primaryKeys) {
		for (const column of pk.columns) pkNames.add(column.name);
	}

	const specRows = rows.map((row, i) => {
		const out: Record<string, SqlPrimitive> = {};
		for (const [jsKey, value] of Object.entries(row)) {
			const column = byJsKey.get(jsKey);
			if (!column) {
				throw new Error(
					`Seed for table "${tableName}": unknown column "${jsKey}"`,
				);
			}
			out[column.name] =
				value === undefined || value === null
					? null
					: (column.mapToDriverValue(value) as SqlPrimitive);
		}
		for (const pk of pkNames) {
			if (!(pk in out)) {
				throw new Error(
					`Seed row ${i} for table "${tableName}" is missing primary key column "${pk}" — ` +
						"seed rows must carry their primary key so they can be upserted idempotently.",
				);
			}
		}
		return out;
	});

	return { table: tableName, pkColumns: [...pkNames], rows: specRows };
}

// Import the consumer's `src/schema/seed.ts` (runs under tsx like the rest of
// the CLI) and introspect it. Returns `null` when no seed file exists.
export async function loadSeedSpecs(
	cwd: string,
): Promise<TableSeedSpec[] | null> {
	const seedPath = join(cwd, "src", "schema", "seed.ts");
	if (!existsSync(seedPath)) return null;
	const mod = (await import(pathToFileURL(seedPath).href)) as {
		default?: unknown;
	};
	const entries = mod.default;
	if (!Array.isArray(entries)) {
		throw new Error(
			"src/schema/seed.ts must `export default defineSeed([...])`",
		);
	}
	return (entries as SeedEntry[]).map((e) => tableToSpec(e.table, e.rows));
}

// Full pipeline: load + introspect + build. `null` when there's no seed file or
// it produces no statements.
export async function buildSeedSqlFromCwd(cwd: string): Promise<string | null> {
	const specs = await loadSeedSpecs(cwd);
	if (specs === null) return null;
	const sql = buildSeedSql(specs);
	return sql.length ? sql : null;
}

// Apply the seed to the target database. d1 goes through
// `wrangler d1 execute --file` (local hits the same miniflare D1 `wrangler dev`
// reads; remote hits the deployed DB); sqlite executes directly against the
// file. Returns `false` when there was nothing to seed.
export async function applySeed(
	cwd: string,
	options: DbOptions,
	opts: { remote: boolean },
): Promise<boolean> {
	const sql = await buildSeedSqlFromCwd(cwd);
	if (sql === null) return false;

	if (options.dialect === "sqlite") {
		if (opts.remote) {
			throw new Error(
				"`--remote` seeding is not supported for the sqlite dialect",
			);
		}
		if (!options.path) {
			throw new Error("Cannot seed: sqlite dialect requires a path");
		}
		const { default: Database } = await import("better-sqlite3");
		const db = new Database(resolve(cwd, options.path));
		try {
			db.exec(sql);
		} finally {
			db.close();
		}
		return true;
	}

	const databaseName = options.databaseId;
	if (!databaseName) {
		throw new Error("Cannot seed: no databaseId configured");
	}
	const seedFile = join(".db-kit", "seed.sql");
	mkdirSync(join(cwd, ".db-kit"), { recursive: true });
	writeFileSync(join(cwd, seedFile), sql, "utf-8");
	executeSqlFile(cwd, databaseName, opts.remote ? "remote" : "local", seedFile);
	return true;
}
