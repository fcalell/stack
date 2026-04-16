import { describe, expect, it } from "vitest";
import { defineConfig } from "@fcalell/config";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";
import { api } from "@fcalell/plugin-api";
import { app } from "@fcalell/plugin-app";

const fakeSchema = { users: {}, posts: {} };

describe("plugin factory validation", () => {
	it("db throws for d1 dialect without databaseId", () => {
		expect(() =>
			db({ dialect: "d1", schema: fakeSchema } as Parameters<typeof db>[0]),
		).toThrow("databaseId");
	});

	it("db throws for sqlite dialect without path", () => {
		expect(() =>
			db({
				dialect: "sqlite",
				schema: fakeSchema,
			} as Parameters<typeof db>[0]),
		).toThrow("path");
	});

	it("db throws for missing schema", () => {
		expect(() =>
			db({
				dialect: "d1",
				databaseId: "test-id",
				schema: null,
			} as unknown as Parameters<typeof db>[0]),
		).toThrow("schema");
	});

	it("auth throws for negative expiresIn", () => {
		expect(() => auth({ session: { expiresIn: -100 } })).toThrow(
			"expiresIn",
		);
	});

	it("auth throws for zero expiresIn", () => {
		expect(() => auth({ session: { expiresIn: 0 } })).toThrow("expiresIn");
	});

	it("api throws for prefix not starting with /", () => {
		expect(() =>
			api({ prefix: "rpc" as `/${string}` }),
		).toThrow("prefix");
	});

	it("api throws for invalid cors type", () => {
		expect(() =>
			api({ cors: 123 as unknown as string }),
		).toThrow("cors");
	});
});

describe("cross-plugin dependency validation", () => {
	it("auth without db produces validation error", () => {
		const config = defineConfig({
			plugins: [auth(), api()],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					plugin: "auth",
					message: expect.stringContaining("db"),
				}),
			]),
		);
	});

	it("full chain db + auth + api + app validates together", () => {
		const config = defineConfig({
			plugins: [
				db({ dialect: "d1", databaseId: "test", schema: fakeSchema }),
				auth({ cookies: { prefix: "test" }, organization: true }),
				api({ cors: "https://test.com", prefix: "/rpc" }),
				app(),
			],
		});

		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("removing db while auth is present produces validation error", () => {
		const config = defineConfig({
			plugins: [auth(), app()],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(e) => e.plugin === "auth" && e.message.includes("db"),
			),
		).toBe(true);
	});

	it("validation error includes fix suggestion", () => {
		const config = defineConfig({
			plugins: [auth()],
		});

		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.fix).toContain("stack add db");
	});

	it("defineConfig throws for invalid studioPort", () => {
		expect(() =>
			defineConfig({
				plugins: [],
				dev: { studioPort: -1 },
			}),
		).toThrow("studioPort");

		expect(() =>
			defineConfig({
				plugins: [],
				dev: { studioPort: 0 },
			}),
		).toThrow("studioPort");

		expect(() =>
			defineConfig({
				plugins: [],
				dev: { studioPort: 1.5 },
			}),
		).toThrow("studioPort");
	});

	it("valid studioPort passes", () => {
		expect(() =>
			defineConfig({
				plugins: [],
				dev: { studioPort: 4983 },
			}),
		).not.toThrow();
	});
});
