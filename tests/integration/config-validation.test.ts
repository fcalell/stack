import { defineConfig } from "@fcalell/cli";
import { ConfigValidationError } from "@fcalell/cli/errors";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { describe, expect, it } from "vitest";

describe("plugin factory validation", () => {
	it("db throws for d1 dialect without databaseId", () => {
		expect(() => db({ dialect: "d1" })).toThrow("databaseId");
	});

	it("db throws for sqlite dialect without path", () => {
		expect(() => db({ dialect: "sqlite" })).toThrow("path");
	});

	it("auth throws for negative expiresIn", () => {
		expect(() => auth({ session: { expiresIn: -100 } })).toThrow("expiresIn");
	});

	it("auth throws for zero expiresIn", () => {
		expect(() => auth({ session: { expiresIn: 0 } })).toThrow("expiresIn");
	});

	it("api throws for prefix not starting with /", () => {
		expect(() => api({ prefix: "rpc" as `/${string}` })).toThrow("prefix");
	});
});

describe("cross-plugin dependency validation", () => {
	it("auth without db passes config validation (checked at runtime)", () => {
		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [auth(), api()],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("full chain db + auth + api + solid validates together", () => {
		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [
				db({ dialect: "d1", databaseId: "test" }),
				auth({ cookies: { prefix: "test" }, organization: true }),
				api({ prefix: "/rpc" }),
				solid(),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("auth plugin declares dependency on db via cli.after", () => {
		const sources = auth.cli.after.map((e) => e.source);
		expect(sources).toContain("db");
	});

	it("duplicate plugin produces validation error", () => {
		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [
				db({ dialect: "d1", databaseId: "x" }),
				db({ dialect: "d1", databaseId: "y" }),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain("Duplicate");
	});

	it("hand-authored plugin entry missing __package fails validation", () => {
		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [
				// Simulates a user constructing the config object directly instead
				// of calling the factory — discovery would silently fall back to
				// `@fcalell/plugin-widget`, which may not be the right package.
				{ __plugin: "widget", options: {} } as never,
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain("__package");
	});
});

describe("typed error classes round-trip from validation results", () => {
	it("ConfigValidationError carries the ValidationError[] from a duplicate-plugin config", () => {
		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [
				db({ dialect: "d1", databaseId: "x" }),
				db({ dialect: "d1", databaseId: "y" }),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);

		// This is exactly the error `generate()` throws when validation fails —
		// consumers and third-party orchestrators can catch it via instanceof.
		const error = new ConfigValidationError(result.errors);
		expect(error).toBeInstanceOf(ConfigValidationError);
		expect(error.errors).toHaveLength(result.errors.length);
		expect(error.errors[0]?.message).toContain("Duplicate");
		expect(error.code).toBe("CONFIG_VALIDATION");
	});
});
