import type { RegisterContext } from "@fcalell/cli";
import { createEventBus, Generate } from "@fcalell/cli/events";
import type { ApiOptions } from "@fcalell/plugin-api";
import { api } from "@fcalell/plugin-api";
import type { AuthOptions } from "@fcalell/plugin-auth";
import { auth } from "@fcalell/plugin-auth";
import type { DbOptions } from "@fcalell/plugin-db";
import { db } from "@fcalell/plugin-db";
import { describe, expect, it, vi } from "vitest";

function createMockCtx<T>(options: T): RegisterContext<T> {
	return {
		cwd: "/tmp/test",
		options,
		hasPlugin: () => false,
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

async function collectPluginBindings<T>(
	plugin: {
		cli: { register: (ctx: RegisterContext<T>, bus: any, events: any) => void };
		events: Record<string, any>;
	},
	options: T,
) {
	const bus = createEventBus();
	const ctx = createMockCtx(options);
	plugin.cli.register(ctx, bus, plugin.events);
	const gen = await bus.emit(Generate, { files: [], bindings: [] });
	return gen.bindings;
}

describe("binding collection across plugins", () => {
	it("db plugin returns D1 binding for d1 dialect", async () => {
		const bindings = await collectPluginBindings(db, {
			dialect: "d1",
			databaseId: "test-id",
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		} satisfies DbOptions);

		expect(bindings).toHaveLength(1);
		expect(bindings[0]).toMatchObject({
			name: "DB_MAIN",
			type: "d1",
			databaseId: "test-id",
		});
	});

	it("db plugin returns empty bindings for sqlite dialect", async () => {
		const bindings = await collectPluginBindings(db, {
			dialect: "sqlite",
			path: "./data/app.sqlite",
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		} satisfies DbOptions);

		expect(bindings).toHaveLength(0);
	});

	it("auth plugin returns 4 bindings (secret, appUrl, 2 rate limiters)", async () => {
		const bindings = await collectPluginBindings(auth, {
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
			},
		} satisfies AuthOptions);

		expect(bindings).toHaveLength(4);

		const names = bindings.map((b) => b.name);
		expect(names).toContain("AUTH_SECRET");
		expect(names).toContain("APP_URL");
		expect(names).toContain("RATE_LIMITER_IP");
		expect(names).toContain("RATE_LIMITER_EMAIL");

		const secret = bindings.find((b) => b.name === "AUTH_SECRET");
		expect(secret?.type).toBe("secret");

		const appUrl = bindings.find((b) => b.name === "APP_URL");
		expect(appUrl?.type).toBe("secret");

		const ipLimiter = bindings.find((b) => b.name === "RATE_LIMITER_IP");
		expect(ipLimiter?.type).toBe("rate_limiter");
		expect(ipLimiter?.rateLimit).toEqual({ limit: 100, period: 60 });

		const emailLimiter = bindings.find((b) => b.name === "RATE_LIMITER_EMAIL");
		expect(emailLimiter?.type).toBe("rate_limiter");
		expect(emailLimiter?.rateLimit).toEqual({ limit: 5, period: 300 });
	});

	it("api plugin returns empty bindings", async () => {
		const bindings = await collectPluginBindings(api, {
			prefix: "/rpc",
		} satisfies ApiOptions);
		expect(bindings).toHaveLength(0);
	});

	it("event-based binding collection aggregates bindings from multiple plugins", async () => {
		const bus = createEventBus();

		const dbOpts: DbOptions = {
			dialect: "d1",
			databaseId: "test-id",
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		};
		const authOpts: AuthOptions = {
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
			},
		};
		const apiOpts: ApiOptions = { prefix: "/rpc" };

		db.cli.register(createMockCtx(dbOpts), bus, db.events);
		auth.cli.register(createMockCtx(authOpts), bus, auth.events);
		api.cli.register(createMockCtx(apiOpts), bus, api.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });

		expect(gen.bindings).toHaveLength(5);

		const names = gen.bindings.map((b) => b.name);
		expect(names).toContain("DB_MAIN");
		expect(names).toContain("AUTH_SECRET");
		expect(names).toContain("APP_URL");
		expect(names).toContain("RATE_LIMITER_IP");
		expect(names).toContain("RATE_LIMITER_EMAIL");
	});

	it("custom binding names override defaults", async () => {
		const bindings = await collectPluginBindings(auth, {
			secretVar: "MY_SECRET",
			appUrlVar: "MY_APP_URL",
			rateLimiter: {
				ip: { binding: "MY_IP_LIMITER", limit: 50, period: 30 },
				email: { binding: "MY_EMAIL_LIMITER", limit: 10, period: 600 },
			},
		} satisfies AuthOptions);

		const names = bindings.map((b) => b.name);
		expect(names).toContain("MY_SECRET");
		expect(names).toContain("MY_APP_URL");
		expect(names).toContain("MY_IP_LIMITER");
		expect(names).toContain("MY_EMAIL_LIMITER");

		expect(names).not.toContain("AUTH_SECRET");
		expect(names).not.toContain("APP_URL");
		expect(names).not.toContain("RATE_LIMITER_IP");
		expect(names).not.toContain("RATE_LIMITER_EMAIL");
	});
});
