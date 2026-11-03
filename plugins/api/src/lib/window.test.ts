import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { paginate } from "./cursor.ts";
import { paginateWindow } from "./window.ts";

const tasks = sqliteTable("tasks", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	points: integer("points").notNull(),
});
const tags = sqliteTable("tags", {
	taskId: text("task_id").notNull(),
	name: text("name").notNull(),
});

function setup() {
	const sqlite = new Database(":memory:");
	sqlite.exec(
		"create table tasks (id text primary key, title text not null, points integer not null); create table tags (task_id text not null, name text not null)",
	);
	const db = drizzle(sqlite, { schema: { tasks, tags } });
	const titles = ["b", "A", "c", "B", "a", "C"];
	titles.forEach((title, at) => {
		db.insert(tasks)
			.values({ id: `t${at}`, title, points: at })
			.run();
		if (at % 2 === 0)
			db.insert(tags)
				.values({ taskId: `t${at}`, name: "x" })
				.run();
	});
	return db;
}

const nocase = sql`${tasks.title} collate nocase`;

test("a window orders by an SQL expression, first page and deep page", async () => {
	const db = setup();
	const options = {
		db,
		idColumn: tasks.id,
		orderBy: { column: nocase, direction: "asc" as const },
		limit: 2,
	};
	const first = await paginateWindow(db.query.tasks, options);
	assert.deepEqual(
		first.data.map((r) => r.id),
		["t1", "t4"],
	);
	assert.equal(first.total, 6);
	const deep = await paginateWindow(db.query.tasks, { ...options, offset: 2 });
	assert.deepEqual(
		deep.data.map((r) => r.id),
		["t0", "t3"],
	);
	const last = await paginateWindow(db.query.tasks, { ...options, offset: 4 });
	assert.deepEqual(
		last.data.map((r) => r.id),
		["t2", "t5"],
	);
	const none = await paginateWindow(db.query.tasks, { ...options, offset: 9 });
	assert.deepEqual(none.data, []);
});

test("sorts maps a key to a column or an expression, and refuses others", async () => {
	const db = setup();
	const base = {
		db,
		idColumn: tasks.id,
		orderBy: { column: tasks.id, direction: "asc" as const },
		sorts: { title: nocase, points: tasks.points },
		limit: 3,
	};
	const byTitle = await paginateWindow(db.query.tasks, {
		...base,
		sort: { column: "title", direction: "desc" },
	});
	assert.deepEqual(
		byTitle.data.map((r) => r.id),
		["t5", "t2", "t3"],
	);
	await assert.rejects(
		paginateWindow(db.query.tasks, {
			...base,
			sort: { column: "constructor" as "title", direction: "asc" },
		}),
		/Cannot sort by/,
	);
});

test("a window pages a joined query", async () => {
	const db = setup();
	const options = {
		db,
		idColumn: tasks.id,
		orderBy: { column: tasks.points, direction: "desc" as const },
		join: (
			query: Parameters<
				NonNullable<Parameters<typeof paginateWindow>[1]["join"]>
			>[0],
		) => query.innerJoin(tags, eq(tags.taskId, tasks.id)),
		where: eq(tags.name, "x"),
		limit: 2,
	};
	const first = await paginateWindow(db.query.tasks, options);
	assert.deepEqual(
		first.data.map((r) => r.id),
		["t4", "t2"],
	);
	assert.equal(first.total, 3);
	const second = await paginateWindow(db.query.tasks, {
		...options,
		offset: 2,
	});
	assert.deepEqual(
		second.data.map((r) => r.id),
		["t0"],
	);
});

test("a cursor page takes the same sorts map", async () => {
	const db = setup();
	const page = await paginate(db.query.tasks, {
		idColumn: tasks.id,
		orderBy: { column: tasks.id, direction: "asc" },
		sorts: { name: tasks.title },
		sort: { column: "name", direction: "asc" },
		limit: 2,
	});
	assert.deepEqual(
		page.data.map((r) => r.id),
		["t1", "t3"],
	);
	assert.ok(page.nextCursor);
});
