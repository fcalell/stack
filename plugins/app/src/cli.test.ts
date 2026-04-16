import type { DevContext, PluginContext } from "@fcalell/config/plugin";
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

function mockDevCtx(overrides?: Partial<DevContext>): DevContext {
	return {
		...mockCtx(),
		getPort: () => 3000,
		...overrides,
	};
}

describe("app cli plugin", () => {
	it("has correct name and label", () => {
		expect(plugin.name).toBe("app");
		expect(plugin.label).toBe("App");
	});

	describe("detect", () => {
		it("returns true when app plugin is present", () => {
			const ctx = mockCtx({ hasPlugin: (name) => name === "app" });
			expect(plugin.detect(ctx)).toBe(true);
		});

		it("returns false when app plugin is absent", () => {
			const ctx = mockCtx({ hasPlugin: () => false });
			expect(plugin.detect(ctx)).toBe(false);
		});
	});

	describe("bindings", () => {
		it("returns empty array", () => {
			const bindings = plugin.bindings({});
			expect(bindings).toEqual([]);
		});

		it("returns empty array with routes config", () => {
			const bindings = plugin.bindings({
				routes: { pagesDir: "src/pages" },
			});
			expect(bindings).toEqual([]);
		});
	});

	describe("scaffold", () => {
		it("creates layout and index pages", async () => {
			const ctx = mockCtx();
			await plugin.scaffold(ctx, {});

			expect(ctx.writeIfMissing).toHaveBeenCalledWith(
				"src/app/pages/_layout.tsx",
				expect.stringContaining("RootLayout"),
			);
			expect(ctx.writeIfMissing).toHaveBeenCalledWith(
				"src/app/pages/index.tsx",
				expect.stringContaining("HomePage"),
			);
		});

		it("adds app dependencies", async () => {
			const ctx = mockCtx();
			await plugin.scaffold(ctx, {});

			expect(ctx.addDependencies).toHaveBeenCalledWith(
				expect.objectContaining({
					"@fcalell/plugin-app": "workspace:*",
					"@fcalell/ui": "workspace:*",
					"solid-js": expect.any(String),
				}),
			);
		});

		it("adds .stack to gitignore", async () => {
			const ctx = mockCtx();
			await plugin.scaffold(ctx, {});

			expect(ctx.addToGitignore).toHaveBeenCalledWith(".stack");
		});
	});

	describe("generate", () => {
		it("returns empty when routes are disabled", async () => {
			const ctx = mockCtx({
				getPluginOptions: ((name: string) => {
					if (name === "app") return { routes: false };
					return undefined;
				}) as PluginContext["getPluginOptions"],
			});
			const files = await plugin.generate(ctx);
			expect(files).toEqual([]);
		});

		it("returns empty when no pages exist", async () => {
			const ctx = mockCtx({
				getPluginOptions: ((name: string) => {
					if (name === "app") return {};
					return undefined;
				}) as PluginContext["getPluginOptions"],
			});
			const files = await plugin.generate(ctx);
			expect(files).toEqual([]);
		});
	});

	describe("worker", () => {
		it("has no worker contribution", () => {
			expect(plugin.worker).toBeUndefined();
		});
	});

	describe("dev", () => {
		async function callDev(ctx: DevContext) {
			expect(plugin.dev).toBeDefined();
			// biome-ignore lint/style/noNonNullAssertion: dev is asserted above
			return plugin.dev!(ctx);
		}

		it("returns vite dev process with correct port", async () => {
			const ctx = mockDevCtx({ getPort: () => 4000 });
			const contribution = await callDev(ctx);

			expect(contribution.processes).toHaveLength(1);
			expect(contribution.processes?.[0]?.name).toBe("app");
			expect(contribution.processes?.[0]?.args).toContain("4000");
		});

		it("includes banner with port", async () => {
			const ctx = mockDevCtx({ getPort: () => 3000 });
			const contribution = await callDev(ctx);

			expect(contribution.banner).toEqual(["App: http://localhost:3000"]);
		});

		it("default port is 3000", async () => {
			const ctx = mockDevCtx();
			const contribution = await callDev(ctx);

			expect(contribution.processes?.[0]?.defaultPort).toBe(3000);
		});
	});
});
