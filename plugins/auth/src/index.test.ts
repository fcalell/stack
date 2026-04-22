import type { Slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { describe, expect, it, vi } from "vitest";

// Mock vite-like plugin that contributes the localhost dev-port origin to
// api.slots.corsOrigins. We don't import `@fcalell/plugin-vite` directly —
// plugin-auth must not depend on it at package-manifest level. The mock
// exercises the exact same cors dataflow path: the contribution becomes
// part of api.slots.cors, which then flows into auth.slots.runtimeOptions.
function viteLikePlugin(
	localhostOrigin = "http://localhost:3000",
): GraphPlugin {
	return {
		name: "vite-like",
		contributes: [
			api.slots.corsOrigins.contribute((ctx) => {
				if (ctx.app.origins) return undefined;
				return localhostOrigin;
			}),
		],
	};
}

import { type AuthOptions, auth } from "./index";

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
	perPluginFiles: Record<string, Set<string>> = {},
	appOverride?: typeof app & { origins?: string[] },
): GraphCtxFactory {
	return {
		app: appOverride ?? app,
		cwd: "/tmp/test",
		log: noopLog,
		ctxForPlugin: (name) => ({
			options: perPluginOptions[name] ?? {},
			fileExists: async (p) => perPluginFiles[name]?.has(p) ?? false,
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

interface CollectOpts {
	authOpts?: AuthOptions;
	authFiles?: Set<string>;
	withVite?: boolean;
	withDb?: boolean;
	appOverride?: typeof app & { origins?: string[] };
	// Control the order in which plugins appear in the resolved config; bug #5
	// regressions would surface as the returned list changing behaviour.
	order?: Array<"api" | "cloudflare" | "vite" | "db" | "auth">;
}

function collectAuthPlugins(opts: CollectOpts = {}): {
	plugins: GraphPlugin[];
	ctxFactory: GraphCtxFactory;
} {
	const withVite = opts.withVite ?? true;
	const withDb = opts.withDb ?? true;
	const authOpts: AuthOptions = opts.authOpts ?? {};

	const apiCollected = api.cli.collect({ app, options: {} });
	const cfCollected = cloudflare.cli.collect({ app, options: {} });
	const dbCollected = withDb
		? db.cli.collect({
				app,
				options: { dialect: "d1", databaseId: "abc-123" },
			})
		: null;
	// Validate options through the factory so defaults (rateLimiter, secretVar,
	// appUrlVar, etc.) are applied — the production path resolves the config
	// via the factory as well, so `ctx.options` inside contributions sees the
	// output of the Zod schema, not the raw input.
	const validatedAuthOpts = auth(authOpts).options;
	const authCollected = auth.cli.collect({ app, options: validatedAuthOpts });

	const map: Record<string, GraphPlugin | null> = {
		api: {
			name: "api",
			slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: apiCollected.contributes,
		},
		cloudflare: {
			name: "cloudflare",
			slots: cfCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: cfCollected.contributes,
		},
		vite: withVite ? viteLikePlugin() : null,
		db: dbCollected
			? {
					name: "db",
					slots: dbCollected.slots as unknown as Record<string, Slot<unknown>>,
					contributes: dbCollected.contributes,
				}
			: null,
		auth: {
			name: "auth",
			slots: authCollected.slots as unknown as Record<string, Slot<unknown>>,
			contributes: authCollected.contributes,
		},
	};

	const defaultOrder: Array<"api" | "cloudflare" | "vite" | "db" | "auth"> =
		opts.order ?? ["api", "cloudflare", "vite", "db", "auth"];

	const plugins = defaultOrder
		.map((n) => map[n])
		.filter((p): p is GraphPlugin => p !== null);

	return {
		plugins,
		ctxFactory: makeCtxFactory(
			{
				api: {},
				cloudflare: {},
				vite: {},
				db: { dialect: "d1", databaseId: "abc-123" },
				auth: validatedAuthOpts,
			},
			{
				auth: opts.authFiles ?? new Set(),
			},
			opts.appOverride,
		),
	};
}

// ── Config factory ────────────────────────────────────────────────

describe("auth config factory", () => {
	it("returns PluginConfig with __plugin 'auth'", () => {
		const config = auth({});
		expect(config.__plugin).toBe("auth");
	});

	it("defaults secretVar to AUTH_SECRET", () => {
		const config = auth({});
		expect(config.options.secretVar).toBe("AUTH_SECRET");
	});

	it("defaults appUrlVar to APP_URL", () => {
		const config = auth({});
		expect(config.options.appUrlVar).toBe("APP_URL");
	});

	it("defaults rate limiter IP binding and values", () => {
		const config = auth({});
		expect(config.options.rateLimiter?.ip).toEqual({
			binding: "RATE_LIMITER_IP",
			limit: 100,
			period: 60,
		});
	});

	it("defaults rate limiter email binding and values", () => {
		const config = auth({});
		expect(config.options.rateLimiter?.email).toEqual({
			binding: "RATE_LIMITER_EMAIL",
			limit: 5,
			period: 300,
		});
	});

	it("custom options override defaults", () => {
		const config = auth({
			secretVar: "MY_SECRET",
			appUrlVar: "MY_URL",
			rateLimiter: {
				ip: { binding: "CUSTOM_IP", limit: 50, period: 30 },
			},
		});
		expect(config.options.secretVar).toBe("MY_SECRET");
		expect(config.options.appUrlVar).toBe("MY_URL");
		expect(config.options.rateLimiter?.ip).toEqual({
			binding: "CUSTOM_IP",
			limit: 50,
			period: 30,
		});
	});

	it("throws when session.expiresIn is <= 0", () => {
		expect(() => auth({ session: { expiresIn: 0 } })).toThrow(
			"auth: session.expiresIn must be a positive number",
		);
		expect(() => auth({ session: { expiresIn: -1 } })).toThrow(
			"auth: session.expiresIn must be a positive number",
		);
	});

	it("accepts valid expiresIn", () => {
		const config = auth({ session: { expiresIn: 3600 } });
		expect(config.options.session?.expiresIn).toBe(3600);
	});

	it("accepts empty options (all defaults)", () => {
		const config = auth({});
		expect(config.options).toMatchObject({
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
		});
	});

	it("passes through organization config", () => {
		const orgConfig = {
			ac: { statements: { project: ["create"] } },
			roles: { admin: {} },
			additionalFields: { logo: { type: "string" as const } },
		};
		const config = auth({ organization: orgConfig });
		expect(config.options.organization).toEqual(orgConfig);
	});

	it("passes through boolean organization config", () => {
		const config = auth({ organization: true });
		expect(config.options.organization).toBe(true);
	});

	it("passes through cookies config", () => {
		const config = auth({
			cookies: { prefix: "myapp", domain: ".example.com" },
		});
		expect(config.options.cookies).toEqual({
			prefix: "myapp",
			domain: ".example.com",
		});
	});
});

// ── CLI metadata ──────────────────────────────────────────────────

describe("auth.cli", () => {
	it("has correct name and label", () => {
		expect(auth.cli.name).toBe("auth");
		expect(auth.cli.label).toBe("Auth");
	});

	it("declares api + cloudflare + db as requires (presence-only)", () => {
		expect(auth.cli.requires).toEqual(
			expect.arrayContaining(["api", "cloudflare", "db"]),
		);
	});
});

describe("auth.defineCallbacks", () => {
	it("is present", () => {
		expect(auth.defineCallbacks).toBeDefined();
		expect(typeof auth.defineCallbacks).toBe("function");
	});

	it("returns the callbacks object as-is", () => {
		const cbs = {
			sendOTP: vi.fn(),
			sendInvitation: vi.fn(),
		};
		expect(auth.defineCallbacks(cbs)).toBe(cbs);
	});
});

// ── cloudflare.slots.bindings + secrets contributions ─────────────

describe("auth → cloudflare bindings + secrets", () => {
	it("contributes two rate-limiter bindings", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const bindings = await g.resolve(cloudflare.slots.bindings);
		const ipRl = bindings.find(
			(b) => b.kind === "rate_limiter" && b.binding === "RATE_LIMITER_IP",
		);
		const emailRl = bindings.find(
			(b) => b.kind === "rate_limiter" && b.binding === "RATE_LIMITER_EMAIL",
		);
		expect(ipRl).toEqual({
			kind: "rate_limiter",
			binding: "RATE_LIMITER_IP",
			simple: { limit: 100, period: 60 },
		});
		expect(emailRl).toEqual({
			kind: "rate_limiter",
			binding: "RATE_LIMITER_EMAIL",
			simple: { limit: 5, period: 300 },
		});
	});

	it("contributes AUTH_SECRET + APP_URL secrets", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const secrets = await g.resolve(cloudflare.slots.secrets);
		expect(secrets).toEqual(
			expect.arrayContaining([
				{ name: "AUTH_SECRET", devDefault: "dev-secret-change-me" },
				{ name: "APP_URL", devDefault: "http://localhost:3000" },
			]),
		);
	});

	it("respects custom secretVar + appUrlVar", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins({
			authOpts: { secretVar: "MY_SECRET", appUrlVar: "MY_URL" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const secrets = await g.resolve(cloudflare.slots.secrets);
		expect(secrets.find((s) => s.name === "MY_SECRET")).toBeTruthy();
		expect(secrets.find((s) => s.name === "MY_URL")).toBeTruthy();
	});
});

// ── runtimeOptions derivation — BUG #5 STRUCTURAL FIX ─────────────
//
// Pre-rewrite, trustedOrigins + sameSite were computed inside a worker
// codegen handler that read a partially-mutated cors array. If the
// plugin order placed vite after auth, vite's localhost contribution
// hadn't landed yet — trustedOrigins missed the localhost origin and
// sameSite stayed absent. Consumers would see missing auth cookies in dev.
//
// Under the slot graph, `auth.slots.runtimeOptions` is a derived slot
// whose `inputs.cors` is `api.slots.cors`. The graph resolver guarantees
// every corsOrigins contribution (including vite's) is fully resolved
// before the derivation's `compute` runs. The bug is structurally dead
// — plugin array order cannot change the output.

describe("auth.slots.runtimeOptions — bug #5 order-independence", () => {
	it("trustedOrigins + sameSite=none are present when vite contributes localhost", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const opts = await g.resolve(auth.slots.runtimeOptions);

		expect(opts.sameSite).toEqual({ kind: "string", value: "none" });
		expect(opts.trustedOrigins).toMatchObject({ kind: "array" });
		const items = (opts.trustedOrigins as { items: Array<{ value: string }> })
			.items;
		const values = items.map((i) => i.value);
		expect(values).toContain("http://localhost:3000");
		expect(values).toContain("https://example.com");
	});

	// The headline fix. Both permutations of the plugin array must produce
	// identical trustedOrigins and sameSite — if any ordering were observable,
	// the test would fail. Replaces the pre-rewrite regression test that
	// depended on emitting a worker codegen event with a hand-seeded `cors`.
	it("cors-derived runtime options do not depend on plugin order", async () => {
		const forward = collectAuthPlugins({
			order: ["api", "cloudflare", "vite", "db", "auth"],
		});
		const reverse = collectAuthPlugins({
			order: ["auth", "db", "vite", "cloudflare", "api"],
		});
		const midway = collectAuthPlugins({
			order: ["auth", "api", "db", "cloudflare", "vite"],
		});

		const forwardGraph = buildGraph(forward.plugins, forward.ctxFactory);
		const reverseGraph = buildGraph(reverse.plugins, reverse.ctxFactory);
		const midwayGraph = buildGraph(midway.plugins, midway.ctxFactory);

		const forwardOpts = await forwardGraph.resolve(auth.slots.runtimeOptions);
		const reverseOpts = await reverseGraph.resolve(auth.slots.runtimeOptions);
		const midwayOpts = await midwayGraph.resolve(auth.slots.runtimeOptions);

		for (const opts of [forwardOpts, reverseOpts, midwayOpts]) {
			expect(opts.sameSite).toEqual({ kind: "string", value: "none" });
			const items = (
				opts.trustedOrigins as {
					items: Array<{ value: string }>;
				}
			).items;
			expect(items.map((i) => i.value)).toContain("http://localhost:3000");
		}
		// All three permutations must be deeply equal — no per-order drift.
		expect(forwardOpts).toEqual(reverseOpts);
		expect(reverseOpts).toEqual(midwayOpts);
	});

	it("omits sameSite + trustedOrigins when no cors", async () => {
		// app.origins overrides the entire cors list; set to [] -> no trusted
		// origins to inject. The derivation still runs, just without sameSite.
		const { plugins, ctxFactory } = collectAuthPlugins({
			withVite: false,
			appOverride: { ...app, origins: [] },
		});
		const g = buildGraph(plugins, ctxFactory);
		const opts = await g.resolve(auth.slots.runtimeOptions);
		expect(opts.sameSite).toBeUndefined();
		expect(opts.trustedOrigins).toBeUndefined();
	});

	it("emits trustedOrigins with the full cors list when no localhost", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins({
			withVite: false,
		});
		const g = buildGraph(plugins, ctxFactory);
		const opts = await g.resolve(auth.slots.runtimeOptions);
		// No localhost → no sameSite
		expect(opts.sameSite).toBeUndefined();
		const items = (opts.trustedOrigins as { items: Array<{ value: string }> })
			.items;
		expect(items.map((i) => i.value)).toEqual([
			"https://example.com",
			"https://app.example.com",
		]);
	});

	it("includes every consumer option in runtimeOptions", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins({
			authOpts: {
				secretVar: "MY_SECRET",
				cookies: { prefix: "myapp" },
				organization: true,
			},
		});
		const g = buildGraph(plugins, ctxFactory);
		const opts = await g.resolve(auth.slots.runtimeOptions);
		expect(opts.secretVar).toEqual({ kind: "string", value: "MY_SECRET" });
		expect(opts.organization).toEqual({ kind: "boolean", value: true });
		expect(opts.cookies).toMatchObject({ kind: "object" });
	});
});

// ── api.slots.pluginRuntimes contribution ─────────────────────────

describe("auth → api.slots.pluginRuntimes", () => {
	it("contributes authRuntime entry with resolved options", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const runtimes = await g.resolve(api.slots.pluginRuntimes);
		const entry = runtimes.find((r) => r.plugin === "auth");
		expect(entry).toBeDefined();
		expect(entry?.identifier).toBe("authRuntime");
		expect(entry?.import).toEqual({
			source: "@fcalell/plugin-auth/runtime",
			default: "authRuntime",
		});
		// Options carry the derived trustedOrigins + sameSite (localhost is
		// in CORS because vite is present).
		expect(entry?.options.trustedOrigins).toMatchObject({ kind: "array" });
		expect(entry?.options.sameSite).toEqual({
			kind: "string",
			value: "none",
		});
	});
});

