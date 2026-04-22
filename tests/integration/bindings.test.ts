import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, type PluginConfig } from "@fcalell/cli";
import { buildTestGraph } from "@fcalell/cli/testing";
import type { ApiOptions } from "@fcalell/plugin-api";
import { api } from "@fcalell/plugin-api";
import type { AuthOptions } from "@fcalell/plugin-auth";
import { auth } from "@fcalell/plugin-auth";
import {
	cloudflare,
	type WranglerBindingSpec,
} from "@fcalell/plugin-cloudflare";
import type { DbOptions } from "@fcalell/plugin-db";
import { db } from "@fcalell/plugin-db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Drives the real slot graph (buildGraphFromConfig) to resolve
// cloudflare.slots.bindings + cloudflare.slots.secrets.

async function resolveWrangler(
	cwd: string,
	plugins: readonly PluginConfig[],
): Promise<{
	bindings: WranglerBindingSpec[];
	secrets: Array<{ name: string; devDefault: string }>;
}> {
	const { graph } = await buildTestGraph({
		config: defineConfig({
			app: { name: "test-app", domain: "example.com" },
			plugins,
		}),
		cwd,
	});
	const bindings = await graph.resolve(cloudflare.slots.bindings);
	const secrets = await graph.resolve(cloudflare.slots.secrets);
	return { bindings, secrets };
}

describe("binding collection across plugins", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-bindings-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("db plugin returns D1 binding for d1 dialect", async () => {
		const dbOptions: DbOptions = {
			dialect: "d1",
			databaseId: "test-id",
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		};
		const { bindings } = await resolveWrangler(cwd, [
			cloudflare(),
			db(dbOptions),
			api(),
		]);

		const d1Bindings = bindings.filter((b) => b.kind === "d1");
		expect(d1Bindings).toHaveLength(1);
		expect(d1Bindings[0]).toMatchObject({
			kind: "d1",
			binding: "DB_MAIN",
			databaseId: "test-id",
		});
	});

	it("db plugin returns no D1 binding for sqlite dialect", async () => {
		const dbOptions: DbOptions = {
			dialect: "sqlite",
			path: "./data/app.sqlite",
			binding: "DB_MAIN",
			migrations: "./src/migrations",
		};
		const { bindings } = await resolveWrangler(cwd, [
			cloudflare(),
			db(dbOptions),
			api(),
		]);

		expect(bindings.filter((b) => b.kind === "d1")).toHaveLength(0);
	});

	it("auth plugin contributes 2 rate limiters + 2 secrets to cloudflare slots", async () => {
		const authOptions: AuthOptions = {
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
			},
		};
		const { bindings, secrets } = await resolveWrangler(cwd, [
			cloudflare(),
			db({ dialect: "d1", databaseId: "x" }),
			auth(authOptions),
			api(),
		]);

		const rateLimiters = bindings.filter((b) => b.kind === "rate_limiter");
		expect(rateLimiters).toHaveLength(2);
		expect(rateLimiters[0]).toMatchObject({
			kind: "rate_limiter",
			binding: "RATE_LIMITER_IP",
			simple: { limit: 100, period: 60 },
		});
		expect(rateLimiters[1]).toMatchObject({
			kind: "rate_limiter",
			binding: "RATE_LIMITER_EMAIL",
			simple: { limit: 5, period: 300 },
		});

		expect(secrets).toContainEqual({
			name: "AUTH_SECRET",
			devDefault: "dev-secret-change-me",
		});
		expect(secrets).toContainEqual({
			name: "APP_URL",
			devDefault: "http://localhost:3000",
		});
	});

	it("api plugin contributes no wrangler bindings on its own", async () => {
		const apiOptions: ApiOptions = { prefix: "/rpc" };
		const { bindings } = await resolveWrangler(cwd, [
			cloudflare(),
			api(apiOptions),
		]);
		expect(bindings).toHaveLength(0);
	});

	it("slot aggregation combines bindings and secrets from multiple plugins", async () => {
		const { bindings, secrets } = await resolveWrangler(cwd, [
			cloudflare(),
			db({
				dialect: "d1",
				databaseId: "test-id",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			}),
			auth({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				rateLimiter: {
					ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
					email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
				},
			}),
			api({ prefix: "/rpc" }),
		]);

		const bindingIds = bindings.map((b) =>
			b.kind === "var" ? b.name : b.binding,
		);
		expect(bindingIds).toContain("DB_MAIN");
		expect(bindingIds).toContain("RATE_LIMITER_IP");
		expect(bindingIds).toContain("RATE_LIMITER_EMAIL");
		expect(secrets.map((s) => s.name)).toContain("AUTH_SECRET");
		expect(secrets.map((s) => s.name)).toContain("APP_URL");
	});

	it("custom binding names override defaults", async () => {
		const { bindings, secrets } = await resolveWrangler(cwd, [
			cloudflare(),
			db({ dialect: "d1", databaseId: "x" }),
			auth({
				secretVar: "MY_SECRET",
				appUrlVar: "MY_APP_URL",
				rateLimiter: {
					ip: { binding: "MY_IP_LIMITER", limit: 50, period: 30 },
					email: { binding: "MY_EMAIL_LIMITER", limit: 10, period: 600 },
				},
			}),
			api(),
		]);

		const bindingIds = bindings.map((b) =>
			b.kind === "var" ? b.name : b.binding,
		);
		expect(bindingIds).toContain("MY_IP_LIMITER");
		expect(bindingIds).toContain("MY_EMAIL_LIMITER");
		expect(secrets.map((s) => s.name)).toContain("MY_SECRET");
		expect(secrets.map((s) => s.name)).toContain("MY_APP_URL");

		expect(bindingIds).not.toContain("RATE_LIMITER_IP");
		expect(bindingIds).not.toContain("RATE_LIMITER_EMAIL");
	});

	it("plugin order in config.plugins does not affect binding collection", async () => {
		// Consumer-style vs reversed order should produce the same bindings —
		// resolution order comes from the dataflow graph, not the array order.
		const dbOptions: DbOptions = { dialect: "d1", databaseId: "shuffle-test" };
		const consumer = await resolveWrangler(cwd, [
			cloudflare(),
			db(dbOptions),
			api(),
		]);
		const shuffled = await resolveWrangler(cwd, [
			api(),
			db(dbOptions),
			cloudflare(),
		]);

		expect(shuffled.bindings).toEqual(consumer.bindings);
	});
});
