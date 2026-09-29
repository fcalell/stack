import assert from "node:assert/strict";
import { test } from "node:test";
import {
	getTableColumns,
	getTableConfig,
	getTableName,
	getViewConfig,
	getViewName,
	getViewSelectedFields,
	index,
	integer,
	isTable,
	isView,
	sqliteTable,
	sqliteView,
	text,
} from "../src/orm.ts";

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
