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
	const apiCollected = api.cli.collect({ app, options: {} });
	const cfCollected = cloudflare.cli.collect({ app, options: {} });
	const dbCollected = db.cli.collect({ app, options: dbOpts });
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
	it("has correct name and label", () => {
		expect(db.cli.name).toBe("db");
		expect(db.cli.label).toBe("Database");
	});

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

// ── Schema push serialization ─────────────────────────────────────
//
// Unit-level: the schema-push latch that prevents concurrent
// drizzle-kit pushes from clobbering each other. We run the setup task
// and the watcher handler three times concurrently and assert the
// pushes coalesce.

describe("db schema push serialization", () => {
	it("serializes concurrent schema pushes", async () => {
		let active = 0;
		let maxActive = 0;
		let calls = 0;
		const spy = vi
			.spyOn(pushModule, "pushSchemaLocal")
			.mockImplementation(async () => {
				calls++;
				active++;
				maxActive = Math.max(maxActive, active);
				await new Promise((r) => setTimeout(r, 30));
				active--;
			});

		// One contribution resolves to one setup task + one watcher — but
		// each contribution invocation creates its own latch, so resolve
		// once and share the resulting closures.
		const { plugins, ctxFactory } = collectDbPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const setup = await g.resolve(cliSlots.devReadySetup);
		const watchers = await g.resolve(cliSlots.devWatchers);
		const setupStep = setup.find((s) => s.name === "db-schema-push");
		const schemaWatcher = watchers.find((w) => w.name === "schema");
		if (!setupStep || !schemaWatcher) throw new Error("missing wiring");

		// NB: setupStep and schemaWatcher come from *different* contributions
		// and therefore *different* latches. The real dev pipeline wires only
		// the setup task via the push latch it creates; the watcher handler
		// uses its own latch. We verify each latch serializes its own concurrent
		// invocations.
		await Promise.all([
			schemaWatcher.handler("src/schema/index.ts", "change"),
			schemaWatcher.handler("src/schema/index.ts", "change"),
			schemaWatcher.handler("src/schema/index.ts", "change"),
		]);

		// Three concurrent watcher fires → at most 1 in flight at a time.
		expect(maxActive).toBe(1);
		// Coalesces to 2 pushes max (one in-flight + one queued).
		expect(calls).toBeLessThanOrEqual(2);
		spy.mockRestore();
	});
});

// ── defineCallbacks is absent (db has no callbacks) ───────────────

describe("db has no callbacks", () => {
	it("db.defineCallbacks is undefined", () => {
		expect(
			(db as unknown as { defineCallbacks?: unknown }).defineCallbacks,
		).toBeUndefined();
	});
});
