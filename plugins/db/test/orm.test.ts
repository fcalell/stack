import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
	alias,
	and,
	eq,
	gt,
	integer,
	notExists,
	sqliteTable,
	text,
} from "../src/orm.ts";

const notes = sqliteTable("notes", {
	id: integer("id").primaryKey(),
	body: text("body").notNull(),
	authorId: text("author_id"),
});

test("a correlated notExists over an aliased table returns only the outer rows the subquery leaves out", () => {
	const sqlite = new Database(":memory:");
	sqlite.exec(
		"CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL, author_id TEXT); INSERT INTO notes (id, body, author_id) VALUES (1, 'first', 'ada'), (2, 'second', 'ada'), (3, 'only', 'bob');",
	);
	const db = drizzle(sqlite);
	const later = alias(notes, "later");

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
