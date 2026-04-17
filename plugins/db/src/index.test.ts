import type { RegisterContext } from "@fcalell/cli";
import {
	createEventBus,
	Dev,
	Generate,
	Init,
	Remove,
} from "@fcalell/cli/events";
import { describe, expect, it, vi } from "vitest";
import { type DbOptions, db } from "./index";

function createMockCtx(
	overrides: Partial<RegisterContext<DbOptions>> & { options: DbOptions },
): RegisterContext<DbOptions> {
	return {
		cwd: "/tmp/test",
		hasPlugin: () => false,
		readFile: vi.fn(async () => ""),
		fileExists: vi.fn(async () => false),
		log: {
			info: vi.fn(),
			warn: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
		},
		prompt: {
			text: vi.fn(async () => ""),
			confirm: vi.fn(async () => false),
			select: vi.fn(async () => undefined as any),
			multiselect: vi.fn(async () => []),
		},
		...overrides,
	};
}

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
			expect.arrayContaining(["push", "generate", "apply", "status", "reset"]),
		);
	});
});

describe("db register", () => {
	it("pushes scaffold files on Init.Scaffold", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
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

		expect(scaffold.files).toContainEqual({
			path: "src/schema/index.ts",
			content: expect.stringContaining("sqliteTable"),
		});
		expect(scaffold.dependencies["@fcalell/plugin-db"]).toBe("workspace:*");
		expect(scaffold.devDependencies["drizzle-kit"]).toBeDefined();
		expect(scaffold.gitignore).toContain(".db-kit");
	});

	it("pushes D1 binding on Generate for d1 dialect", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: {
				dialect: "d1",
				databaseId: "abc-123",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(gen.bindings).toContainEqual(
			expect.objectContaining({
				name: "DB_MAIN",
				type: "d1",
				databaseId: "abc-123",
			}),
		);
	});

	it("pushes no bindings on Generate for sqlite dialect", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
			options: {
				dialect: "sqlite",
				path: "./data/app.sqlite",
				binding: "DB_MAIN",
				migrations: "./src/migrations",
			},
		});
		db.cli.register(ctx, bus, db.events);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(gen.bindings).toHaveLength(0);
	});

	it("pushes cleanup info on Remove", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
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
		});
		expect(removal.files).toContain("src/schema/");
		expect(removal.dependencies).toContain("@fcalell/plugin-db");
	});

	it("pushes schema push setup + watcher on Dev.Ready", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx({
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
