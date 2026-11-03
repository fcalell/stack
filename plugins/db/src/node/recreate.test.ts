import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	columnsBefore,
	copyOnlyExisting,
	expressionIndexes,
} from "./recreate.ts";

const COPY =
	'INSERT INTO `__new_tracks`("id", "title", "extra") SELECT "id", "title", "extra" FROM `tracks`;--> statement-breakpoint\nDROP TABLE `tracks`;';

test("a table copy reads only the columns the table had", () => {
	const before = new Map([["tracks", new Set(["id", "title"])]]);
	assert.equal(
		copyOnlyExisting(COPY, before),
		'INSERT INTO `__new_tracks`("id", "title") SELECT "id", "title" FROM `tracks`;--> statement-breakpoint\nDROP TABLE `tracks`;',
	);
});

test("a copy of columns that all existed, or of a table with no snapshot, is left as it is", () => {
	const all = new Map([["tracks", new Set(["id", "title", "extra"])]]);
	assert.equal(copyOnlyExisting(COPY, all), COPY);
	assert.equal(copyOnlyExisting(COPY, new Map()), COPY);
});

test("the columns before are the newest snapshot's, by database name", () => {
	const dir = mkdtempSync(join(tmpdir(), "recreate-"));
	try {
		mkdirSync(join(dir, "meta"));
		const snapshot = (columns: string[]) =>
			JSON.stringify({
				tables: {
					tracks: {
						columns: Object.fromEntries(columns.map((c) => [c, { name: c }])),
					},
				},
			});
		writeFileSync(join(dir, "meta", "0000_snapshot.json"), snapshot(["a"]));
		writeFileSync(
			join(dir, "meta", "0001_snapshot.json"),
			snapshot(["a", "b"]),
		);
		assert.deepEqual([...(columnsBefore(dir).get("tracks") ?? [])], ["a", "b"]);
		assert.equal(columnsBefore(join(dir, "none")).size, 0);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("an expression index a rebuild quoted as a column is written as the expression", () => {
	const columns = new Map([["tracks", new Set(["id", "title"])]]);
	assert.equal(
		expressionIndexes(
			'CREATE INDEX `t_idx` ON `tracks` (`"title" collate nocase`,`id`);--> statement-breakpoint\nCREATE UNIQUE INDEX `u` ON `tracks` (`title`) WHERE `id` is not null;',
			columns,
		),
		'CREATE INDEX `t_idx` ON `tracks` ("title" collate nocase,`id`);--> statement-breakpoint\nCREATE UNIQUE INDEX `u` ON `tracks` (`title`) WHERE `id` is not null;',
	);
});
