import assert from "node:assert/strict";
import { test } from "node:test";
import { sqliteFile } from "./push.ts";

const options = { dialect: "sqlite" as const, path: "./data/app.sqlite" };

test("the dev path is the file when the env names none", () => {
	assert.equal(sqliteFile("/app", options, {}), "/app/data/app.sqlite");
});

test("DB_FILE wins over the path, relative to the project root", () => {
	assert.equal(
		sqliteFile("/app", options, { DB_FILE: "./scratch.sqlite" }),
		"/app/scratch.sqlite",
	);
	assert.equal(
		sqliteFile("/app", options, { DB_FILE: "/var/lib/a.sqlite" }),
		"/var/lib/a.sqlite",
	);
});

test("a renamed var is the one read", () => {
	const renamed = { ...options, fileVar: "TV_DB" };
	assert.equal(
		sqliteFile("/app", renamed, { DB_FILE: "/x.sqlite", TV_DB: "/y.sqlite" }),
		"/y.sqlite",
	);
});
