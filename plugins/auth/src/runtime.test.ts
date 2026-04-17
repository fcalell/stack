import { describe, expect, it, vi } from "vitest";
import authRuntime from "./worker/index";

describe("authRuntime", () => {
	it("name is 'auth'", () => {
		const runtime = authRuntime({
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
		});
		expect(runtime.name).toBe("auth");
	});

	describe("validateEnv", () => {
		it("throws when secret var is missing from env", () => {
			const runtime = authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
			});
			expect(() => runtime.validateEnv?.({})).toThrow(
				"Missing env var: AUTH_SECRET",
			);
		});

		it("throws when secret var is undefined in env", () => {
			const runtime = authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
			});
			expect(() => runtime.validateEnv?.({ AUTH_SECRET: undefined })).toThrow(
				"Missing env var: AUTH_SECRET",
			);
		});

		it("passes when secret var exists in env", () => {
			const runtime = authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
			});
			expect(() =>
				runtime.validateEnv?.({ AUTH_SECRET: "some-secret" }),
			).not.toThrow();
		});

		it("uses custom secret var name", () => {
			const runtime = authRuntime({
				secretVar: "MY_SECRET",
				appUrlVar: "APP_URL",
			});
			expect(() => runtime.validateEnv?.({})).toThrow(
				"Missing env var: MY_SECRET",
			);
			expect(() => runtime.validateEnv?.({ MY_SECRET: "val" })).not.toThrow();
		});
	});

	describe("context", () => {
		it("returns auth context with env, db, and callbacks", () => {
			const callbacks = {
				sendOTP: vi.fn(),
				sendInvitation: vi.fn(),
			};
			const runtime = authRuntime(
				{ secretVar: "AUTH_SECRET", appUrlVar: "APP_URL" },
				callbacks,
			);
			const env = { AUTH_SECRET: "secret" };
			const upstream = { db: { mock: true } };
			const result = runtime.context(env, upstream);

			expect(result).toEqual({
				auth: { env, db: upstream.db, callbacks },
			});
		});

		it("returns auth context without callbacks when none provided", () => {
			const runtime = authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
			});
			const env = { AUTH_SECRET: "secret" };
			const upstream = { db: { mock: true } };
			const result = runtime.context(env, upstream);

			expect(result).toEqual({
				auth: { env, db: upstream.db, callbacks: undefined },
			});
		});
	});
});
