import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { unpackAbility } from "@fcalell/plugin-auth/ability";
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

// ---------------------------------------------------------------------------
// WS6.2 helpers (docs/prd/backend-hardening.md): `auth.orgRules` + the
// `can:` procedure option, driven through the real emitted worker.
// ---------------------------------------------------------------------------

async function signInUser(
	worker: MiniflareWorker,
	email: string,
): Promise<string> {
	const sendRes = await sendOtp(worker, email);
	if (sendRes.status !== 200) {
		throw new Error(
			`sendOtp failed: ${sendRes.status} ${await sendRes.text()}`,
		);
	}
	const otp = await readOtp(worker.d1, email);
	const signInRes = await signIn(worker, email, otp);
	if (signInRes.status !== 200) {
		throw new Error(
			`signIn failed: ${signInRes.status} ${await signInRes.text()}`,
		);
	}
	const tokenCookie = findCookie(cookiePairs(signInRes), ".session_token");
	if (!tokenCookie) throw new Error("signIn: no .session_token cookie");
	return tokenCookie;
}

async function createOrg(
	worker: MiniflareWorker,
	cookie: string,
	name: string,
	slug: string,
): Promise<{ id: string; slug: string; name: string }> {
	const res = await worker.dispatch(
		"https://example.com/api/auth/organization/create",
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://example.com",
				cookie,
			},
			body: JSON.stringify({ name, slug }),
		},
	);
	if (res.status !== 200) {
		throw new Error(`createOrg failed: ${res.status} ${await res.text()}`);
	}
	// better-auth's createOrganization sets the caller's session
	// activeOrganizationId to the new org unless keepCurrentActiveOrganization
	// is passed — org: true procedures resolve against it immediately.
	return (await res.json()) as { id: string; slug: string; name: string };
}

// better-auth exposes no HTTP route for adding a member (`addMember` in
// crud-members.mjs is server-only, called via `auth.api.addMember(...)` --
// unreachable from a worker fetch), and it refuses to demote a lone owner
// ("You cannot leave the organization without an owner"). Insert the member
// row directly against the same migrated D1 the app talks to, then activate
// it through the real `/organization/set-active` endpoint (which does check
// membership via a DB read) -- the least-fake way to stand up a second,
// non-owner member for role-comparison assertions.
async function addAsMember(
	worker: MiniflareWorker,
	organizationId: string,
	userEmail: string,
): Promise<void> {
	const user = await worker.d1
		.prepare("SELECT id FROM user WHERE email = ?")
		.bind(userEmail)
		.first<{ id: string }>();
	if (!user) throw new Error(`no user row for email ${userEmail}`);
	await worker.d1
		.prepare(
			"INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, 'member', ?)",
		)
		.bind(crypto.randomUUID(), organizationId, user.id, Date.now())
		.run();
}

async function setActiveOrg(
	worker: MiniflareWorker,
	cookie: string,
	organizationId: string,
): Promise<void> {
	const res = await worker.dispatch(
		"https://example.com/api/auth/organization/set-active",
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://example.com",
				cookie,
			},
			body: JSON.stringify({ organizationId }),
		},
	);
	if (res.status !== 200) {
		throw new Error(`set-active failed: ${res.status} ${await res.text()}`);
	}
}

