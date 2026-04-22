import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { ConfigValidationError } from "@fcalell/cli/errors";
import { buildTestGraph } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { vite } from "@fcalell/plugin-vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("plugin factory validation (Zod schema)", () => {
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

describe("cross-plugin dependency validation (requires)", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-validation-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("full chain cloudflare + db + auth + api + vite + solid validates together", () => {
		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "test" }),
				auth({ cookies: { prefix: "test" }, organization: true }),
				api({ prefix: "/rpc" }),
				vite(),
				solid(),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("auth declares requires on db, api, cloudflare (presence check)", () => {
		// `requires` are the plugin names the CLI uses for actionable errors
		// when a sibling is missing. Ordering is now derived from slot inputs.
		expect([...auth.cli.requires]).toEqual(
			expect.arrayContaining(["api", "cloudflare", "db"]),
		);
	});

	it("auth without required siblings throws at graph build time with actionable message", async () => {
		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [auth()],
		});

		await expect(buildTestGraph({ config, cwd })).rejects.toThrow(
			/\[auth\] requires plugin 'api'/,
		);
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

		const error = new ConfigValidationError(result.errors);
		expect(error).toBeInstanceOf(ConfigValidationError);
		expect(error.errors).toHaveLength(result.errors.length);
		expect(error.errors[0]?.message).toContain("Duplicate");
		expect(error.code).toBe("CONFIG_VALIDATION");
	});
});
