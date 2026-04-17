import { describe, expect, it, vi } from "vitest";

vi.mock("./d1/client", () => ({
	createClient: vi.fn((_d1, _schema) => ({ mock: true })),
}));

import { createClient } from "./d1/client";
import dbRuntime from "./worker/index";

const mockedCreateClient = vi.mocked(createClient);

describe("dbRuntime", () => {
	it("name is 'db'", () => {
		const runtime = dbRuntime({ binding: "DB_MAIN", schema: { users: {} } });
		expect(runtime.name).toBe("db");
	});

	describe("validateEnv", () => {
		it("throws when binding is missing from env", () => {
			const runtime = dbRuntime({ binding: "DB_MAIN", schema: {} });
			expect(() => runtime.validateEnv?.({})).toThrow(
				"Missing binding: DB_MAIN",
			);
		});

		it("throws when binding is undefined in env", () => {
			const runtime = dbRuntime({ binding: "DB_MAIN", schema: {} });
			expect(() => runtime.validateEnv?.({ DB_MAIN: undefined })).toThrow(
				"Missing binding: DB_MAIN",
			);
		});

		it("passes when binding exists in env", () => {
			const runtime = dbRuntime({ binding: "DB_MAIN", schema: {} });
			expect(() =>
				runtime.validateEnv?.({ DB_MAIN: { prepare: vi.fn() } }),
			).not.toThrow();
		});

		it("uses custom binding name", () => {
			const runtime = dbRuntime({
				binding: "DB_SECONDARY",
				schema: {},
			});
			expect(() => runtime.validateEnv?.({})).toThrow(
				"Missing binding: DB_SECONDARY",
			);
			expect(() =>
				runtime.validateEnv?.({
					DB_SECONDARY: { prepare: vi.fn() },
				}),
			).not.toThrow();
		});
	});

	describe("context", () => {
		it("creates a db client from the env binding", () => {
			mockedCreateClient.mockReturnValue({ mock: true } as never);

			const schema = { users: {} } as Record<string, unknown>;
			const runtime = dbRuntime({ binding: "DB_MAIN", schema });
			const fakeD1 = { prepare: vi.fn() };
			const result = runtime.context({ DB_MAIN: fakeD1 }, {});

			expect(mockedCreateClient).toHaveBeenCalledWith(fakeD1, schema);
			expect(result).toEqual({ db: { mock: true } });
		});

		it("passes schema through to createClient", () => {
			mockedCreateClient.mockReturnValue({ mock: true } as never);

			const schema = { posts: {}, comments: {} } as Record<string, unknown>;
			const runtime = dbRuntime({ binding: "DB_MAIN", schema });
			const fakeD1 = { prepare: vi.fn() };
			runtime.context({ DB_MAIN: fakeD1 }, {});

			expect(mockedCreateClient).toHaveBeenCalledWith(fakeD1, schema);
		});
	});
});
