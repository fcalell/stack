import { describe, expect, it } from "vitest";
import dbCli from "@fcalell/plugin-db/cli";
import authCli from "@fcalell/plugin-auth/cli";
import apiCli from "@fcalell/plugin-api/cli";
import appCli from "@fcalell/plugin-app/cli";
import type { CliPlugin, PluginContext } from "@fcalell/config/plugin";
import { vi } from "vitest";

const allPlugins = [
	{ module: dbCli, expectedName: "db", expectedLabel: "Database" },
	{ module: authCli, expectedName: "auth", expectedLabel: "Auth" },
	{ module: apiCli, expectedName: "api", expectedLabel: "API" },
	{ module: appCli, expectedName: "app", expectedLabel: "App" },
];

function createMockContext(
	overrides: Partial<PluginContext> = {},
): PluginContext {
	return {
		cwd: "/tmp/test-project",
		config: null,
		hasPlugin: vi.fn().mockReturnValue(false),
		getPluginOptions: vi.fn().mockReturnValue(undefined),
		writeFile: vi.fn().mockResolvedValue(undefined),
		writeIfMissing: vi.fn().mockResolvedValue(true),
		ensureDir: vi.fn().mockResolvedValue(undefined),
		fileExists: vi.fn().mockResolvedValue(false),
		readFile: vi.fn().mockResolvedValue(""),
		addDependencies: vi.fn(),
		addDevDependencies: vi.fn(),
		addToGitignore: vi.fn(),
		addPluginToConfig: vi.fn().mockResolvedValue(undefined),
		removePluginFromConfig: vi.fn().mockResolvedValue(undefined),
		prompt: {
			text: vi.fn().mockResolvedValue(""),
			confirm: vi.fn().mockResolvedValue(false),
			select: vi.fn().mockResolvedValue(""),
			multiselect: vi.fn().mockResolvedValue([]),
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

describe("CLI plugin interface contracts", () => {
	describe.each(allPlugins)(
		"$expectedName plugin",
		({ module: plugin, expectedName, expectedLabel }) => {
			it("has correct name", () => {
				expect(plugin.name).toBe(expectedName);
			});

			it("has correct label", () => {
				expect(plugin.label).toBe(expectedLabel);
			});

			it("has detect function", () => {
				expect(typeof plugin.detect).toBe("function");
			});

			it("has scaffold function", () => {
				expect(typeof plugin.scaffold).toBe("function");
			});

			it("has bindings function", () => {
				expect(typeof plugin.bindings).toBe("function");
			});

			it("has generate function", () => {
				expect(typeof plugin.generate).toBe("function");
			});

			it("detect returns true when plugin is present", () => {
				const ctx = createMockContext({
					hasPlugin: vi.fn((name: string) => name === expectedName),
				});

				const result = plugin.detect(ctx);
				expect(result).toBe(true);
			});

			it("detect returns false when plugin is absent", () => {
				const ctx = createMockContext({
					hasPlugin: vi.fn().mockReturnValue(false),
				});

				const result = plugin.detect(ctx);
				expect(result).toBe(false);
			});

			it("bindings returns an array", () => {
				const result = plugin.bindings({} as never);
				expect(Array.isArray(result)).toBe(true);
			});

			it("all binding declarations have valid type fields", () => {
				const validTypes = [
					"d1",
					"r2",
					"kv",
					"queue",
					"rate_limiter",
					"durable_object",
					"service",
					"var",
					"secret",
				];

				let options: unknown = {};
				if (expectedName === "db") {
					options = {
						dialect: "d1",
						databaseId: "test",
						schema: {},
						binding: "DB_MAIN",
						migrations: "./src/migrations",
					};
				} else if (expectedName === "auth") {
					options = {
						secretVar: "AUTH_SECRET",
						appUrlVar: "APP_URL",
						rateLimiter: {
							ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
							email: {
								binding: "RATE_LIMITER_EMAIL",
								limit: 5,
								period: 300,
							},
						},
					};
				}

				const bindings = plugin.bindings(options as never);
				for (const binding of bindings) {
					expect(validTypes).toContain(binding.type);
					expect(typeof binding.name).toBe("string");
					expect(binding.name.length).toBeGreaterThan(0);
				}
			});

			it("generate returns a promise of GeneratedFile[]", async () => {
				const ctx = createMockContext({
					getPluginOptions: vi.fn().mockReturnValue(undefined),
				});

				const result = await plugin.generate(ctx);
				expect(Array.isArray(result)).toBe(true);
				for (const file of result) {
					expect(typeof file.path).toBe("string");
					expect(typeof file.content).toBe("string");
				}
			});
		},
	);
});

describe("worker contribution consistency", () => {
	it("db plugin declares runtime contribution", () => {
		expect(dbCli.worker).toBeDefined();
		expect(dbCli.worker?.runtime).toBeDefined();
		expect(dbCli.worker?.runtime?.importFrom).toBe(
			"@fcalell/plugin-db/runtime",
		);
		expect(dbCli.worker?.runtime?.factory).toBe("dbRuntime");
	});

	it("auth plugin declares runtime and callbacks contribution", () => {
		expect(authCli.worker).toBeDefined();
		expect(authCli.worker?.runtime).toBeDefined();
		expect(authCli.worker?.runtime?.importFrom).toBe(
			"@fcalell/plugin-auth/runtime",
		);
		expect(authCli.worker?.runtime?.factory).toBe("authRuntime");
		expect(authCli.worker?.callbacks).toBeDefined();
		expect(authCli.worker?.callbacks?.defineHelper).toBe(
			"defineAuthCallbacks",
		);
		expect(authCli.worker?.routes).toBe(true);
	});

	it("api plugin declares runtime, routes, and middleware", () => {
		expect(apiCli.worker).toBeDefined();
		expect(apiCli.worker?.runtime).toBeDefined();
		expect(apiCli.worker?.runtime?.importFrom).toBe(
			"@fcalell/plugin-api/runtime",
		);
		expect(apiCli.worker?.runtime?.factory).toBe("createWorker");
		expect(apiCli.worker?.routes).toBe(true);
		expect(apiCli.worker?.middleware).toBe(true);
	});

	it("app plugin has no worker contribution", () => {
		expect(appCli.worker).toBeUndefined();
	});
});
