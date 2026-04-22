import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, type PluginConfig } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { buildTestGraph } from "@fcalell/cli/testing";
import { type ApiOptions, api } from "@fcalell/plugin-api";
import { type AuthOptions, auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { type DbOptions, db } from "@fcalell/plugin-db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Structural contract tests: each first-party plugin boots through the real
// build-graph path and produces well-typed slot contributions.

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

interface TargetPluginSpec {
	name: "db" | "auth" | "api";
	label: string;
	plugins: readonly PluginConfig[];
}

const targets: TargetPluginSpec[] = [
	{
		name: "db",
		label: "Database",
		// Consumer-ordered: requires chain is cloudflare, api, db.
		plugins: [cloudflare(), db(dbOptions), api()],
	},
	{
		name: "auth",
		label: "Auth",
		plugins: [
			cloudflare(),
			db({ dialect: "d1", databaseId: "x" }),
			auth(authOptions),
			api(),
		],
	},
	{
		name: "api",
		label: "API",
		plugins: [cloudflare(), api(apiOptions)],
	},
];

describe("plugin CLI contracts", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-contracts-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	describe.each(targets)("$name plugin", (spec) => {
		it(`has plugin metadata (name=${spec.name}, label=${spec.label})`, async () => {
			const { collected } = await buildTestGraph({
				config: defineConfig({
					app: { name: "app", domain: "example.com" },
					plugins: spec.plugins,
				}),
				cwd,
			});
			const plugin = collected.find((c) => c.discovered.name === spec.name);
			expect(plugin).toBeDefined();
			expect(plugin?.discovered.cli.name).toBe(spec.name);
			expect(plugin?.discovered.cli.label).toBe(spec.label);
			expect(typeof plugin?.discovered.cli.collect).toBe("function");
		});

		it("contributes structurally-valid bindings", async () => {
			const { graph } = await buildTestGraph({
				config: defineConfig({
					app: { name: "app", domain: "example.com" },
					plugins: spec.plugins,
				}),
				cwd,
			});

			const bindings = await graph.resolve(cloudflare.slots.bindings);
			const secrets = await graph.resolve(cloudflare.slots.secrets);

			const validKinds = ["d1", "kv", "r2", "rate_limiter", "var"];
			for (const binding of bindings) {
				expect(validKinds).toContain(binding.kind);
				const id = binding.kind === "var" ? binding.name : binding.binding;
				expect(typeof id).toBe("string");
				expect(id.length).toBeGreaterThan(0);
			}
			for (const secret of secrets) {
				expect(typeof secret.name).toBe("string");
				expect(secret.name.length).toBeGreaterThan(0);
			}
		});

		it("removal info is well-formed strings", async () => {
			const { graph } = await buildTestGraph({
				config: defineConfig({
					app: { name: "app", domain: "example.com" },
					plugins: spec.plugins,
				}),
				cwd,
			});

			const files = await graph.resolve(cliSlots.removeFiles);
			const deps = await graph.resolve(cliSlots.removeDeps);
			const devDeps = await graph.resolve(cliSlots.removeDevDeps);

			for (const f of files) expect(typeof f).toBe("string");
			for (const d of deps) expect(typeof d).toBe("string");
			for (const d of devDeps) expect(typeof d).toBe("string");
		});
	});
});
