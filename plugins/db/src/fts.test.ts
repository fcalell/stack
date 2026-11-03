import assert from "node:assert/strict";
import { test } from "node:test";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { FTS_KEY, ftsQuery, ftsTable } from "./fts.ts";
import {
	migratedFts,
	pendingFtsMigrations,
	resyncRecreatedContent,
} from "./node/fts.ts";

const tracks = sqliteTable("tracks", {
	id: integer("id").primaryKey(),
	title: text("title").notNull(),
	artistName: text("artist_name").notNull(),
	plays: integer("plays").notNull().default(0),
});

const search = ftsTable("track_search", {
	content: tracks,
	columns: ["title", "artistName"],
	prefix: [2, 3],
});

test("ftsTable maps columns to their database names and watches only them", () => {
	const def = search[FTS_KEY];
	assert.deepEqual(def.columns, ["title", "artist_name"]);
	assert.match(def.create, /fts5\(`title`, `artist_name`, content=`tracks`/);
	assert.match(def.create, /prefix='2 3'/);
	const update = def.triggers.find((t) => t.name === "track_search_au");
	assert.match(
		update?.sql ?? "",
		/AFTER UPDATE OF `id`, `title`, `artist_name`/,
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
	assert.match(created?.sql ?? "", /^-- stack:fts track_search [0-9a-f]{8}\n/);
	assert.doesNotMatch(created?.sql ?? "", /DROP TABLE/);

	assert.deepEqual(
		pendingFtsMigrations([def], new Map([[def.name, def.hash]])),
		[],
	);

	const [changed] = pendingFtsMigrations([def], new Map([[def.name, "0"]]));
	assert.match(changed?.sql ?? "", /DROP TABLE IF EXISTS `track_search`/);

	const [dropped] = pendingFtsMigrations([], new Map([[def.name, def.hash]]));
	assert.equal(dropped?.name, "fts_drop_track_search");
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
		"INSERT INTO `__new_tracks` SELECT * FROM `tracks`;--> statement-breakpoint\nDROP TABLE `tracks`;--> statement-breakpoint\nALTER TABLE `__new_tracks` RENAME TO `tracks`;\n";
	const synced = resyncRecreatedContent(recreate, [def]);
	assert.match(synced, /CREATE TRIGGER `track_search_ai`/);
	assert.match(synced, /VALUES \('rebuild'\)/);
	const untouched = "ALTER TABLE `tracks` ADD `x` text;\n";
	assert.equal(resyncRecreatedContent(untouched, [def]), untouched);
});
