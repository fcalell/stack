import { describe, expect, it } from "vitest";
import { renderToml } from "#ast/toml-printer";

describe("renderToml", () => {
	it("emits root scalars", () => {
		const out = renderToml({
			root: { name: "my-worker", count: 3, active: true },
			tables: [],
			arrayTables: [],
		});
		expect(out).toBe(
			['name = "my-worker"', "count = 3", "active = true", ""].join("\n"),
		);
	});

	it("emits nested tables under a path", () => {
		const out = renderToml({
			root: {},
			tables: [
				{ path: ["build"], entries: { command: "pnpm build" } },
				{ path: ["build", "upload"], entries: { format: "service-worker" } },
			],
			arrayTables: [],
		});
		expect(out).toBe(
			[
				"[build]",
				'command = "pnpm build"',
				"",
				"[build.upload]",
				'format = "service-worker"',
				"",
			].join("\n"),
		);
	});

	it("emits array of tables", () => {
		const out = renderToml({
			root: {},
			tables: [],
			arrayTables: [
				{
					path: ["d1_databases"],
					entries: {
						binding: "DB_MAIN",
						database_id: "abc-123",
					},
				},
				{
					path: ["d1_databases"],
					entries: {
						binding: "DB_SECONDARY",
						database_id: "def-456",
					},
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

	it("emits mixed root + tables + array-tables", () => {
		const out = renderToml({
			root: { name: "app", compatibility_date: "2024-01-01" },
			tables: [
				{
					path: ["vars"],
					entries: { ENV: "production" },
				},
			],
			arrayTables: [
				{
					path: ["routes"],
					entries: { pattern: "app.example.com/*", zone_name: "example.com" },
				},
			],
		});
		expect(out).toContain('name = "app"');
		expect(out).toContain('compatibility_date = "2024-01-01"');
		expect(out).toContain("[vars]");
		expect(out).toContain('ENV = "production"');
		expect(out).toContain("[[routes]]");
		expect(out).toContain('pattern = "app.example.com/*"');
	});

	it("emits a realistic wrangler.toml", () => {
		const out = renderToml({
			root: {
				name: "my-worker",
				main: ".stack/worker.ts",
				compatibility_date: "2024-01-01",
			},
			tables: [
				{
					path: ["vars"],
					entries: { PUBLIC_URL: "https://app.example.com" },
				},
			],
			arrayTables: [
				{
					path: ["d1_databases"],
					entries: {
						binding: "DB_MAIN",
						database_name: "main",
						database_id: "xxx",
					},
				},
				{
					path: ["kv_namespaces"],
					entries: { binding: "CACHE", id: "yyy" },
				},
			],
		});
		expect(out).toBe(
			[
				'name = "my-worker"',
				'main = ".stack/worker.ts"',
				'compatibility_date = "2024-01-01"',
				"",
				"[vars]",
				'PUBLIC_URL = "https://app.example.com"',
				"",
				"[[d1_databases]]",
				'binding = "DB_MAIN"',
				'database_name = "main"',
				'database_id = "xxx"',
				"",
				"[[kv_namespaces]]",
				'binding = "CACHE"',
				'id = "yyy"',
				"",
			].join("\n"),
		);
	});

	it("throws when a table path is empty", () => {
		expect(() =>
			renderToml({
				root: {},
				tables: [{ path: [], entries: {} }],
				arrayTables: [],
			}),
		).toThrow(/non-empty/);
	});

	it("throws when an array-table path is empty", () => {
		expect(() =>
			renderToml({
				root: {},
				tables: [],
				arrayTables: [{ path: [], entries: {} }],
			}),
		).toThrow(/non-empty/);
	});
});
