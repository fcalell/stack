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

// Miniflare E2E coverage for docs/prd/backend-hardening.md WS1.1 (plugin-api
// /rpc content-type guard), WS1.2 (error logging), WS1.3 (waitUntil), and
// WS2.1/2.2 (plugin-auth cookieCache + OTP attempt cap) — driven through the
// real emitted `.stack/worker.ts` (and, for WS1.2/1.3, a real consumer
// `src/worker/routes/*.ts` importing `virtual:stack-procedure` exactly as
// plugin-api's README documents); assert behavior, not source strings, per
// .claude/playbooks/testing.md.
//
// WS1.2/1.3 fixtures a real route file the way a real consumer would author
// one:
//   import { procedure } from "virtual:stack-procedure";
//   import { ApiError } from "@fcalell/plugin-api/error";
// `virtual:stack-procedure` resolves via a tsconfig `paths` alias to the
// generated `.stack/procedure.ts` (see `miniflare-harness.ts`'s
// `writeProcedureTsconfig` + `bundleWorker`'s `tsconfig` option — esbuild
// reads `paths` from a real tsconfig.json natively). `ApiError` is imported
// from the `/error` subpath rather than the package root — the root export
// pulls in plugin-api's Node-only codegen graph, which doesn't bundle for
// workerd.

async function readOtp(
	d1: MiniflareWorker["d1"],
	email: string,
	type = "sign-in",
): Promise<string> {
	const identifier = `${type}-otp-${email.toLowerCase()}`;
	const row = await d1
		.prepare("SELECT value FROM verification WHERE identifier = ?")
		.bind(identifier)
		.first<{ value: string }>();
	if (!row) throw new Error(`No verification row for identifier ${identifier}`);
	// better-auth stores "<otp>:<attempts>" in plain text (default
	// `storeOTP: "plain"` — our runtime never overrides it).
	return row.value.slice(0, row.value.lastIndexOf(":"));
}

function cookiePairs(res: Response): string[] {
	return res.headers.getSetCookie().map((c) => c.split(";")[0] as string);
}

function findCookie(pairs: string[], suffix: string): string | undefined {
	return pairs.find((p) => p.split("=")[0]?.endsWith(suffix));
}

afterAll(() => {
	teardownMiniflareWorkspace();
});

// ---------------------------------------------------------------------------
// PRD 1.1 — CSRF content-type guard on /rpc
// ---------------------------------------------------------------------------

describe("rpc hardening: /rpc content-type guard", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "rpc-content-type-guard",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-hardening" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": "export const tables = {};\n",
			},
		});
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("rejects a POST to /rpc with no Content-Type with 415 UNSUPPORTED_MEDIA_TYPE", async () => {
		const res = await worker.dispatch("https://example.com/rpc/anything", {
			method: "POST",
		});
		expect(res.status).toBe(415);
		expect(await res.json()).toEqual({ code: "UNSUPPORTED_MEDIA_TYPE" });
	});

	it("the identical request with application/json passes the guard and reaches the RPC handler", async () => {
		const res = await worker.dispatch("https://example.com/rpc/anything", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ json: {} }),
		});
		// No consumer routes are registered in this fixture, so the RPC
		// handler resolves the request (past the 415 guard) and falls through
		// to the worker's own "no matching procedure" 404 — the guard's job
		// is only to gate on Content-Type, never to decide routing.
		expect(res.status).toBe(404);
		expect(await res.json()).toMatchObject({ code: "NOT_FOUND" });
	});

	// M4: a real client (browser fetch, oRPC client) commonly appends a
	// charset parameter; the guard must accept it, not just the bare token.
	it("the same request with a charset parameter (application/json; charset=utf-8) also passes the guard", async () => {
		const res = await worker.dispatch("https://example.com/rpc/anything", {
			method: "POST",
			headers: { "content-type": "application/json; charset=utf-8" },
			body: JSON.stringify({ json: {} }),
		});
		expect(res.status).toBe(404);
		expect(await res.json()).toMatchObject({ code: "NOT_FOUND" });
	});
});

// ---------------------------------------------------------------------------
// PRD 2.1 — cookieCache disabled for expo, enabled for web
// PRD 2.2 — OTP attempt cap (pinned allowedAttempts: 3)
// ---------------------------------------------------------------------------

function authFixturePlugins(expo: boolean, dbId: string) {
	return [
		cloudflare(),
		db({ dialect: "d1", databaseId: dbId }),
		auth({ secretVar: "AUTH_SECRET", expo }),
		api(),
	] as const;
}

