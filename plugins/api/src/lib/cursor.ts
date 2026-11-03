import {
	and,
	asc,
	desc,
	eq,
	getTableColumns,
	gt,
	lt,
	or,
	type SQL,
} from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { ApiError } from "../error.ts";

export const DEFAULT_LIMIT = 20;
// What a paginated procedure accepts unless it names its own `maxLimit`.
export const MAX_LIMIT = 100;
// What no procedure may name as its `maxLimit`: a page this large is a table
// scan the client asked for by mistake.
export const LIMIT_CEILING = 10_000;

export type Direction = "asc" | "desc";

/** One column a page orders by. */
export interface Order {
	column: SQLiteColumn;
	direction: Direction;
}

/** The `sort` a procedure declaring `sort: [...columns]` takes: a column key of the table and the way round. */
export interface SortInput {
	column: string;
	direction: Direction;
}

type CursorValue = string | number | boolean | Date;

// A moment travels as `{ $date }`: the cursor is JSON, which has no date, and
// the page that decodes it has no column type to say a number is one.
function toWire(value: CursorValue): unknown {
	return value instanceof Date ? { $date: value.getTime() } : value;
}

function fromWire(value: unknown): CursorValue | undefined {
	if (typeof value === "object" && value !== null && "$date" in value) {
		const at = (value as { $date: unknown }).$date;
		return typeof at === "number" ? new Date(at) : undefined;
	}
	return typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
		? value
		: undefined;
}

