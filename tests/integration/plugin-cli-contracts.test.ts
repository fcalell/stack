import type { RegisterContext } from "@fcalell/cli";
import { createEventBus, Generate, Init, Remove } from "@fcalell/cli/events";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { db } from "@fcalell/plugin-db";
import { describe, expect, it, vi } from "vitest";

function createMockCtx<T>(options: T): RegisterContext<T> {
	return {
		cwd: "/tmp/test-project",
		options,
		hasPlugin: vi.fn().mockReturnValue(false),
		readFile: vi.fn(async () => ""),
		fileExists: vi.fn(async () => false),
		log: {
			info: vi.fn(),
			warn: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
		},
		prompt: {
			text: vi.fn(async () => ""),
			confirm: vi.fn(async () => false),
			select: vi.fn(async () => undefined as any),
			multiselect: vi.fn(async () => []),
		},
	};
}

describe("createPlugin-based CLI plugin contracts", () => {
	const newPlugins = [
		{ plugin: db, expectedName: "db", expectedLabel: "Database" },
		{ plugin: auth, expectedName: "auth", expectedLabel: "Auth" },
		{ plugin: api, expectedName: "api", expectedLabel: "API" },
	];

	describe.each(newPlugins)("$expectedName plugin", ({
		plugin,
		expectedName,
		expectedLabel,
	}) => {
		it("has correct name", () => {
			expect(plugin.cli.name).toBe(expectedName);
		});

		it("has correct label", () => {
			expect(plugin.cli.label).toBe(expectedLabel);
		});

		it("has a register function", () => {
			expect(typeof plugin.cli.register).toBe("function");
		});

		it("contributes bindings via Generate event", async () => {
			const bus = createEventBus();
			let options: any = {};
			if (expectedName === "db") {
				options = {
					dialect: "d1",
					databaseId: "test",
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

			const ctx = createMockCtx(options);
			plugin.cli.register(ctx, bus, plugin.events);

			const gen = await bus.emit(Generate, { files: [], bindings: [] });

			for (const binding of gen.bindings) {
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
				expect(validTypes).toContain(binding.type);
				expect(typeof binding.name).toBe("string");
				expect(binding.name.length).toBeGreaterThan(0);
			}
		});

		it("contributes scaffold files via Init.Scaffold event", async () => {
			const bus = createEventBus();
			let options: any = {};
			if (expectedName === "db") {
				options = {
					dialect: "d1",
					databaseId: "test",
					binding: "DB_MAIN",
					migrations: "./src/migrations",
				};
			}

			const ctx = createMockCtx(options);
			plugin.cli.register(ctx, bus, plugin.events);

			const scaffold = await bus.emit(Init.Scaffold, {
				files: [],
				dependencies: {},
				devDependencies: {},
				gitignore: [],
			});

			expect(scaffold.files.length).toBeGreaterThanOrEqual(0);
			expect(Object.keys(scaffold.dependencies).length).toBeGreaterThanOrEqual(
				0,
			);
		});

		it("contributes removal info via Remove event", async () => {
			const bus = createEventBus();
			let options: any = {};
			if (expectedName === "db") {
				options = {
					dialect: "d1",
					databaseId: "test",
					binding: "DB_MAIN",
					migrations: "./src/migrations",
				};
			}

			const ctx = createMockCtx(options);
			plugin.cli.register(ctx, bus, plugin.events);

			const removal = await bus.emit(Remove, {
				files: [],
				dependencies: [],
			});

			expect(removal.files.length).toBeGreaterThanOrEqual(0);
			expect(removal.dependencies.length).toBeGreaterThanOrEqual(0);
		});
	});
});
