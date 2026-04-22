import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { describe, expect, it } from "vitest";
import { type ApiOptions, api } from "./index";
import type { PluginRuntimeEntry } from "./node/types";

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

// Collects the api plugin + any additional GraphPlugin entries into the
// shape buildGraph expects. Uses the real `api.cli.collect` so the test
// exercises the production slot-resolution path — no hand-ordering, no
// synthetic payloads.
function collectPlugins(
	extras: GraphPlugin[] = [],
	opts: ApiOptions = {},
): GraphPlugin[] {
	const collected = api.cli.collect({ app, options: opts });
	const apiPlugin: GraphPlugin = {
		name: "api",
		slots: collected.slots as unknown as Record<
			string,
			import("@fcalell/cli").Slot<unknown>
		>,
		contributes: collected.contributes,
	};
	return [apiPlugin, ...extras];
}

// ── Config factory ────────────────────────────────────────────────

describe("api config factory", () => {
	it("returns PluginConfig with __plugin: 'api'", () => {
		const config = api({});
		expect(config.__plugin).toBe("api");
	});

	it("default prefix is /rpc", () => {
		const config = api({});
		expect(config.options.prefix).toBe("/rpc");
	});

	it("custom prefix is preserved", () => {
		const config = api({ prefix: "/api" });
		expect(config.options.prefix).toBe("/api");
	});

	it("throws when prefix doesn't start with /", () => {
		expect(() => api({ prefix: "rpc" })).toThrow(
			"api: prefix must start with /",
		);
	});

	it("stamps __package with the default namespace", () => {
		expect(api({}).__package).toBe("@fcalell/plugin-api");
	});
});

// ── Slot ownership ────────────────────────────────────────────────

describe("api.slots", () => {
	it("owns workerImports, pluginRuntimes, middlewareEntries, cors, callbacks", () => {
		expect(api.slots.workerImports.source).toBe("api");
		expect(api.slots.pluginRuntimes.source).toBe("api");
		expect(api.slots.middlewareEntries.source).toBe("api");
		expect(api.slots.cors.source).toBe("api");
		expect(api.slots.callbacks.source).toBe("api");
		expect(api.slots.workerSource.source).toBe("api");
	});
});

// ── cors — bug #5 order-independence ──────────────────────────────

describe("api.slots.cors (bug #5 — order-independent)", () => {
	it("resolves defaults when no origins contributed", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toEqual(["https://example.com", "https://app.example.com"]);
	});

	it("appends contributed origins from corsOrigins", async () => {
		const viteLike: GraphPlugin = {
			name: "vite-like",
			contributes: [
				api.slots.corsOrigins.contribute(() => "http://localhost:3000"),
			],
		};
		const g = buildGraph(collectPlugins([viteLike]), makeCtxFactory());
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toContain("http://localhost:3000");
		expect(cors).toContain("https://example.com");
	});

	it("honours app.origins override (ignoring extras)", async () => {
		const viteLike: GraphPlugin = {
			name: "vite-like",
			contributes: [
				api.slots.corsOrigins.contribute(() => "http://localhost:3000"),
			],
		};
		const g = buildGraph(
			collectPlugins([viteLike]),
			makeCtxFactory(
				{},
				{},
				{
					...app,
					origins: ["https://only.example.com"],
				},
			),
		);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toEqual(["https://only.example.com"]);
	});

	// ── Order-independence: vite contributes AFTER another CORS contributor ──
	// Reversing the plugin order must not change cors output. This proves the
	// structural dataflow fix for REVIEW #5 — the old event bus was susceptible
	// to handler ordering because cors was mutated on the Worker payload.
	it("cors does not depend on plugin array order", async () => {
		const early: GraphPlugin = {
			name: "early",
			contributes: [
				api.slots.corsOrigins.contribute(() => "https://early.example"),
			],
		};
		const late: GraphPlugin = {
			name: "late",
			contributes: [
				api.slots.corsOrigins.contribute(() => "http://localhost:3000"),
			],
		};
		const forwardGraph = buildGraph(
			[...collectPlugins([early]), late],
			makeCtxFactory(),
		);
		const reverseGraph = buildGraph(
			[...collectPlugins([late]), early],
			makeCtxFactory(),
		);
		const forward = await forwardGraph.resolve(api.slots.cors);
		const reverse = await reverseGraph.resolve(api.slots.cors);
		// Both must contain localhost — this is the fix.
		expect(forward).toContain("http://localhost:3000");
		expect(reverse).toContain("http://localhost:3000");
		// And both must contain the other contributor.
		expect(forward).toContain("https://early.example");
		expect(reverse).toContain("https://early.example");
	});
});

