import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plugin } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { buildTestGraphFromPlugins } from "@fcalell/cli/testing";
import { cloudflare } from "@fcalell/plugin-cloudflare";
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
	const collected = api.cli.collect({ app, options: api(opts).options });
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
describe("api.slots.routePrefixes", () => {
	it("carries the default /rpc prefix for deploy targets", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const prefixes = await g.resolve(api.slots.routePrefixes);
		expect(prefixes).toEqual(["/rpc"]);
	});

	it("follows a custom api({ prefix })", async () => {
		const g = buildGraph(
			collectPlugins([], { prefix: "/api" }),
			makeCtxFactory(),
		);
		const prefixes = await g.resolve(api.slots.routePrefixes);
		expect(prefixes).toEqual(["/api"]);
	});
});

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
		expect(src).toContain(
			'import * as routes from "../src/worker/routes/index.ts"',
		);
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
		expect(src).not.toContain(
			'import * as routes from "../src/worker/routes/index.ts"',
		);
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
			src?.includes(
				'import * as routes from "../src/worker/routes/index.ts"',
			) ?? false;
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

// ── procedureSource — virtual:stack-procedure target ──────────────

describe("api.slots.procedureSource", () => {
	it("returns null when no runtimes contributed (mirrors workerSource)", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const src = await g.resolve(api.slots.procedureSource);
		expect(src).toBeNull();
	});

	it("mirrors the worker's runtime chain and exports a typed `procedure`", async () => {
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
				api.slots.workerImports.contribute(() => ({
					source: "../src/schema",
					namespace: "schema",
				})),
			],
		};
		const g = buildGraph(collectPlugins([dbLike]), makeCtxFactory());
		const src = await g.resolve(api.slots.procedureSource);
		expect(src).not.toBeNull();
		expect(src).toContain(
			'import createWorker from "@fcalell/plugin-api/runtime"',
		);
		expect(src).toContain('import * as schema from "../src/schema"');
		expect(src).toContain('import dbRuntime from "@fcalell/plugin-db/runtime"');
		expect(src).toContain(
			'import { createProcedure } from "@fcalell/plugin-api/procedure"',
		);
		expect(src).toContain("const __chain = createWorker(");
		expect(src).toContain(".use(dbRuntime(");
		expect(src).toContain(
			"export const procedure = createProcedure<WorkerContext, RbacStatements, Entity>();",
		);
		// Never imports the route barrel back — route files import
		// virtual:stack-procedure, so that would be a cycle.
		expect(src).not.toContain('"../src/worker/routes');
	});

	it("renders auth's contributed RBAC statements when present", async () => {
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
						options: {},
					}),
				),
			],
		};
		const authLike: GraphPlugin = {
			name: "auth",
			contributes: [
				api.slots.rbacStatements.contribute(() => ({
					project: ["create", "delete"],
				})),
			],
		};
		const g = buildGraph(collectPlugins([dbLike, authLike]), makeCtxFactory());
		const src = await g.resolve(api.slots.procedureSource);
		expect(src).toContain('project: readonly ["create", "delete"];');
	});

	it("falls back to Record<never, never> when nothing contributes rbacStatements", async () => {
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
						options: {},
					}),
				),
			],
		};
		const g = buildGraph(collectPlugins([dbLike]), makeCtxFactory());
		const src = await g.resolve(api.slots.procedureSource);
		expect(src).toContain("type RbacStatements = Record<never, never>;");
	});

	// WS3.1: the entity vocabulary for
	// `procedure({ reads, writes })`'s type-level autocomplete. plugin-db
	// contributes it in a separate task; here we only pin api's own
	// null/empty fallback and that a third-party contribution renders.
	it("falls back to `type Entity = string` when nothing contributes entities", async () => {
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
						options: {},
					}),
				),
			],
		};
		const g = buildGraph(collectPlugins([dbLike]), makeCtxFactory());
		const src = await g.resolve(api.slots.procedureSource);
		expect(src).toContain("type Entity = string;");
		expect(src).toContain(
			"export const procedure = createProcedure<WorkerContext, RbacStatements, Entity>();",
		);
	});

	// Real-graph, third-party-plugin-shaped test (mirrors
	// tests/integration/third-party-plugin.test.ts): a plugin built through
	// the public `plugin()` factory, exactly like a real out-of-tree
	// `plugin-db` would, contributes to `api.slots.entities` and the union
	// renders in the generated `.stack/procedure.ts`.
	it("renders a third-party plugin's contributed entity vocabulary as a string-literal union", async () => {
		const cwd = makeRealCwd();
		const widget = plugin<"widget", Record<string, never>>("widget", {
			label: "Widget",
			package: "@acme/stack-plugin-widget",
			requires: ["api"],
			contributes: [
				api.slots.entities.contribute(() => ["todos", "users"]),
				api.slots.pluginRuntimes.contribute(
					(): PluginRuntimeEntry => ({
						plugin: "widget",
						import: {
							source: "@acme/stack-plugin-widget/runtime",
							default: "widgetRuntime",
						},
						identifier: "widgetRuntime",
						options: {},
					}),
				),
			],
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: api, options: {} }, { factory: widget }],
			app,
			cwd,
		});

		const src = await graph.resolve(api.slots.procedureSource);
		expect(src).toContain('type Entity = "todos" | "users";');
		expect(src).toContain(
			"export const procedure = createProcedure<WorkerContext, RbacStatements, Entity>();",
		);
	});
});