// Base64 of the JSON's UTF-8 bytes: a title is not Latin-1, which `btoa` takes.
function toBase64(text: string): string {
	let binary = "";
	for (const byte of new TextEncoder().encode(text)) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function fromBase64(encoded: string): string {
	const binary = atob(encoded);
	return new TextDecoder("utf-8", { fatal: true }).decode(
		Uint8Array.from(binary, (char) => char.charCodeAt(0)),
	);
}

/** A cursor for the row after which the next page continues: the order columns' values, in order, then the row's id. */
export function encodeCursor(
	values: readonly CursorValue[],
	id: string,
): string {
	return toBase64(JSON.stringify([values.map(toWire), id]));
}

export function decodeCursor(cursor: string): {
	values: CursorValue[];
	id: string;
} {
	const malformed = () =>
		new ApiError("BAD_REQUEST", { message: "Invalid cursor" });
	let parsed: unknown;
	try {
		parsed = JSON.parse(fromBase64(cursor));
	} catch {
		throw malformed();
	}
	if (!Array.isArray(parsed) || parsed.length !== 2) throw malformed();
	const [wire, id] = parsed as [unknown, unknown];
	if (!Array.isArray(wire) || typeof id !== "string" || !id) throw malformed();
	const values = wire.map(fromWire);
	if (values.some((value) => value === undefined)) throw malformed();
	return { values: values as CursorValue[], id };
}

/** A limit within 1 and `max` (`LIMIT_CEILING`, since the procedure's own `maxLimit` already bounded what it took), defaulting to `DEFAULT_LIMIT`. */
export function clampLimit(
	limit: number | undefined,
	max: number = LIMIT_CEILING,
): number {
	return Math.max(1, Math.min(limit ?? DEFAULT_LIMIT, max));
}

/** Drizzle's relational `columns`, narrowed to exclusion so `id` stays; the order columns stay too, whatever it names. */
export type ExcludedColumns<T> = {
	[K in Exclude<keyof T, "id">]?: false;
};

export interface PageOptions<C = object> {
	where?: SQL;
	limit?: number;
	/** The default order: one column, or several in precedence. `id` follows in the first one's direction. */
	orderBy: Order | readonly Order[];
	/** The caller's order, a procedure's `input.sort`: it replaces `orderBy` with one column of `idColumn`'s table, so a Table's header sort reaches the query. */
	sort?: SortInput | undefined;
	idColumn: SQLiteColumn;
	columns?: C;
}

export interface PaginateOptions<C = object> extends PageOptions<C> {
	cursor?: string;
}

export interface PaginatedResult<T> {
	data: T[];
	nextCursor: string | null;
}

// The order columns of a page: the caller's sort, else the default. An
// unknown sort column answers BAD_REQUEST (a procedure that declares `sort`
// already refuses it at the schema).
export function orderOf(options: PageOptions<unknown>): Order[] {
	const { sort, idColumn } = options;
	if (sort) {
		const column = getTableColumns(idColumn.table)[sort.column];
		if (!column) {
			throw new ApiError("BAD_REQUEST", {
				message: `Cannot sort by ${sort.column}`,
			});
		}
		return [{ column: column as SQLiteColumn, direction: sort.direction }];
	}
	return Array.isArray(options.orderBy)
		? [...options.orderBy]
		: [options.orderBy as Order];
}

// The row key each order column is read from: the table's key for it.
function keysOf(orders: readonly Order[], idColumn: SQLiteColumn): string[] {
	const columns = Object.entries(getTableColumns(idColumn.table));
	return orders.map(({ column }) => {
		const found = columns.find(([, each]) => each === column);
		if (!found) {
			throw new Error(
				`paginate: the order column ${column.name} is not a column of the table ${idColumn.table}`,
			);
		}
		return found[0];
	});
}

// The rows strictly after the cursor's, in order: for columns c1..cn and id,
// (c1 > v1) or (c1 = v1 and c2 > v2) or ... or (all equal and id > vid), each
// `>` a `<` in a descending column; the id follows the first column's way.
function after(
	orders: readonly Order[],
	idColumn: SQLiteColumn,
	cursor: { values: readonly CursorValue[]; id: string },
): SQL {
	if (cursor.values.length !== orders.length) {
		throw new ApiError("BAD_REQUEST", { message: "Invalid cursor" });
	}
	const steps = [
		...orders.map((order, at) => ({
			column: order.column,
			direction: order.direction,
			value: cursor.values[at] as CursorValue,
		})),
		{
			column: idColumn,
			direction: orders[0]?.direction ?? "asc",
			value: cursor.id,
		},
	];
	const branches = steps.map((step, at) => {
		const equal = steps
			.slice(0, at)
			.map((each) => eq(each.column, each.value as never));
		const past =
			step.direction === "desc"
				? lt(step.column, step.value as never)
				: gt(step.column, step.value as never);
		return and(...equal, past);
	});
	return or(...branches) as SQL;
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

// Drizzle's `columns` with the order columns and the id put back, which the
// cursor reads off the last row.
function withKept<C>(
	columns: C | undefined,
	keys: readonly string[],
): C | undefined {
	if (!columns) return undefined;
	const kept = { ...columns } as Record<string, unknown>;
	for (const key of [...keys, "id"]) delete kept[key];
	return kept as C;
}

export function orderSql(
	orders: readonly Order[],
	idColumn: SQLiteColumn,
): SQL[] {
	const direction = orders[0]?.direction ?? "asc";
	const by = direction === "desc" ? desc : asc;
	return [
		...orders.map((order) =>
			order.direction === "desc" ? desc(order.column) : asc(order.column),
		),
		by(idColumn),
	];
}

export async function paginate<
	T extends { id: string },
	const C extends ExcludedColumns<T> = object,
>(
	queryBuilder: QueryBuilder<T, NoInfer<C>>,
	options: PaginateOptions<C>,
): Promise<PaginatedResult<Omit<T, keyof C>>> {
	const limit = clampLimit(options.limit);
	const { idColumn } = options;
	const orders = orderOf(options);
	const keys = keysOf(orders, idColumn);

	let where = options.where;
	if (options.cursor) {
		const cursorCondition = after(
			orders,
			idColumn,
			decodeCursor(options.cursor),
		);
		where = where ? and(where, cursorCondition) : cursorCondition;
	}

	const columns = withKept(options.columns, keys);
	const rows = await queryBuilder.findMany({
		...(columns ? { columns } : {}),
		where,
		limit: limit + 1,
		orderBy: orderSql(orders, idColumn),
	});

	const hasMore = rows.length > limit;
	const data = hasMore ? rows.slice(0, -1) : rows;
	const lastItem = data[data.length - 1] as Record<string, unknown> | undefined;

	return {
		data: data as Omit<T, keyof C>[],
		nextCursor:
			hasMore && lastItem
				? encodeCursor(
						keys.map((key) => {
							const value = lastItem[key];
							if (value === null || value === undefined) {
								throw new Error(
									`paginate: the row's ${key} is empty, and a keyset cursor needs a value to continue past. Sort by a column that is never null.`,
								);
							}
							return value as CursorValue;
						}),
						lastItem.id as string,
					)
				: null,
	};
}
