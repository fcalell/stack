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

// Smoke tests for the miniflare harness itself: the emitted worker boots
// under real workerd with real bindings (D1, rate limiters), not the mocked
// bindings worker-runtime.test.ts's tsx-subprocess harness uses. This is the
// bindings-capable sibling later PRD tests (415 guards, OTP flows, org
// creation, rate-limit 429s) build on.

afterAll(() => {
	teardownMiniflareWorkspace();
});

describe("basic worker boots under miniflare", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "basic-get",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-smoke" }),
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

	it("GET / returns 200 with { ok: true } from the default route", async () => {
		const res = await worker.dispatch("https://example.com/");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});
});

describe("auth worker boots against real D1", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-get-session",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-smoke-auth" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": 'export * from "@fcalell/plugin-auth/schema";\n',
				"src/worker/plugins/auth.ts": `import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

const callbacks: AuthCallbacks = {
	sendOTP: async () => {},
};

export default callbacks;
`,
			},
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("migrations create the better-auth tables in real D1", async () => {
		const res = await worker.d1
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
			.all();
		const tableNames = res.results.map((row) => (row as { name: string }).name);
		expect(tableNames).toEqual(
			expect.arrayContaining(["user", "session", "account", "verification"]),
		);
	});

	it("GET /api/auth/get-session with no cookie returns 200 with an empty session", async () => {
		const res = await worker.dispatch(
			"https://example.com/api/auth/get-session",
		);
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(JSON.parse(body || "null")).toBeNull();
	});
});
