import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	buildSeedSql,
	describeSeed,
	loadSeed,
	type TableSeedSpec,
} from "./seed.ts";

const projects: TableSeedSpec = {
	table: "projects",
	pkColumns: ["id"],
	rows: [
		{ id: "a", name: "A" },
		{ id: "b", name: "B" },
	],
};
const links: TableSeedSpec = {
	table: "links",
	pkColumns: [],
	rows: [{ url: "x" }],
};
const emptied: TableSeedSpec = { table: "tags", pkColumns: ["id"], rows: [] };

test("buildSeedSql prunes by default", () => {
	const sql = buildSeedSql([projects, links, emptied]);
	assert.match(sql, /INSERT INTO "projects"[^;]*ON CONFLICT\("id"\) DO UPDATE/);
	assert.match(sql, /DELETE FROM "projects" WHERE "id" NOT IN \('a', 'b'\);/);
	assert.match(sql, /DELETE FROM "links";\nINSERT INTO "links"/);
	assert.match(sql, /DELETE FROM "tags";/);
	assert.equal(sql, buildSeedSql([projects, links, emptied], { prune: true }));
});

test("buildSeedSql without prune only upserts", () => {
	const sql = buildSeedSql([projects, links, emptied], { prune: false });
	assert.match(sql, /INSERT INTO "projects"[^;]*ON CONFLICT\("id"\) DO UPDATE/);
	assert.doesNotMatch(sql, /DELETE/);
	assert.doesNotMatch(sql, /"links"/);
	assert.doesNotMatch(sql, /"tags"/);
});

test("buildSeedSql without prune and nothing to upsert is empty", () => {
	assert.equal(buildSeedSql([links, emptied], { prune: false }), "");
});

test("describeSeed states the effect on rows outside the seed", () => {
	assert.deepEqual(describeSeed([projects, links, emptied], { prune: true }), [
		{ label: "projects", detail: "2 rows upserted; every other row deleted" },
		{ label: "links", detail: "1 row; table emptied and refilled" },
		{ label: "tags", detail: "all rows deleted" },
	]);
	assert.deepEqual(describeSeed([projects, links, emptied], { prune: false }), [
		{ label: "projects", detail: "2 rows upserted; other rows kept" },
		{ label: "links", detail: "left alone: no primary key" },
		{ label: "tags", detail: "left alone" },
	]);
});

async function withSeedFile<T>(
	source: string | null,
	run: (cwd: string) => Promise<T>,
): Promise<T> {
	const cwd = mkdtempSync(join(tmpdir(), "stack-seed-"));
	try {
		if (source !== null) {
			mkdirSync(join(cwd, "src", "schema"), { recursive: true });
			writeFileSync(join(cwd, "src", "schema", "seed.ts"), source);
		}
		return await run(cwd);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
}

test("loadSeed reads the prune marker, false when absent", async () => {
	assert.equal(await withSeedFile(null, loadSeed), null);
	const absent = await withSeedFile("export default [];\n", loadSeed);
	assert.deepEqual(absent, { specs: [], prune: false });
	const off = await withSeedFile(
		"export const prune = false;\nexport default [];\n",
		loadSeed,
	);
	assert.equal(off?.prune, false);
	const on = await withSeedFile(
		"export const prune = true;\nexport default [];\n",
		loadSeed,
	);
	assert.equal(on?.prune, true);
});

test("loadSeed refuses a non-boolean prune marker", async () => {
	await assert.rejects(
		withSeedFile('export const prune = "yes";\nexport default [];\n', loadSeed),
		/prune.*boolean/,
	);
});
