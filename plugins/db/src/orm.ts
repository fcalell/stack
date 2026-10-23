// Conditions, ordering, aggregates, relations, the SQL template tag, and the
// table and view introspection a helper reads a table through (its columns,
// its name, whether a value is one).
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
	getTableColumns,
	getTableName,
	getViewName,
	getViewSelectedFields,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	isTable,
	isView,
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

// Table definition, its introspection (indexes, keys, checks), and a second
// reference to a table for a self-join or a correlated subquery
export {
	alias,
	blob,
	check,
	foreignKey,
	getTableConfig,
	getViewConfig,
	index,
	integer,
	numeric,
	primaryKey,
	real,
	sqliteTable,
	sqliteTableCreator,
	sqliteView,
	text,
	unique,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type { InferInsertModel } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

// The table, relation and row types a plugin's typed surface names
// (plugin-auth's tables and scopes). A plugin's emitted declarations name a
// drizzle type through this module, the one it depends on; drizzle itself
// resolves from plugin-db alone, so a type missing here is emitted as a
// `drizzle-orm` import that resolves to nothing in a consumer, and every row
// read through it is `any`.
export type {
	InferInsertModel,
	InferSelectModel,
	Many,
	One,
	Relations,
	SQL,
} from "drizzle-orm";
export type {
	SQLiteColumn,
	SQLiteTable,
	SQLiteTableWithColumns,
} from "drizzle-orm/sqlite-core";

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
