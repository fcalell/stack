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
	text,
	unique,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type { InferInsertModel, SQL } from "drizzle-orm";
import type { TypedQueryBuilder } from "drizzle-orm/query-builders/query-builder";
import {
	sqliteView as drizzleView,
	type ManualViewBuilder,
	QueryBuilder,
	type SQLiteColumnBuilderBase,
	type SQLiteTable,
	type ViewBuilder,
} from "drizzle-orm/sqlite-core";

// A view's body with declared columns: raw `sql`, a query builder, or the
// callback that makes one. drizzle's `ManualViewBuilder.as` takes only `sql`
// and calls `.inlineParams()` on whatever it gets, so a builder or a callback
// died at schema load with `query.inlineParams is not a function` and
// `stack db generate` failed. A builder is turned into its `sql` here; the
// declared columns stay the view's typed shape.
type ViewBody =
	| SQL
	| TypedQueryBuilder<never>
	| ((qb: QueryBuilder) => TypedQueryBuilder<never>);

export interface ColumnsViewBuilder<
	TName extends string,
	TColumns extends Record<string, SQLiteColumnBuilderBase>,
> {
	existing(): ReturnType<ManualViewBuilder<TName, TColumns>["existing"]>;
	as(body: ViewBody): ReturnType<ManualViewBuilder<TName, TColumns>["as"]>;
}

// A view over a query: `sqliteView("name").as((qb) => qb.select()...)` (the
// columns are the select's), or with declared columns over `sql` or a builder:
// `sqliteView("name", { id: text("id") }).as(sql\`select ...\`)`. `.existing()`
// declares a view the database already holds.
export function sqliteView<TName extends string>(
	name: TName,
): ViewBuilder<TName>;
export function sqliteView<
	TName extends string,
	TColumns extends Record<string, SQLiteColumnBuilderBase>,
>(name: TName, columns: TColumns): ColumnsViewBuilder<TName, TColumns>;
export function sqliteView(
	name: string,
	columns?: Record<string, SQLiteColumnBuilderBase>,
): unknown {
	if (!columns) return drizzleView(name);
	const builder = drizzleView(name, columns);
	return {
		existing: () => builder.existing(),
		as: (body: ViewBody) => {
			const query =
				typeof body === "function" ? body(new QueryBuilder()) : body;
			const text =
				"inlineParams" in query
					? (query as SQL)
					: (query as TypedQueryBuilder<never>).getSQL();
			return builder.as(text);
		},
	};
}

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

// Full-text search (FTS5) over a table: declare the index in the schema with
// `ftsTable`, query it with `match`, `bm25` and `highlight`, and turn typed
// text into a safe query with `ftsQuery`. Page: `guide/fts.md`.
export type { FtsTable } from "./fts.ts";
export { bm25, ftsQuery, ftsTable, highlight, match } from "./fts.ts";
