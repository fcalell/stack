import { and, eq, gt, lt, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function encodeCursor(createdAt: Date, id: string): string {
	return btoa(`${createdAt.getTime()}:${id}`);
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
	try {
		const decoded = atob(cursor);
		const separatorIndex = decoded.indexOf(":");
		if (separatorIndex === -1) {
			throw new Error("Invalid cursor");
		}

		const timestamp = Number.parseInt(decoded.slice(0, separatorIndex), 10);
		const id = decoded.slice(separatorIndex + 1);

		if (Number.isNaN(timestamp) || !id) {
			throw new Error("Invalid cursor");
		}
		return { createdAt: new Date(timestamp), id };
	} catch (error) {
		if (error instanceof Error && error.message === "Invalid cursor") {
			throw error;
		}
		throw new Error("Invalid cursor format");
	}
}

export function clampLimit(limit: number | undefined): number {
	const n = limit ?? DEFAULT_LIMIT;
	return Math.max(1, Math.min(n, MAX_LIMIT));
}

export interface PaginateOptions {
	where?: SQL;
	cursor?: string;
	limit?: number;
	orderBy: {
		column: SQLiteColumn;
		direction: "asc" | "desc";
	};
	idColumn: SQLiteColumn;
}

export interface PaginatedResult<T> {
	data: T[];
	nextCursor: string | null;
}

export async function paginate<T extends { id: string; createdAt: Date }>(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle query builder type
	queryBuilder: any,
	options: PaginateOptions,
): Promise<PaginatedResult<T>> {
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
		where,
		limit: limit + 1,
		orderBy: isDesc ? [orderBy.column, idColumn] : [orderBy.column, idColumn],
	});

	const hasMore = rows.length > limit;
	const data = hasMore ? rows.slice(0, -1) : rows;
	const lastItem = data[data.length - 1];

	return {
		data,
		nextCursor:
			hasMore && lastItem
				? encodeCursor(lastItem.createdAt, lastItem.id)
				: null,
	};
}
