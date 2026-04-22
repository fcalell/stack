import type { Slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";
import { cloudflare } from "./index";

// ── Harness ────────────────────────────────────────────────────────

const app = { name: "test-app", domain: "example.com" };

const noopLog = {
	info: () => {},
	warn: () => {},
	success: () => {},
	error: () => {},
};

function makeCtxFactory(
	perPluginOptions: Record<string, unknown> = {},
): GraphCtxFactory {
	return {
		app,
		cwd: "/tmp/does-not-exist",
		log: noopLog,
		ctxForPlugin: (name) => ({
			options: perPluginOptions[name] ?? {},
			fileExists: async () => false,
			readFile: async () => "",
			template: (n) => new URL(`file:///tmp/templates/${name}/${n}`),
			scaffold: (n, target) => ({
				source: new URL(`file:///tmp/templates/${name}/${n}`),
				target,
				plugin: name,
			}),
		}),
	};
}

function collectCloudflarePlugins(extras: GraphPlugin[] = []): {
	plugins: GraphPlugin[];
	ctxFactory: GraphCtxFactory;
} {
	const collected = cloudflare.cli.collect({ app, options: {} });
	const cfPlugin: GraphPlugin = {
		name: "cloudflare",
		slots: collected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: collected.contributes,
	};
	return {
		plugins: [cfPlugin, ...extras],
		ctxFactory: makeCtxFactory(),
	};
}

// ── Config factory ────────────────────────────────────────────────

describe("cloudflare config factory", () => {
	it("returns PluginConfig with __plugin 'cloudflare'", () => {
		const config = cloudflare();
		expect(config.__plugin).toBe("cloudflare");
	});
});

// ── Slot ownership ────────────────────────────────────────────────

describe("cloudflare.slots", () => {
	it("owns bindings, routes, vars, secrets, compatibilityDate, wranglerToml", () => {
		expect(cloudflare.slots.bindings.source).toBe("cloudflare");
		expect(cloudflare.slots.routes.source).toBe("cloudflare");
		expect(cloudflare.slots.vars.source).toBe("cloudflare");
		expect(cloudflare.slots.secrets.source).toBe("cloudflare");
		expect(cloudflare.slots.compatibilityDate.source).toBe("cloudflare");
		expect(cloudflare.slots.wranglerToml.source).toBe("cloudflare");
	});

	it("compatibilityDate seeds to today's ISO date", async () => {
		const { plugins, ctxFactory } = collectCloudflarePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const today = new Date().toISOString().split("T")[0];
		expect(await g.resolve(cloudflare.slots.compatibilityDate)).toBe(today);
	});
});

// ── wranglerToml derivation ───────────────────────────────────────

describe("cloudflare.slots.wranglerToml", () => {
	it("renders name + compatibility_date when no consumer file exists", async () => {
		const { plugins, ctxFactory } = collectCloudflarePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const content = await g.resolve(cloudflare.slots.wranglerToml);
		const parsed = parseToml(content) as {
			name?: string;
			compatibility_date?: string;
			main?: string;
		};
		expect(parsed.name).toBe("test-app");
		expect(parsed.main).toBe("worker.ts");
		expect(parsed.compatibility_date).toBeDefined();
	});

	it("embeds D1 bindings contributed by sibling plugins", async () => {
		const dbLike: GraphPlugin = {
			name: "db-like",
			contributes: [
				cloudflare.slots.bindings.contribute(() => ({
					kind: "d1",
					binding: "DB_MAIN",
					databaseId: "abc-123",
					databaseName: "abc-123",
				})),
			],
		};
		const { plugins, ctxFactory } = collectCloudflarePlugins([dbLike]);
		const g = buildGraph(plugins, ctxFactory);
		const content = await g.resolve(cloudflare.slots.wranglerToml);
		const parsed = parseToml(content) as {
			d1_databases?: unknown[];
		};
		expect(parsed.d1_databases).toEqual([
			expect.objectContaining({
				binding: "DB_MAIN",
				database_id: "abc-123",
			}),
		]);
	});

	it("embeds rate_limiter bindings + secrets via [vars]", async () => {
		const authLike: GraphPlugin = {
			name: "auth-like",
			contributes: [
				cloudflare.slots.bindings.contribute(() => ({
					kind: "rate_limiter",
					binding: "RATE_LIMITER_IP",
					simple: { limit: 100, period: 60 },
				})),
				cloudflare.slots.secrets.contribute(() => ({
					name: "AUTH_SECRET",
					devDefault: "dev",
				})),
			],
		};
		const { plugins, ctxFactory } = collectCloudflarePlugins([authLike]);
		const g = buildGraph(plugins, ctxFactory);
		const content = await g.resolve(cloudflare.slots.wranglerToml);
		const parsed = parseToml(content) as {
			unsafe?: { bindings?: unknown[] };
			vars?: Record<string, string>;
		};
		expect(parsed.unsafe?.bindings).toEqual([
			{
				name: "RATE_LIMITER_IP",
				type: "ratelimit",
				limit: 100,
				period: 60,
			},
		]);
		// Secrets land as empty strings — wrangler treats [vars] as public config.
		expect(parsed.vars).toEqual({ AUTH_SECRET: "" });
	});

	// Order-independence of the wrangler aggregator. Two plugins both
	// contribute bindings — the toml output's list order is stable against
	// plugin array reordering (concat + content shape).
	it("wrangler.toml shape does not depend on plugin order", async () => {
		const a: GraphPlugin = {
			name: "a",
			contributes: [
				cloudflare.slots.bindings.contribute(() => ({
					kind: "kv",
					binding: "KV_A",
					id: "kv-a-id",
				})),
			],
		};
		const b: GraphPlugin = {
			name: "b",
			contributes: [
				cloudflare.slots.bindings.contribute(() => ({
					kind: "kv",
					binding: "KV_B",
					id: "kv-b-id",
				})),
			],
		};
		const forward = collectCloudflarePlugins([a, b]);
		const reverse = collectCloudflarePlugins([b, a]);
		const forwardGraph = buildGraph(forward.plugins, forward.ctxFactory);
		const reverseGraph = buildGraph(reverse.plugins, reverse.ctxFactory);
		const parsedF = parseToml(
			await forwardGraph.resolve(cloudflare.slots.wranglerToml),
		) as { kv_namespaces?: Array<{ binding: string }> };
		const parsedR = parseToml(
			await reverseGraph.resolve(cloudflare.slots.wranglerToml),
		) as { kv_namespaces?: Array<{ binding: string }> };

		// Both toml outputs must contain the same bindings as a set.
		const setF = new Set(parsedF.kv_namespaces?.map((b) => b.binding));
		const setR = new Set(parsedR.kv_namespaces?.map((b) => b.binding));
		expect(setF).toEqual(setR);
		expect(setF).toEqual(new Set(["KV_A", "KV_B"]));
	});
});

// ── cli.slots contributions ───────────────────────────────────────

describe("cloudflare → cli.slots", () => {
	it("pushes .stack/wrangler.toml into artifactFiles", async () => {
		const { plugins, ctxFactory } = collectCloudflarePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		const wrangler = files.find((f) => f.path === ".stack/wrangler.toml");
		expect(wrangler).toBeDefined();
		expect(wrangler?.content).toContain('name = "test-app"');
	});

	it("pushes .dev.vars when secrets are contributed", async () => {
		const authLike: GraphPlugin = {
			name: "auth-like",
			contributes: [
				cloudflare.slots.secrets.contribute(() => ({
					name: "AUTH_SECRET",
					devDefault: "dev-secret",
				})),
			],
		};
		const { plugins, ctxFactory } = collectCloudflarePlugins([authLike]);
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		const devVars = files.find((f) => f.path === ".dev.vars");
		expect(devVars).toBeDefined();
		expect(devVars?.content).toContain("AUTH_SECRET=dev-secret");
	});

	it("skips .dev.vars when no secrets are contributed", async () => {
		const { plugins, ctxFactory } = collectCloudflarePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.find((f) => f.path === ".dev.vars")).toBeUndefined();
	});

	it("contributes a postWrite hook (wrangler types shell-out)", async () => {
		const { plugins, ctxFactory } = collectCloudflarePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const postWrite = await g.resolve(cliSlots.postWrite);
		expect(postWrite).toHaveLength(1);
		expect(typeof postWrite[0]).toBe("function");
	});
});
