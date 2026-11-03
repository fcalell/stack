import type { SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import {
	clampLimit,
	type ExcludedColumns,
	orderOf,
	orderSql,
	type PageOptions,
} from "./cursor.ts";

export interface WindowOptions<C = object> extends PageOptions<C> {
	/** The page's first row, a procedure's `input.offset`. */
	offset?: number;
	/** The database the count runs on: `context.db`. */
	db: {
		$count(source: SQLiteTable, filters?: SQL): Promise<number>;
	};
}

export interface WindowResult<T> {
	data: T[];
	/** Every row the filter matches: the scroller's length. */
	total: number;
	offset: number;
}

interface QueryBuilder<T, C> {
	findMany(config: {
		columns?: C;
		where?: SQL;
		limit?: number;
		offset?: number;
		orderBy?: SQL[];
	}): Promise<T[]>;
}

/** The answer of a `paginated: "window"` procedure: one page at `offset` and the filter's total, both from the one `where`, in the order `orderBy` (or the caller's `sort`) gives, then `id`. */
export async function paginateWindow<
	T extends { id: string },
	const C extends ExcludedColumns<T> = object,
>(
	queryBuilder: QueryBuilder<T, NoInfer<C>>,
	options: WindowOptions<C>,
): Promise<WindowResult<Omit<T, keyof C>>> {
	const limit = clampLimit(options.limit);
	const offset = Math.max(0, Math.trunc(options.offset ?? 0));
	const { idColumn, where } = options;
	const [data, total] = await Promise.all([
		queryBuilder.findMany({
			...(options.columns ? { columns: options.columns } : {}),
			where,
			limit,
			offset,
			orderBy: orderSql(orderOf(options), idColumn),
		}),
		options.db.$count(idColumn.table as SQLiteTable, where),
	]);
	return { data: data as Omit<T, keyof C>[], total, offset };
}