// ── workerSource — bug #1 (callback wiring) ───────────────────────

describe("api.slots.workerSource (bug #1 — callback wiring)", () => {
	it("returns null when no runtimes contributed", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const src = await g.resolve(api.slots.workerSource);
		expect(src).toBeNull();
	});

	it("renders base + runtime when at least one plugin contributes a runtime", async () => {
		const dbLike: GraphPlugin = {
			name: "db",
			contributes: [
				api.slots.pluginRuntimes.contribute(
					(): PluginRuntimeEntry => ({
						plugin: "db",
						import: {
							source: "@fcalell/plugin-db/runtime",
							default: "dbRuntime",
						},
						identifier: "dbRuntime",
						options: {
							binding: { kind: "string", value: "DB_MAIN" },
						},
					}),
				),
			],
		};
		const g = buildGraph(collectPlugins([dbLike]), makeCtxFactory());
		const src = await g.resolve(api.slots.workerSource);
		expect(src).not.toBeNull();
		expect(src).toContain("createWorker(");
		expect(src).toContain(".use(dbRuntime(");
		expect(src).toContain('binding: "DB_MAIN"');
	});

	// This is the bug-#1 structural fix: the auth plugin contributes its
	// runtime entry AND contributes a callback entry for the same plugin key
	// ("auth"). The aggregator splices callbacks into the matching runtime —
	// no ordering, no mutation, no "find the entry" loop. Reversing
	// contribution order must yield the same output.
	it("wires callbacks into matching runtime regardless of plugin order", async () => {
		function authLike(): GraphPlugin {
			return {
				name: "auth",
				contributes: [
					api.slots.pluginRuntimes.contribute(
						(): PluginRuntimeEntry => ({
							plugin: "auth",
							import: {
								source: "@fcalell/plugin-auth/runtime",
								default: "authRuntime",
							},
							identifier: "authRuntime",
							options: {
								secretVar: { kind: "string", value: "AUTH_SECRET" },
							},
						}),
					),
					api.slots.callbacks.contribute(() => ({
						auth: {
							import: {
								source: "../src/worker/plugins/auth",
								default: "authCallbacks",
							},
							identifier: "authCallbacks",
						},
					})),
				],
			};
		}
		function dbLike(): GraphPlugin {
			return {
				name: "db",
				contributes: [
					api.slots.pluginRuntimes.contribute(
						(): PluginRuntimeEntry => ({
							plugin: "db",
							import: {
								source: "@fcalell/plugin-db/runtime",
								default: "dbRuntime",
							},
							identifier: "dbRuntime",
							options: {
								binding: { kind: "string", value: "DB_MAIN" },
							},
						}),
					),
				],
			};
		}

		const forward = buildGraph(
			collectPlugins([dbLike(), authLike()]),
			makeCtxFactory(),
		);
		const reverse = buildGraph(
			collectPlugins([authLike(), dbLike()]),
			makeCtxFactory(),
		);
		const srcForward = await forward.resolve(api.slots.workerSource);
		const srcReverse = await reverse.resolve(api.slots.workerSource);
		expect(srcForward).not.toBeNull();
		expect(srcReverse).not.toBeNull();
		if (!srcForward || !srcReverse) return;
		for (const src of [srcForward, srcReverse]) {
			expect(src).toContain(
				'import authCallbacks from "../src/worker/plugins/auth"',
			);
			expect(src).toContain("callbacks: authCallbacks");
			expect(src).toContain('binding: "DB_MAIN"');
		}
	});

	it("does not wire callbacks when no matching runtime is contributed", async () => {
		// Callback for "auth" plugin but no auth runtime — the key should be
		// silently dropped because no runtime entry matches.
		const dangling: GraphPlugin = {
			name: "dangling",
			contributes: [
				api.slots.pluginRuntimes.contribute(
					(): PluginRuntimeEntry => ({
						plugin: "db",
						import: {
							source: "@fcalell/plugin-db/runtime",
							default: "dbRuntime",
						},
						identifier: "dbRuntime",
						options: {},
					}),
				),
				api.slots.callbacks.contribute(() => ({
					auth: {
						import: {
							source: "../src/worker/plugins/auth",
							default: "authCallbacks",
						},
						identifier: "authCallbacks",
					},
				})),
			],
		};
		const g = buildGraph(collectPlugins([dangling]), makeCtxFactory());
		const src = await g.resolve(api.slots.workerSource);
		expect(src).not.toBeNull();
		expect(src ?? "").not.toContain("callbacks: authCallbacks");
	});
});

