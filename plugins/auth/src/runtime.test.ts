import { APIError } from "better-auth/api";
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
			const result = await runtime.fetch?.(
				request,
				validEnv,
				// `fetch`'s upstream param is typed against the honest
				// `AuthInstance<TOptions>` contract (api/$Infer) real codegen
				// always supplies; this test only exercises the non-auth-path
				// short-circuit, so the mock upstream deliberately doesn't carry
				// that shape. Cast through `unknown` — same escape hatch TS
				// itself suggests for a narrowing assertion with no provable
				// overlap.
				{ ...upstream } as unknown as Parameters<
					NonNullable<typeof runtime.fetch>
				>[2],
			);
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
			} as unknown as Parameters<NonNullable<typeof runtime.fetch>>[2];
			const request = new Request("http://localhost/api/auth/sign-in");
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(handler).toHaveBeenCalledWith(request);
			expect(result).toBeInstanceOf(Response);
		});
	});

	// WS2.3: `_rateLimiter` is what `context()` hands to `fetch()` (and to the
	// per-procedure oRPC middleware, via the same upstream ctx object).
	describe("context — _rateLimiter", () => {
		const rateLimiterOpts = {
			...baseOpts,
			rateLimiter: {
				ip: { binding: "RATE_LIMITER_IP" },
				email: { binding: "RATE_LIMITER_EMAIL" },
			},
		};

		it("builds _rateLimiter from env when both bindings are present", () => {
			const runtime = authRuntime(rateLimiterOpts);
			const ipBinding = { limit: vi.fn() };
			const emailBinding = { limit: vi.fn() };
			const env = {
				...validEnv,
				RATE_LIMITER_IP: ipBinding,
				RATE_LIMITER_EMAIL: emailBinding,
			};
			const result = runtime.context(env, { db: mockDb }) as {
				_rateLimiter?: { ip?: unknown; email?: unknown };
			};
			expect(result._rateLimiter?.ip).toBe(ipBinding);
			expect(result._rateLimiter?.email).toBe(emailBinding);
		});

		it("includes only the binding actually present in env", () => {
			const runtime = authRuntime(rateLimiterOpts);
			const ipBinding = { limit: vi.fn() };
			const result = runtime.context(
				{ ...validEnv, RATE_LIMITER_IP: ipBinding },
				{ db: mockDb },
			) as { _rateLimiter?: { ip?: unknown; email?: unknown } };
			expect(result._rateLimiter?.ip).toBe(ipBinding);
			expect(result._rateLimiter?.email).toBeUndefined();
		});

		it("omits _rateLimiter entirely when neither binding is present in env", () => {
			const runtime = authRuntime(rateLimiterOpts);
			const result = runtime.context({ ...validEnv }, { db: mockDb }) as {
				_rateLimiter?: unknown;
			};
			expect(result._rateLimiter).toBeUndefined();
		});

		it("omits _rateLimiter when no rateLimiter option was configured at all", () => {
			const runtime = authRuntime(baseOpts);
			const env = { ...validEnv, RATE_LIMITER_IP: { limit: vi.fn() } };
			const result = runtime.context(env, { db: mockDb }) as {
				_rateLimiter?: unknown;
			};
			expect(result._rateLimiter).toBeUndefined();
		});
	});

	// WS2.3: per-IP + per-email throttling of the Better Auth surface.
	describe("fetch — rate limiting (WS2.3)", () => {
		function successHandler() {
			return vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
		}

		// `fetch`'s upstream param is typed against the honest
		// `AuthInstance<TOptions>` contract (api/$Infer) real codegen always
		// supplies; these tests exercise rate-limiting/handler-forwarding
		// behavior with minimal `auth` stand-ins that don't carry that shape.
		// Cast through `unknown` — same escape hatch TS itself suggests for a
		// narrowing assertion with no provable overlap.
		type FetchUpstream = Parameters<
			NonNullable<ReturnType<typeof authRuntime<typeof baseOpts>>["fetch"]>
		>[2];

		it("returns 429 with TOO_MANY_REQUESTS when the ip limiter denies", async () => {
			const runtime = authRuntime(baseOpts);
			const ipLimit = vi.fn().mockResolvedValue({ success: false });
			const upstream = {
				auth: { handler: successHandler() },
				_rateLimiter: { ip: { limit: ipLimit } },
			} as unknown as FetchUpstream;
			const request = new Request("http://localhost/api/auth/get-session", {
				headers: { "cf-connecting-ip": "1.2.3.4" },
			});
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(result?.status).toBe(429);
			expect(await result?.json()).toEqual({ code: "TOO_MANY_REQUESTS" });
			expect(ipLimit).toHaveBeenCalledWith({ key: "1.2.3.4" });
		});

		it("keys the ip limiter on 'unknown' when cf-connecting-ip is missing", async () => {
			const runtime = authRuntime(baseOpts);
			const ipLimit = vi.fn().mockResolvedValue({ success: true });
			const upstream = {
				auth: { handler: successHandler() },
				_rateLimiter: { ip: { limit: ipLimit } },
			} as unknown as FetchUpstream;
			const request = new Request("http://localhost/api/auth/get-session");
			await runtime.fetch?.(request, validEnv, upstream);
			expect(ipLimit).toHaveBeenCalledWith({ key: "unknown" });
		});

		it("never throttles in dev mode, even when the limiter would deny", async () => {
			const runtime = authRuntime(baseOpts);
			const ipLimit = vi.fn().mockResolvedValue({ success: false });
			const handler = successHandler();
			const upstream = {
				auth: { handler },
				_rateLimiter: { ip: { limit: ipLimit } },
				_devMode: true,
			} as unknown as FetchUpstream;
			const request = new Request("http://localhost/api/auth/get-session");
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(ipLimit).not.toHaveBeenCalled();
			expect(handler).toHaveBeenCalled();
			expect(result?.status).toBe(200);
		});

		it("skips throttling silently when no _rateLimiter is on the upstream ctx", async () => {
			const runtime = authRuntime(baseOpts);
			const handler = successHandler();
			const upstream = { auth: { handler } } as unknown as FetchUpstream;
			const request = new Request("http://localhost/api/auth/get-session");
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(handler).toHaveBeenCalled();
			expect(result?.status).toBe(200);
		});

		it("applies the email limiter on the OTP-send path, keyed by the folded email", async () => {
			const runtime = authRuntime(baseOpts);
			const ipLimit = vi.fn().mockResolvedValue({ success: true });
			const emailLimit = vi.fn().mockResolvedValue({ success: false });
			const handler = successHandler();
			const upstream = {
				auth: { handler },
				_rateLimiter: { ip: { limit: ipLimit }, email: { limit: emailLimit } },
			} as unknown as FetchUpstream;
			const request = new Request(
				"http://localhost/api/auth/email-otp/send-verification-otp",
				{
					method: "POST",
					body: JSON.stringify({
						email: "Victim+1@Gmail.com",
						type: "sign-in",
					}),
					headers: { "content-type": "application/json" },
				},
			);
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(result?.status).toBe(429);
			expect(emailLimit).toHaveBeenCalledWith({ key: "victim@gmail.com" });
			expect(handler).not.toHaveBeenCalled();
		});

		it("does not apply the email limiter on non-OTP-send auth routes", async () => {
			const runtime = authRuntime(baseOpts);
			const emailLimit = vi.fn().mockResolvedValue({ success: false });
			const handler = successHandler();
			const upstream = {
				auth: { handler },
				_rateLimiter: { email: { limit: emailLimit } },
			} as unknown as FetchUpstream;
			const request = new Request("http://localhost/api/auth/get-session");
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(emailLimit).not.toHaveBeenCalled();
			expect(result?.status).toBe(200);
		});

		it("skips the per-email check (request still proceeds) when the body isn't valid JSON", async () => {
			const runtime = authRuntime(baseOpts);
			const emailLimit = vi.fn().mockResolvedValue({ success: false });
			const handler = successHandler();
			const upstream = {
				auth: { handler },
				_rateLimiter: { email: { limit: emailLimit } },
			} as unknown as FetchUpstream;
			const request = new Request(
				"http://localhost/api/auth/email-otp/send-verification-otp",
				{
					method: "POST",
					body: "not json",
					headers: { "content-type": "application/json" },
				},
			);
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(emailLimit).not.toHaveBeenCalled();
			expect(result?.status).toBe(200);
		});

		it("skips the per-email check when the body has no string email", async () => {
			const runtime = authRuntime(baseOpts);
			const emailLimit = vi.fn().mockResolvedValue({ success: false });
			const handler = successHandler();
			const upstream = {
				auth: { handler },
				_rateLimiter: { email: { limit: emailLimit } },
			} as unknown as FetchUpstream;
			const request = new Request(
				"http://localhost/api/auth/email-otp/send-verification-otp",
				{
					method: "POST",
					body: JSON.stringify({ type: "sign-in" }),
					headers: { "content-type": "application/json" },
				},
			);
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(emailLimit).not.toHaveBeenCalled();
			expect(result?.status).toBe(200);
		});

		// Better Auth must still read the real body — cloning for the email
		// check must never consume the original request stream.
		it("forwards the original, unconsumed request body to auth.handler", async () => {
			const runtime = authRuntime(baseOpts);
			const emailLimit = vi.fn().mockResolvedValue({ success: true });
			const handler = vi.fn(async (req: Request) => {
				const body = await req.json();
				return new Response(JSON.stringify(body), { status: 200 });
			});
			const upstream = {
				auth: { handler },
				_rateLimiter: { email: { limit: emailLimit } },
			} as unknown as FetchUpstream;
			const request = new Request(
				"http://localhost/api/auth/email-otp/send-verification-otp",
				{
					method: "POST",
					body: JSON.stringify({ email: "a@example.com", type: "sign-in" }),
					headers: { "content-type": "application/json" },
				},
			);
			const result = await runtime.fetch?.(request, validEnv, upstream);
			expect(await result?.json()).toEqual({
				email: "a@example.com",
				type: "sign-in",
			});
		});
	});

	describe("social providers + emailOtp opt-out", () => {
		const googleOpts = {
			...baseOpts,
			socialProviders: {
				google: {
					clientIdVar: "GOOGLE_CLIENT_ID",
					clientSecretVar: "GOOGLE_CLIENT_SECRET",
				},
			},
		};

		it("validateEnv throws when a provider's client-id var is missing", () => {
			const runtime = authRuntime(googleOpts);
			expect(() => runtime.validateEnv?.(validEnv)).toThrow(
				"Missing env var: GOOGLE_CLIENT_ID",
			);
		});

		it("validateEnv throws when a provider's client-secret var is missing", () => {
			const runtime = authRuntime(googleOpts);
			expect(() =>
				runtime.validateEnv?.({ ...validEnv, GOOGLE_CLIENT_ID: "id" }),
			).toThrow("Missing env var: GOOGLE_CLIENT_SECRET");
		});

		it("validateEnv passes when provider vars are present", () => {
			const runtime = authRuntime(googleOpts);
			expect(() =>
				runtime.validateEnv?.({
					...validEnv,
					GOOGLE_CLIENT_ID: "id",
					GOOGLE_CLIENT_SECRET: "secret",
				}),
			).not.toThrow();
		});

		// The headline: betterAuth (minimal) must accept a forwarded
		// `socialProviders` config built from env, with email-OTP disabled.
		it("builds an auth instance with social providers and emailOtp off", () => {
			const runtime = authRuntime({
				...baseOpts,
				emailOtp: false,
				socialProviders: {
					google: {
						clientIdVar: "GOOGLE_CLIENT_ID",
						clientSecretVar: "GOOGLE_CLIENT_SECRET",
					},
					apple: {
						clientIdVar: "APPLE_CLIENT_ID",
						clientSecretVar: "APPLE_CLIENT_SECRET",
						appBundleIdentifier: "app.example",
					},
				},
			});
			const env = {
				...validEnv,
				GOOGLE_CLIENT_ID: "gid",
				GOOGLE_CLIENT_SECRET: "gsecret",
				APPLE_CLIENT_ID: "aid",
				APPLE_CLIENT_SECRET: "asecret",
			};
			const result = runtime.context(env, { db: mockDb }) as {
				auth: { handler: unknown };
			};
			expect(typeof result.auth.handler).toBe("function");
		});
	});

	describe("native expo + production hardening", () => {
		// A fresh env object per test: the runtime caches the auth instance per
		// env (WeakMap), so reusing the shared `validEnv` would return whatever
		// instance an earlier test built for it.
		it("enables the server expo() plugin when `expo` is set", () => {
			const runtime = authRuntime({ ...baseOpts, expo: true });
			// `context()`'s `auth` is typed as the honest `AuthInstance<TOptions>`
			// contract (api/$Infer), not the real better-auth instance's actual
			// `.options` — cast through `unknown` (as TS itself suggests) to reach
			// into the real runtime value for this internals-level assertion.
			const { auth } = runtime.context(
				{ ...validEnv },
				{ db: mockDb },
			) as unknown as {
				auth: { options: { plugins?: Array<{ id?: string }> } };
			};
			const ids = (auth.options.plugins ?? []).map((p) => p.id);
			expect(ids).toContain("expo");
		});

		it("does not add the expo() plugin by default", () => {
			const runtime = authRuntime(baseOpts);
			const { auth } = runtime.context(
				{ ...validEnv },
				{ db: mockDb },
			) as unknown as {
				auth: { options: { plugins?: Array<{ id?: string }> } };
			};
			const ids = (auth.options.plugins ?? []).map((p) => p.id);
			expect(ids).not.toContain("expo");
		});

		it("enables the signed session cookie cache with a 5min maxAge (avoids a D1 read per request)", () => {
			const runtime = authRuntime(baseOpts);
			const { auth } = runtime.context(
				{ ...validEnv },
				{ db: mockDb },
			) as unknown as {
				auth: {
					options: {
						session?: { cookieCache?: { enabled?: boolean; maxAge?: number } };
					};
				};
			};
			expect(auth.options.session?.cookieCache).toEqual({
				enabled: true,
				maxAge: 300,
			});
		});

		// WS2.1: cookieCache sets a second `session_data` cookie alongside
		// `session_token`. React Native reliably round-trips only one cookie, so
		// a native device ends up sending session_data without session_token —
		// every authed request would resolve to no session with the cache on.
		it("disables the session cookie cache for native (expo) consumers", () => {
			const runtime = authRuntime({ ...baseOpts, expo: true });
			const { auth } = runtime.context(
				{ ...validEnv },
				{ db: mockDb },
			) as unknown as {
				auth: {
					options: {
						session?: { cookieCache?: { enabled?: boolean; maxAge?: number } };
					};
				};
			};
			expect(auth.options.session?.cookieCache).toEqual({ enabled: false });
		});

		it("reads the client IP from Cloudflare's cf-connecting-ip header", () => {
			const runtime = authRuntime(baseOpts);
			const { auth } = runtime.context(
				{ ...validEnv },
				{ db: mockDb },
			) as unknown as {
				auth: {
					options: {
						advanced?: { ipAddress?: { ipAddressHeaders?: string[] } };
					};
				};
			};
			expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toContain(
				"cf-connecting-ip",
			);
		});
	});

	// WS6.2 error narrowing: `routes()`'s `auth.orgRules` handler must only
	// deny-all ({ rules: [] }) for the two "no ability to compile" cases
	// better-auth's `getActiveMember` throws for; every other error (a D1
	// outage, an unexpected bug) must surface as a real query error
	// client-side, matching `fetchOrgRules`'s contract
	// (`@fcalell/plugin-api/ability-client`).
	describe("routes — auth.orgRules error narrowing (WS6.2)", () => {
		// Mirrors `OrgRulesProcedureFactory`'s shape (`.query(fn)`), just handing
		// back `fn` itself so the test can invoke the real handler directly with
		// a controlled `auth.api.getActiveMember` stub — no need to build a real
		// oRPC procedure to unit-test the error-narrowing branch.
		function stubProcedureFactory() {
			return { query: <TFn>(fn: TFn) => fn };
		}

		function buildOrgRulesHandler(
			getActiveMember: () => Promise<{ role: string }>,
		) {
			const runtime = authRuntime({ ...baseOpts, organization: true });
			const routes = runtime.routes?.(stubProcedureFactory) as {
				auth: { orgRules: (opts: { context: unknown }) => Promise<unknown> };
			};
			const context = {
				reqHeaders: new Headers(),
				auth: { api: { getActiveMember } },
			};
			return () => routes.auth.orgRules({ context });
		}

		it("returns { rules: [] } when getActiveMember throws NO_ACTIVE_ORGANIZATION", async () => {
			const call = buildOrgRulesHandler(() =>
				Promise.reject(
					new APIError("BAD_REQUEST", {
						code: "NO_ACTIVE_ORGANIZATION",
						message: "No active organization",
					}),
				),
			);
			await expect(call()).resolves.toEqual({ rules: [] });
		});

		it("returns { rules: [] } when getActiveMember throws MEMBER_NOT_FOUND", async () => {
			const call = buildOrgRulesHandler(() =>
				Promise.reject(
					new APIError("BAD_REQUEST", {
						code: "MEMBER_NOT_FOUND",
						message: "Member not found",
					}),
				),
			);
			await expect(call()).resolves.toEqual({ rules: [] });
		});

		it("rethrows a same-shaped APIError with an unrelated code instead of denying", async () => {
			const call = buildOrgRulesHandler(() =>
				Promise.reject(
					new APIError("INTERNAL_SERVER_ERROR", {
						code: "SOME_OTHER_ERROR",
						message: "boom",
					}),
				),
			);
			await expect(call()).rejects.toThrow("boom");
		});

		it("rethrows a non-APIError failure (e.g. a D1 outage) instead of denying", async () => {
			const call = buildOrgRulesHandler(() =>
				Promise.reject(new Error("D1 outage")),
			);
			await expect(call()).rejects.toThrow("D1 outage");
		});
	});

	// WS2.2: the attempt cap is the actual brute-force gate for OTP verify (the
	// route is only IP-limited otherwise), so these must be pinned constants,
	// never left to drift on a better-auth dependency bump.
	describe("email-otp security parameters are pinned", () => {
		it("pins otpLength/expiresIn/allowedAttempts on the registered email-otp plugin", () => {
			const runtime = authRuntime({
				...baseOpts,
				callbacks: { sendOTP: vi.fn() },
			});
			const { auth } = runtime.context(
				{ ...validEnv },
				{ db: mockDb },
			) as unknown as {
				auth: {
					options: {
						plugins?: Array<{
							id?: string;
							options?: {
								otpLength?: number;
								expiresIn?: number;
								allowedAttempts?: number;
							};
						}>;
					};
				};
			};
			const emailOtpPlugin = (auth.options.plugins ?? []).find(
				(p) => p.id === "email-otp",
			);
			expect(emailOtpPlugin?.options).toMatchObject({
				otpLength: 6,
				expiresIn: 300,
				allowedAttempts: 3,
			});
		});
	});
});