const authSeed = {
	"src/schema/index.ts": 'export * from "@fcalell/plugin-auth/schema";\n',
	"src/worker/plugins/auth.ts": `import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

const callbacks: AuthCallbacks = {
	sendOTP: async () => {},
};

export default callbacks;
`,
};

async function sendOtp(
	worker: MiniflareWorker,
	email: string,
): Promise<Response> {
	return worker.dispatch(
		"https://example.com/api/auth/email-otp/send-verification-otp",
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://example.com",
			},
			body: JSON.stringify({ email, type: "sign-in" }),
		},
	);
}

async function signIn(
	worker: MiniflareWorker,
	email: string,
	otp: string,
): Promise<Response> {
	return worker.dispatch("https://example.com/api/auth/sign-in/email-otp", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "https://example.com",
		},
		body: JSON.stringify({ email, otp }),
	});
}

describe("auth hardening: cookieCache off for expo, on for web", () => {
	let webWorker: MiniflareWorker;
	let expoWorker: MiniflareWorker;

	beforeAll(async () => {
		webWorker = await emitWorkerMiniflare({
			label: "auth-cookiecache-web",
			origins: ["https://example.com"],
			plugins: authFixturePlugins(false, "mf-hardening-auth-web"),
			seed: authSeed,
		});
		await applyDrizzleMigrations(webWorker.cwd, webWorker.d1);

		expoWorker = await emitWorkerMiniflare({
			label: "auth-cookiecache-expo",
			origins: ["https://example.com"],
			plugins: authFixturePlugins(true, "mf-hardening-auth-expo"),
			seed: authSeed,
		});
		await applyDrizzleMigrations(expoWorker.cwd, expoWorker.d1);
	});

	afterAll(async () => {
		await webWorker.dispose();
		await expoWorker.dispose();
	});

	it("web (non-expo): sign-in sets a session_data cache cookie, and get-session resolves the session from only the token cookie", async () => {
		const email = "web-user@example.com";
		const sendRes = await sendOtp(webWorker, email);
		expect(sendRes.status).toBe(200);
		const otp = await readOtp(webWorker.d1, email);

		const signInRes = await signIn(webWorker, email, otp);
		expect(signInRes.status).toBe(200);

		const pairs = cookiePairs(signInRes);
		const tokenCookie = findCookie(pairs, ".session_token");
		const dataCookie = findCookie(pairs, ".session_data");
		expect(tokenCookie).toBeDefined();
		expect(dataCookie).toBeDefined();

		const sessionRes = await webWorker.dispatch(
			"https://example.com/api/auth/get-session",
			{ headers: { cookie: tokenCookie as string } },
		);
		expect(sessionRes.status).toBe(200);
		const session = (await sessionRes.json()) as {
			user?: { email?: string };
		} | null;
		expect(session?.user?.email).toBe(email);
	});

	it("expo: sign-in sets NO session_data cookie, and get-session with only session_token still resolves the session", async () => {
		const email = "expo-user@example.com";
		const sendRes = await sendOtp(expoWorker, email);
		expect(sendRes.status).toBe(200);
		const otp = await readOtp(expoWorker.d1, email);

		const signInRes = await signIn(expoWorker, email, otp);
		expect(signInRes.status).toBe(200);

		const pairs = cookiePairs(signInRes);
		const tokenCookie = findCookie(pairs, ".session_token");
		const dataCookie = findCookie(pairs, ".session_data");
		expect(tokenCookie).toBeDefined();
		expect(dataCookie).toBeUndefined();

		const sessionRes = await expoWorker.dispatch(
			"https://example.com/api/auth/get-session",
			{ headers: { cookie: tokenCookie as string } },
		);
		expect(sessionRes.status).toBe(200);
		const session = (await sessionRes.json()) as {
			user?: { email?: string };
		} | null;
		expect(session?.user?.email).toBe(email);
	});
});

