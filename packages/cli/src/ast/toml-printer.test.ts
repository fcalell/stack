import { describe, expect, it } from "vitest";
import { renderToml } from "#ast/toml-printer";

describe("renderToml", () => {
	it("emits root scalars", () => {
		const out = renderToml({
			root: { name: "my-worker", count: 3, active: true },
			arrayTables: [],
		});
		expect(out).toBe(
			['name = "my-worker"', "count = 3", "active = true", ""].join("\n"),
		);
	});

	it("emits a [table] from a nested root object (how [vars] is produced)", () => {
		const out = renderToml({
			root: { name: "app", vars: { ENV: "production" } },
			arrayTables: [],
		});
		expect(out).toContain('name = "app"');
		expect(out).toContain("[vars]");
		expect(out).toContain('ENV = "production"');
	});

	it("emits array-tables as [[path]]", () => {
		const out = renderToml({
			root: {},
			arrayTables: [
				{
					path: ["d1_databases"],
					entries: { binding: "DB_MAIN", database_id: "abc-123" },
				},
				{
					path: ["d1_databases"],
					entries: { binding: "DB_SECONDARY", database_id: "def-456" },
				},
			],
		});
		expect(out).toBe(
			[
				"[[d1_databases]]",
				'binding = "DB_MAIN"',
				'database_id = "abc-123"',
				"",
				"[[d1_databases]]",
				'binding = "DB_SECONDARY"',
				'database_id = "def-456"',
				"",
			].join("\n"),
		);
	});

	// Load-bearing: rate_limiter bindings emit a multi-segment array-table path
	// `["unsafe", "bindings"]`, which must render as `[[unsafe.bindings]]`. This
	// is the one job the path-walking layer exists for — a naive `path[0]`-only
	// fold would emit a broken `[[unsafe]]`.
	it("folds a multi-segment array-table path into [[a.b]]", () => {
		const out = renderToml({
			root: {},
			arrayTables: [
				{
					path: ["unsafe", "bindings"],
					entries: { name: "RATE_LIMITER", type: "ratelimit" },
				},
			],
		});
		expect(out).toContain("[[unsafe.bindings]]");
		expect(out).toContain('name = "RATE_LIMITER"');
		expect(out).not.toContain("[[unsafe]]\n");
	});

	it("emits a realistic wrangler.toml (root scalars + [vars] + array-tables)", () => {
		const out = renderToml({
			root: {
				name: "my-worker",
				main: ".stack/worker.ts",
				compatibility_date: "2024-01-01",
				vars: { PUBLIC_URL: "https://app.example.com" },
			},
			arrayTables: [
				{
					path: ["d1_databases"],
					entries: {
						binding: "DB_MAIN",
						database_name: "main",
						database_id: "xxx",
					},
				},
				{ path: ["kv_namespaces"], entries: { binding: "CACHE", id: "yyy" } },
			],
		});
		expect(out).toContain('name = "my-worker"');
		expect(out).toContain("[vars]");
		expect(out).toContain('PUBLIC_URL = "https://app.example.com"');
		expect(out).toContain("[[d1_databases]]");
		expect(out).toContain('database_id = "xxx"');
		expect(out).toContain("[[kv_namespaces]]");
		expect(out).toContain('id = "yyy"');
	});

	it("throws when an array-table path is empty", () => {
		expect(() =>
			renderToml({ root: {}, arrayTables: [{ path: [], entries: {} }] }),
		).toThrow(/non-empty/);
	});
});
