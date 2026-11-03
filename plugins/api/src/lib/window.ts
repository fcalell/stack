import { count, inArray, type SQL } from "drizzle-orm";
import type {
	BaseSQLiteDatabase,
	SQLiteColumn,
	SQLiteSelect,
	SQLiteTable,
} from "drizzle-orm/sqlite-core";
import { ApiError } from "../error.ts";
import {
	clampLimit,
	type Direction,
	type ExcludedColumns,
	type Orderable,
	orderSql,
	type SortInput,
	sortOf,
} from "./cursor.ts";

/** One thing a window orders by: a column or an SQL expression, and the way round. */
export interface WindowOrder {
	column: Orderable;
	direction: Direction;
}

export interface WindowOptions<C = object, K extends string = string> {
	where?: SQL;
	limit?: number;
	/** The default order: one column or expression, or several in precedence. `id` follows in the first one's direction. */
	orderBy: WindowOrder | readonly WindowOrder[];
	/** The caller's order, a procedure's `input.sort`: it replaces `orderBy` with what `sorts` maps its key to, so a Table's header sort reaches the query. */
	sort?: SortInput<K> | undefined;
	/** What each sort key orders by: a column, or an expression (`sql\`${tracks.title} collate nocase\``). A key not named here sorts by the column of `idColumn`'s table of that name. */
	sorts?: Record<K, Orderable>;
	idColumn: SQLiteColumn;
	columns?: C;
	/** The page's first row, a procedure's `input.offset`. */
	offset?: number;
	/** The database: `context.db`. */
	db: BaseSQLiteDatabase<
		"sync" | "async",
		unknown, // biome-ignore lint/suspicious/noExplicitAny: the schema is the consumer's
		any
	>;
	/** Joins the query selects the ids and the count from (it starts at `idColumn`'s table), so `where` and the order may name a joined table: `(query) => query.innerJoin(trackSearch, eq(trackSearch.rowid, tracks.seq))`. */
	join?: (query: SQLiteSelect) => SQLiteSelect;
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

const BATCH = 90;

function orders<K extends string>(
	options: WindowOptions<object, K>,
): WindowOrder[] {
	const { sort, idColumn } = options;
	if (sort) {
		const found = sortOf(sort.column, options.sorts, idColumn);
		if (!found) {
			throw new ApiError("BAD_REQUEST", {
				message: `Cannot sort by ${sort.column}`,
			});
		}
		return [{ column: found, direction: sort.direction }];
	}
	return Array.isArray(options.orderBy)
		? [...options.orderBy]
		: [options.orderBy as WindowOrder];
}

/**
 * The answer of a `paginated: "window"` procedure: one page at `offset` and the filter's total, both from the one `where`, in the order `orderBy` (or the caller's `sort`) gives, then `id`.
 *
 * The order is decided on the ids alone (a sorter that holds a key and an id, not every column of a wide row), then the page's rows are read by id: the cost of a deep offset stays a narrow sort. The first page of a query with no `join` is read in one statement, since a top-N sort is cheap.
 */
export async function paginateWindow<
	T extends { id: string },
	const C extends ExcludedColumns<T> = object,
	K extends string = string,
>(
	queryBuilder: QueryBuilder<T, NoInfer<C>>,
	options: WindowOptions<C, K>,
): Promise<WindowResult<Omit<T, keyof C>>> {
	const limit = clampLimit(options.limit);
	const offset = Math.max(0, Math.trunc(options.offset ?? 0));
	const { idColumn, where, db, join } = options;
	const table = idColumn.table as SQLiteTable;
	const orderBy = orderSql(
		orders(options as WindowOptions<object, K>),
		idColumn,
	);
	const columns = options.columns ? { columns: options.columns } : {};

	// A fresh query over the one source: the ids and the count must agree.
	const source = (fields: Record<string, SQLiteColumn | SQL>) => {
		const query = db.select(fields).from(table).$dynamic() as SQLiteSelect;
		return (join ? join(query) : query).where(where);
	};
	const total = async (): Promise<number> => {
		const [row] = (await source({ n: count() })) as { n: number }[];
		return row?.n ?? 0;
	};

	if (offset === 0 && !join) {
		const [data, n] = await Promise.all([
			queryBuilder.findMany({ ...columns, where, limit, orderBy }),
			total(),
		]);
		return { data: data as Omit<T, keyof C>[], total: n, offset };
	}

	const [ids, n] = await Promise.all([
		(async () =>
			(
				(await source({ id: idColumn })
					.orderBy(...orderBy)
					.limit(limit)
					.offset(offset)) as { id: string }[]
			).map((row) => row.id))(),
		total(),
	]);
	if (ids.length === 0) return { data: [], total: n, offset };
	// A D1 statement binds at most 100 values: a long page is read in batches.
	const batches: string[][] = [];
	for (let at = 0; at < ids.length; at += BATCH) {
		batches.push(ids.slice(at, at + BATCH));
	}
	const rows = (
		await Promise.all(
			batches.map((batch) =>
				queryBuilder.findMany({ ...columns, where: inArray(idColumn, batch) }),
			),
		)
	).flat();
	const byId = new Map(rows.map((row) => [row.id, row]));
	const data = ids.flatMap((id) => {
		const row = byId.get(id);
		return row ? [row] : [];
	});
	return { data: data as Omit<T, keyof C>[], total: n, offset };
}
