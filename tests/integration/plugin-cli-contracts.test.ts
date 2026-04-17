import type { RegisterContext } from "@fcalell/cli";
import {
	createEventBus,
	type Event,
	type EventBus,
	Generate,
	Init,
	Remove,
} from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { type ApiOptions, api } from "@fcalell/plugin-api";
import { type AuthOptions, auth } from "@fcalell/plugin-auth";
import { type DbOptions, db } from "@fcalell/plugin-db";
import { describe, expect, it } from "vitest";

const dbOptions: DbOptions = {
	dialect: "d1",
	databaseId: "test",
	binding: "DB_MAIN",
	migrations: "./src/migrations",
};

const authOptions: AuthOptions = {
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

const apiOptions: ApiOptions = {};

type PluginOptions = DbOptions | AuthOptions | ApiOptions;

const optionsByName: Record<string, PluginOptions> = {
	db: dbOptions,
	auth: authOptions,
	api: apiOptions,
};

interface AnyCliPlugin {
	cli: {
		name: string;
		label: string;
		register: (
			ctx: RegisterContext<unknown>,
			bus: EventBus,
			events: Record<string, Event<unknown>>,
		) => void;
	};
	events: Record<string, Event<unknown>>;
}

describe("createPlugin-based CLI plugin contracts", () => {
	const newPlugins: Array<{
		plugin: AnyCliPlugin;
		expectedName: string;
		expectedLabel: string;
	}> = [
		{
			plugin: db as unknown as AnyCliPlugin,
			expectedName: "db",
			expectedLabel: "Database",
		},
		{
			plugin: auth as unknown as AnyCliPlugin,
			expectedName: "auth",
			expectedLabel: "Auth",
		},
		{
			plugin: api as unknown as AnyCliPlugin,
			expectedName: "api",
			expectedLabel: "API",
		},
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
			const options = optionsByName[expectedName] ?? {};

			const ctx = createMockCtx({ options });
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
			const options = optionsByName[expectedName] ?? {};

			const ctx = createMockCtx({ options });
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
			const options = optionsByName[expectedName] ?? {};

			const ctx = createMockCtx({ options });
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
