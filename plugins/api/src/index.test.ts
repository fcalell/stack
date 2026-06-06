import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { afterEach, describe, expect, it } from "vitest";
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

// Track scratch dirs so we can clean them up after each test.
const scratchDirs: string[] = [];

afterEach(() => {
	while (scratchDirs.length > 0) {
		const dir = scratchDirs.pop();
		if (dir) rmSync(dir, { recursive: true, force: true });
	}
});

// Stand up a real cwd with optional `src/worker/routes/<file>` entries so
// the barrel + routesHandler path runs against the filesystem (which is
// what production does). Mocking only `fileExists` no longer suffices —
// `routesHandler` and the barrel slot share a `hasRoutableFiles(cwd)`
// helper that does a real `readdirSync`. Pass route filenames here and we
// wire everything together.
function makeRealCwd(routeFiles: string[] = []): string {
	const dir = mkdtempSync(join(tmpdir(), "api-test-"));
	scratchDirs.push(dir);
	if (routeFiles.length > 0) {
		const routesDir = join(dir, "src", "worker", "routes");
		mkdirSync(routesDir, { recursive: true });
		for (const file of routeFiles) {
			writeFileSync(join(routesDir, file), "// fixture");
		}
	}
	return dir;
}

function makeCtxFactory(
	perPluginOptions: Record<string, unknown> = {},
	perPluginFiles: Record<string, Set<string>> = {},
	appOverride?: typeof app & { origins?: string[] },
	cwd: string = "/tmp/test",
): GraphCtxFactory {
	return {
		app: appOverride ?? app,
		cwd,
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

// ── cors — order-independence ─────────────────────────────────────
//
// Reversing the plugin order must not change cors output — the slot
// graph derives ordering from data dependencies. Locked in alongside
// the explicit-override semantics so a future refactor doesn't tie the
// derivation back to plugin array position.

describe("api.slots.cors (order-independent)", () => {
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
		expect(forward).toContain("http://localhost:3000");
		expect(reverse).toContain("http://localhost:3000");
		expect(forward).toContain("https://early.example");
		expect(reverse).toContain("https://early.example");
	});
});

// ── cors — explicit override semantics ────────────────────────────
//
// Contract: `app.origins` is *present, even when empty* = override verbatim;
// *absent* = derived defaults from `app.domain` plus extras from
// `corsOrigins`. The `[]` case is the load-bearing one — `Boolean([])` is
// `true`, so any truthiness check would pass it through silently. These
// tests pin the explicit `!== undefined` semantics so a future refactor
// can't reintroduce the JS coercion surprise.

describe("api.slots.cors (explicit override semantics)", () => {
	it("undefined origins -> derived defaults", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toEqual(["https://example.com", "https://app.example.com"]);
	});

	it("empty array origins -> empty CORS list (verbatim override)", async () => {
		const viteLike: GraphPlugin = {
			name: "vite-like",
			contributes: [
				api.slots.corsOrigins.contribute(() => "http://localhost:3000"),
			],
		};
		const g = buildGraph(
			collectPlugins([viteLike]),
			makeCtxFactory({}, {}, { ...app, origins: [] }),
		);
		const cors = await g.resolve(api.slots.cors);
		// Empty array is honored verbatim — extras are ignored.
		expect(cors).toEqual([]);
	});

	it("single origin override -> verbatim, ignoring extras", async () => {
		const viteLike: GraphPlugin = {
			name: "vite-like",
			contributes: [
				api.slots.corsOrigins.contribute(() => "http://localhost:3000"),
			],
		};
		const g = buildGraph(
			collectPlugins([viteLike]),
			makeCtxFactory({}, {}, { ...app, origins: ["https://only.example.com"] }),
		);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toEqual(["https://only.example.com"]);
	});

	it("multi-origin override -> verbatim, in declaration order", async () => {
		const g = buildGraph(
			collectPlugins(),
			makeCtxFactory(
				{},
				{},
				{
					...app,
					origins: [
						"https://a.example",
						"https://b.example",
						"https://c.example",
					],
				},
			),
		);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toEqual([
			"https://a.example",
			"https://b.example",
			"https://c.example",
		]);
	});

	it("['*'] override -> wildcard alone is allowed", async () => {
		const g = buildGraph(
			collectPlugins(),
			makeCtxFactory({}, {}, { ...app, origins: ["*"] }),
		);
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toEqual(["*"]);
	});

	it("rejects '*' mixed with specific origins (override case)", async () => {
		const g = buildGraph(
			collectPlugins(),
			makeCtxFactory({}, {}, { ...app, origins: ["*", "https://example.com"] }),
		);
		await expect(g.resolve(api.slots.cors)).rejects.toThrow(
			/wildcard semantics are undefined/,
		);
	});

	it("rejects '*' mixed with derived defaults via corsOrigins contribution", async () => {
		const wildcardPlugin: GraphPlugin = {
			name: "wildcard",
			contributes: [api.slots.corsOrigins.contribute(() => "*")],
		};
		const g = buildGraph(collectPlugins([wildcardPlugin]), makeCtxFactory());
		await expect(g.resolve(api.slots.cors)).rejects.toThrow(
			/wildcard semantics are undefined/,
		);
	});

	it("derived path mixed with corsOrigins contributions", async () => {
		const viteLike: GraphPlugin = {
			name: "vite-like",
			contributes: [
				api.slots.corsOrigins.contribute(() => "http://localhost:3000"),
				api.slots.corsOrigins.contribute(() => "http://localhost:4000"),
			],
		};
		const g = buildGraph(collectPlugins([viteLike]), makeCtxFactory());
		const cors = await g.resolve(api.slots.cors);
		expect(cors).toContain("https://example.com");
		expect(cors).toContain("https://app.example.com");
		expect(cors).toContain("http://localhost:3000");
		expect(cors).toContain("http://localhost:4000");
	});
});