// ── api.slots.callbacks contribution ──────────────────────────────

describe("auth → api.slots.callbacks", () => {
	it("wires the callback file when it exists on disk", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins({
			authFiles: new Set(["src/worker/plugins/auth.ts"]),
		});
		const g = buildGraph(plugins, ctxFactory);
		const callbacks = await g.resolve(api.slots.callbacks);
		expect(callbacks.auth).toEqual({
			import: {
				source: "../src/worker/plugins/auth",
				default: "authCallbacks",
			},
			identifier: "authCallbacks",
		});
	});

	it("skips callback wiring when the file is absent", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins({
			authFiles: new Set(),
		});
		const g = buildGraph(plugins, ctxFactory);
		const callbacks = await g.resolve(api.slots.callbacks);
		expect(callbacks.auth).toBeUndefined();
	});
});

// ── cli slots: scaffold (auto), deps, remove ──────────────────────

describe("auth → cli slots", () => {
	it("auto-scaffolds the callback file when callbacks declared", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const scaffolds = await g.resolve(cliSlots.initScaffolds);
		const cb = scaffolds.find((s) => s.target === "src/worker/plugins/auth.ts");
		expect(cb).toBeDefined();
		expect(cb?.plugin).toBe("auth");
	});

	it("auto-wires @fcalell/plugin-auth into initDeps", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const deps = await g.resolve(cliSlots.initDeps);
		expect(deps["@fcalell/plugin-auth"]).toBe("workspace:*");
	});

	it("auto-wires callback file into removeFiles", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const removeFiles = await g.resolve(cliSlots.removeFiles);
		expect(removeFiles).toContain("src/worker/plugins/auth.ts");
	});

	it("contributes an init prompt", async () => {
		const { plugins, ctxFactory } = collectAuthPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const prompts = await g.resolve(cliSlots.initPrompts);
		expect(prompts.find((p) => p.plugin === "auth")).toBeDefined();
	});
});
