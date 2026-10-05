import { and, asc, desc, eq, gt, lt, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { ApiError } from "../error.ts";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function encodeCursor(createdAt: Date, id: string): string {
	return btoa(`${createdAt.getTime()}:${id}`);
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
	const malformed = () =>
		new ApiError("BAD_REQUEST", { message: "Invalid cursor" });
	let decoded: string;
	try {
		decoded = atob(cursor);
	} catch {
		throw malformed();
	}
	const separatorIndex = decoded.indexOf(":");
	if (separatorIndex === -1) throw malformed();

	const timestamp = Number.parseInt(decoded.slice(0, separatorIndex), 10);
	const id = decoded.slice(separatorIndex + 1);
	if (Number.isNaN(timestamp) || !id) throw malformed();
	return { createdAt: new Date(timestamp), id };
}

export function clampLimit(limit: number | undefined): number {
	const n = limit ?? DEFAULT_LIMIT;
	return Math.max(1, Math.min(n, MAX_LIMIT));
}

/** Drizzle's relational `columns`, narrowed to exclusion so `id` and `createdAt` stay. */
export type ExcludedColumns<T> = {
	[K in Exclude<keyof T, "id" | "createdAt">]?: false;
};

export interface PaginateOptions<C = object> {
	where?: SQL;
	cursor?: string;
	limit?: number;
	orderBy: {
		column: SQLiteColumn;
		direction: "asc" | "desc";
	};
	idColumn: SQLiteColumn;
	columns?: C;
}

export interface PaginatedResult<T> {
	data: T[];
	nextCursor: string | null;
}

interface QueryBuilder<T, C> {
	findMany(config: {
		columns?: C;
		where?: SQL;
		limit?: number;
		orderBy?: SQL[];
	}): Promise<T[]>;
}

export async function paginate<
	T extends { id: string; createdAt: Date },
	C extends ExcludedColumns<T> = object,
>(
	queryBuilder: QueryBuilder<T, C>,
	options: PaginateOptions<C>,
): Promise<PaginatedResult<Omit<T, keyof C>>> {
	const limit = clampLimit(options.limit);
	const { orderBy, idColumn } = options;
	const isDesc = orderBy.direction === "desc";

	let where = options.where;

	if (options.cursor) {
		const decoded = decodeCursor(options.cursor);
		const cursorCondition = or(
			isDesc
				? lt(orderBy.column, decoded.createdAt)
				: gt(orderBy.column, decoded.createdAt),
			and(
				eq(orderBy.column, decoded.createdAt),
				isDesc ? lt(idColumn, decoded.id) : gt(idColumn, decoded.id),
			),
		);
		where = where ? and(where, cursorCondition) : cursorCondition;
	}

	const rows = await queryBuilder.findMany({
		...(options.columns ? { columns: options.columns } : {}),
		where,
		limit: limit + 1,
		orderBy: isDesc
			? [desc(orderBy.column), desc(idColumn)]
			: [asc(orderBy.column), asc(idColumn)],
	});

	const hasMore = rows.length > limit;
	const data = hasMore ? rows.slice(0, -1) : rows;
	const lastItem = data[data.length - 1];

	return {
		data: data as Omit<T, keyof C>[],
		nextCursor:
			hasMore && lastItem
				? encodeCursor(lastItem.createdAt, lastItem.id)
				: null,
	};
}
