import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { expo } from "@fcalell/plugin-expo";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	emitWorkerMiniflare,
	type MiniflareWorker,
	teardownMiniflareWorkspace,
} from "./miniflare-harness";

// WS4 — client version gate (docs/prd/backend-hardening.md), driven through
// the real emitted `.stack/worker.ts` under miniflare: plugin-expo's
// `versionGate` middleware — contributed to `api.slots.middlewareEntries` at
// `after-cors`/`order: 0` — must wall a stale native client with 426 before
// the request reaches the procedure, and must never let the blanket per-IP
// `/rpc` volume limiter (plugin-api's `RATE_LIMITER_RPC`, WS1.4) answer first
// with a confusing 429.

const SEED = {
	"src/schema/index.ts": "export const tables = {};\n",
	"src/worker/routes/testing.ts": `import { procedure } from "virtual:stack-procedure";

export const testing = {
	ping: procedure().handler(async () => ({ ok: true })),
};
`,
};

function versionGatePlugins(dbId: string) {
	return [
		cloudflare(),
		db({ dialect: "d1", databaseId: dbId }),
		expo({ minNativeBuild: { ios: 10, android: 10 } }),
		api(),
	] as const;
}

async function pingWithHeaders(
	worker: MiniflareWorker,
	headers: Record<string, string>,
): Promise<Response> {
	return worker.dispatch("https://example.com/rpc/testing/ping", {
		method: "POST",
		headers: {
			origin: "https://example.com",
			"content-type": "application/json",
			...headers,
		},
		body: JSON.stringify({ json: {} }),
	});
}

afterAll(() => {
	teardownMiniflareWorkspace();
});

describe("expo version gate: 426 on a below-floor native build", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "expo-version-gate",
			origins: ["https://example.com"],
			plugins: versionGatePlugins("mf-version-gate"),
			seed: SEED,
		});
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("walls a below-floor ios build with 426 UPGRADE_REQUIRED before it reaches the procedure", async () => {
		const res = await pingWithHeaders(worker, {
			"x-stack-client-build": "5",
			"x-stack-client-platform": "ios",
		});
		expect(res.status).toBe(426);
		expect(await res.json()).toEqual({
			code: "UPGRADE_REQUIRED",
			message: "A newer version of the app is required.",
		});
	});

	it("passes an at/above-floor build through to the procedure", async () => {
		const res = await pingWithHeaders(worker, {
			"x-stack-client-build": "20",
			"x-stack-client-platform": "ios",
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ json: { ok: true } });
	});

	it("fails open when the client sends no version headers", async () => {
		const res = await pingWithHeaders(worker, {});
		expect(res.status).toBe(200);
	});

	it('fails open on a non-integer build ("1.2.3")', async () => {
		const res = await pingWithHeaders(worker, {
			"x-stack-client-build": "1.2.3",
			"x-stack-client-platform": "ios",
		});
		expect(res.status).toBe(200);
	});

	it("fails open on an unrecognized platform", async () => {
		const res = await pingWithHeaders(worker, {
			"x-stack-client-build": "5",
			"x-stack-client-platform": "windows",
		});
		expect(res.status).toBe(200);
	});

	it("never walls /api/auth/* even with a below-floor build (a stranded user must re-auth)", async () => {
		const res = await worker.dispatch(
			"https://example.com/api/auth/get-session",
			{
				headers: {
					origin: "https://example.com",
					"x-stack-client-build": "1",
					"x-stack-client-platform": "ios",
				},
			},
		);
		expect(res.status).not.toBe(426);
	});

	// Regression: `startsWith("/api/auth")` also exempted `/api/authX`, a
	// path that merely shares the prefix but isn't the auth surface at all —
	// it must still get walled like any other below-floor request.
	it("walls /api/authX (prefix look-alike, not the real /api/auth surface) with a below-floor build", async () => {
		const res = await worker.dispatch("https://example.com/api/authX", {
			headers: {
				origin: "https://example.com",
				"x-stack-client-build": "5",
				"x-stack-client-platform": "ios",
			},
		});
		expect(res.status).toBe(426);
	});
});

describe("expo version gate: never answers 429 for a walled request", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "expo-version-gate-rate-limit",
			origins: ["https://example.com"],
			plugins: versionGatePlugins("mf-version-gate-rl"),
			seed: SEED,
			// The blanket per-IP `/rpc` limiter (plugin-api's RATE_LIMITER_RPC) is
			// exhausted on the very first passing request — miniflare's simulator
			// requires limit >= 1, so a "trips on second use" quota is the
			// smallest expressible.
			rateLimiters: { RATE_LIMITER_RPC: { limit: 1 } },
		});
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("a below-floor build still gets 426, not 429, once the rpc limiter's quota is exhausted", async () => {
		// Burn the RATE_LIMITER_RPC quota with a passing (non-gated) request.
		const warm = await pingWithHeaders(worker, {
			"x-stack-client-build": "20",
			"x-stack-client-platform": "ios",
		});
		expect(warm.status).toBe(200);

		// If the version gate ran after the rpc limiter, this would be 429 —
		// the gate must short-circuit the request before the limiter check.
		const res = await pingWithHeaders(worker, {
			"x-stack-client-build": "5",
			"x-stack-client-platform": "ios",
		});
		expect(res.status).toBe(426);
	});
});
