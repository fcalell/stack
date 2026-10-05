import assert from "node:assert/strict";
import { test } from "node:test";
import type { SQL } from "drizzle-orm";
import {
	integer,
	SQLiteSyncDialect,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { ApiError } from "../src/error.ts";
import { decodeCursor, encodeCursor, paginate } from "../src/lib/cursor.ts";

const items = sqliteTable("items", {
	id: text("id").primaryKey(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	name: text("name"),
});

type Row = { id: string; createdAt: Date; name: string | null };
type Config = {
	columns?: { name?: false };
	where?: SQL;
	limit?: number;
	orderBy?: SQL[];
};

const dialect = new SQLiteSyncDialect();
const render = (term: SQL) => dialect.sqlToQuery(term);

function stub(rows: Row[] = []) {
	const calls: Config[] = [];
	return {
		calls,
		findMany: async (config: Config) => {
			calls.push(config);
			return rows;
		},
	};
}

const base = { idColumn: items.id };
const desc = { column: items.createdAt, direction: "desc" as const };
const asc = { column: items.createdAt, direction: "asc" as const };
const row = (n: number): Row => ({
	id: `r${n}`,
	createdAt: new Date(n * 1000),
	name: null,
});

test("a desc page orders the order column and the id descending", async () => {
	const q = stub();
	await paginate(q, { ...base, orderBy: desc });
	const terms = (q.calls[0]?.orderBy ?? []).map((t) => render(t).sql);
	assert.equal(terms.length, 2);
	assert.match(terms[0] ?? "", /"created_at" desc$/);
	assert.match(terms[1] ?? "", /"id" desc$/);
});

test("an asc page orders the order column and the id ascending", async () => {
	const q = stub();
	await paginate(q, { ...base, orderBy: asc });
	const terms = (q.calls[0]?.orderBy ?? []).map((t) => render(t).sql);
	assert.equal(terms.length, 2);
	assert.match(terms[0] ?? "", /"created_at" asc$/);
	assert.match(terms[1] ?? "", /"id" asc$/);
});

test("a desc cursor keeps the rows before it", async () => {
	const cursor = encodeCursor(new Date(5000), "abc");
	for (const [orderBy, op] of [
		[desc, "<"],
		[asc, ">"],
	] as const) {
		const q = stub();
		await paginate(q, { ...base, orderBy, cursor });
		const { sql, params } = render(q.calls[0]?.where as SQL);
		assert.match(sql, new RegExp(`"created_at" \\${op} \\?`));
		assert.ok(
			sql.includes(
				`("items"."created_at" ${op} ? or ("items"."created_at" = ? and "items"."id" ${op} ?))`,
			),
			sql,
		);
		assert.match(sql, /"created_at" = \?/);
		assert.match(sql, new RegExp(`"id" \\${op} \\?`));
		assert.ok(params.includes(5000));
		assert.ok(params.includes("abc"));
	}
});

test("a caller's where is kept beside the cursor condition", async () => {
	const { eq } = await import("drizzle-orm");
	const where = eq(items.id, "mine");
	const q = stub();
	await paginate(q, { ...base, orderBy: desc, where });
	assert.equal(q.calls[0]?.where, where);

	const cursor = encodeCursor(new Date(5000), "abc");
	await paginate(q, { ...base, orderBy: desc, where, cursor });
	const { sql, params } = render(q.calls[1]?.where as SQL);
	assert.match(sql, /"id" = \?/);
	assert.ok(params.includes("mine"));
	assert.match(sql, /^\("items"\."id" = \? and \(/);
	assert.ok(sql.indexOf('"id" = ?') < sql.indexOf('"created_at" <'));
});

test("a full page answers the cursor of its last row", async () => {
	const q = stub([row(3), row(2), row(1)]);
	const res = await paginate(q, { ...base, orderBy: desc, limit: 2 });
	assert.deepEqual(res.data, [row(3), row(2)]);
	assert.ok(res.nextCursor);
	const decoded = decodeCursor(res.nextCursor);
	assert.equal(decoded.id, "r2");
	assert.equal(decoded.createdAt.getTime(), 2000);
});

test("the last page answers no cursor", async () => {
	for (const rows of [[row(2), row(1)], [row(1)]]) {
		const q = stub(rows);
		const res = await paginate(q, { ...base, orderBy: desc, limit: 2 });
		assert.deepEqual(res.data, rows);
		assert.equal(res.nextCursor, null);
	}
});

test("the limit is clamped before the query", async () => {
	for (const [limit, asked] of [
		[0, 2],
		[500, 101],
		[undefined, 21],
	] as const) {
		const q = stub();
		await paginate(q, { ...base, orderBy: desc, limit });
		assert.equal(q.calls[0]?.limit, asked);
	}
});

test("a malformed cursor is refused before the query", async () => {
	const cursors = [
		"%%%not base64",
		btoa("nocolon"),
		btoa("abc:id"),
		btoa("123:"),
	];
	for (const cursor of cursors) {
		const q = stub();
		await assert.rejects(
			paginate(q, { ...base, orderBy: desc, cursor }),
			(error) => error instanceof ApiError && error.code === "BAD_REQUEST",
		);
		assert.equal(q.calls.length, 0);
	}
});

test("columns pass to the query and leave the row type", async () => {
	const q = stub([row(1)]);
	const columns = { name: false } as const;
	const res = await paginate(q, { ...base, orderBy: desc, columns });
	assert.equal(q.calls[0]?.columns, columns);
	// @ts-expect-error name is dropped from the answer's row type
	res.data[0]?.name;
	assert.ok(res.data[0]?.id);

	const plain = stub([row(1)]);
	const all = await paginate<Row, object>(plain, { ...base, orderBy: desc });
	assert.equal("columns" in (plain.calls[0] ?? {}), false);
	assert.equal(all.data[0]?.name, null);
});

test("columns infer from the options alone against a wide query builder", async () => {
	type Wide = {
		columns?: Partial<Record<keyof Row, boolean>>;
		where?: SQL;
		limit?: number;
		orderBy?: SQL[];
	};
	const wide = { findMany: async (_config: Wide) => [row(1)] };
	const res = await paginate(wide, {
		...base,
		orderBy: desc,
		columns: { name: false },
	});
	// @ts-expect-error name is dropped from the answer's row type
	res.data[0]?.name;
	assert.ok(res.data[0]?.id);
	assert.ok(res.data[0]?.createdAt);
});
