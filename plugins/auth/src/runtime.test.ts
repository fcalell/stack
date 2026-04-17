import { describe, expect, it, vi } from "vitest";
import authRuntime from "./worker/index";

const baseOpts = {
	secretVar: "AUTH_SECRET",
	appUrlVar: "APP_URL",
};

const validEnv = {
	AUTH_SECRET: "test-secret-value",
	APP_URL: "http://localhost:3000",
};

const mockDb = { mock: true };

describe("authRuntime", () => {
	it("name is 'auth'", () => {
		const runtime = authRuntime(baseOpts);
		expect(runtime.name).toBe("auth");
	});

	describe("validateEnv", () => {
		it("throws when secret var is missing from env", () => {
			const runtime = authRuntime(baseOpts);
			expect(() => runtime.validateEnv?.({})).toThrow(
				"Missing env var: AUTH_SECRET",
			);
		});

		it("throws when secret var is undefined in env", () => {
			const runtime = authRuntime(baseOpts);
			expect(() =>
				runtime.validateEnv?.({
					AUTH_SECRET: undefined,
					APP_URL: "http://x",
				}),
			).toThrow("Missing env var: AUTH_SECRET");
		});

		it("throws when appUrl var is missing", () => {
			const runtime = authRuntime(baseOpts);
			expect(() => runtime.validateEnv?.({ AUTH_SECRET: "s" })).toThrow(
				"Missing env var: APP_URL",
			);
		});

		it("passes when both secret and appUrl vars exist in env", () => {
			const runtime = authRuntime(baseOpts);
			expect(() => runtime.validateEnv?.(validEnv)).not.toThrow();
		});

		it("uses custom secret var name", () => {
			const runtime = authRuntime({
				secretVar: "MY_SECRET",
				appUrlVar: "APP_URL",
			});
			expect(() => runtime.validateEnv?.({ APP_URL: "u" })).toThrow(
				"Missing env var: MY_SECRET",
			);
			expect(() =>
				runtime.validateEnv?.({ MY_SECRET: "val", APP_URL: "u" }),
			).not.toThrow();
		});
	});

	describe("context", () => {
		it("returns a betterAuth instance under `auth`", () => {
			const runtime = authRuntime({
				...baseOpts,
				callbacks: { sendOTP: vi.fn(), sendInvitation: vi.fn() },
			});
			const result = runtime.context(validEnv, { db: mockDb }) as {
				auth: { handler: unknown; api: unknown };
			};
			expect(result.auth).toBeDefined();
			expect(typeof result.auth.handler).toBe("function");
			expect(typeof result.auth.api).toBe("object");
		});

		it("reuses the same auth instance per env object", () => {
			const runtime = authRuntime(baseOpts);
			const env = { ...validEnv };
			const first = runtime.context(env, { db: mockDb }) as {
				auth: unknown;
			};
			const second = runtime.context(env, { db: mockDb }) as {
				auth: unknown;
			};
			expect(first.auth).toBe(second.auth);
		});

		it("creates separate instances per distinct env object", () => {
			const runtime = authRuntime(baseOpts);
			const first = runtime.context({ ...validEnv }, { db: mockDb }) as {
				auth: unknown;
			};
			const second = runtime.context({ ...validEnv }, { db: mockDb }) as {
				auth: unknown;
			};
			expect(first.auth).not.toBe(second.auth);
		});
	});

	describe("fetch", () => {
		it("returns null for non-auth paths", async () => {
			const runtime = authRuntime(baseOpts);
			const request = new Request("http://localhost/rpc/foo");
			const upstream = runtime.context(validEnv, { db: mockDb }) as {
				auth: unknown;
			};
			const result = await runtime.fetch?.(request, validEnv, {
				db: mockDb,
				...upstream,
			});
			expect(result).toBeNull();
		});

		it("delegates /api/auth/* requests to auth.handler", async () => {
			const runtime = authRuntime(baseOpts);
			const handler = vi
				.fn()
				.mockResolvedValue(new Response("ok", { status: 200 }));
			const upstream = {
				db: mockDb,
				auth: { handler },
			};
			const request = new Request("http://localhost/api/auth/sign-in");
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(handler).toHaveBeenCalledWith(request);
			expect(result).toBeInstanceOf(Response);
		});
	});
});
