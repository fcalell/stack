import { describe, expect, it, vi } from "vitest";

vi.mock("./d1/client", () => ({
	createClient: vi.fn((_d1, _schema) => ({ mock: true })),
}));

import type { PluginConfig } from "@fcalell/config";
import { createClient } from "./d1/client";
import type { DbOptions } from "./index";
import { dbRuntime } from "./runtime";

const mockedCreateClient = vi.mocked(createClient);

function makePluginConfig(
	overrides?: Partial<DbOptions<Record<string, unknown>>>,
): PluginConfig<"db", DbOptions<Record<string, unknown>>> {
	return {
		__plugin: "db",
		options: {
			dialect: "d1",
			databaseId: "abc-123",
			schema: { users: {} } as Record<string, unknown>,
			binding: "DB_MAIN",
			migrations: "./src/migrations",
			...overrides,
		},
	};
}

describe("dbRuntime", () => {
	it("name is 'db'", () => {
		const runtime = dbRuntime(makePluginConfig());
		expect(runtime.name).toBe("db");
	});

	describe("validateEnv", () => {
		it("throws when binding is missing from env", () => {
			const runtime = dbRuntime(makePluginConfig());
			expect(() => runtime.validateEnv?.({})).toThrow(
				"Missing binding: DB_MAIN",
			);
		});

		it("throws when binding is undefined in env", () => {
			const runtime = dbRuntime(makePluginConfig());
			expect(() => runtime.validateEnv?.({ DB_MAIN: undefined })).toThrow(
				"Missing binding: DB_MAIN",
			);
		});

		it("passes when binding exists in env", () => {
			const runtime = dbRuntime(makePluginConfig());
			expect(() =>
				runtime.validateEnv?.({ DB_MAIN: { prepare: vi.fn() } }),
			).not.toThrow();
		});

		it("uses custom binding name", () => {
			const runtime = dbRuntime(makePluginConfig({ binding: "DB_SECONDARY" }));
			expect(() => runtime.validateEnv?.({})).toThrow(
				"Missing binding: DB_SECONDARY",
			);
			expect(() =>
				runtime.validateEnv?.({ DB_SECONDARY: { prepare: vi.fn() } }),
			).not.toThrow();
		});
	});

	describe("context", () => {
		it("creates a db client from the env binding", () => {
			mockedCreateClient.mockReturnValue({ mock: true } as never);

			const runtime = dbRuntime(makePluginConfig());
			const fakeD1 = { prepare: vi.fn() };
			const result = runtime.context({ DB_MAIN: fakeD1 }, {});

			expect(mockedCreateClient).toHaveBeenCalledWith(fakeD1, {
				users: {},
			});
			expect(result).toEqual({ db: { mock: true } });
		});

		it("passes schema module through to createClient", () => {
			mockedCreateClient.mockReturnValue({ mock: true } as never);

			const schema = { posts: {}, comments: {} } as Record<string, unknown>;
			const runtime = dbRuntime(makePluginConfig({ schema }));
			const fakeD1 = { prepare: vi.fn() };
			runtime.context({ DB_MAIN: fakeD1 }, {});

			expect(mockedCreateClient).toHaveBeenCalledWith(fakeD1, schema);
		});
	});
});
