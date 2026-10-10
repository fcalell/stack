import assert from "node:assert/strict";
import { test } from "node:test";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import dbRuntime from "../src/server/index.ts";

const notes = sqliteTable("notes", {
	id: integer("id").primaryKey(),
	body: text("body").notNull(),
});
const schema = { notes };

test("a missing var throws with the var's name", () => {
	const runtime = dbRuntime({ fileVar: "STACK_TEST_DB_FILE", schema });
	assert.throws(() => runtime.validateEnv?.({}), /STACK_TEST_DB_FILE/);
	assert.throws(() => runtime.context({}, {}), /STACK_TEST_DB_FILE/);
});
