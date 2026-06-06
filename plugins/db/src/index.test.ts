import type { Slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { describe, expect, it, vi } from "vitest";
import { type DbOptions, db } from "./index";
import * as pushModule from "./node/push";
import { dbOptionsSchema } from "./types";

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
): GraphCtxFactory {
	return {
		app,
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

// Collects api + cloudflare + db via the production path so `buildGraph`
// walks the same slots the CLI would. The tests never hand-order plugins
// or hand-seed shared payloads.
function collectDbPlugins(
	opts: { db?: DbOptions; dbFiles?: Set<string> } = {},
): { plugins: GraphPlugin[]; ctxFactory: GraphCtxFactory } {
	const dbOpts: DbOptions = opts.db ?? {
		dialect: "d1",
		databaseId: "abc-123",
	};
	// Resolve through the schema so collect() receives the post-validation
	// (z.output) view it expects — defaults applied, no optional gaps.
	const resolvedDbOpts = dbOptionsSchema.parse(dbOpts);
	const apiCollected = api.cli.collect({ app, options: {} });
	const cfCollected = cloudflare.cli.collect({ app, options: {} });
	const dbCollected = db.cli.collect({ app, options: resolvedDbOpts });
	const apiPlugin: GraphPlugin = {
		name: "api",
		slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: apiCollected.contributes,
	};
	const cfPlugin: GraphPlugin = {
		name: "cloudflare",
		slots: cfCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: cfCollected.contributes,
	};
	const dbPlugin: GraphPlugin = {
		name: "db",
		slots: dbCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: dbCollected.contributes,
	};
	return {
		plugins: [apiPlugin, cfPlugin, dbPlugin],
		ctxFactory: makeCtxFactory(
			{ db: dbOpts, api: {}, cloudflare: {} },
			{ db: opts.dbFiles ?? new Set() },
		),
	};
}

// ── Config factory ────────────────────────────────────────────────

describe("db config factory", () => {
	it("returns correct PluginConfig for D1 dialect", () => {
		const result = db({ dialect: "d1", databaseId: "abc-123" });
		expect(result.__plugin).toBe("db");
		expect(result.options.dialect).toBe("d1");
		expect(result.options.databaseId).toBe("abc-123");
	});

	it("returns correct PluginConfig for SQLite dialect", () => {
		const result = db({ dialect: "sqlite", path: "./data/app.sqlite" });
		expect(result.__plugin).toBe("db");
		expect(result.options.dialect).toBe("sqlite");
		expect(result.options.path).toBe("./data/app.sqlite");
	});

	it("throws when D1 missing databaseId", () => {
		expect(() => db({ dialect: "d1" })).toThrow(
			"D1 dialect requires databaseId",
		);
	});

	it("throws when SQLite missing path", () => {
		expect(() => db({ dialect: "sqlite" })).toThrow(
			"SQLite dialect requires path",
		);
	});

	it("defaults binding to DB_MAIN", () => {
		const result = db({ dialect: "d1", databaseId: "abc" });
		expect(result.options.binding).toBe("DB_MAIN");
	});

	it("defaults migrations path to ./src/migrations", () => {
		const result = db({ dialect: "d1", databaseId: "abc" });
		expect(result.options.migrations).toBe("./src/migrations");
	});

	it("preserves custom binding name", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc",
			binding: "DB_SECONDARY",
		});
		expect(result.options.binding).toBe("DB_SECONDARY");
	});

	it("preserves custom migrations path", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc",
			migrations: "./custom/migrations",
		});
		expect(result.options.migrations).toBe("./custom/migrations");
	});
});

// ── CLI metadata ──────────────────────────────────────────────────

describe("db.cli metadata", () => {
	it("exposes commands", () => {
		expect(Object.keys(db.cli.commands)).toEqual(
			expect.arrayContaining(["push", "generate", "apply", "reset"]),
		);
	});

	it("declares api + cloudflare as requires (presence-only)", () => {
		expect(db.cli.requires).toEqual(
			expect.arrayContaining(["api", "cloudflare"]),
		);
	});
});

// ── cloudflare.slots.bindings contribution ────────────────────────

