import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// drizzle-kit alters a SQLite table it cannot alter in place (a dropped
// default, a changed constraint) by copying it: `CREATE TABLE __new_t`,
// `INSERT INTO __new_t(...) SELECT ... FROM t`, `DROP TABLE t`, rename. When the
// same change also adds a column, its copy names the new column in the SELECT,
// which the old table does not have, and the migration fails where it applies
// (`no such column`). The copy must read only the columns the table had before
// the migration: the added one takes its default, or null.

interface Snapshot {
	tables?: Record<string, { columns?: Record<string, unknown> }>;
}

/** The columns of each table in the newest drizzle snapshot of a migrations dir, or none where there is no snapshot. */
export function columnsBefore(
	migrationsDir: string,
): Map<string, ReadonlySet<string>> {
	const meta = join(migrationsDir, "meta");
	const out = new Map<string, ReadonlySet<string>>();
	if (!existsSync(meta)) return out;
	const newest = readdirSync(meta)
		.filter((f) => /^\d+_snapshot\.json$/.test(f))
		.sort()
		.at(-1);
	if (!newest) return out;
	const snapshot = JSON.parse(
		readFileSync(join(meta, newest), "utf-8"),
	) as Snapshot;
	for (const [table, def] of Object.entries(snapshot.tables ?? {})) {
		out.set(
			table,
			new Set(
				Object.entries(def.columns ?? {}).map(([key, column]) => {
					const named = (column as { name?: string } | undefined)?.name;
					return named ?? key;
				}),
			),
		);
	}
	return out;
}

const unquote = (name: string): string =>
	name.trim().replace(/^[`"]|[`"]$/g, "");

const COPY =
	/INSERT INTO `__new_(\w+)`\(([^)]*)\) SELECT ([^;]*?) FROM `(\w+)`;/g;

/** The migration with each table copy's column lists cut to the columns the table had before it. Pairs `("a", "b")` and `"a", "b"` stay pairs: the target and the source list are cut together. A migration with no copy, or a copy of a table the snapshot does not hold, is returned as it is. */
export function copyOnlyExisting(
	sql: string,
	before: Map<string, ReadonlySet<string>>,
): string {
	return sql.replace(COPY, (whole, table, into, from, source) => {
		const had = before.get(source as string);
		if (!had || table !== source) return whole;
		const targets = (into as string).split(",").map(unquote);
		const reads = (from as string).split(",").map(unquote);
		if (targets.length !== reads.length) return whole;
		const keep = reads.flatMap((read, at) => (had.has(read) ? [at] : []));
		if (keep.length === reads.length || keep.length === 0) return whole;
		const quoted = (names: string[]) =>
			keep.map((at) => `"${names[at]}"`).join(", ");
		return `INSERT INTO \`__new_${table}\`(${quoted(targets)}) SELECT ${quoted(reads)} FROM \`${source}\`;`;
	});
}
