import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { DbOptions } from "../types.ts";
import { runDrizzleKit, writeDrizzleConfig } from "./drizzle-kit.ts";
import {
	deadFtsTriggers,
	loadFtsDefinitions,
	migratedFts,
	pendingFtsMigrations,
} from "./fts.ts";

// A migration acknowledged as an intentional, reviewed drop carries this
// marker anywhere in its `.sql` (a plain comment line). Kept as a bare token so
// `-- stack:allow-destructive` reads naturally in a SQL file.
export const ALLOW_DESTRUCTIVE_MARKER = "stack:allow-destructive";

// Temp workspace for the drift check. Lives under the already-gitignored
// `.db-kit` and is RELATIVE to cwd on purpose: drizzle-kit 0.31 mangles
// absolute `--out` paths, so every drift path stays relative.
const DRIFT_DIR = ".db-kit/drift";
const DRIFT_CONFIG = ".db-kit/drift.config.ts";

// Only the tables/columns/views a snapshot diff needs. Drizzle snapshot files
// carry far more (indexes, FKs, checks); we read the two keys that describe a
// destructive change and ignore the rest, so this survives snapshot-version
// bumps that leave `tables`/`views` shape intact.
interface Snapshot {
	tables?: Record<string, { columns?: Record<string, unknown> }>;
	views?: Record<string, unknown>;
}

interface JournalEntry {
	idx: number;
	tag: string;
}

interface Journal {
	entries?: JournalEntry[];
}

export interface DropReport {
	tables: string[];
	columns: { table: string; column: string }[];
	views: string[];
}

function migrationsDirOf(cwd: string, options: DbOptions): string {
	return join(cwd, options.migrations ?? "./src/migrations");
}

function readJournal(migrationsDir: string): Journal | null {
	const journalPath = join(migrationsDir, "meta", "_journal.json");
	if (!existsSync(journalPath)) return null;
	return JSON.parse(readFileSync(journalPath, "utf-8")) as Journal;
}

function readSnapshot(migrationsDir: string, idx: number): Snapshot {
	const name = `${String(idx).padStart(4, "0")}_snapshot.json`;
	const snapshotPath = join(migrationsDir, "meta", name);
	if (!existsSync(snapshotPath)) return {};
	return JSON.parse(readFileSync(snapshotPath, "utf-8")) as Snapshot;
}

// Drops present in `prev` and gone in `next`. A dropped table subsumes its
// columns (only the table is reported, not each column). Deterministically
// ordered so the explainer reads the same across runs.
function diffSnapshots(prev: Snapshot, next: Snapshot): DropReport {
	const prevTables = prev.tables ?? {};
	const nextTables = next.tables ?? {};
	const tables = Object.keys(prevTables)
		.filter((t) => !(t in nextTables))
		.sort();

	const columns: { table: string; column: string }[] = [];
	for (const [table, def] of Object.entries(prevTables)) {
		const nextTable = nextTables[table];
		if (!nextTable) continue; // whole-table drop already reported
		const nextColumns = nextTable.columns ?? {};
		for (const column of Object.keys(def.columns ?? {})) {
			if (!(column in nextColumns)) columns.push({ table, column });
		}
	}
	columns.sort(
		(a, b) =>
			a.table.localeCompare(b.table) || a.column.localeCompare(b.column),
	);

	const nextViews = next.views ?? {};
	const views = Object.keys(prev.views ?? {})
		.filter((v) => !(v in nextViews))
		.sort();

	return { tables, columns, views };
}

export function hasDrops(report: DropReport): boolean {
	return (
		report.tables.length > 0 ||
		report.columns.length > 0 ||
		report.views.length > 0
	);
}

// The destructive-migration gate. Diffs the NEWEST migration's drizzle meta
// snapshot against its predecessor. Older migrations are shipped history and
// never re-flagged. Returns `null` when there are no migrations at all.
export function detectLatestDrops(
	cwd: string,
	options: DbOptions,
): { report: DropReport; acknowledged: boolean; migration: string } | null {
	const migrationsDir = migrationsDirOf(cwd, options);
	const entries = readJournal(migrationsDir)?.entries;
	if (!entries || entries.length === 0) return null;

	const sorted = [...entries].sort((a, b) => a.idx - b.idx);
	const newest = sorted[sorted.length - 1];
	if (!newest) return null;
	const predecessor = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

	const nextSnapshot = readSnapshot(migrationsDir, newest.idx);
	const prevSnapshot = predecessor
		? readSnapshot(migrationsDir, predecessor.idx)
		: {};

	const report = diffSnapshots(prevSnapshot, nextSnapshot);
	const sqlPath = join(migrationsDir, `${newest.tag}.sql`);
	const sql = existsSync(sqlPath) ? readFileSync(sqlPath, "utf-8") : "";

	return {
		report,
		acknowledged: sql.includes(ALLOW_DESTRUCTIVE_MARKER),
		migration: `${newest.tag}.sql`,
	};
}

export function formatDropReport(
	migration: string,
	report: DropReport,
): string {
	const lines: string[] = [];
	for (const t of report.tables) lines.push(`  - drops table "${t}"`);
	for (const v of report.views) lines.push(`  - drops view "${v}"`);
	for (const c of report.columns)
		lines.push(`  - drops column "${c.column}" on table "${c.table}"`);

	return [
		`Destructive migration ${migration}:`,
		...lines,
		"",
		"A drop breaks the live worker mid-deploy — old code still reads the",
		"dropped shape during the rollout window. Use expand/contract: ship the",
		"additive change, deploy, migrate data off the old shape, then drop it in a",
		"later release.",
		"",
		`If this drop is intentional and safe, add a "-- ${ALLOW_DESTRUCTIVE_MARKER}"`,
		`line anywhere in ${migration}.`,
	].join("\n");
}