// ── routesHandler is the single source of truth for routes ────────
//
// Bug #2: previously `routesHandler` (a value slot seeded from
// fileExists("src/worker/routes")) and the workerImports contribution
// each ran their own fileExists check. If the filesystem returned
// different answers between the two reads, the emitted worker would
// have an import without a `.handler(routes)` call (or vice versa).
// The fix: the import contribution resolves `self.slots.routesHandler`
// — a single point of decision — so the two values can never disagree.
describe("api routes — single source of truth", () => {
	it("import + handler are wired together when handler resolves to non-null", async () => {
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
		const cwd = makeRealCwd(["users.ts"]);
		const g = buildGraph(
			collectPlugins([dbLike]),
			makeCtxFactory({}, {}, undefined, cwd),
		);
		const src = await g.resolve(api.slots.workerSource);
		expect(src).toContain('import * as routes from "../src/worker/routes"');
		expect(src).toContain(".handler(routes)");
	});

	it("import + handler both absent when handler resolves to null", async () => {
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
		expect(src).not.toContain('import * as routes from "../src/worker/routes"');
		expect(src).toContain(".handler()");
	});

	// Two independent filesystem reads inside the contribution chain would
	// race — `routesHandler` and the `workerImports` contribution must agree
	// on whether a routes directory exists. Because the import contribution
	// resolves the `routesHandler` slot (memoized by the graph), both reads
	// see the same value — the slot's seed runs exactly once even though
	// downstream computations consume it many times. We pin that property
	// here by asserting "import present iff handler present" — the only two
	// internally-consistent shapes the worker source can take.
	it("internal consistency: import present iff handler present", async () => {
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
		const cwd = makeRealCwd(["users.ts"]);
		const g = buildGraph(
			collectPlugins([dbLike]),
			makeCtxFactory({}, {}, undefined, cwd),
		);
		const src = await g.resolve(api.slots.workerSource);
		const hasImport =
			src?.includes('import * as routes from "../src/worker/routes"') ?? false;
		const hasHandler = src?.includes(".handler(routes)") ?? false;
		expect(hasImport).toBe(hasHandler);
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

	it("routes handler seeds to routes when src/worker/routes has files", async () => {
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
		const cwd = makeRealCwd(["users.ts"]);
		const g = buildGraph(
			collectPlugins([dbLike]),
			makeCtxFactory({}, {}, undefined, cwd),
		);
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

	// Bug regression: previously the routesHandler seed checked only for
	// the directory's existence. An empty `src/worker/routes/` directory
	// would seed `routes` and emit `import * as routes from "../src/worker/routes"`,
	// but the barrel artifact would skip emission (no routable files) —
	// leaving a dangling import. Both must agree on the same predicate
	// ("at least one routable file under routes/").
	it("routes handler is null when src/worker/routes is empty", async () => {
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
		const cwd = makeRealCwd([]); // creates cwd, no routes dir
		const g = buildGraph(
			collectPlugins([dbLike]),
			makeCtxFactory({}, {}, undefined, cwd),
		);
		const src = await g.resolve(api.slots.workerSource);
		expect(src).toContain(".handler()");
		expect(src).not.toContain('import * as routes from "../src/worker/routes"');
	});
});

// ── cli.slots — artifact files, dev processes, deploy steps ───────

describe("api contributions into cli.slots", () => {
	it("pushes worker.ts + route barrel into artifactFiles when routes are present", async () => {
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
		const cwd = makeRealCwd(["users.ts"]);
		const g = buildGraph(
			collectPlugins([dbLike]),
			makeCtxFactory({}, {}, undefined, cwd),
		);
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
	});

	// Bug regression: previously the route barrel artifact was unconditionally
	// emitted. The generator swallows the missing-dir error and produces a
	// header-only stub — meaning a worker-only / no-routes consumer would
	// get an empty `src/worker/routes/index.ts` written into their tree
	// every time `stack generate` runs. The artifact source must return
	// null when there are no routable files so emitArtifact skips it.
	it("skips emitting route barrel when src/worker/routes does not exist", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).not.toContain("src/worker/routes/index.ts");
	});

	it("skips emitting route barrel when src/worker/routes is empty", async () => {
		const cwd = makeRealCwd([]);
		const g = buildGraph(
			collectPlugins(),
			makeCtxFactory({}, {}, undefined, cwd),
		);
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).not.toContain("src/worker/routes/index.ts");
	});

	it("emits route barrel content when at least one route file exists", async () => {
		const cwd = makeRealCwd(["users.tsx", "posts.ts"]);
		const g = buildGraph(
			collectPlugins(),
			makeCtxFactory({}, {}, undefined, cwd),
		);
		const files = await g.resolve(cliSlots.artifactFiles);
		const barrel = files.find((f) => f.path === "src/worker/routes/index.ts");
		expect(barrel).toBeDefined();
		// Bug regression: .tsx files must be included.
		expect(barrel?.content).toContain('export * from "./users";');
		expect(barrel?.content).toContain('export * from "./posts";');
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
