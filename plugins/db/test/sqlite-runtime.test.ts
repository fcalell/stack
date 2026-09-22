import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import dbRuntime from "../src/server/index.ts";

const notes = sqliteTable("notes", {
	id: integer("id").primaryKey(),
	body: text("body").notNull(),
});
const schema = { notes };

test("context opens the file DB_FILE names and reads its rows", async () => {
	const file = join(mkdtempSync(join(tmpdir(), "stack-sqlite-")), "app.sqlite");
	const seed = new Database(file);
	seed.exec(
		"CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL); INSERT INTO notes (id, body) VALUES (1, 'hello');",
	);
	seed.close();
	process.env.DB_FILE = file;

	const runtime = dbRuntime({ fileVar: "DB_FILE", schema });
	runtime.validateEnv?.(process.env);
	const { db } = await runtime.context(process.env, {});

	assert.deepEqual(db.select().from(notes).all(), [{ id: 1, body: "hello" }]);
});

test("a missing var throws with the var's name", () => {
	const runtime = dbRuntime({ fileVar: "STACK_TEST_DB_FILE", schema });
	assert.throws(() => runtime.validateEnv?.({}), /STACK_TEST_DB_FILE/);
	assert.throws(() => runtime.context({}, {}), /STACK_TEST_DB_FILE/);
});
