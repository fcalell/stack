import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { describe, expect, it } from "vitest";

describe("plugin factory validation", () => {
	it("db throws for d1 dialect without databaseId", () => {
		expect(() => db({ dialect: "d1" } as Parameters<typeof db>[0])).toThrow(
			"databaseId",
		);
	});

	it("db throws for sqlite dialect without path", () => {
		expect(() =>
			db({
				dialect: "sqlite",
			} as Parameters<typeof db>[0]),
		).toThrow("path");
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

	it("api throws for invalid cors type", () => {
		expect(() => api({ cors: 123 as unknown as string })).toThrow("cors");
	});
});

describe("cross-plugin dependency validation", () => {
	it("auth without db passes config validation (checked at runtime)", () => {
		const config = defineConfig({
			plugins: [auth(), api()],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("full chain db + auth + api + solid validates together", () => {
		const config = defineConfig({
			plugins: [
				db({ dialect: "d1", databaseId: "test" }),
				auth({ cookies: { prefix: "test" }, organization: true }),
				api({ cors: "https://test.com", prefix: "/rpc" }),
				solid(),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("auth plugin declares dependency on db via cli.depends", () => {
		expect(auth.cli.depends).toHaveLength(1);
		expect(auth.cli.depends[0]?.source).toBe("db");
	});

	it("duplicate plugin produces validation error", () => {
		const config = defineConfig({
			plugins: [
				db({ dialect: "d1", databaseId: "x" }),
				db({ dialect: "d1", databaseId: "y" }),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain("Duplicate");
	});
});