// Hard gate used by both `stack db check` and the pre-deploy `deployChecks`
// contribution. Throws the expand/contract explainer when the newest migration
// drops something without an acknowledgement marker.
export function assertNoUnacknowledgedDrops(
	cwd: string,
	options: DbOptions,
): void {
	const result = detectLatestDrops(cwd, options);
	if (!result || !hasDrops(result.report) || result.acknowledged) return;
	throw new Error(formatDropReport(result.migration, result.report));
}

function countSqlFiles(dir: string): number {
	if (!existsSync(dir)) return 0;
	return readdirSync(dir).filter((f) => f.endsWith(".sql")).length;
}

// The drift gate. Copies committed migrations into a throwaway, gitignored
// dir and runs `drizzle-kit generate` with `--out` pointed there against the
// live schema. A newly emitted `.sql` means the schema changed without
// `stack db generate`. The real migrations dir is never touched.
export function detectSchemaDrift(cwd: string, options: DbOptions): boolean {
	const migrationsDir = migrationsDirOf(cwd, options);
	const driftAbs = join(cwd, DRIFT_DIR);
	const configAbs = join(cwd, DRIFT_CONFIG);

	rmSync(driftAbs, { recursive: true, force: true });
	mkdirSync(driftAbs, { recursive: true });
	try {
		if (existsSync(migrationsDir)) {
			cpSync(migrationsDir, driftAbs, { recursive: true });
		}
		const before = countSqlFiles(driftAbs);

		// `out` is relative to cwd (drizzle-kit resolves config paths against
		// cwd, matching push.ts), kept relative to dodge the 0.31 absolute-path
		// bug.
		writeDrizzleConfig(configAbs, {
			schema: "./src/schema/index.ts",
			out: `./${DRIFT_DIR}`,
		});

		runDrizzleKit(cwd, ["generate", "--config", configAbs], {
			createOnConflict: true,
		});

		if (countSqlFiles(driftAbs) > before) return true;

		// A full-text index declared, changed or removed since its migration.
		return (
			pendingFtsMigrations(loadFtsDefinitions(cwd), migratedFts(migrationsDir))
				.length > 0
		);
	} finally {
		rmSync(driftAbs, { recursive: true, force: true });
		rmSync(configAbs, { force: true });
	}
}

/** What a full-text index's content table lost to a rebuild: each index a committed migration rebuilt the table of without creating its triggers again. Its writes no longer reach the index. */
export function formatDeadTriggers(
	cwd: string,
	options: DbOptions,
): string | null {
	const dead = deadFtsTriggers(
		migrationsDirOf(cwd, options),
		loadFtsDefinitions(cwd),
	);
	if (dead.length === 0) return null;
	return [
		"A migration rebuilds a table with a full-text index and leaves it without its triggers, so writes stop reaching the index:",
		...dead.map(
			(d) =>
				`  - ${d.migration} rebuilds "${d.table}"; the triggers of "${d.index}" are not created again`,
		),
		"",
		"Append the resync that `stack db generate` writes after a rebuild to that migration: DROP TRIGGER IF EXISTS and CREATE TRIGGER for `<index>_ai`, `_ad` and `_au` (copy them from the index's `fts_<index>` migration), then INSERT INTO `<index>`(`<index>`) VALUES ('rebuild').",
		"Do not edit a migration already applied to a database you keep: add a new custom migration (`stack db generate --custom`) with the same statements.",
	].join("\n");
}

/** The first committed migration that fails to build a database from nothing, applied in order to a scratch in-memory sqlite, as `stack db apply` and a fresh deploy would; null when all apply. A statement SQLite refuses (a rebuilt table's index on a column it lacks, an empty custom migration) is reported with its migration. */
export function formatFailedMigration(
	cwd: string,
	options: DbOptions,
): string | null {
	const dir = migrationsDirOf(cwd, options);
	if (!existsSync(dir)) return null;
	const journaled = readJournal(dir)?.entries?.map((e) => `${e.tag}.sql`);
	const files = (
		journaled ??
		readdirSync(dir)
			.filter((f) => f.endsWith(".sql"))
			.sort()
	).filter((f) => existsSync(join(dir, f)));
	if (files.length === 0) return null;
	const Database = createRequire(import.meta.url)("better-sqlite3");
	const db = new Database(":memory:");
	try {
		for (const file of files) {
			const statements = readFileSync(join(dir, file), "utf-8")
				.split("--> statement-breakpoint")
				.map((s) => s.trim())
				.filter(Boolean);
			for (const statement of statements) {
				try {
					db.exec(statement);
				} catch (err) {
					const why = err instanceof Error ? err.message : String(err);
					return [
						`Migration ${file} fails to apply to an empty database: ${why}`,
						`  ${statement.split("\n")[0]?.slice(0, 160)}`,
						"",
						"Fix the schema and run `stack db generate` again, or, for a migration not yet applied anywhere, correct the statement in the file.",
					].join("\n");
				}
			}
		}
		return null;
	} finally {
		db.close();
	}
}
