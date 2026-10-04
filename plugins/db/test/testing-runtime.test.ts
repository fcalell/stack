import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { TestingContext } from "@fcalell/plugin-api/testing";
import { count, eq } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import dbTesting from "../src/testing/index.ts";

// The table `test/fixtures/migrations/` builds: `0000_create_item.sql`
// creates it, `0001_add_column.sql` adds `note`.
const item = sqliteTable("item", {
	id: integer("id").primaryKey(),
	name: text("name").notNull(),
	note: text("note"),
});
const schema = { item };

const FIXTURES = new URL("./fixtures/", import.meta.url);
// `setup` reads only `root`.
const ctx = { root: FIXTURES } as unknown as TestingContext;

function plugin(migrations = "./migrations") {
	return dbTesting({ binding: "DB_TEST", migrations, schema });
}

interface RawD1 {
	prepare(query: string): { all(): Promise<{ results: unknown[] }> };
}

test("migrations apply in filename order and are recorded as deploy records them", async () => {
	const setup = await plugin().setup(ctx, {});
	try {
		assert.deepEqual(Object.keys(setup.env ?? {}), ["DB_TEST"]);
		const d1 = setup.env?.DB_TEST as RawD1;
		const objects = await d1
			.prepare(
				"SELECT type, name FROM sqlite_master WHERE name IN ('item', 'item_name_idx') ORDER BY name",
			)
			.all();
		assert.deepEqual(objects.results, [
			{ type: "table", name: "item" },
			{ type: "index", name: "item_name_idx" },
		]);
		const columns = await d1
			.prepare("SELECT name FROM pragma_table_info('item') ORDER BY cid")
			.all();
		assert.deepEqual(columns.results, [
			{ name: "id" },
			{ name: "name" },
			{ name: "note" },
		]);
		const applied = await d1
			.prepare("SELECT name FROM d1_migrations ORDER BY id")
			.all();
		assert.deepEqual(applied.results, [
			{ name: "0000_create_item.sql" },
			{ name: "0001_add_column.sql" },
		]);
	} finally {
		await setup.dispose?.();
	}
});

test("a row written through the drizzle client reads back", async () => {
	const setup = await plugin().setup(ctx, {});
	try {
		const db = setup.provides?.db;
		assert.ok(db);
		await db.insert(item).values({ id: 1, name: "first", note: "n" });
		assert.deepEqual(await db.select().from(item).where(eq(item.id, 1)), [
			{ id: 1, name: "first", note: "n" },
		]);
		const [row] = await db
			.insert(item)
			.values({ id: 2, name: "second" })
			.returning({ id: item.id });
		assert.deepEqual(row, { id: 2 });
	} finally {
		await setup.dispose?.();
	}
});

test("a batch runs whole or not at all", async () => {
	const setup = await plugin().setup(ctx, {});
	try {
		const db = setup.provides?.db;
		assert.ok(db);
		const [, rows] = await db.batch([
			db.insert(item).values({ id: 1, name: "first" }),
			db.select().from(item),
		]);
		assert.deepEqual(rows, [{ id: 1, name: "first", note: null }]);

		await assert.rejects(
			db.batch([
				db.insert(item).values({ id: 2, name: "second" }),
				db.insert(item).values({ id: 1, name: "duplicate" }),
			]),
			(error: unknown) => {
				const text = `${String(error)} ${String((error as { cause?: unknown }).cause)}`;
				assert.match(text, /UNIQUE constraint failed/);
				return true;
			},
		);
		assert.deepEqual(await db.select({ n: count() }).from(item), [{ n: 1 }]);
	} finally {
		await setup.dispose?.();
	}
});

test("two setups are two databases", async () => {
	const [first, second] = await Promise.all([
		plugin().setup(ctx, {}),
		plugin().setup(ctx, {}),
	]);
	try {
		const a = first.provides?.db;
		const b = second.provides?.db;
		assert.ok(a && b);
		await a.insert(item).values({ id: 1, name: "only in the first" });
		assert.equal((await a.select().from(item)).length, 1);
		assert.deepEqual(await b.select().from(item), []);
	} finally {
		await Promise.all([first.dispose?.(), second.dispose?.()]);
	}
});

test("a migrations directory without a migration is refused by name", async () => {
	const dir = join(fileURLToPath(FIXTURES), "./migrations-empty");
	await assert.rejects(
		plugin("./migrations-empty").setup(ctx, {}),
		(error: unknown) => {
			assert.ok(error instanceof Error);
			assert.ok(error.message.includes(dir), error.message);
			return true;
		},
	);
});

test("a failing migration fails the boot by its name", async () => {
	await assert.rejects(
		plugin("./migrations-broken").setup(ctx, {}),
		/0001_bad\.sql/,
	);
});
