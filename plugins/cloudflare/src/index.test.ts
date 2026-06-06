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
import { DEFAULT_COMPATIBILITY_DATE } from "./types";

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
	it("compatibilityDate seeds to the pinned default (clock-independent)", async () => {
		const { plugins, ctxFactory } = collectCloudflarePlugins();
		const g = buildGraph(plugins, ctxFactory);
		expect(await g.resolve(cloudflare.slots.compatibilityDate)).toBe(
			DEFAULT_COMPATIBILITY_DATE,
		);
	});

	it("compatibilityDate resolves to the same value twice within one graph", async () => {
		const { plugins, ctxFactory } = collectCloudflarePlugins();
		const g = buildGraph(plugins, ctxFactory);
		const first = await g.resolve(cloudflare.slots.compatibilityDate);
		const second = await g.resolve(cloudflare.slots.compatibilityDate);
		expect(first).toBe(second);
	});

	it("compatibilityDate is stable across fresh graphs (determinism guard)", async () => {
		// Two independent graphs — mirrors `stack generate` being invoked twice
		// in separate processes on different days. The seed does not read the
		// wall clock, so both resolves produce the same pinned date.
		const first = collectCloudflarePlugins();
		const second = collectCloudflarePlugins();
		const g1 = buildGraph(first.plugins, first.ctxFactory);
		const g2 = buildGraph(second.plugins, second.ctxFactory);
		expect(await g1.resolve(cloudflare.slots.compatibilityDate)).toBe(
			await g2.resolve(cloudflare.slots.compatibilityDate),
		);
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

// ── Cross-plugin namespace collisions (real-graph) ────────────────
//
// Collisions happen when two different plugins register the same identifier
// through different slots — e.g. a KV binding named `SHARED` from plugin A and
// a secret named `SHARED` from plugin B. These land in the same `env.*`
// namespace at runtime, so the wrangler derivation fails fast at resolve time
// with both shapes in the error message.

describe("cloudflare cross-plugin namespace collisions", () => {
	it("fails resolving wranglerToml when a binding and a secret collide", async () => {
		const pluginA: GraphPlugin = {
			name: "plugin-a",
			contributes: [
				cloudflare.slots.bindings.contribute(() => ({
					kind: "kv",
					binding: "SHARED",
					id: "kv-id",
				})),
			],
		};
		const pluginB: GraphPlugin = {
			name: "plugin-b",
			contributes: [
				cloudflare.slots.secrets.contribute(() => ({
					name: "SHARED",
					devDefault: "dev",
				})),
			],
		};
		const { plugins, ctxFactory } = collectCloudflarePlugins([
			pluginA,
			pluginB,
		]);
		const g = buildGraph(plugins, ctxFactory);
		await expect(g.resolve(cloudflare.slots.wranglerToml)).rejects.toThrow(
			/"SHARED".*kv namespace, secret/s,
		);
	});

	it("fails when two plugins contribute secrets with the same name", async () => {
		const pluginA: GraphPlugin = {
			name: "plugin-a",
			contributes: [
				cloudflare.slots.secrets.contribute(() => ({
					name: "AUTH_SECRET",
					devDefault: "a",
				})),
			],
		};
		const pluginB: GraphPlugin = {
			name: "plugin-b",
			contributes: [
				cloudflare.slots.secrets.contribute(() => ({
					name: "AUTH_SECRET",
					devDefault: "b",
				})),
			],
		};
		const { plugins, ctxFactory } = collectCloudflarePlugins([
			pluginA,
			pluginB,
		]);
		const g = buildGraph(plugins, ctxFactory);
		await expect(g.resolve(cloudflare.slots.wranglerToml)).rejects.toThrow(
			/"AUTH_SECRET".*secret, secret/s,
		);
	});

	it("fails when a vars map contribution collides with a secret", async () => {
		const pluginA: GraphPlugin = {
			name: "plugin-a",
			contributes: [
				cloudflare.slots.vars.contribute(() => ({ NODE_ENV: "prod" })),
			],
		};
		const pluginB: GraphPlugin = {
			name: "plugin-b",
			contributes: [
				cloudflare.slots.secrets.contribute(() => ({
					name: "NODE_ENV",
					devDefault: "dev",
				})),
			],
		};
		const { plugins, ctxFactory } = collectCloudflarePlugins([
			pluginA,
			pluginB,
		]);
		const g = buildGraph(plugins, ctxFactory);
		await expect(g.resolve(cloudflare.slots.wranglerToml)).rejects.toThrow(
			/"NODE_ENV".*secret, extra var/s,
		);
	});
});
