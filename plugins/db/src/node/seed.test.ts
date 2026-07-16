import { describe, expect, it } from "vitest";
import { integer, primaryKey, sqliteTable, text } from "../orm";
import { buildSeedSql, type TableSeedSpec, tableToSpec } from "./seed";

// ── buildSeedSql (pure) ─────────────────────────────────────────────

describe("buildSeedSql", () => {
	it("upserts by primary key then prunes rows that left the seed", () => {
		const spec: TableSeedSpec = {
			table: "todos",
			pkColumns: ["id"],
			rows: [
				{ id: "1", title: "a" },
				{ id: "2", title: "b" },
			],
		};
		const sql = buildSeedSql([spec]);
		expect(sql).toContain(
			`INSERT INTO "todos" ("id", "title") VALUES ('1', 'a'), ('2', 'b') ON CONFLICT("id") DO UPDATE SET "title" = excluded."title";`,
		);
		expect(sql).toContain(`DELETE FROM "todos" WHERE "id" NOT IN ('1', '2');`);
		// Prune must come after the upsert so surviving keys already exist.
		expect(sql.indexOf("INSERT INTO")).toBeLessThan(sql.indexOf("DELETE FROM"));
	});

	it("replaces a primary-key-less table wholesale", () => {
		const sql = buildSeedSql([
			{ table: "logs", pkColumns: [], rows: [{ msg: "x" }] },
		]);
		expect(sql).toContain(`DELETE FROM "logs";`);
		expect(sql).toContain(`INSERT INTO "logs" ("msg") VALUES ('x');`);
		expect(sql).not.toContain("ON CONFLICT");
	});

	it("prunes a table whose seed is empty", () => {
		expect(buildSeedSql([{ table: "t", pkColumns: ["id"], rows: [] }])).toBe(
			`DELETE FROM "t";\n`,
		);
	});

	it("escapes string literals", () => {
		const sql = buildSeedSql([
			{ table: "t", pkColumns: ["id"], rows: [{ id: "1", name: "O'Brien" }] },
		]);
		expect(sql).toContain("'O''Brien'");
	});

	it("serializes numbers, booleans, null, and bytes as SQL literals", () => {
		const sql = buildSeedSql([
			{
				table: "t",
				pkColumns: ["id"],
				rows: [
					{
						id: 1,
						active: true,
						off: false,
						note: null,
						blob: new Uint8Array([1, 255]),
					},
				],
			},
		]);
		// Columns are emitted in sorted order: active, blob, id, note, off.
		expect(sql).toContain("VALUES (1, X'01ff', 1, NULL, 0)");
	});

	it("keeps DEFAULTs by grouping rows on the columns they provide", () => {
		const sql = buildSeedSql([
			{
				table: "todos",
				pkColumns: ["id"],
				rows: [
					{ id: "1", title: "a" },
					{ id: "2" }, // omits title → its own group, title left to DEFAULT
				],
			},
		]);
		expect(sql).toContain(
			`INSERT INTO "todos" ("id", "title") VALUES ('1', 'a')`,
		);
		expect(sql).toContain(
			`INSERT INTO "todos" ("id") VALUES ('2') ON CONFLICT("id") DO NOTHING;`,
		);
	});

	it("chunks multi-row inserts under the 100-parameter budget", () => {
		// 3 columns → floor(100/3) = 33 rows per statement; 40 rows → 2 inserts.
		const rows = Array.from({ length: 40 }, (_, i) => ({
			id: String(i),
			a: "x",
			b: "y",
		}));
		const sql = buildSeedSql([{ table: "t", pkColumns: ["id"], rows }]);
		expect(sql.match(/INSERT INTO/g)?.length).toBe(2);
	});

	it("prunes a composite primary key with row-value tuples", () => {
		const sql = buildSeedSql([
			{
				table: "membership",
				pkColumns: ["org_id", "user_id"],
				rows: [{ org_id: "o1", user_id: "u1", role: "admin" }],
			},
		]);
		expect(sql).toContain(
			`DELETE FROM "membership" WHERE ("org_id", "user_id") NOT IN (('o1', 'u1'));`,
		);
	});
});

// ── tableToSpec (real drizzle introspection) ────────────────────────

const todos = sqliteTable("todos", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	done: integer("done", { mode: "boolean" }).notNull(),
	slug: text("slug_name"),
});

describe("tableToSpec", () => {
	it("maps JS keys to DB column names and applies driver mapping", () => {
		const spec = tableToSpec(todos, [
			{ id: "1", title: "x", done: true, slug: "s" },
		]);
		expect(spec.table).toBe("todos");
		expect(spec.pkColumns).toEqual(["id"]);
		// boolean → 0/1, and `slug` maps to the DB name `slug_name`.
		expect(spec.rows[0]).toEqual({
			id: "1",
			title: "x",
			done: 1,
			slug_name: "s",
		});
	});

	it("keeps only the columns a row provides (omitted → DEFAULT)", () => {
		const spec = tableToSpec(todos, [{ id: "1", title: "x", done: false }]);
		expect(Object.keys(spec.rows[0] ?? {})).toEqual(["id", "title", "done"]);
	});

	it("throws on an unknown column", () => {
		expect(() =>
			tableToSpec(todos, [{ id: "1", title: "x", done: false, nope: 1 }]),
		).toThrow(/unknown column "nope"/);
	});

	it("throws when a row omits its primary key", () => {
		expect(() => tableToSpec(todos, [{ title: "x", done: false }])).toThrow(
			/missing primary key column "id"/,
		);
	});

	it("detects composite primary keys", () => {
		const membership = sqliteTable(
			"membership",
			{
				orgId: text("org_id").notNull(),
				userId: text("user_id").notNull(),
				role: text("role").notNull(),
			},
			(t) => [primaryKey({ columns: [t.orgId, t.userId] })],
		);
		const spec = tableToSpec(membership, [
			{ orgId: "o1", userId: "u1", role: "admin" },
		]);
		expect(spec.pkColumns.sort()).toEqual(["org_id", "user_id"]);
	});
});