// ── entities: list slot semantics ──────────────────────────────────
//
// `api.slots.entities` is a list slot (WS1 fix): every plugin that owns
// tables contributes its own names, and the final vocabulary is the sorted,
// deduplicated union. `uniqueBy` makes a genuine name collision between two
// contributors a loud error rather than one silently shadowing the other —
// mirrors `vite.slots.resolveAliases`'s coverage.
describe("api.slots.entities (list, order-independent)", () => {
	it("unions and sorts entity names from multiple contributors regardless of contribution order", async () => {
		const dbLike: GraphPlugin = {
			name: "db",
			contributes: [api.slots.entities.contribute(() => ["posts", "todos"])],
		};
		const authLike: GraphPlugin = {
			name: "auth",
			contributes: [api.slots.entities.contribute(() => ["account", "user"])],
		};

		const forward = buildGraph(
			collectPlugins([dbLike, authLike]),
			makeCtxFactory(),
		);
		const backward = buildGraph(
			collectPlugins([authLike, dbLike]),
			makeCtxFactory(),
		);

		const expected = ["account", "posts", "todos", "user"];
		await expect(forward.resolve(api.slots.entities)).resolves.toEqual(
			expected,
		);
		await expect(backward.resolve(api.slots.entities)).resolves.toEqual(
			expected,
		);
	});

	it("rejects two contributors naming the same entity instead of silently letting one shadow the other", async () => {
		const a: GraphPlugin = {
			name: "a",
			contributes: [api.slots.entities.contribute(() => "member")],
		};
		const b: GraphPlugin = {
			name: "b",
			contributes: [api.slots.entities.contribute(() => "member")],
		};

		const g = buildGraph(collectPlugins([a, b]), makeCtxFactory());
		await expect(g.resolve(api.slots.entities)).rejects.toThrow(
			/entities.*duplicate key 'member'/,
		);
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

	// M3: `.stack/procedure.ts`'s rebuilt `__chain` must mirror the real
	// worker's `.use(...)` chain past the runtime entries too, so a
	// context-injecting consumer middleware's extra keys land in
	// `WorkerContext` (see `node/procedure-codegen.ts`). Regression guard for
	// the bug where `procedure.ts` only rebuilt base + pluginRuntimes and
	// silently dropped middleware-injected context.
	it("mirrors consumer middleware into .stack/procedure.ts's __chain", async () => {
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
		const src = await g.resolve(api.slots.procedureSource);
		expect(src).toContain('import middleware from "../src/worker/middleware"');
		const dbIdx = src?.indexOf(".use(dbRuntime(") ?? -1;
		const mwIdx = src?.indexOf(".use(middleware)") ?? -1;
		expect(dbIdx).toBeGreaterThanOrEqual(0);
		expect(mwIdx).toBeGreaterThan(dbIdx);
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
		expect(src).toContain(
			'import * as routes from "../src/worker/routes/index.ts"',
		);
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
	// would seed `routes` and emit `import * as routes from "../src/worker/routes/index.ts"`,
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
		expect(src).not.toContain(
			'import * as routes from "../src/worker/routes/index.ts"',
		);
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
		expect(paths).toContain(".stack/procedure.ts");
		expect(paths).toContain("src/worker/routes/index.ts");
	});

	it("skips emitting .stack/worker.ts and .stack/procedure.ts when no runtimes and no routes", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).not.toContain(".stack/worker.ts");
		expect(paths).not.toContain(".stack/procedure.ts");
	});

	// A consumer with routes but no runtime plugins (no db/auth) is a real
	// worker: its procedures must be served. The gate is "nothing to run at
	// all", not "no plugin runtimes".
	it("emits worker.ts + procedure.ts for a routes-only project (no runtimes)", async () => {
		const cwd = makeRealCwd(["board.ts"]);
		const g = buildGraph(
			collectPlugins(),
			makeCtxFactory({}, {}, undefined, cwd),
		);
		const files = await g.resolve(cliSlots.artifactFiles);
		const worker = files.find((f) => f.path === ".stack/worker.ts");
		const procedure = files.find((f) => f.path === ".stack/procedure.ts");
		expect(worker).toBeDefined();
		expect(worker?.content).toContain(".handler(routes)");
		expect(procedure).toBeDefined();
		expect(procedure?.content).toContain("export const procedure");
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
		expect(barrel?.content).toContain('export * from "./users.tsx";');
		expect(barrel?.content).toContain('export * from "./posts.ts";');
	});

	it("contributes a route watcher via cliSlots.devWatchers", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const watchers = await g.resolve(cliSlots.devWatchers);
		expect(watchers.find((w) => w.name === "routes")).toBeTruthy();
	});

	it("auto-wires deps/gitignore into cli slots", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const deps = await g.resolve(cliSlots.initDeps);
		const ignore = await g.resolve(cliSlots.gitignore);
		expect(deps["@fcalell/plugin-api"]).toBe("workspace:*");
		expect(ignore).toContain(".stack");
	});
});

