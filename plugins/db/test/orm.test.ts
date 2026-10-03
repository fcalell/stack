import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
	alias,
	and,
	eq,
	getTableColumns,
	getTableConfig,
	getTableName,
	getViewConfig,
	getViewName,
	getViewSelectedFields,
	gt,
	index,
	integer,
	isTable,
	isView,
	notExists,
	type SQL,
	type sql,
	sqliteTable,
	sqliteView,
	text,
} from "../src/orm.ts";

// Compile-time equality, so a lost or changed export fails `check-types`.
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function assertType<T extends true>(_: T): void {}

const notes = sqliteTable(
	"notes",
	{
		id: integer("id").primaryKey(),
		body: text("body").notNull(),
		authorId: text("author_id"),
	},
	(table) => [index("notes_author").on(table.authorId)],
);
const recent = sqliteView("recent_notes").as((qb) =>
	qb.select({ id: notes.id }).from(notes),
);

test("a table is read through the re-exported introspection", () => {
	assert.equal(isTable(notes), true);
	assert.equal(getTableName(notes), "notes");
	// A helper counts a row's bound parameters from its columns.
	assert.deepEqual(Object.keys(getTableColumns(notes)), [
		"id",
		"body",
		"authorId",
	]);
	const config = getTableConfig(notes);
	assert.equal(config.name, "notes");
	assert.deepEqual(
		config.indexes.map((entry) => entry.config.name),
		["notes_author"],
	);
});

test("a view is read through the re-exported introspection", () => {
	assert.equal(isView(recent), true);
	assert.equal(isTable(recent), false);
	assert.equal(getViewName(recent), "recent_notes");
	assert.deepEqual(Object.keys(getViewSelectedFields(recent)), ["id"]);
	assert.equal(getViewConfig(recent).name, "recent_notes");
});

test("a correlated notExists over an aliased table returns only the outer rows the subquery leaves out", () => {
	const sqlite = new Database(":memory:");
	sqlite.exec(
		"CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL, author_id TEXT); INSERT INTO notes (id, body, author_id) VALUES (1, 'first', 'ada'), (2, 'second', 'ada'), (3, 'only', 'bob');",
	);
	const db = drizzle(sqlite);
	const later = alias(notes, "later");
	// @ts-expect-error the alias carries only the table's own columns
	later.title;

	const query = db
		.select({ id: notes.id })
		.from(notes)
		.where(
			notExists(
				db
					.select({ id: later.id })
					.from(later)
					.where(
						and(eq(later.authorId, notes.authorId), gt(later.id, notes.id)),
					),
			),
		)
		.orderBy(notes.id);

	const rendered = query.toSQL().sql;
	assert.ok(rendered.includes('"notes" "later"'), rendered);
	assert.ok(rendered.includes('"later"."author_id"'), rendered);
	assert.ok(rendered.includes('"notes"."author_id"'), rendered);
	assert.deepEqual(
		query.all().map((row) => row.id),
		[2, 3],
	);
	sqlite.close();
});

test("a fragment built with sql is the re-exported SQL type", () => {
	assertType<Equal<SQL, ReturnType<typeof sql>>>(true);
});
