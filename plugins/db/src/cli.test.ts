import type { PluginContext } from "@fcalell/config/plugin";
import { describe, expect, it, vi } from "vitest";
import plugin from "./cli";

function mockCtx(overrides?: Partial<PluginContext>): PluginContext {
	return {
		cwd: "/tmp/test",
		config: null,
		hasPlugin: () => false,
		getPluginOptions: () => undefined,
		writeFile: vi.fn(),
		writeIfMissing: vi.fn().mockResolvedValue(true),
		ensureDir: vi.fn(),
		fileExists: vi.fn().mockResolvedValue(false),
		readFile: vi.fn().mockResolvedValue(""),
		addDependencies: vi.fn(),
		addDevDependencies: vi.fn(),
		addToGitignore: vi.fn(),
		addPluginToConfig: vi.fn(),
		removePluginFromConfig: vi.fn(),
		prompt: {
			text: vi.fn(),
			confirm: vi.fn(),
			select: vi.fn(),
			multiselect: vi.fn(),
		},
		log: {
			info: vi.fn(),
			warn: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
		},
		...overrides,
	};
}

describe("db cli plugin", () => {
	it("has correct name and label", () => {
		expect(plugin.name).toBe("db");
		expect(plugin.label).toBe("Database");
	});

	describe("detect", () => {
		it("returns true when db plugin is present", () => {
			const ctx = mockCtx({ hasPlugin: (name) => name === "db" });
			expect(plugin.detect(ctx)).toBe(true);
		});

		it("returns false when db plugin is absent", () => {
			const ctx = mockCtx({ hasPlugin: () => false });
			expect(plugin.detect(ctx)).toBe(false);
		});
	});

	describe("bindings", () => {
		it("returns D1 binding for d1 dialect", () => {
			const bindings = plugin.bindings({
				dialect: "d1",
				databaseId: "abc-123",
				schema: {},
				binding: "DB_MAIN",
			});
			expect(bindings).toEqual([
				{
					name: "DB_MAIN",
					type: "d1",
					databaseId: "abc-123",
					databaseName: "abc-123",
				},
			]);
		});

		it("uses custom binding name", () => {
			const bindings = plugin.bindings({
				dialect: "d1",
				databaseId: "abc-123",
				schema: {},
				binding: "DB_SECONDARY",
			});
			expect(bindings[0]?.name).toBe("DB_SECONDARY");
		});

		it("defaults binding to DB_MAIN", () => {
			const bindings = plugin.bindings({
				dialect: "d1",
				databaseId: "abc-123",
				schema: {},
			});
			expect(bindings[0]?.name).toBe("DB_MAIN");
		});

		it("returns empty array for sqlite dialect", () => {
			const bindings = plugin.bindings({
				dialect: "sqlite",
				path: "./data/app.sqlite",
				schema: {},
			});
			expect(bindings).toEqual([]);
		});
	});

	describe("scaffold", () => {
		it("creates schema and migrations directory", async () => {
			const ctx = mockCtx();
			await plugin.scaffold(ctx, {});

			expect(ctx.writeIfMissing).toHaveBeenCalledWith(
				"src/schema/index.ts",
				expect.stringContaining("sqliteTable"),
			);
			expect(ctx.ensureDir).toHaveBeenCalledWith("src/migrations");
		});

		it("adds required dependencies", async () => {
			const ctx = mockCtx();
			await plugin.scaffold(ctx, {});

			expect(ctx.addDependencies).toHaveBeenCalledWith({
				"@fcalell/plugin-db": "workspace:*",
			});
			expect(ctx.addDevDependencies).toHaveBeenCalledWith(
				expect.objectContaining({
					"drizzle-kit": expect.any(String),
				}),
			);
		});

		it("adds .db-kit to gitignore", async () => {
			const ctx = mockCtx();
			await plugin.scaffold(ctx, {});

			expect(ctx.addToGitignore).toHaveBeenCalledWith(".db-kit");
		});
	});

	describe("generate", () => {
		it("returns empty array", async () => {
			const ctx = mockCtx();
			const files = await plugin.generate(ctx);
			expect(files).toEqual([]);
		});
	});

	describe("worker", () => {
		it("declares runtime contribution", () => {
			expect(plugin.worker).toEqual({
				runtime: {
					importFrom: "@fcalell/plugin-db/runtime",
					factory: "dbRuntime",
				},
			});
		});
	});
});
