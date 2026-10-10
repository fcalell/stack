import type { SQL } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { paginate } from "../src/lib/cursor.ts";

// `tsc` runs over this file in `pnpm check`: each `@ts-expect-error` line must
// be an error. Never called.

const items = sqliteTable("items", {
	id: text("id").primaryKey(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	name: text("name"),
});

type Row = { id: string; createdAt: Date; name: string | null };

// Columns infer from the options alone against a wide query builder.
async function _wideBuilder() {
	type Wide = {
		columns?: Partial<Record<keyof Row, boolean>>;
		where?: SQL;
		limit?: number;
		orderBy?: SQL[];
	};
	const wide = { findMany: async (_config: Wide): Promise<Row[]> => [] };
	const res = await paginate(wide, {
		idColumn: items.id,
		orderBy: { column: items.createdAt, direction: "desc" },
		columns: { name: false },
	});
	// @ts-expect-error name is dropped from the answer's row type
	res.data[0]?.name;
	res.data[0]?.id;
	res.data[0]?.createdAt;
}
