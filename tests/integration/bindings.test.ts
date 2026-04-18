import type { RegisterContext } from "@fcalell/cli";
import {
	Codegen,
	type CodegenEnvPayload,
	type CodegenWranglerPayload,
	createEventBus,
	type Event,
	type EventBus,
} from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import type { ApiOptions } from "@fcalell/plugin-api";
import { api } from "@fcalell/plugin-api";
import type { AuthOptions } from "@fcalell/plugin-auth";
import { auth } from "@fcalell/plugin-auth";
import type { DbOptions } from "@fcalell/plugin-db";
import { db } from "@fcalell/plugin-db";
import { describe, expect, it } from "vitest";

function emptyWrangler(): CodegenWranglerPayload {
	return {
		bindings: [],
		routes: [],
		vars: {},
		secrets: [],
		compatibilityDate: "2025-01-01",
	};
}

function emptyEnv(): CodegenEnvPayload {
	return { fields: [] };
}

async function collectPluginWrangler<
	T,
	E extends Record<string, Event<unknown>>,
>(
	plugin: {
		cli: {
			register: (ctx: RegisterContext<T>, bus: EventBus, events: E) => void;
		};
		events: E;
	},
	options: T,
): Promise<CodegenWranglerPayload> {
	const bus = createEventBus();
	const ctx = createMockCtx({ options });
	plugin.cli.register(ctx, bus, plugin.events);
	return bus.emit(Codegen.Wrangler, emptyWrangler());
}

async function collectPluginEnv<T, E extends Record<string, Event<unknown>>>(
	plugin: {
		cli: {
			register: (ctx: RegisterContext<T>, bus: EventBus, events: E) => void;
		};
		events: E;
	},
	options: T,
): Promise<CodegenEnvPayload> {
	const bus = createEventBus();
	const ctx = createMockCtx({ options });
	plugin.cli.register(ctx, bus, plugin.events);
	return bus.emit(Codegen.Env, emptyEnv());
}

describe("binding collection across plugins", () => {
	it("db plugin returns D1 binding for d1 dialect", async () => {
		const wrangler = await collectPluginWrangler(db, {
			dialect: "d1",
			databaseId: "test-id",
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		} satisfies DbOptions);

		expect(wrangler.bindings).toHaveLength(1);
		expect(wrangler.bindings[0]).toMatchObject({
			kind: "d1",
			binding: "DB_MAIN",
			databaseId: "test-id",
		});
	});

	it("db plugin returns empty bindings for sqlite dialect", async () => {
		const wrangler = await collectPluginWrangler(db, {
			dialect: "sqlite",
			path: "./data/app.sqlite",
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		} satisfies DbOptions);

		expect(wrangler.bindings).toHaveLength(0);
	});

	it("auth plugin contributes 2 rate limiters + 2 secrets via Codegen.Wrangler", async () => {
		const wrangler = await collectPluginWrangler(auth, {
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
			},
		} satisfies AuthOptions);

		expect(wrangler.bindings).toHaveLength(2);
		const bindings = wrangler.bindings;
		expect(bindings[0]).toMatchObject({
			kind: "rate_limiter",
			binding: "RATE_LIMITER_IP",
			simple: { limit: 100, period: 60 },
		});
		expect(bindings[1]).toMatchObject({
			kind: "rate_limiter",
			binding: "RATE_LIMITER_EMAIL",
			simple: { limit: 5, period: 300 },
		});

		expect(wrangler.secrets).toEqual([
			{ name: "AUTH_SECRET", devDefault: "dev-secret-change-me" },
			{ name: "APP_URL", devDefault: "http://localhost:3000" },
		]);
	});

	it("auth plugin contributes 4 env fields via Codegen.Env", async () => {
		const env = await collectPluginEnv(auth, {
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
			},
		} satisfies AuthOptions);

		expect(env.fields).toHaveLength(4);
		const names = env.fields.map((f) => f.name);
		expect(names).toEqual([
			"AUTH_SECRET",
			"APP_URL",
			"RATE_LIMITER_IP",
			"RATE_LIMITER_EMAIL",
		]);
	});

	it("api plugin contributes no wrangler bindings", async () => {
		const wrangler = await collectPluginWrangler(api, {
			prefix: "/rpc",
		} satisfies ApiOptions);
		expect(wrangler.bindings).toHaveLength(0);
	});

	it("event-based aggregation combines bindings and secrets from multiple plugins", async () => {
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

		db.cli.register(createMockCtx({ options: dbOpts }), bus, db.events);
		auth.cli.register(createMockCtx({ options: authOpts }), bus, auth.events);
		api.cli.register(createMockCtx({ options: apiOpts }), bus, api.events);

		const wrangler = await bus.emit(Codegen.Wrangler, emptyWrangler());
		expect(wrangler.bindings).toHaveLength(3);
		const bindingIds = wrangler.bindings.map((b) =>
			b.kind === "var" ? b.name : b.binding,
		);
		expect(bindingIds).toContain("DB_MAIN");
		expect(bindingIds).toContain("RATE_LIMITER_IP");
		expect(bindingIds).toContain("RATE_LIMITER_EMAIL");
		expect(wrangler.secrets.map((s) => s.name)).toEqual([
			"AUTH_SECRET",
			"APP_URL",
		]);

		const env = await bus.emit(Codegen.Env, emptyEnv());
		expect(env.fields.map((f) => f.name)).toEqual([
			"DB_MAIN",
			"AUTH_SECRET",
			"APP_URL",
			"RATE_LIMITER_IP",
			"RATE_LIMITER_EMAIL",
		]);
	});

	it("custom binding names override defaults", async () => {
		const wrangler = await collectPluginWrangler(auth, {
			secretVar: "MY_SECRET",
			appUrlVar: "MY_APP_URL",
			rateLimiter: {
				ip: { binding: "MY_IP_LIMITER", limit: 50, period: 30 },
				email: { binding: "MY_EMAIL_LIMITER", limit: 10, period: 600 },
			},
		} satisfies AuthOptions);

		const bindingIds = wrangler.bindings.map((b) =>
			b.kind === "var" ? b.name : b.binding,
		);
		expect(bindingIds).toContain("MY_IP_LIMITER");
		expect(bindingIds).toContain("MY_EMAIL_LIMITER");
		expect(wrangler.secrets.map((s) => s.name)).toEqual([
			"MY_SECRET",
			"MY_APP_URL",
		]);

		expect(bindingIds).not.toContain("RATE_LIMITER_IP");
		expect(bindingIds).not.toContain("RATE_LIMITER_EMAIL");
	});
});
