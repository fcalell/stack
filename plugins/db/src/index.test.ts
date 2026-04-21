import {
	createEventBus,
	Dev,
	Generate,
	Init,
	Remove,
} from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { describe, expect, it, vi } from "vitest";
import { type DbOptions, db } from "./index";
import * as pushModule from "./node/push";

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

describe("db.events", () => {
	it("exposes SchemaReady event", () => {
		expect(db.events.SchemaReady.source).toBe("db");
		expect(db.events.SchemaReady.name).toBe("SchemaReady");
	});
});

describe("db.name", () => {
	it("is 'db'", () => {
		expect(db.name).toBe("db");
	});
});

describe("db.cli", () => {
	it("has correct name and label", () => {
		expect(db.cli.name).toBe("db");
		expect(db.cli.label).toBe("Database");
	});

	it("exposes commands", () => {
		expect(Object.keys(db.cli.commands)).toEqual(
			expect.arrayContaining(["push", "generate", "apply", "reset"]),
		);
	});

	it("does not expose status command", () => {
		expect(Object.keys(db.cli.commands)).not.toContain("status");
	});
});

describe("db register", () => {
	it("pushes scaffold files on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "d1",
				databaseId: "abc",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const schema = scaffold.files.find(
			(f) => f.target === "src/schema/index.ts",
		);
		expect(schema).toBeDefined();
		expect(schema?.source.pathname.endsWith("templates/schema.ts")).toBe(true);
		expect(scaffold.dependencies["@fcalell/plugin-db"]).toBe("workspace:*");
		expect(scaffold.devDependencies["drizzle-kit"]).toBeDefined();
		expect(scaffold.gitignore).toContain(".db-kit");
	});

	it("pushes D1 binding on cloudflare.events.Wrangler for d1 dialect", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "d1",
				databaseId: "abc-123",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const wrangler = await bus.emit(cloudflare.events.Wrangler, {
			bindings: [],
			routes: [],
			vars: {},
			secrets: [],
			compatibilityDate: "2025-01-01",
		});
		expect(wrangler.bindings).toContainEqual(
			expect.objectContaining({
				kind: "d1",
				binding: "DB_MAIN",
				databaseId: "abc-123",
			}),
		);
	});

	it("pushes no wrangler bindings for sqlite dialect", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "sqlite",
				path: "./data/app.sqlite",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const wrangler = await bus.emit(cloudflare.events.Wrangler, {
			bindings: [],
			routes: [],
			vars: {},
			secrets: [],
			compatibilityDate: "2025-01-01",
		});
		expect(wrangler.bindings).toHaveLength(0);
	});

	it("skips worker runtime contribution for sqlite dialect", async () => {
		// better-sqlite3 can't run in the Workers isolate, so sqlite dialect
		// must not inject dbRuntime middleware into the generated worker.
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "sqlite",
				path: "./data/app.sqlite",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const worker = await bus.emit(api.events.Worker, {
			imports: [],
			base: null,
			pluginRuntimes: [],
			middlewareChain: [],
			handler: null,
			cors: [],
		});
		expect(worker.imports).toHaveLength(0);
		expect(worker.pluginRuntimes).toHaveLength(0);
		expect(worker.middlewareChain).toHaveLength(0);
	});

	it("contributes worker runtime middleware for d1 dialect", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "d1",
				databaseId: "abc",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
			fileExists: async () => false,
		});
		db.cli.register(ctx, bus, db.events);

		const worker = await bus.emit(api.events.Worker, {
			imports: [],
			base: null,
			pluginRuntimes: [],
			middlewareChain: [],
			handler: null,
			cors: [],
		});
		expect(worker.pluginRuntimes).toHaveLength(1);
		const entry = worker.pluginRuntimes[0];
		expect(entry?.plugin).toBe("db");
		expect(entry?.identifier).toBe("dbRuntime");
		expect(entry?.import).toEqual({
			source: "@fcalell/plugin-db/runtime",
			default: "dbRuntime",
		});
		expect(entry?.options.binding).toEqual({
			kind: "string",
			value: "DB_MAIN",
		});
	});

	it("adds schema namespace import + option when src/schema exists", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "d1",
				databaseId: "abc",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
			fileExists: async (p: string) => p === "src/schema",
		});
		db.cli.register(ctx, bus, db.events);

		const worker = await bus.emit(api.events.Worker, {
			imports: [],
			base: null,
			pluginRuntimes: [],
			middlewareChain: [],
			handler: null,
			cors: [],
		});
		expect(worker.imports).toContainEqual({
			source: "../src/schema",
			namespace: "schema",
		});
		const entry = worker.pluginRuntimes[0];
		expect(entry?.options.schema).toEqual({
			kind: "identifier",
			name: "schema",
		});
	});

	it("emits Generate without bindings field (plain files only)", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "d1",
				databaseId: "abc-123",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const gen = await bus.emit(Generate, { files: [], postWrite: [] });
		expect(gen.files).toEqual([]);
	});

	it("pushes cleanup info on Remove", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "d1",
				databaseId: "abc",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const removal = await bus.emit(Remove, {
			files: [],
			dependencies: [],
			devDependencies: [],
		});
		expect(removal.files).toContain("src/schema/");
		expect(removal.dependencies).toContain("@fcalell/plugin-db");
		expect(removal.devDependencies).toEqual(
			expect.arrayContaining(["drizzle-kit", "tsx"]),
		);
	});

	it("serializes concurrent schema pushes from setup + watcher", async () => {
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

		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "d1",
				databaseId: "abc",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const ready = await bus.emit(Dev.Ready, {
			url: "http://localhost:8787",
			port: 8787,
			setup: [],
			watchers: [],
		});

		const setupStep = ready.setup[0];
		const watcher = ready.watchers[0];
		if (!setupStep || !watcher) throw new Error("missing setup/watcher");

		// Fire initial push + two concurrent watcher pushes while in-flight.
		// Expect coalescing: only one extra push queued, never overlapping.
		const p1 = setupStep.run();
		const p2 = watcher.handler("src/schema/index.ts", "change");
		const p3 = watcher.handler("src/schema/index.ts", "change");
		await Promise.all([p1, p2, p3]);

		expect(maxActive).toBe(1);
		expect(calls).toBe(2);
		spy.mockRestore();
	});

	it("pushes schema push setup + watcher on Dev.Ready", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx<DbOptions>({
			options: {
				dialect: "d1",
				databaseId: "abc",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const ready = await bus.emit(Dev.Ready, {
			url: "http://localhost:8787",
			port: 8787,
			setup: [],
			watchers: [],
		});

		expect(ready.setup).toHaveLength(1);
		expect(ready.setup[0]?.name).toBe("db-schema-push");
		expect(ready.watchers).toContainEqual(
			expect.objectContaining({
				name: "schema",
				paths: "src/schema/**",
			}),
		);
	});
});