// Every `/rpc/*` procedure in this file's fixtures sends its input the way
// the real oRPC client wire format does (`{ json: <input> }`) and returns
// `{ json: <output> }` / `{ json: { code } }` on error — same envelope
// `tests/integration/worker-hardening.miniflare.test.ts` asserts against.
async function rpc(
	worker: MiniflareWorker,
	path: string,
	cookie: string,
	input: Record<string, unknown> = {},
): Promise<Response> {
	return worker.dispatch(`https://example.com/rpc/${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "https://example.com",
			cookie,
		},
		body: JSON.stringify({ json: input }),
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

// ---------------------------------------------------------------------------
// WS6.2 (docs/prd/backend-hardening.md): `auth.orgRules` (the framework-owned
// procedure at `ORG_RULES_PATH`) + the `can:` procedure option + `assertCan`
// against a `defineAbility`-built ability — all driven through the real
// emitted worker, a real migrated D1, and a real consumer route file the way
// worker-hardening.miniflare.test.ts's WS1.2/1.3 fixtures do.
// ---------------------------------------------------------------------------

const ORG_RULES_TESTING_ROUTE = `import { z } from "@fcalell/plugin-api/schema";
import { assertCan, defineAbility } from "@fcalell/plugin-auth/ability";
import { procedure } from "virtual:stack-procedure";

// Abstract (string-only) subject -- no row, no conditions, matches WS6.1's
// assertCan miniflare coverage.
type Subjects = { organization: never };

export const testing = {
	// FORBIDDEN when the ability denies, 200 when it allows -- driven by
	// \`input.allow\` so a single procedure exercises both branches.
	assertOrgUpdate: procedure({ auth: true })
		.input(z.object({ allow: z.boolean() }))
		.query(async ({ input }) => {
			const { can, build } = defineAbility<Subjects>();
			if (input.allow) can("update", "organization");
			assertCan(build(), "update", "organization");
			return { ok: true };
		}),

	// Same ability, cloaked: a denial reports NOT_FOUND instead of FORBIDDEN.
	assertOrgUpdateCloaked: procedure({ auth: true })
		.input(z.object({ allow: z.boolean() }))
		.query(async ({ input }) => {
			const { can, build } = defineAbility<Subjects>();
			if (input.allow) can("update", "organization");
			assertCan(build(), "update", "organization", { cloak: true });
			return { ok: true };
		}),

	// Real hasPermission path via the org-level \`can:\` gate.
	updateOrg: procedure({
		auth: true,
		org: true,
		can: ["update", "organization"],
	}).query(async () => ({ ok: true })),
};
`;

describe("auth.orgRules + can:/assertCan (WS6.2)", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "auth-org-rules",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-org-rules" }),
				auth({ secretVar: "AUTH_SECRET", organization: true }),
				api(),
			],
			seed: {
				"src/schema/index.ts":
					'export * from "@fcalell/plugin-auth/schema";\n' +
					'export * from "@fcalell/plugin-auth/schema/organization";\n',
				"src/worker/plugins/auth.ts": AUTH_CALLBACKS_FILE,
				"src/worker/routes/testing.ts": ORG_RULES_TESTING_ROUTE,
			},
		});
		await applyDrizzleMigrations(worker.cwd, worker.d1);
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("packs rules for an org owner that unpack into a granting ability, and a plain member into a denying one", async () => {
		const ownerCookie = await signInUser(worker, "org-rules-owner@example.com");
		const org = await createOrg(worker, ownerCookie, "Rules Co", "rules-co");

		const ownerRes = await rpc(worker, "auth/orgRules", ownerCookie);
		expect(ownerRes.status).toBe(200);
		const ownerBody = (await ownerRes.json()) as { json: { rules: unknown[] } };
		const ownerAbility = unpackAbility(
			// biome-ignore lint/suspicious/noExplicitAny: PackedRules<A> needs a concrete ability generic; the round-trip is what's under test.
			ownerBody.json.rules as any,
		);
		expect(ownerAbility.can("update", "organization")).toBe(true);

		const memberEmail = "org-rules-member@example.com";
		const memberCookie = await signInUser(worker, memberEmail);
		await addAsMember(worker, org.id, memberEmail);
		await setActiveOrg(worker, memberCookie, org.id);

		const memberRes = await rpc(worker, "auth/orgRules", memberCookie);
		expect(memberRes.status).toBe(200);
		const memberBody = (await memberRes.json()) as {
			json: { rules: unknown[] };
		};
		const memberAbility = unpackAbility(
			// biome-ignore lint/suspicious/noExplicitAny: same round-trip as above.
			memberBody.json.rules as any,
		);
		expect(memberAbility.can("update", "organization")).toBe(false);
	});

	it("returns { rules: [] } when the session has no active organization", async () => {
		const cookie = await signInUser(worker, "org-rules-no-org@example.com");

		const res = await rpc(worker, "auth/orgRules", cookie);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ json: { rules: [] } });
	});

	it("assertCan FORBIDDENs when the ability denies, and lets the handler run when it allows", async () => {
		const cookie = await signInUser(worker, "assert-can-user@example.com");

		const denied = await rpc(worker, "testing/assertOrgUpdate", cookie, {
			allow: false,
		});
		expect(denied.status).toBe(403);
		expect(await denied.json()).toMatchObject({ json: { code: "FORBIDDEN" } });

		const allowed = await rpc(worker, "testing/assertOrgUpdate", cookie, {
			allow: true,
		});
		expect(allowed.status).toBe(200);
		expect(await allowed.json()).toMatchObject({ json: { ok: true } });
	});

	it("assertCan with { cloak: true } returns NOT_FOUND instead of FORBIDDEN when denied", async () => {
		const cookie = await signInUser(worker, "assert-can-cloak@example.com");

		const denied = await rpc(worker, "testing/assertOrgUpdateCloaked", cookie, {
			allow: false,
		});
		expect(denied.status).toBe(404);
		expect(await denied.json()).toMatchObject({ json: { code: "NOT_FOUND" } });
	});

	it("a can:-gated procedure succeeds for the owner and FORBIDDENs for a plain member (real hasPermission path)", async () => {
		const ownerCookie = await signInUser(worker, "can-gate-owner@example.com");
		const org = await createOrg(worker, ownerCookie, "Gate Co", "gate-co");

		const asOwner = await rpc(worker, "testing/updateOrg", ownerCookie, {
			organizationId: org.id,
		});
		expect(asOwner.status).toBe(200);
		expect(await asOwner.json()).toMatchObject({ json: { ok: true } });

		const memberEmail = "can-gate-member@example.com";
		const memberCookie = await signInUser(worker, memberEmail);
		await addAsMember(worker, org.id, memberEmail);
		await setActiveOrg(worker, memberCookie, org.id);

		const asMember = await rpc(worker, "testing/updateOrg", memberCookie, {
			organizationId: org.id,
		});
		expect(asMember.status).toBe(403);
		expect(await asMember.json()).toMatchObject({
			json: { code: "FORBIDDEN" },
		});
	});
});
