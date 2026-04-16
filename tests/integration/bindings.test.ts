import { describe, expect, it } from "vitest";
import { collectBindings } from "@fcalell/cli/codegen";
import dbCli from "@fcalell/plugin-db/cli";
import authCli from "@fcalell/plugin-auth/cli";
import apiCli from "@fcalell/plugin-api/cli";
import appCli from "@fcalell/plugin-app/cli";
import type { DbOptions } from "@fcalell/plugin-db";
import type { AuthOptions } from "@fcalell/plugin-auth";
import type { ApiOptions } from "@fcalell/plugin-api";
import type { AppOptions } from "@fcalell/plugin-app";

describe("binding collection across plugins", () => {
	it("db plugin returns D1 binding for d1 dialect", () => {
		const bindings = dbCli.bindings({
			dialect: "d1",
			databaseId: "test-id",
			schema: {},
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

	it("db plugin returns empty bindings for sqlite dialect", () => {
		const bindings = dbCli.bindings({
			dialect: "sqlite",
			path: "./data/app.sqlite",
			schema: {},
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		} satisfies DbOptions);

		expect(bindings).toHaveLength(0);
	});

	it("auth plugin returns 4 bindings (secret, appUrl, 2 rate limiters)", () => {
		const bindings = authCli.bindings({
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

		const emailLimiter = bindings.find(
			(b) => b.name === "RATE_LIMITER_EMAIL",
		);
		expect(emailLimiter?.type).toBe("rate_limiter");
		expect(emailLimiter?.rateLimit).toEqual({ limit: 5, period: 300 });
	});

	it("api plugin returns empty bindings", () => {
		const bindings = apiCli.bindings({ prefix: "/rpc" } satisfies ApiOptions);
		expect(bindings).toHaveLength(0);
	});

	it("app plugin returns empty bindings", () => {
		const bindings = appCli.bindings({} satisfies AppOptions);
		expect(bindings).toHaveLength(0);
	});

	it("collectBindings aggregates bindings from multiple plugins", () => {
		const dbOptions: DbOptions = {
			dialect: "d1",
			databaseId: "test-id",
			schema: {},
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		};
		const authOptions: AuthOptions = {
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
			},
		};

		const result = collectBindings([
			{ name: "db", cli: dbCli, options: dbOptions },
			{ name: "auth", cli: authCli, options: authOptions },
			{ name: "api", cli: apiCli, options: { prefix: "/rpc" } },
			{ name: "app", cli: appCli, options: {} },
		]);

		expect(result.bindings).toHaveLength(5);
		expect(result.collisions).toHaveLength(0);

		const names = result.bindings.map((b) => b.name);
		expect(names).toContain("DB_MAIN");
		expect(names).toContain("AUTH_SECRET");
		expect(names).toContain("APP_URL");
		expect(names).toContain("RATE_LIMITER_IP");
		expect(names).toContain("RATE_LIMITER_EMAIL");
	});

	it("collectBindings detects binding name collisions", () => {
		const fakePlugin1 = {
			...dbCli,
			bindings: () => [{ name: "SHARED_BINDING", type: "d1" as const }],
		};
		const fakePlugin2 = {
			...authCli,
			bindings: () => [{ name: "SHARED_BINDING", type: "secret" as const }],
		};

		const result = collectBindings([
			{ name: "plugin-a", cli: fakePlugin1, options: {} },
			{ name: "plugin-b", cli: fakePlugin2, options: {} },
		]);

		expect(result.collisions).toHaveLength(1);
		expect(result.collisions[0]).toMatchObject({
			name: "SHARED_BINDING",
			plugins: ["plugin-a", "plugin-b"],
		});
	});

	it("custom binding names override defaults", () => {
		const bindings = authCli.bindings({
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
