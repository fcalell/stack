// Conditions
// Ordering
// Aggregates
// Relations
// SQL template tag
export {
	and,
	asc,
	avg,
	between,
	count,
	countDistinct,
	desc,
	eq,
	exists,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	like,
	lt,
	lte,
	max,
	min,
	ne,
	not,
	notBetween,
	notExists,
	notIlike,
	notInArray,
	notLike,
	or,
	relations,
	sql,
	sum,
} from "drizzle-orm";

// Table definition
export {
	blob,
	foreignKey,
	index,
	integer,
	numeric,
	primaryKey,
	real,
	sqliteTable,
	sqliteTableCreator,
	sqliteView,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type { InferInsertModel } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

// Seed authoring surface for `src/schema/seed.ts`. `seedTable` pins each row to
// its table's insert model (typed against the schema, no column mapping, no
// SQL); `defineSeed` collects the entries. `stack db seed` introspects these
// into idempotent upsert/prune SQL.
export interface SeedEntry {
	table: SQLiteTable;
	rows: Array<Record<string, unknown>>;
}

export function seedTable<T extends SQLiteTable>(
	table: T,
	rows: Array<InferInsertModel<T>>,
): SeedEntry {
	return { table, rows: rows as Array<Record<string, unknown>> };
}

export function defineSeed(entries: SeedEntry[]): SeedEntry[] {
	return entries;
}