// ── middleware + routes ───────────────────────────────────────────

describe("api middleware + routes", () => {
	it("consumer middleware gets auto-wired when the file exists", async () => {
		const dbLike: GraphPlugin = {
			name: "db",
			contributes: [
				api.slots.pluginRuntimes.contribute(
					(): PluginRuntimeEntry => ({
						plugin: "db",
						import: { source: "@pkg/db/runtime", default: "dbRuntime" },
						identifier: "dbRuntime",
						options: {},
					}),
				),
			],
		};
		const files = { api: new Set(["src/worker/middleware.ts"]) };
		const g = buildGraph(collectPlugins([dbLike]), makeCtxFactory({}, files));
		const src = await g.resolve(api.slots.workerSource);
		expect(src).toContain(".use(middleware)");
		expect(src).toContain('import middleware from "../src/worker/middleware"');
	});

	it("routes handler seeds to routes when src/worker/routes exists", async () => {
		const dbLike: GraphPlugin = {
			name: "db",
			contributes: [
				api.slots.pluginRuntimes.contribute(
					(): PluginRuntimeEntry => ({
						plugin: "db",
						import: { source: "@pkg/db/runtime", default: "dbRuntime" },
						identifier: "dbRuntime",
						options: {},
					}),
				),
			],
		};
		const files = { api: new Set(["src/worker/routes"]) };
		const g = buildGraph(collectPlugins([dbLike]), makeCtxFactory({}, files));
		const src = await g.resolve(api.slots.workerSource);
		expect(src).toContain(".handler(routes)");
		expect(src).toContain('import * as routes from "../src/worker/routes"');
	});

	it("routes handler is null when src/worker/routes does not exist", async () => {
		const dbLike: GraphPlugin = {
			name: "db",
			contributes: [
				api.slots.pluginRuntimes.contribute(
					(): PluginRuntimeEntry => ({
						plugin: "db",
						import: { source: "@pkg/db/runtime", default: "dbRuntime" },
						identifier: "dbRuntime",
						options: {},
					}),
				),
			],
		};
		const g = buildGraph(collectPlugins([dbLike]), makeCtxFactory());
		const src = await g.resolve(api.slots.workerSource);
		expect(src).toContain(".handler()");
	});
});

// ── cli.slots — artifact files, dev processes, deploy steps ───────

describe("api contributions into cli.slots", () => {
	it("pushes worker.ts + route barrel into artifactFiles", async () => {
		const dbLike: GraphPlugin = {
			name: "db",
			contributes: [
				api.slots.pluginRuntimes.contribute(
					(): PluginRuntimeEntry => ({
						plugin: "db",
						import: { source: "@pkg/db/runtime", default: "dbRuntime" },
						identifier: "dbRuntime",
						options: {},
					}),
				),
			],
		};
		const g = buildGraph(collectPlugins([dbLike]), makeCtxFactory());
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).toContain(".stack/worker.ts");
		expect(paths).toContain("src/worker/routes/index.ts");
	});

	it("skips emitting .stack/worker.ts when no runtimes contributed", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).not.toContain(".stack/worker.ts");
		// Route barrel is still always emitted.
		expect(paths).toContain("src/worker/routes/index.ts");
	});

	it("contributes a dev process via cliSlots.devProcesses", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const procs = await g.resolve(cliSlots.devProcesses);
		expect(procs.find((p) => p.name === "api")).toBeTruthy();
	});

	it("contributes a route watcher via cliSlots.devWatchers", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const watchers = await g.resolve(cliSlots.devWatchers);
		expect(watchers.find((w) => w.name === "routes")).toBeTruthy();
	});

	it("contributes a deploy step via cliSlots.deploySteps", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const steps = await g.resolve(cliSlots.deploySteps);
		expect(steps.find((s) => s.name === "Worker")).toBeTruthy();
	});

	it("auto-wires deps/devDeps/gitignore into cli slots", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const deps = await g.resolve(cliSlots.initDeps);
		const devDeps = await g.resolve(cliSlots.initDevDeps);
		const ignore = await g.resolve(cliSlots.gitignore);
		expect(deps["@fcalell/plugin-api"]).toBe("workspace:*");
		expect(devDeps.wrangler).toBeDefined();
		expect(ignore).toContain(".wrangler");
		expect(ignore).toContain(".stack");
	});
});
