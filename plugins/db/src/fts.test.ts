import assert from "node:assert/strict";
import { test } from "node:test";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { FTS_KEY, ftsQuery, ftsTable } from "./fts.ts";
import {
	deadFtsTriggers,
	migratedFts,
	pendingFtsMigrations,
	resyncRecreatedContent,
} from "./node/fts.ts";

const tasks = sqliteTable("tasks", {
	id: integer("id").primaryKey(),
	title: text("title").notNull(),
	ownerName: text("owner_name").notNull(),
	plays: integer("plays").notNull().default(0),
});

const search = ftsTable("task_search", {
	content: tasks,
	columns: ["title", "ownerName"],
	prefix: [2, 3],
});

test("ftsTable maps columns to their database names and watches only them", () => {
	const def = search[FTS_KEY];
	assert.deepEqual(def.columns, ["title", "owner_name"]);
	assert.match(def.create, /fts5\(`title`, `owner_name`, content=`tasks`/);
	assert.match(def.create, /prefix='2 3'/);
	const update = def.triggers.find((t) => t.name === "task_search_au");
	assert.match(
		update?.sql ?? "",
		/AFTER UPDATE OF `id`, `title`, `owner_name`/,
	);
	assert.doesNotMatch(update?.sql ?? "", /plays/);
});

test("ftsTable refuses a content table without an integer key", () => {
	const textKeyed = sqliteTable("t", { id: text("id").primaryKey() });
	assert.throws(
		() => ftsTable("t_search", { content: textKeyed, columns: ["id"] }),
		/integer primary key/,
	);
});

test("ftsQuery quotes every word and prefixes the last", () => {
	assert.equal(ftsQuery("daft pu"), '"daft" "pu"*');
	assert.equal(ftsQuery('a "b" OR (c'), '"a" "b" "OR" "c"*');
	assert.equal(ftsQuery("daft pu", { prefix: false }), '"daft" "pu"');
	assert.equal(ftsQuery("  -- "), null);
});

test("an index migrates once, again when it changes, and drops when removed", () => {
	const def = search[FTS_KEY];
	const [created] = pendingFtsMigrations([def], new Map());
	assert.match(created?.sql ?? "", /^-- stack:fts task_search [0-9a-f]{8}\n/);
	assert.doesNotMatch(created?.sql ?? "", /DROP TABLE/);

	assert.deepEqual(
		pendingFtsMigrations([def], new Map([[def.name, def.hash]])),
		[],
	);

	const [changed] = pendingFtsMigrations([def], new Map([[def.name, "0"]]));
	assert.match(changed?.sql ?? "", /DROP TABLE IF EXISTS `task_search`/);

	const [dropped] = pendingFtsMigrations([], new Map([[def.name, def.hash]]));
	assert.equal(dropped?.name, "fts_drop_task_search");
});

test("migratedFts reads the newest marker per index", async () => {
	const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const dir = mkdtempSync(join(tmpdir(), "fts-"));
	try {
		writeFileSync(
			join(dir, "0001_a.sql"),
			"-- stack:fts a 11111111\nSELECT 1;",
		);
		writeFileSync(
			join(dir, "0002_b.sql"),
			"-- stack:fts a 22222222\nSELECT 1;",
		);
		writeFileSync(join(dir, "0003_c.sql"), "-- stack:fts b 33333333\n");
		writeFileSync(join(dir, "0004_d.sql"), "-- stack:fts-drop b\n");
		assert.deepEqual([...migratedFts(dir)], [["a", "22222222"]]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("a migration that recreates the content table re-syncs the index", () => {
	const def = search[FTS_KEY];
	const recreate =
		"INSERT INTO `__new_tracks` SELECT * FROM `tasks`;--> statement-breakpoint\nDROP TABLE `tasks`;--> statement-breakpoint\nALTER TABLE `__new_tracks` RENAME TO `tasks`;\n";
	const synced = resyncRecreatedContent(recreate, [def]);
	assert.match(synced, /CREATE TRIGGER `task_search_ai`/);
	assert.match(synced, /VALUES \('rebuild'\)/);
	const untouched = "ALTER TABLE `tasks` ADD `x` text;\n";
	assert.equal(resyncRecreatedContent(untouched, [def]), untouched);
});

test("a rebuild of the content table that creates no trigger afterwards is reported", async () => {
	const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const def = search[FTS_KEY];
	const dir = mkdtempSync(join(tmpdir(), "fts-dead-"));
	try {
		writeFileSync(
			join(dir, "0000_fts.sql"),
			pendingFtsMigrations([def], new Map())[0]?.sql ?? "",
		);
		assert.deepEqual(deadFtsTriggers(dir, [def]), []);
		const rebuild =
			"INSERT INTO `__new_tracks` SELECT * FROM `tasks`;--> statement-breakpoint\nDROP TABLE `tasks`;--> statement-breakpoint\nALTER TABLE `__new_tracks` RENAME TO `tasks`;\n";
		writeFileSync(join(dir, "0001_rebuild.sql"), rebuild);
		assert.deepEqual(deadFtsTriggers(dir, [def]), [
			{
				index: "task_search",
				table: "tasks",
				migration: "0001_rebuild.sql",
			},
		]);
		writeFileSync(
			join(dir, "0001_rebuild.sql"),
			resyncRecreatedContent(rebuild, [def]),
		);
		assert.deepEqual(deadFtsTriggers(dir, [def]), []);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
