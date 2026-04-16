import { describe, expect, it } from "vitest";
import { defineConfig, getPlugin } from "@fcalell/config";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";
import { api } from "@fcalell/plugin-api";
import { app } from "@fcalell/plugin-app";

const fakeSchema = { users: {}, posts: {} };

describe("defineConfig with multiple plugin combinations", () => {
	it("full-stack config (db + auth + api + app) validates successfully", () => {
		const config = defineConfig({
			domain: "example.com",
			plugins: [
				db({ dialect: "d1", databaseId: "test-db-id", schema: fakeSchema }),
				auth(),
				api({ cors: "https://example.com" }),
				app(),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("frontend-only config (app only) validates successfully", () => {
		const config = defineConfig({
			plugins: [app()],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("API-only config (db + api) validates successfully", () => {
		const config = defineConfig({
			plugins: [
				db({ dialect: "d1", databaseId: "test-db-id", schema: fakeSchema }),
				api(),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("API-without-db config (api only) validates successfully", () => {
		const config = defineConfig({
			plugins: [api()],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("missing dependency is caught: auth without db produces validation error with fix suggestion", () => {
		const config = defineConfig({
			plugins: [auth(), api()],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toMatchObject({
			plugin: "auth",
			message: expect.stringContaining("db"),
			fix: expect.stringContaining("stack add db"),
		});
	});

	it("duplicate plugin names are caught", () => {
		const config = defineConfig({
			plugins: [
				db({ dialect: "d1", databaseId: "id-1", schema: fakeSchema }),
				db({ dialect: "d1", databaseId: "id-2", schema: fakeSchema }),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(
			true,
		);
	});

	it("domain is preserved through config", () => {
		const config = defineConfig({
			domain: "myapp.example.com",
			plugins: [app()],
		});

		expect(config.domain).toBe("myapp.example.com");
	});

	it("plugin order does not matter for validation (deps are checked by name)", () => {
		const configAscending = defineConfig({
			plugins: [
				db({ dialect: "d1", databaseId: "test-id", schema: fakeSchema }),
				auth(),
				api(),
			],
		});

		const configReversed = defineConfig({
			plugins: [
				api(),
				auth(),
				db({ dialect: "d1", databaseId: "test-id", schema: fakeSchema }),
			],
		});

		expect(configAscending.validate().valid).toBe(true);
		expect(configReversed.validate().valid).toBe(true);
	});

	it("getPlugin extracts the correct plugin with full options", () => {
		const config = defineConfig({
			plugins: [
				db({ dialect: "d1", databaseId: "my-db-id", schema: fakeSchema }),
				auth({ cookies: { prefix: "myapp" } }),
				api({ cors: ["https://a.com", "https://b.com"], prefix: "/api" }),
				app(),
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

		const appPlugin = getPlugin(config, "app");
		expect(appPlugin.__plugin).toBe("app");
	});

	it("getPlugin throws for missing plugin", () => {
		const config = defineConfig({
			plugins: [app()],
		});

		expect(() => getPlugin(config, "db")).toThrow('Plugin "db" not found');
	});
});
