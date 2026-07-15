import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	applyDrizzleMigrations,
	emitWorkerMiniflare,
	type MiniflareWorker,
	teardownMiniflareWorkspace,
} from "./miniflare-harness";

// WS2.3: the auth runtime throttles /api/auth/* before handing requests to
// Better Auth. These tests exercise the real 429 path under workerd — not
// the middleware in isolation — so a wiring regression (context() never
// building `_rateLimiter`, fetch() never checking it) shows up here even if
// the unit tests in plugins/auth/src/runtime.test.ts stay green.

const AUTH_SEED = {
	"src/schema/index.ts": 'export * from "@fcalell/plugin-auth/schema";\n',
	"src/worker/plugins/auth.ts": `import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

const callbacks: AuthCallbacks = {
	sendOTP: async () => {},
};

export default callbacks;
`,
};

afterAll(() => {
	teardownMiniflareWorkspace();
});

describe("per-email rate limit on OTP send", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-rate-limit-email",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-rate-limit-email" }),
				auth({
					secretVar: "AUTH_SECRET",
					// Generous ip limit (default 100/60s) so only the email limiter
					// is exercised; a small email limit makes the 3rd send trip it.
					rateLimiter: { email: { limit: 2 } },
				}),
				api(),
			],
			seed: AUTH_SEED,
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	function sendOtp(email: string) {
		return worker.dispatch(
			"https://example.com/api/auth/email-otp/send-verification-otp",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, type: "sign-in" }),
			},
		);
	}

	it("throttles the same inbox across +tag / dot addressing variants", async () => {
		// All three fold to the same gmail key (victim@gmail.com): +tag is
		// stripped, and dots are collapsed for gmail.com specifically.
		const first = await sendOtp("victim+1@gmail.com");
		expect(first.status).not.toBe(429);

		const second = await sendOtp("v.i.c.t.i.m@gmail.com");
		expect(second.status).not.toBe(429);

		const third = await sendOtp("victim+2@gmail.com");
		expect(third.status).toBe(429);
		expect(await third.json()).toEqual({ code: "TOO_MANY_REQUESTS" });
	});
});

describe("per-IP rate limit on the auth surface", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-rate-limit-ip",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-rate-limit-ip" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
			seed: AUTH_SEED,
			// Miniflare's simple-ratelimit simulator rejects `limit: 0` (must be
			// > 0), so the smallest quota it accepts is 1: the first request
			// consumes it, proving the per-IP check runs on every /api/auth/*
			// route (not just the OTP-send path) once exhausted.
			rateLimiters: { RATE_LIMITER_IP: { limit: 1 } },
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("returns 429 for a non-OTP auth route once the ip quota is exhausted", async () => {
		const first = await worker.dispatch(
			"https://example.com/api/auth/get-session",
		);
		expect(first.status).not.toBe(429);

		const second = await worker.dispatch(
			"https://example.com/api/auth/get-session",
		);
		expect(second.status).toBe(429);
		expect(await second.json()).toEqual({ code: "TOO_MANY_REQUESTS" });
	});
});

describe("auth route that writes to D1 (runtime plugin ordering)", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-ordering-otp-send",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-ordering-otp" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
			seed: AUTH_SEED,
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	// Regression for the runtime-plugin ordering bug: codegen sorts
	// `pluginRuntimes` alphabetically for deterministic output, so the
	// emitted worker always `.use(authRuntime(...))` before
	// `.use(dbRuntime(...))` regardless of `plugins:` order. Without
	// `authRuntime`'s `dependsOn: ["db"]` edge, `upstream.db` is undefined
	// when better-auth's drizzle adapter tries to write a verification row —
	// get-session (no DB write) doesn't exercise the adapter, OTP-send does.
	it("POST /api/auth/email-otp/send-verification-otp returns 200 and writes a verification row", async () => {
		const res = await worker.dispatch(
			"https://example.com/api/auth/email-otp/send-verification-otp",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email: "regress@example.com",
					type: "sign-in",
				}),
			},
		);
		expect(res.status).toBe(200);

		const rows = await worker.d1
			.prepare("SELECT identifier FROM verification")
			.all();
		expect(rows.results.length).toBeGreaterThan(0);
	});
});

describe("dev mode never throttles", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-rate-limit-dev",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-rate-limit-dev" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
			seed: AUTH_SEED,
			// Same 1-request quota as the production-mode test above.
			rateLimiters: { RATE_LIMITER_IP: { limit: 1 } },
			env: { STACK_DEV: "1" },
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("does not throttle even after the bound limiter's quota would be exhausted", async () => {
		const first = await worker.dispatch(
			"https://example.com/api/auth/get-session",
		);
		expect(first.status).toBe(200);

		const second = await worker.dispatch(
			"https://example.com/api/auth/get-session",
		);
		expect(second.status).toBe(200);
	});
});
