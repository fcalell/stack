import { and, inArray, notInArray, type SQL, sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Selector } from "../schema.ts";

export interface SelectionOptions<Q> {
	/** The table's id column. */
	id: SQLiteColumn;
	/** The where clause of the read's query, the one its list procedure builds from the same input. */
	where: (query: Q) => SQL | undefined;
}

/** The rows a selector names, as a where clause: `{ ids }` those rows, `{ query, except }` every row the query matches but the excepted. A D1 statement binds at most 100 values, so a long `ids` or `except` is read in batches by the caller. */
export function selectionWhere<Q>(
	selection: Selector<Q>,
	options: SelectionOptions<Q>,
): SQL {
	const { id } = options;
	if ("ids" in selection) return inArray(id, selection.ids);
	const matching = options.where(selection.query);
	const kept =
		selection.except.length > 0 ? notInArray(id, selection.except) : undefined;
	return and(matching, kept) ?? sql`1 = 1`;
}

interface Selecting {
	select(fields: { id: SQLiteColumn }): {
		from(table: SQLiteTable): {
			where(where: SQL): PromiseLike<{ id: string }[]>;
		};
	};
}

/** The ids a selector names: its own for `{ ids }`, the matching rows' less the excepted for `{ query, except }`. */
export async function selectedIds<Q>(
	db: Selecting,
	selection: Selector<Q>,
	options: SelectionOptions<Q>,
): Promise<string[]> {
	if ("ids" in selection) return selection.ids;
	const rows = await db
		.select({ id: options.id })
		.from(options.id.table as SQLiteTable)
		.where(selectionWhere(selection, options));
	return rows.map((row) => row.id);
}