describe("auth hardening: OTP attempt cap (pinned allowedAttempts: 3)", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-otp-cap",
			origins: ["https://example.com"],
			plugins: authFixturePlugins(false, "mf-hardening-otp-cap"),
			seed: authSeed,
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("invalidates the OTP after 3 wrong attempts; the 4th attempt with the CORRECT code is still rejected", async () => {
		const email = "otp-cap@example.com";
		const sendRes = await sendOtp(worker, email);
		expect(sendRes.status).toBe(200);
		const otp = await readOtp(worker.d1, email);
		const wrongOtp = otp === "000000" ? "111111" : "000000";

		for (let attempt = 0; attempt < 3; attempt++) {
			const res = await signIn(worker, email, wrongOtp);
			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.status).toBeLessThan(500);
		}

		const finalRes = await signIn(worker, email, otp);
		expect(finalRes.status).toBeGreaterThanOrEqual(400);
		expect(finalRes.status).toBeLessThan(500);
		const body = (await finalRes.json()) as { code?: string };
		expect(body.code).toBeDefined();

		// The session must never have been created.
		const pairs = cookiePairs(finalRes);
		expect(findCookie(pairs, ".session_token")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// PRD 1.2 — error logging: a non-ORPCError throw is logged + mapped to 500;
// an ORPCError throw is mapped to its status with no procedure-error log.
// ---------------------------------------------------------------------------

async function callRpc(
	worker: MiniflareWorker,
	path: string,
): Promise<Response> {
	return worker.dispatch(`https://example.com/rpc/${path}`, {
		method: "POST",
		headers: {
			origin: "https://example.com",
			"content-type": "application/json",
		},
		body: JSON.stringify({ json: {} }),
	});
}

const procedureErrorLogFixture = {
	"src/schema/index.ts": "export const tables = {};\n",
	"src/worker/routes/testing.ts": `import { procedure } from "virtual:stack-procedure";
import { ApiError } from "@fcalell/plugin-api/error";

export const testing = {
	boom: procedure().handler(async () => {
		throw new Error("boom");
	}),
	missing: procedure().handler(async () => {
		throw new ApiError("NOT_FOUND", { message: "nope" });
	}),
};
`,
};

describe("rpc hardening: procedure error logging (WS1.2)", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "rpc-procedure-error-logging",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-procedure-errors" }),
				api(),
			],
			seed: procedureErrorLogFixture,
		});
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("a non-ORPCError throw maps to 500 AND is logged on the worker console", async () => {
		const res = await callRpc(worker, "testing/boom");
		expect(res.status).toBe(500);
		expect(await res.json()).toMatchObject({
			json: { code: "INTERNAL_SERVER_ERROR" },
		});
		expect(worker.consoleOutput()).toContain(
			"[api] Unexpected procedure error",
		);
	});

	it("an ORPCError (ApiError) throw maps to its status with no procedure-error log", async () => {
		const before = worker.consoleOutput().length;
		const res = await callRpc(worker, "testing/missing");
		expect(res.status).toBe(404);
		expect(await res.json()).toMatchObject({ json: { code: "NOT_FOUND" } });
		const emitted = worker.consoleOutput().slice(before);
		expect(emitted).not.toContain("[api] Unexpected procedure error");
	});
});

// ---------------------------------------------------------------------------
// PRD 1.3 — executionCtx.waitUntil: the response returns before deferred work
// finishes; the deferred effect is observable afterward.
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntil<T>(
	fn: () => Promise<T | null | undefined>,
	options: { timeoutMs: number; intervalMs: number },
): Promise<T> {
	const deadline = Date.now() + options.timeoutMs;
	for (;;) {
		const result = await fn();
		if (result) return result;
		if (Date.now() >= deadline) {
			throw new Error(`pollUntil: timed out after ${options.timeoutMs}ms`);
		}
		await sleep(options.intervalMs);
	}
}

const waitUntilFixture = {
	"src/schema/index.ts": `import { sqliteTable, text } from "@fcalell/plugin-db/orm";
export const logs = sqliteTable("logs", {
	id: text("id").primaryKey(),
	value: text("value").notNull(),
});
`,
	"src/worker/routes/testing.ts": `import { procedure } from "virtual:stack-procedure";
import { logs } from "../../schema";

export const testing = {
	defer: procedure().handler(async ({ context }) => {
		context.executionCtx.waitUntil(
			(async () => {
				// Delay the write so the response reliably returns first — the
				// test polls for it afterward rather than racing a 0ms task.
				await new Promise((resolve) => setTimeout(resolve, 150));
				await context.db
					.insert(logs)
					.values({ id: "deferred-1", value: "done" });
			})(),
		);
		return { ok: true };
	}),
};
`,
};

describe("rpc hardening: executionCtx.waitUntil (WS1.3)", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "rpc-wait-until",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-wait-until" }),
				api(),
			],
			seed: waitUntilFixture,
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	async function readLog(): Promise<{ value: string } | null> {
		return worker.d1
			.prepare("SELECT value FROM logs WHERE id = ?")
			.bind("deferred-1")
			.first<{ value: string }>();
	}

	it("returns the response before the deferred write finishes, then the write lands", async () => {
		const res = await callRpc(worker, "testing/defer");
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ json: { ok: true } });

		// The response came back well before the procedure's 150ms delay —
		// the deferred write must not have landed yet.
		expect(await readLog()).toBeNull();

		const row = await pollUntil(readLog, { timeoutMs: 2000, intervalMs: 25 });
		expect(row.value).toBe("done");
	});
});
