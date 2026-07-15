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

// WS2.4: `organization: true` wires better-auth's organization-plugin tables
// (organization/member/invitation) into the drizzleAdapter schema map, and the
// consumer migrates them by additionally re-exporting
// `@fcalell/plugin-auth/schema/organization` from `src/schema/index.ts`. This
// drives the real, emitted `.stack/worker.ts` under workerd: sign in via the
// email-OTP flow, then create an organization through the real auth handler,
// against a D1 migrated from our schema — mirroring what a real consumer's
// schema file looks like once they enable organizations. Pattern mirrors
// tests/integration/auth-rate-limit.miniflare.test.ts and
// tests/integration/worker-hardening.miniflare.test.ts (readOtp / cookie
// helpers).

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

const AUTH_CALLBACKS_FILE = `import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

const callbacks: AuthCallbacks = {
	sendOTP: async () => {},
};

export default callbacks;
`;

async function sendOtp(worker: MiniflareWorker, email: string) {
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

async function signIn(worker: MiniflareWorker, email: string, otp: string) {
	return worker.dispatch("https://example.com/api/auth/sign-in/email-otp", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "https://example.com",
		},
		body: JSON.stringify({ email, otp }),
	});
}

afterAll(() => {
	teardownMiniflareWorkspace();
});

describe("organization: true — create an organization through the real auth handler", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-organization-create",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-organization-create" }),
				auth({ secretVar: "AUTH_SECRET", organization: true }),
				api(),
			],
			seed: {
				"src/schema/index.ts":
					'export * from "@fcalell/plugin-auth/schema";\n' +
					'export * from "@fcalell/plugin-auth/schema/organization";\n',
				"src/worker/plugins/auth.ts": AUTH_CALLBACKS_FILE,
			},
			// Default rate limits are generous enough for the single sign-in round
			// trip this test performs (no STACK_DEV needed).
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("signs in via email-OTP, then creates an organization; rows land in D1", async () => {
		const email = "org-owner@example.com";

		const sendRes = await sendOtp(worker, email);
		expect(sendRes.status).toBe(200);
		const otp = await readOtp(worker.d1, email);

		const signInRes = await signIn(worker, email, otp);
		expect(signInRes.status).toBe(200);
		const tokenCookie = findCookie(cookiePairs(signInRes), ".session_token");
		expect(tokenCookie).toBeDefined();

		const createRes = await worker.dispatch(
			"https://example.com/api/auth/organization/create",
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "https://example.com",
					cookie: tokenCookie as string,
				},
				body: JSON.stringify({ name: "Acme Inc", slug: "acme-inc" }),
			},
		);
		expect(createRes.status).toBe(200);
		const created = (await createRes.json()) as {
			id?: string;
			slug?: string;
			name?: string;
		};
		expect(created).toMatchObject({ name: "Acme Inc", slug: "acme-inc" });

		const orgRow = await worker.d1
			.prepare("SELECT name, slug FROM organization WHERE slug = ?")
			.bind("acme-inc")
			.first<{ name: string; slug: string }>();
		expect(orgRow).toEqual({ name: "Acme Inc", slug: "acme-inc" });

		const memberRow = await worker.d1
			.prepare(
				"SELECT role FROM member WHERE organization_id = (SELECT id FROM organization WHERE slug = ?)",
			)
			.bind("acme-inc")
			.first<{ role: string }>();
		expect(memberRow?.role).toBe("owner");
	});
});

describe("organization option disabled — no organization tables in the migrated D1", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-organization-disabled",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-organization-disabled" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
			seed: {
				"src/schema/index.ts": 'export * from "@fcalell/plugin-auth/schema";\n',
				"src/worker/plugins/auth.ts": AUTH_CALLBACKS_FILE,
			},
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("the consumer's migrated D1 has no organization/member/invitation tables", async () => {
		const rows = await worker.d1
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('organization', 'member', 'invitation')",
			)
			.all();
		expect(rows.results).toEqual([]);
	});

	it("POST /api/auth/organization/create 404s (organization plugin never registered)", async () => {
		const res = await worker.dispatch(
			"https://example.com/api/auth/organization/create",
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "https://example.com",
				},
				body: JSON.stringify({ name: "Acme Inc", slug: "acme-inc" }),
			},
		);
		expect(res.status).toBe(404);
	});
});