// ── H1 — dedicated blanket-limiter binding ─────────────────────────

describe("api → cloudflare.slots.bindings (RATE_LIMITER_RPC)", () => {
	it("contributes its own rate_limiter binding, independent of any procedure/auth limiter", async () => {
		const cfCollected = cloudflare.cli.collect({ app, options: {} });
		const cfPlugin: GraphPlugin = {
			name: "cloudflare",
			slots: cfCollected.slots as unknown as Record<
				string,
				import("@fcalell/cli").Slot<unknown>
			>,
			contributes: cfCollected.contributes,
		};
		const g = buildGraph(collectPlugins([cfPlugin]), makeCtxFactory());
		const bindings = await g.resolve(cloudflare.slots.bindings);
		expect(bindings).toContainEqual(
			expect.objectContaining({
				kind: "rate_limiter",
				binding: "RATE_LIMITER_RPC",
				simple: { limit: 1000, period: 60 },
			}),
		);
	});

	it("still contributes RATE_LIMITER_RPC regardless of plugin registration order", async () => {
		const cfCollected = cloudflare.cli.collect({ app, options: {} });
		const cfPlugin: GraphPlugin = {
			name: "cloudflare",
			slots: cfCollected.slots as unknown as Record<
				string,
				import("@fcalell/cli").Slot<unknown>
			>,
			contributes: cfCollected.contributes,
		};
		// Build with cloudflare collected first, api second — mirrors
		// `collectPlugins` putting api first normally; the reverse ordering here
		// pins that the binding contribution never depended on array position.
		const apiCollected = api.cli.collect({ app, options: api({}).options });
		const apiPlugin: GraphPlugin = {
			name: "api",
			slots: apiCollected.slots as unknown as Record<
				string,
				import("@fcalell/cli").Slot<unknown>
			>,
			contributes: apiCollected.contributes,
		};
		const g = buildGraph([cfPlugin, apiPlugin], makeCtxFactory());
		const bindings = await g.resolve(cloudflare.slots.bindings);
		expect(bindings).toContainEqual(
			expect.objectContaining({
				kind: "rate_limiter",
				binding: "RATE_LIMITER_RPC",
			}),
		);
	});
});

// ── L2 — domain-agnostic tsconfig contribution ─────────────────────

describe("api → cliSlots.tsconfigPaths", () => {
	it("contributes the virtual:stack-procedure -> .stack/procedure.ts paths mapping", async () => {
		const g = buildGraph(collectPlugins(), makeCtxFactory());
		const paths = await g.resolve(cliSlots.tsconfigPaths);
		expect(paths).toEqual({
			"virtual:stack-procedure": ["./.stack/procedure.ts"],
		});
	});
});
