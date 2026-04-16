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

describe("auth cli plugin", () => {
	it("has correct name and label", () => {
		expect(plugin.name).toBe("auth");
		expect(plugin.label).toBe("Auth");
	});

	describe("detect", () => {
		it("returns true when auth plugin is present", () => {
			const ctx = mockCtx({ hasPlugin: (name) => name === "auth" });
			expect(plugin.detect(ctx)).toBe(true);
		});

		it("returns false when auth plugin is absent", () => {
			const ctx = mockCtx({ hasPlugin: () => false });
			expect(plugin.detect(ctx)).toBe(false);
		});
	});

	describe("bindings", () => {
		it("returns all auth bindings with defaults", () => {
			const bindings = plugin.bindings({});
			expect(bindings).toHaveLength(4);
			expect(bindings.map((b) => b.name)).toEqual([
				"AUTH_SECRET",
				"APP_URL",
				"RATE_LIMITER_IP",
				"RATE_LIMITER_EMAIL",
			]);
		});

		it("uses default types for bindings", () => {
			const bindings = plugin.bindings({});
			expect(bindings[0]?.type).toBe("secret");
			expect(bindings[1]?.type).toBe("secret");
			expect(bindings[2]?.type).toBe("rate_limiter");
			expect(bindings[3]?.type).toBe("rate_limiter");
		});

		it("uses custom secret var names", () => {
			const bindings = plugin.bindings({
				secretVar: "MY_SECRET",
				appUrlVar: "MY_URL",
			});
			expect(bindings[0]?.name).toBe("MY_SECRET");
			expect(bindings[1]?.name).toBe("MY_URL");
		});

		it("uses custom rate limiter bindings", () => {
			const bindings = plugin.bindings({
				rateLimiter: {
					ip: { binding: "CUSTOM_IP", limit: 50, period: 30 },
					email: { binding: "CUSTOM_EMAIL", limit: 10, period: 600 },
				},
			});
			expect(bindings[2]?.name).toBe("CUSTOM_IP");
			expect(bindings[2]?.rateLimit).toEqual({ limit: 50, period: 30 });
			expect(bindings[3]?.name).toBe("CUSTOM_EMAIL");
			expect(bindings[3]?.rateLimit).toEqual({ limit: 10, period: 600 });
		});

		it("includes dev defaults for secret bindings", () => {
			const bindings = plugin.bindings({});
			expect(bindings[0]?.devDefault).toBe("dev-secret-change-me");
			expect(bindings[1]?.devDefault).toBe("http://localhost:3000");
		});

		it("uses default rate limiter values", () => {
			const bindings = plugin.bindings({});
			expect(bindings[2]?.rateLimit).toEqual({ limit: 100, period: 60 });
			expect(bindings[3]?.rateLimit).toEqual({ limit: 5, period: 300 });
		});
	});

	describe("scaffold", () => {
		it("creates auth callbacks template", async () => {
			const ctx = mockCtx();
			await plugin.scaffold(ctx, {});

			expect(ctx.writeIfMissing).toHaveBeenCalledWith(
				"src/worker/plugins/auth.ts",
				expect.stringContaining("defineAuthCallbacks"),
			);
		});

		it("adds auth dependency", async () => {
			const ctx = mockCtx();
			await plugin.scaffold(ctx, {});

			expect(ctx.addDependencies).toHaveBeenCalledWith({
				"@fcalell/plugin-auth": "workspace:*",
			});
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
			expect(plugin.worker?.runtime).toEqual({
				importFrom: "@fcalell/plugin-auth/runtime",
				factory: "authRuntime",
			});
		});

		it("declares callbacks contribution", () => {
			expect(plugin.worker?.callbacks).toEqual({
				required: false,
				defineHelper: "defineAuthCallbacks",
				importFrom: "@fcalell/plugin-auth",
			});
		});

		it("declares routes contribution", () => {
			expect(plugin.worker?.routes).toBe(true);
		});
	});
});