describe("db → cloudflare.slots.bindings", () => {
	it("pushes a D1 binding for dialect d1", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "d1", databaseId: "abc-123", binding: "DB_MAIN" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const bindings = await g.resolve(cloudflare.slots.bindings);
		expect(bindings).toContainEqual(
			expect.objectContaining({
				kind: "d1",
				binding: "DB_MAIN",
				databaseId: "abc-123",
			}),
		);
	});

	it("does not push a D1 binding for sqlite dialect", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "sqlite", path: "./data/app.sqlite" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const bindings = await g.resolve(cloudflare.slots.bindings);
		expect(bindings).toHaveLength(0);
	});

	it("uses the custom binding name", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "d1", databaseId: "x", binding: "DB_SECONDARY" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const bindings = await g.resolve(cloudflare.slots.bindings);
		const d1 = bindings.find((b) => b.kind === "d1");
		expect(d1?.binding).toBe("DB_SECONDARY");
	});
});

// ── api.slots.pluginRuntimes contribution ─────────────────────────

describe("db → api.slots.pluginRuntimes", () => {
	it("contributes a dbRuntime entry for d1", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "d1", databaseId: "abc", binding: "DB_MAIN" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const runtimes = await g.resolve(api.slots.pluginRuntimes);
		const dbEntry = runtimes.find((r) => r.plugin === "db");
		expect(dbEntry).toBeDefined();
		expect(dbEntry?.identifier).toBe("dbRuntime");
		expect(dbEntry?.import).toEqual({
			source: "@fcalell/plugin-db/runtime",
			default: "dbRuntime",
		});
		expect(dbEntry?.options.binding).toEqual({
			kind: "string",
			value: "DB_MAIN",
		});
	});

	it("contributes no runtime for sqlite dialect", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "sqlite", path: "./data/app.sqlite" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const runtimes = await g.resolve(api.slots.pluginRuntimes);
		expect(runtimes.find((r) => r.plugin === "db")).toBeUndefined();
	});

	it("adds schema option + schema namespace import when src/schema exists", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "d1", databaseId: "abc", binding: "DB_MAIN" },
			dbFiles: new Set(["src/schema"]),
		});
		const g = buildGraph(plugins, ctxFactory);
		const runtimes = await g.resolve(api.slots.pluginRuntimes);
		const dbEntry = runtimes.find((r) => r.plugin === "db");
		expect(dbEntry?.options.schema).toEqual({
			kind: "identifier",
			name: "schema",
		});
		const imports = await g.resolve(api.slots.workerImports);
		expect(imports).toContainEqual({
			source: "../src/schema",
			namespace: "schema",
		});
	});

	it("skips schema import when src/schema is absent", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "d1", databaseId: "abc", binding: "DB_MAIN" },
			dbFiles: new Set(),
		});
		const g = buildGraph(plugins, ctxFactory);
		const runtimes = await g.resolve(api.slots.pluginRuntimes);
		const dbEntry = runtimes.find((r) => r.plugin === "db");
		expect(dbEntry?.options.schema).toBeUndefined();
		const imports = await g.resolve(api.slots.workerImports);
		expect(
			imports.find((i) => "namespace" in i && i.namespace === "schema"),
		).toBeUndefined();
	});
});

// ── cli slots: scaffolds, deps, remove, watchers ──────────────────

describe("db → cli slots", () => {
	it("contributes the schema template scaffold", async () => {
		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const scaffolds = await g.resolve(cliSlots.initScaffolds);
		const schema = scaffolds.find((s) => s.target === "src/schema/index.ts");
		expect(schema).toBeDefined();
		expect(schema?.plugin).toBe("db");
	});

	it("auto-wires deps/devDeps/gitignore into cli slots", async () => {
		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const deps = await g.resolve(cliSlots.initDeps);
		const devDeps = await g.resolve(cliSlots.initDevDeps);
		const ignore = await g.resolve(cliSlots.gitignore);
		expect(deps["@fcalell/plugin-db"]).toBe("workspace:*");
		expect(devDeps["drizzle-kit"]).toBeDefined();
		expect(devDeps.tsx).toBeDefined();
		expect(ignore).toContain(".db-kit");
	});

	it("pushes schema + migrations directories into removeFiles", async () => {
		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const removeFiles = await g.resolve(cliSlots.removeFiles);
		expect(removeFiles).toContain("src/schema/");
		expect(removeFiles).toContain("src/migrations/");
	});

	it("contributes a devReadySetup task for schema push", async () => {
		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const setup = await g.resolve(cliSlots.devReadySetup);
		expect(setup.find((s) => s.name === "db-schema-push")).toBeTruthy();
	});

	it("contributes a devWatcher for src/schema/**", async () => {
		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const watchers = await g.resolve(cliSlots.devWatchers);
		const schemaWatcher = watchers.find((w) => w.name === "schema");
		expect(schemaWatcher).toBeDefined();
		expect(schemaWatcher?.paths).toBe("src/schema/**");
	});

	it("contributes a deploy step for d1 migrations", async () => {
		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const steps = await g.resolve(cliSlots.deploySteps);
		expect(steps.find((s) => s.name === "Database migrations")).toBeTruthy();
	});

	it("contributes no deploy step for sqlite", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "sqlite", path: "./data/app.sqlite" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const steps = await g.resolve(cliSlots.deploySteps);
		expect(steps.find((s) => s.name === "Database migrations")).toBeUndefined();
	});
});

