import assert from "node:assert/strict";
import { test } from "node:test";
import { ORPCError } from "@fcalell/plugin-api/testing";
import { testing } from "../../../.stack/testing.ts";

test("a created note lists first", async () => {
	await using app = await testing.boot();
	const client = app.client();
	await client.notes.create({ title: "First" });
	await client.notes.create({ title: "Second" });
	const notes = await client.notes.list();
	assert.deepEqual(
		notes.map((note) => note.title),
		["Second", "First"],
	);
});

test("a blank title is refused", async () => {
	await using app = await testing.boot();
	await assert.rejects(
		app.client().notes.create({ title: "  " }),
		(error) => error instanceof ORPCError && error.code === "BAD_REQUEST",
	);
});
