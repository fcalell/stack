import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { DbOptions } from "../types";

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

// WS5.1 destructive-migration gate. Diffs the NEWEST migration's drizzle meta
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

// WS5.2 drift gate. Copies committed migrations into a throwaway, gitignored
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
		writeFileSync(
			configAbs,
			`import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  out: ${JSON.stringify(`./${DRIFT_DIR}`)},
});
`,
			"utf-8",
		);

		const result = spawnSync(
			"npx",
			["drizzle-kit", "generate", "--config", configAbs],
			{ cwd, stdio: "pipe", env: { ...process.env } },
		);
		if (result.status !== 0) {
			const stderr = result.stderr?.toString().trim() ?? "";
			const stdout = result.stdout?.toString().trim() ?? "";
			throw new Error(
				`drizzle-kit generate failed during drift check:\n${stderr || stdout}`,
			);
		}

		return countSqlFiles(driftAbs) > before;
	} finally {
		rmSync(driftAbs, { recursive: true, force: true });
		rmSync(configAbs, { force: true });
	}
}