// ── D1 binding shape: migrations_dir round-trip ───────────────────
//
// The wrangler aggregator only emits `[[d1_databases]].migrations_dir`
// when the binding spec carries `migrationsDir`. Without it, `wrangler
// d1 migrations apply` silently no-ops at deploy time — a bug that has
// historically only been caught by snapshot review. Lock it down here.

describe("db → cloudflare.slots.bindings (migrations dir)", () => {
	it("passes migrationsDir from the resolved options.migrations default", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: { dialect: "d1", databaseId: "abc-123" },
		});
		const g = buildGraph(plugins, ctxFactory);
		const bindings = await g.resolve(cloudflare.slots.bindings);
		const d1 = bindings.find((b) => b.kind === "d1");
		expect(d1).toBeDefined();
		expect(d1).toMatchObject({ migrationsDir: "./src/migrations" });
	});

	it("passes a custom migrations path through to migrationsDir", async () => {
		const { plugins, ctxFactory } = collectDbPlugins({
			db: {
				dialect: "d1",
				databaseId: "abc",
				migrations: "./custom/migrations",
			},
		});
		const g = buildGraph(plugins, ctxFactory);
		const bindings = await g.resolve(cloudflare.slots.bindings);
		const d1 = bindings.find((b) => b.kind === "d1");
		expect(d1).toMatchObject({ migrationsDir: "./custom/migrations" });
	});
});

// ── Schema push serialization ─────────────────────────────────────
//
// The setup task (`devReadySetup`) and the schema watcher (`devWatchers`)
// must share a single in-flight/queued latch per (graph, cwd) so concurrent
// drizzle-kit pushes don't race on SQLite's file lock. The latch lives in a
// closure built inside `contributes: (self) => { ... }`, so it is scoped to
// a single graph build — two graphs over the same cwd see independent
// latches (regression: a module-scoped `Map<cwd, ...>` would have leaked
// across graphs and let an old watcher starve a new graph's pushes).

