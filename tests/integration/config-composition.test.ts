import { defineConfig, getPlugin } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { describe, expect, it } from "vitest";

const app = { name: "app", domain: "example.com" };

describe("defineConfig with multiple plugin combinations", () => {
	it("full-stack config (db + auth + api + solid) validates successfully", () => {
		const config = defineConfig({
			app,
			plugins: [
				db({ dialect: "d1", databaseId: "test-db-id" }),
				auth(),
				api({ cors: "https://example.com" }),
				solid(),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("frontend-only config (solid only) validates successfully", () => {
		const config = defineConfig({
			app,
			plugins: [solid()],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("API-only config (db + api) validates successfully", () => {
		const config = defineConfig({
			app,
			plugins: [db({ dialect: "d1", databaseId: "test-db-id" }), api()],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("API-without-db config (api only) validates successfully", () => {
		const config = defineConfig({
			app,
			plugins: [api()],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("auth without db passes config validation (dependency is event-based, checked at runtime)", () => {
		const config = defineConfig({
			app,
			plugins: [auth(), api()],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("duplicate plugin names are caught", () => {
		const config = defineConfig({
			app,
			plugins: [
				db({ dialect: "d1", databaseId: "id-1" }),
				db({ dialect: "d1", databaseId: "id-2" }),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(
			true,
		);
	});

	it("app.domain is preserved through config", () => {
		const config = defineConfig({
			app: { name: "myapp", domain: "myapp.example.com" },
			plugins: [solid()],
		});

		expect(config.app.domain).toBe("myapp.example.com");
	});

	it("plugin order does not matter for validation (deps are checked by name)", () => {
		const configAscending = defineConfig({
			app,
			plugins: [db({ dialect: "d1", databaseId: "test-id" }), auth(), api()],
		});

		const configReversed = defineConfig({
			app,
			plugins: [api(), auth(), db({ dialect: "d1", databaseId: "test-id" })],
		});

		expect(configAscending.validate().valid).toBe(true);
		expect(configReversed.validate().valid).toBe(true);
	});

	it("getPlugin extracts the correct plugin with full options", () => {
		const config = defineConfig({
			app,
			plugins: [
				db({ dialect: "d1", databaseId: "my-db-id" }),
				auth({ cookies: { prefix: "myapp" } }),
				api({ cors: ["https://a.com", "https://b.com"], prefix: "/api" }),
				solid(),
			],
		});

		const dbPlugin = getPlugin(config, "db");
		expect(dbPlugin.__plugin).toBe("db");
		expect(dbPlugin.options.dialect).toBe("d1");
		expect(dbPlugin.options.databaseId).toBe("my-db-id");

		const authPlugin = getPlugin(config, "auth");
		expect(authPlugin.__plugin).toBe("auth");
		expect(authPlugin.options.cookies?.prefix).toBe("myapp");

		const apiPlugin = getPlugin(config, "api");
		expect(apiPlugin.__plugin).toBe("api");
		expect(apiPlugin.options.prefix).toBe("/api");

		const solidPlugin = getPlugin(config, "solid");
		expect(solidPlugin.__plugin).toBe("solid");
	});

	it("getPlugin throws for missing plugin", () => {
		const config = defineConfig({
			app,
			plugins: [solid()],
		});

		expect(() => getPlugin(config, "db")).toThrow('Plugin "db" not found');
	});
});
