import { describe, expect, it } from "vitest";
import {
	type DbOptions,
	db,
	getMigrationsPath,
	getSchemaModule,
	getSchemaPath,
} from "./index";

describe("db", () => {
	it("returns correct PluginConfig for D1 dialect", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc-123",
			schema: { users: {} },
		});
		expect(result.__plugin).toBe("db");
		expect(result.options.dialect).toBe("d1");
		expect(result.options.databaseId).toBe("abc-123");
	});

	it("returns correct PluginConfig for SQLite dialect", () => {
		const result = db({
			dialect: "sqlite",
			path: "./data/app.sqlite",
			schema: { users: {} },
		});
		expect(result.__plugin).toBe("db");
		expect(result.options.dialect).toBe("sqlite");
		expect(result.options.path).toBe("./data/app.sqlite");
	});

	it("throws when D1 missing databaseId", () => {
		expect(() => db({ dialect: "d1", schema: { users: {} } })).toThrow(
			"db: D1 dialect requires databaseId",
		);
	});

	it("throws when SQLite missing path", () => {
		expect(() => db({ dialect: "sqlite", schema: { users: {} } })).toThrow(
			"db: SQLite dialect requires path",
		);
	});

	it("throws when schema is missing", () => {
		expect(() =>
			db({
				dialect: "d1",
				databaseId: "abc",
				schema: null as unknown as Record<string, unknown>,
			}),
		).toThrow("db: schema is required");
	});

	it("throws when schema is not an object", () => {
		expect(() =>
			db({
				dialect: "d1",
				databaseId: "abc",
				schema: "bad" as unknown as Record<string, unknown>,
			}),
		).toThrow("db: schema is required");
	});

	it("defaults binding to DB_MAIN", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {} },
		});
		expect(result.options.binding).toBe("DB_MAIN");
	});

	it("defaults migrations path to ./src/migrations", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {} },
		});
		expect(result.options.migrations).toBe("./src/migrations");
	});

	it("preserves custom binding name", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {} },
			binding: "DB_SECONDARY",
		});
		expect(result.options.binding).toBe("DB_SECONDARY");
	});

	it("preserves custom migrations path", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {} },
			migrations: "./custom/migrations",
		});
		expect(result.options.migrations).toBe("./custom/migrations");
	});

	it("__plugin is 'db'", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {} },
		});
		expect(result.__plugin).toBe("db");
	});

	it("has no requires field", () => {
		const result = db({
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {} },
		});
		expect(result.requires).toBeUndefined();
	});
});

describe("getSchemaPath", () => {
	it("returns custom path when schema has path+module structure", () => {
		const options: DbOptions = {
			dialect: "d1",
			databaseId: "abc",
			schema: { path: "./custom/schema", module: { users: {} } },
		};
		expect(getSchemaPath(options)).toBe("./custom/schema");
	});

	it("returns default for a plain module object", () => {
		const options: DbOptions = {
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {}, posts: {} },
		};
		expect(getSchemaPath(options)).toBe("./src/schema");
	});

	it("returns default when module is null", () => {
		const options: DbOptions = {
			dialect: "d1",
			databaseId: "abc",
			schema: { path: "./x", module: null } as unknown as Record<
				string,
				unknown
			>,
		};
		expect(getSchemaPath(options)).toBe("./src/schema");
	});
});

describe("getSchemaModule", () => {
	it("returns module for path+module schema", () => {
		const module = { users: {}, posts: {} };
		const options: DbOptions = {
			dialect: "d1",
			databaseId: "abc",
			schema: { path: "./x", module },
		};
		expect(getSchemaModule(options)).toBe(module);
	});

	it("returns schema directly for a plain module object", () => {
		const schema = { users: {}, posts: {} };
		const options: DbOptions = {
			dialect: "d1",
			databaseId: "abc",
			schema,
		};
		expect(getSchemaModule(options)).toBe(schema);
	});
});

describe("getMigrationsPath", () => {
	it("returns custom path when provided", () => {
		const options: DbOptions = {
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {} },
			migrations: "./custom/migrations",
		};
		expect(getMigrationsPath(options)).toBe("./custom/migrations");
	});

	it("returns default when migrations is undefined", () => {
		const options: DbOptions = {
			dialect: "d1",
			databaseId: "abc",
			schema: { users: {} },
		};
		expect(getMigrationsPath(options)).toBe("./src/migrations");
	});
});