describe("db schema push serialization", () => {
	it("serializes concurrent setup + watcher in one graph", async () => {
		let active = 0;
		let maxActive = 0;
		let calls = 0;
		// The setup task fires first and is gated open by the test; while it
		// is in flight we kick the watcher and assert the watcher waits
		// behind the setup push (i.e. they share the same latch within the
		// graph).
		let releaseFirst!: () => void;
		const firstReady = new Promise<void>((r) => {
			releaseFirst = r;
		});
		const spy = vi
			.spyOn(pushModule, "pushSchemaLocal")
			.mockImplementation(async () => {
				calls++;
				active++;
				maxActive = Math.max(maxActive, active);
				if (calls === 1) {
					await firstReady;
				} else {
					await new Promise((r) => setTimeout(r, 10));
				}
				active--;
			});

		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const setup = await g.resolve(cliSlots.devReadySetup);
		const watchers = await g.resolve(cliSlots.devWatchers);
		const setupStep = setup.find((s) => s.name === "db-schema-push");
		const schemaWatcher = watchers.find((w) => w.name === "schema");
		if (!setupStep || !schemaWatcher) throw new Error("missing wiring");

		const setupPromise = setupStep.run();
		// Yield so the setup push starts executing before the watcher fires.
		await new Promise((r) => setImmediate(r));
		const watcherPromise = schemaWatcher.handler(
			"src/schema/index.ts",
			"change",
		);

		// While the setup push is gated, the watcher must NOT have started a
		// concurrent push — only the setup push is in flight.
		expect(active).toBe(1);
		expect(calls).toBe(1);

		releaseFirst();
		await Promise.all([setupPromise, watcherPromise]);

		// Strict: never more than one drizzle-kit push at a time.
		expect(maxActive).toBe(1);
		// Setup + watcher share the same latch → exactly two pushes.
		expect(calls).toBe(2);
		spy.mockRestore();
	});

	it("serializes concurrent watcher-only invocations", async () => {
		let active = 0;
		let maxActive = 0;
		let calls = 0;
		const spy = vi
			.spyOn(pushModule, "pushSchemaLocal")
			.mockImplementation(async () => {
				calls++;
				active++;
				maxActive = Math.max(maxActive, active);
				await new Promise((r) => setTimeout(r, 20));
				active--;
			});

		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const watchers = await g.resolve(cliSlots.devWatchers);
		const schemaWatcher = watchers.find((w) => w.name === "schema");
		if (!schemaWatcher) throw new Error("missing schema watcher");

		await Promise.all([
			schemaWatcher.handler("src/schema/index.ts", "change"),
			schemaWatcher.handler("src/schema/index.ts", "change"),
			schemaWatcher.handler("src/schema/index.ts", "change"),
			schemaWatcher.handler("src/schema/index.ts", "change"),
			schemaWatcher.handler("src/schema/index.ts", "change"),
		]);

		// Five concurrent fires → at most one in flight at a time.
		expect(maxActive).toBe(1);
		// Coalesces to in-flight + at most one queued → at most 2 pushes.
		expect(calls).toBeLessThanOrEqual(2);
		spy.mockRestore();
	});

	it("graph-scoped: two graphs over the same cwd are independent", async () => {
		// REGRESSION: a module-scoped `Map<cwd, serializer>` would queue
		// graph B's push behind graph A's still-in-flight push, because
		// both graphs share the same key. This test asserts the latch is
		// graph-scoped — gating graph A's push must not block graph B at all.
		// Both graphs run with the same cwd ("/tmp/test"); we discriminate
		// the two pushes via call order, not cwd.
		let releaseA!: () => void;
		const aReady = new Promise<void>((r) => {
			releaseA = r;
		});
		let totalCalls = 0;
		let callsA = 0;
		let callsB = 0;
		// `phase` tracks which graph we're currently exercising — set to "B"
		// before stepB.run() so the mock can attribute the call. This is
		// safe because the test serializes phase transitions.
		let phase: "A" | "B" = "A";

		const spy = vi
			.spyOn(pushModule, "pushSchemaLocal")
			.mockImplementation(async () => {
				totalCalls++;
				if (phase === "A") {
					callsA++;
					await aReady;
				} else {
					callsB++;
					await new Promise((r) => setTimeout(r, 5));
				}
			});

		// Two graphs over the SAME cwd. A leak in the serializer cache
		// would queue B behind A.
		const a = collectDbPlugins();
		const gA = buildGraph(a.plugins, a.ctxFactory);
		const setupA = await gA.resolve(cliSlots.devReadySetup);
		const stepA = setupA.find((s) => s.name === "db-schema-push");
		if (!stepA) throw new Error("missing setup step A");

		const b = collectDbPlugins();
		const gB = buildGraph(b.plugins, b.ctxFactory);
		const setupB = await gB.resolve(cliSlots.devReadySetup);
		const stepB = setupB.find((s) => s.name === "db-schema-push");
		if (!stepB) throw new Error("missing setup step B");

		// Kick graph A first; it hangs on `aReady` (latch held by graph A).
		const aPromise = stepA.run();
		await new Promise((r) => setImmediate(r));
		expect(callsA).toBe(1);
		expect(totalCalls).toBe(1);

		// Now run graph B. With a graph-scoped latch B's push starts
		// immediately. A module-scoped `Map<cwd, ...>` would block here
		// because B's serializer would be the SAME object as A's.
		phase = "B";
		await stepB.run();
		expect(callsB).toBe(1);

		// Release A and confirm A still ran exactly once.
		releaseA();
		await aPromise;
		expect(callsA).toBe(1);

		spy.mockRestore();
	});
});
