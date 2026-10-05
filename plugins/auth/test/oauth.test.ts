import assert from "node:assert/strict";
import {
	createHash,
	createPrivateKey,
	randomBytes,
	sign as signBytes,
} from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, mock, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { createTables } from "@fcalell/auth-testing";
import createWorker from "@fcalell/plugin-api/runtime";
import {
	and,
	eq,
	integer,
	sql,
	sqliteTable,
	text,
} from "@fcalell/plugin-db/orm";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import { symmetricDecrypt } from "better-auth/crypto";
import * as authSchema from "../src/schema/index.ts";
import * as oauthSchema from "../src/schema/oauth.ts";
import * as orgSchema from "../src/schema/organization.ts";
import { defineMembership, organization } from "../src/scope.ts";
import type { VerifiedAgent } from "../src/worker/index.ts";
import authRuntime, { type AuthRuntimeInput } from "../src/worker/index.ts";

const ORIGIN = "http://localhost";
const SECRET = "test-secret-at-least-32-characters-long";
const RESOURCE = `${ORIGIN}/mcp`;
const CLIENT = "https://client.acme-agent.com/oauth/client.json";
const REDIRECT = "http://127.0.0.1:33418/callback";
const CHALLENGE = `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/mcp", scope="mcp offline_access"`;

// A consumer whose members may expire: the membership predicate the grant
// read applies beside the tenancy's.
const membership = sqliteTable("membership", {
	memberId: text("member_id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
});
const unexpired = defineMembership(
	sql`not exists (select 1 from ${membership} where ${membership.memberId} = ${orgSchema.member.id} and ${membership.expiresAt} <= cast(unixepoch('subsecond') * 1000 as integer))`,
);
const schema = { ...authSchema, ...orgSchema, ...oauthSchema, membership };

afterEach(() => {
	mock.restoreAll();
	mock.timers.reset();
});

// The network a client's metadata document sits behind: the DoH answer for
// its host, and the document.
function stubNetwork(): void {
	mock.method(globalThis, "fetch", async (input: URL | string) => {
		const url = new URL(String(input));
		if (url.hostname === "cloudflare-dns.com") {
			const answer =
				url.searchParams.get("type") === "A"
					? {
							Answer: [
								{
									name: url.searchParams.get("name"),
									type: 1,
									data: "93.184.216.34",
								},
							],
						}
					: {};
			return Response.json({ Status: 0, ...answer });
		}
		assert.equal(url.href, CLIENT);
		return Response.json({
			client_id: CLIENT,
			client_name: "Acme agent",
			redirect_uris: [REDIRECT],
			token_endpoint_auth_method: "none",
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
		});
	});
}

interface Browser {
	cookies: Map<string, string>;
	send(path: string, init?: RequestInit): Promise<Response>;
}

interface Options {
	auth?: Partial<AuthRuntimeInput>;
	env?: Record<string, unknown>;
}

// The worker as the codegen composes it for a node consumer with `mcp` on,
// over a fresh database file holding Acme (Ada, Bob, Fay and Eve), Beta (Ada)
// and Cat, who belongs to none. Eve's membership expired yesterday.
async function setup(options: Options = {}) {
	const env: Record<string, unknown> = {
		DB_FILE: join(mkdtempSync(join(tmpdir(), "stack-oauth-")), "app.sqlite"),
		AUTH_SECRET: SECRET,
		APP_URL: ORIGIN,
		...options.env,
	};
	const codes: string[] = [];
	const authOptions: AuthRuntimeInput = {
		secretVar: "AUTH_SECRET",
		appUrlVar: "APP_URL",
		trustedOrigins: [ORIGIN],
		emailOtp: true,
		callbacks: { sendOTP: (payload) => void codes.push(payload.code) },
		organization: true,
		mcp: true,
		rateLimiter: {
			ip: { binding: "RATE_LIMITER_IP" },
			email: { binding: "RATE_LIMITER_EMAIL" },
			agent: { binding: "RATE_LIMITER_AGENT" },
		},
		scopes: { unexpired },
		...options.auth,
	};
	const db = dbRuntime({ fileVar: "DB_FILE", schema });
	const plugin = authRuntime(authOptions);
	const worker = createWorker({ cors: [ORIGIN] })
		.use(db)
		.use(plugin)
		.handler();
	const { db: client } = await db.context(env, {});
	await createTables(client, schema);
	const now = new Date();
	const day = 24 * 60 * 60 * 1000;
	for (const id of ["ada", "bob", "cat", "fay", "eve"]) {
		client
			.insert(authSchema.user)
			.values({ id, name: id, email: `${id}@example.com` })
			.run();
	}
	client
		.insert(orgSchema.organization)
		.values([
			{ id: "acme", name: "Acme", slug: "acme", createdAt: now },
			{ id: "beta", name: "Beta", slug: "beta", createdAt: now },
		])
		.run();
	client
		.insert(orgSchema.member)
		.values([
			{
				id: "m-ada",
				organizationId: "acme",
				userId: "ada",
				role: "owner",
				createdAt: now,
			},
			{
				id: "m-ada-b",
				organizationId: "beta",
				userId: "ada",
				role: "owner",
				createdAt: now,
			},
			{
				id: "m-bob",
				organizationId: "acme",
				userId: "bob",
				role: "member",
				createdAt: now,
			},
			{
				id: "m-fay",
				organizationId: "acme",
				userId: "fay",
				role: "member",
				createdAt: now,
			},
			{
				id: "m-eve",
				organizationId: "acme",
				userId: "eve",
				role: "member",
				createdAt: now,
			},
		])
		.run();
	client
		.insert(membership)
		.values([
			{ memberId: "m-fay", expiresAt: new Date(now.getTime() + day) },
			{ memberId: "m-eve", expiresAt: new Date(now.getTime() - day) },
		])
		.run();

	function browser(): Browser {
		const cookies = new Map<string, string>();
		return {
			cookies,
			async send(path, init = {}) {
				const headers = new Headers(init.headers);
				headers.set("origin", ORIGIN);
				if (cookies.size > 0) {
					headers.set(
						"cookie",
						[...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
					);
				}
				if (typeof init.body === "string" && !headers.has("content-type")) {
					headers.set("content-type", "application/json");
				}
				const response = await worker.fetch(
					new Request(`${ORIGIN}${path}`, { ...init, headers }),
					env,
					undefined,
				);
				for (const cookie of response.headers.getSetCookie()) {
					const pair = cookie.slice(0, cookie.indexOf(";"));
					const eq = pair.indexOf("=");
					cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
				}
				return response;
			},
		};
	}

	const context = async () =>
		(await plugin.context(env, { db: client })) as unknown as {
			oauth: {
				verify(request: Request): Promise<VerifiedAgent | Response>;
				revokeGrant(id: string): Promise<boolean>;
			};
			auth: { api: Record<string, unknown> };
		};

	return { env, client, codes, worker, browser, context, plugin };
}

type Fixture = Awaited<ReturnType<typeof setup>>;

// ── The authorization, step by step ─────────────────────────────────

function pkce() {
	const verifier = randomBytes(32).toString("base64url");
	return {
		verifier,
		challenge: createHash("sha256").update(verifier).digest("base64url"),
	};
}

function authorizeParams(
	challenge: string | null,
	extra: Record<string, string> = {},
): URLSearchParams {
	const params = new URLSearchParams({
		response_type: "code",
		client_id: CLIENT,
		redirect_uri: REDIRECT,
		scope: "mcp offline_access",
		state: "st",
		...(challenge
			? { code_challenge: challenge, code_challenge_method: "S256" }
			: {}),
		resource: RESOURCE,
		...extra,
	});
	// An empty resource is no resource: a token the verifier refuses.
	if (params.get("resource") === "") params.delete("resource");
	return params;
}

// Opens the authorization as the client's browser does; answers where the
// provider sent it, relative to the app.
async function authorize(
	b: Browser,
	challenge: string | null,
	options: { method?: "GET" | "POST"; extra?: Record<string, string> } = {},
): Promise<URL> {
	const params = authorizeParams(challenge, options.extra);
	const response =
		options.method === "POST"
			? await b.send("/api/auth/oauth2/authorize", {
					method: "POST",
					headers: { "content-type": "application/x-www-form-urlencoded" },
					body: params.toString(),
				})
			: await b.send(`/api/auth/oauth2/authorize?${params}`);
	assert.equal(response.status, 302, await response.text());
	return new URL(response.headers.get("location") ?? "", ORIGIN);
}

// A page URL's signed query, what the page attaches to its calls.
const signed = (url: URL) => url.search.slice(1);

async function pageAfter(response: Response): Promise<URL> {
	const text = await response.text();
	assert.equal(response.status, 200, text);
	const body = JSON.parse(text) as { redirect: true; url: string };
	assert.equal(body.redirect, true, text);
	return new URL(body.url, ORIGIN);
}

// Signs in by code, with the authorization's query when one is in flight, and
// answers the page the provider resumes to.
async function signIn(
	f: Fixture,
	b: Browser,
	email: string,
	url?: URL,
): Promise<Response> {
	f.codes.length = 0;
	const sentCode = await b.send("/api/auth/email-otp/send-verification-otp", {
		method: "POST",
		body: JSON.stringify({ email, type: "sign-in" }),
	});
	assert.equal(sentCode.status, 200, await sentCode.text());
	return b.send("/api/auth/sign-in/email-otp", {
		method: "POST",
		body: JSON.stringify({
			email,
			otp: f.codes[0],
			...(url ? { oauth_query: signed(url) } : {}),
		}),
	});
}

async function setActive(
	b: Browser,
	url: URL,
	body: Record<string, unknown>,
): Promise<Response> {
	return b.send("/api/auth/organization/set-active", {
		method: "POST",
		body: JSON.stringify({ ...body, oauth_query: signed(url) }),
	});
}

async function consent(
	b: Browser,
	url: URL,
	accept: boolean,
): Promise<Response> {
	return b.send("/api/auth/oauth2/consent", {
		method: "POST",
		body: JSON.stringify({ accept, oauth_query: signed(url) }),
	});
}

interface Tokens {
	accessToken: string;
	refreshToken: string;
	body: Record<string, unknown>;
}

async function exchange(
	b: Browser,
	callback: URL,
	verifier: string,
	resource = true,
): Promise<Tokens> {
	const code = callback.searchParams.get("code");
	assert.ok(code, callback.href);
	const response = await b.send("/api/auth/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT,
			client_id: CLIENT,
			code_verifier: verifier,
			...(resource ? { resource: RESOURCE } : {}),
		}).toString(),
	});
	const body = (await response.json()) as Record<string, unknown>;
	assert.equal(response.status, 200, JSON.stringify(body));
	return {
		accessToken: body.access_token as string,
		refreshToken: body.refresh_token as string,
		body,
	};
}

async function refresh(b: Browser, refreshToken: string): Promise<Response> {
	return b.send("/api/auth/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: CLIENT,
			resource: RESOURCE,
		}).toString(),
	});
}

// The whole authorization for a member: sign in when no session stands, choose
// the organization when asked, consent, exchange.
async function connect(
	f: Fixture,
	b: Browser,
	email: string,
	options: { organizationId?: string; resource?: boolean } = {},
): Promise<Tokens> {
	const { verifier, challenge } = pkce();
	let url = await authorize(b, challenge, {
		extra: options.resource === false ? { resource: "" } : {},
	});
	if (url.pathname === "/sign-in") {
		url = await pageAfter(await signIn(f, b, email, url));
	}
	if (url.pathname === "/connect/organization") {
		assert.ok(options.organizationId, "the member must choose");
		url = await pageAfter(
			await setActive(b, url, { organizationId: options.organizationId }),
		);
	}
	assert.equal(url.pathname, "/connect/consent");
	const callback = await pageAfter(await consent(b, url, true));
	return exchange(b, callback, verifier, options.resource !== false);
}

// The authorization codes issued so far: verification rows the provider
// writes for each.
function codesIssued(f: Fixture): number {
	return f.client
		.select()
		.from(authSchema.verification)
		.all()
		.filter((row) => row.value.includes("authorization_code")).length;
}

function grantRows(f: Fixture, userId: string, organizationId: string) {
	return f.client
		.select()
		.from(oauthSchema.oauthConsent)
		.where(
			and(
				eq(oauthSchema.oauthConsent.userId, userId),
				eq(oauthSchema.oauthConsent.referenceId, organizationId),
			),
		)
		.all();
}

function grantId(f: Fixture, userId: string, organizationId: string): string {
	const [row] = grantRows(f, userId, organizationId);
	assert.ok(row, `no grant for ${userId} in ${organizationId}`);
	return row.id;
}

async function verify(
	f: Fixture,
	headers: Record<string, string>,
): Promise<VerifiedAgent | Response> {
	return (await f.context()).oauth.verify(
		new Request(`${ORIGIN}/mcp`, { method: "POST", headers }),
	);
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

function claims(token: string): Record<string, unknown> {
	return JSON.parse(
		Buffer.from(token.split(".")[1] ?? "", "base64url").toString(),
	);
}

// A token signed with the stored key, for the refusals a real token cannot
// show: another audience, another `typ`, an elapsed lifetime, a missing scope.
async function mint(
	f: Fixture,
	grant: Record<string, unknown>,
	over: {
		header?: Record<string, unknown>;
		claims?: Record<string, unknown>;
	} = {},
): Promise<string> {
	const [key] = f.client.select().from(oauthSchema.jwks).all();
	assert.ok(key);
	const jwk = await symmetricDecrypt({
		key: SECRET,
		data: JSON.parse(key.privateKey),
	});
	const iat = Math.floor(Date.now() / 1000);
	const encode = (value: unknown) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	const input = `${encode({ typ: "at+jwt", alg: "EdDSA", kid: key.id, ...over.header })}.${encode(
		{
			iss: `${ORIGIN}/api/auth`,
			aud: RESOURCE,
			scope: "mcp offline_access",
			iat,
			exp: iat + 3600,
			...grant,
			...over.claims,
		},
	)}`;
	const signature = signBytes(
		null,
		Buffer.from(input),
		createPrivateKey({ key: JSON.parse(jwk), format: "jwk" }),
	);
	return `${input}.${signature.toString("base64url")}`;
}

function answerOf(result: VerifiedAgent | Response): Response {
	assert.ok(result instanceof Response, "expected a refusal");
	return result;
}

// ── Tests ───────────────────────────────────────────────────────────

test("discovery names the resource, the issuer and CIMD only", async () => {
	const f = await setup();
	const b = f.browser();
	const server = await b.send(
		"/.well-known/oauth-authorization-server/api/auth",
	);
	assert.equal(server.status, 200);
	const metadata = (await server.json()) as Record<string, unknown>;
	assert.equal(metadata.issuer, `${ORIGIN}/api/auth`);
	assert.equal(metadata.client_id_metadata_document_supported, true);
	assert.deepEqual(metadata.code_challenge_methods_supported, ["S256"]);
	assert.deepEqual(metadata.scopes_supported, ["mcp", "offline_access"]);
	assert.equal("registration_endpoint" in metadata, false);
	assert.deepEqual(metadata.grant_types_supported, [
		"authorization_code",
		"refresh_token",
	]);

	for (const path of [
		"/.well-known/oauth-protected-resource/mcp",
		"/.well-known/oauth-protected-resource",
	]) {
		const response = await b.send(path);
		assert.equal(response.status, 200, path);
		const resource = (await response.json()) as Record<string, unknown>;
		assert.equal(resource.resource, RESOURCE);
		assert.deepEqual(resource.authorization_servers, [`${ORIGIN}/api/auth`]);
		assert.deepEqual(resource.scopes_supported, ["mcp"]);
	}
});

test("a client known by its metadata document connects", async () => {
	stubNetwork();
	const f = await setup();
	const b = f.browser();
	const tokens = await connect(f, b, "bob@example.com");

	const header = JSON.parse(
		Buffer.from(tokens.accessToken.split(".")[0] ?? "", "base64url").toString(),
	) as { typ: string };
	assert.equal(header.typ, "at+jwt");
	const payload = claims(tokens.accessToken);
	assert.equal(payload.aud, RESOURCE);
	assert.equal(payload.scope, "mcp offline_access");
	assert.equal(payload.organization_id, "acme");
	assert.equal(payload.sub, "bob");
	assert.equal(payload.azp, CLIENT);
	assert.equal((payload.exp as number) - (payload.iat as number), 3600);
	assert.ok(tokens.refreshToken);
	assert.equal("id_token" in tokens.body, false);
	assert.equal(tokens.body.token_type, "Bearer");
});

test("the doors the design closes stay closed", async () => {
	stubNetwork();
	const f = await setup();
	const b = f.browser();

	const registered = await b.send("/api/auth/oauth2/register", {
		method: "POST",
		body: JSON.stringify({ redirect_uris: [REDIRECT], client_name: "Rogue" }),
	});
	assert.ok(registered.status >= 400, String(registered.status));

	// An authorization with no code challenge, and one asking for `openid`,
	// answer the client an error at its redirect.
	for (const [challenge, extra, error] of [
		[null, {}, "invalid_request"],
		[pkce().challenge, { scope: "openid mcp" }, "invalid_scope"],
	] as const) {
		const url = await authorize(b, challenge, { extra });
		assert.equal(`${url.origin}${url.pathname}`, REDIRECT, url.href);
		assert.equal(url.searchParams.get("error"), error, url.href);
	}

	const credentials = await b.send("/api/auth/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "client_credentials",
			client_id: CLIENT,
		}).toString(),
	});
	assert.equal(credentials.status, 400);
	assert.equal(
		((await credentials.json()) as { error: string }).error,
		"unsupported_grant_type",
	);

	// A member's session reaches no client management, no session JWT and no
	// consent listing.
	const tokens = await connect(f, b, "bob@example.com");
	assert.ok(b.cookies.size > 0);
	const created = await b.send("/api/auth/oauth2/create-client", {
		method: "POST",
		body: JSON.stringify({ redirect_uris: [REDIRECT] }),
	});
	assert.equal(created.status, 401);
	assert.equal((await b.send("/api/auth/token")).status, 404);
	for (const [method, path] of [
		["GET", "/api/auth/oauth2/get-consents"],
		["GET", "/api/auth/oauth2/get-consent?id=x"],
		["POST", "/api/auth/oauth2/update-consent"],
		["POST", "/api/auth/oauth2/delete-consent"],
	] as const) {
		const response = await b.send(path, {
			method,
			...(method === "POST" ? { body: JSON.stringify({ id: "x" }) } : {}),
		});
		assert.equal(response.status, 404, path);
	}

	// An access token is no session.
	const session = await f
		.browser()
		.send("/api/auth/get-session", { headers: bearer(tokens.accessToken) });
	assert.equal(await session.json(), null);
});

test("a member chooses an organization and consents each time", async () => {
	stubNetwork();
	const f = await setup();

	// Ada belongs to two: after signing in she is sent to choose; by id, by
	// slug, and the already active one each answer the consent page.
	const ada = f.browser();
	const first = pkce();
	let url = await authorize(ada, first.challenge);
	assert.equal(url.pathname, "/sign-in");
	url = await pageAfter(await signIn(f, ada, "ada@example.com", url));
	assert.equal(url.pathname, "/connect/organization");
	assert.equal(
		(await pageAfter(await setActive(ada, url, { organizationId: "acme" })))
			.pathname,
		"/connect/consent",
	);
	assert.equal(
		(await pageAfter(await setActive(ada, url, { organizationSlug: "beta" })))
			.pathname,
		"/connect/consent",
	);
	// Beta is active now: choosing it again resumes to consent as well.
	const again = await pageAfter(
		await setActive(ada, url, { organizationId: "beta" }),
	);
	assert.equal(again.pathname, "/connect/consent");
	const callback = await pageAfter(await consent(ada, again, true));
	const tokens = await exchange(ada, callback, first.verifier);
	assert.equal(claims(tokens.accessToken).organization_id, "beta");

	// With the grant standing, a second authorization asks the choice and then
	// consent again, by GET and by POST, and still issues a code.
	for (const method of ["GET", "POST"] as const) {
		const second = pkce();
		const choice = await authorize(ada, second.challenge, { method });
		assert.equal(choice.pathname, "/connect/organization", method);
		const page = await pageAfter(
			await setActive(ada, choice, { organizationId: "beta" }),
		);
		assert.equal(page.pathname, "/connect/consent", method);
		const code = await pageAfter(await consent(ada, page, true));
		assert.ok(code.searchParams.get("code"), `${method} ${code.href}`);
		assert.equal(`${code.origin}${code.pathname}`, REDIRECT);
	}

	// A one-organization member skips the choice, but not consent.
	const bob = f.browser();
	await connect(f, bob, "bob@example.com");
	for (const method of ["GET", "POST"] as const) {
		const second = pkce();
		const page = await authorize(bob, second.challenge, { method });
		assert.equal(page.pathname, "/connect/consent", method);
		const code = await pageAfter(await consent(bob, page, true));
		assert.ok(code.searchParams.get("code"), method);
	}

	// A member of none lands on the choice page; Deny answers the client
	// `access_denied`, and allowing issues nothing.
	const cat = f.browser();
	const third = pkce();
	let page = await authorize(cat, third.challenge);
	page = await pageAfter(await signIn(f, cat, "cat@example.com", page));
	assert.equal(page.pathname, "/connect/organization");
	const denied = await pageAfter(await consent(cat, page, false));
	assert.equal(`${denied.origin}${denied.pathname}`, REDIRECT);
	assert.equal(denied.searchParams.get("error"), "access_denied");
	assert.equal(denied.searchParams.has("code"), false);
	const refused = await consent(cat, page, true);
	assert.equal(refused.status, 403);
	assert.equal(
		((await refused.json()) as { code: string }).code,
		"ORGANIZATION_NOT_RESOLVED",
	);

	// An organization the predicate refuses, one that is unknown, a null one
	// and none at all are refused alike, and no code issues.
	// Outside an authorization the choice is the member's own: nothing is
	// refused.
	const plain = await ada.send("/api/auth/organization/set-active", {
		method: "POST",
		body: JSON.stringify({ organizationId: null }),
	});
	assert.equal(plain.status, 200, await plain.text());

	const codesBefore = codesIssued(f);
	const eve = f.browser();
	let eveUrl = await authorize(eve, pkce().challenge);
	eveUrl = await pageAfter(await signIn(f, eve, "eve@example.com", eveUrl));
	assert.equal(eveUrl.pathname, "/connect/organization");
	for (const body of [
		{ organizationId: "acme" },
		{ organizationSlug: "acme" },
		{ organizationId: "nowhere" },
		{ organizationId: null },
		{},
	]) {
		const response = await setActive(eve, eveUrl, body);
		assert.equal(response.status, 403, JSON.stringify(body));
		assert.equal(
			((await response.json()) as { code: string }).code,
			"ORGANIZATION_NOT_RESOLVED",
			JSON.stringify(body),
		);
	}
	assert.equal(codesIssued(f), codesBefore);
});

test("a consent's scopes read back as the list better-auth wrote", async () => {
	stubNetwork();
	const f = await setup();
	await connect(f, f.browser(), "ada@example.com", { organizationId: "acme" });
	const [row] = grantRows(f, "ada", "acme");
	assert.ok(row);
	// Stored once-encoded, as better-auth's adapter reads it.
	assert.equal(row.scopes, '["mcp","offline_access"]');
	assert.deepEqual(oauthSchema.scopesOf(row.scopes), ["mcp", "offline_access"]);
});

test("verify answers the member in the grant's organization", async () => {
	stubNetwork();
	const f = await setup();
	const tokens = await connect(f, f.browser(), "ada@example.com", {
		organizationId: "acme",
	});
	const verified = await verify(f, bearer(tokens.accessToken));
	assert.ok(!(verified instanceof Response));
	assert.equal(verified.user.agent, true);
	assert.equal(verified.user.id, "ada");
	assert.equal(verified.session.id, grantId(f, "ada", "acme"));
	assert.equal("token" in verified.session, false);
	assert.equal(verified.session.activeOrganizationId, "acme");
	assert.equal(verified.member.id, "m-ada");
	assert.equal(verified.member.organizationId, "acme");
	assert.deepEqual(verified.grant, {
		id: grantId(f, "ada", "acme"),
		clientId: CLIENT,
		organizationId: "acme",
		scopes: ["mcp", "offline_access"],
	});
	assert.equal(
		verified.session.expiresAt.getTime() - verified.session.createdAt.getTime(),
		3600 * 1000,
	);
	// Ada is a member of Beta too: the pinned tenancy resolves Acme only.
	assert.ok(await verified.tenancy.resolve(organization, "acme", "ada"));
	assert.equal(
		await verified.tenancy.resolve(organization, "beta", "ada"),
		null,
	);
	assert.equal(
		await verified.tenancy.bySlug(organization, "beta", undefined, "ada"),
		null,
	);
	assert.ok(
		await verified.tenancy.bySlug(organization, "acme", undefined, "ada"),
	);
});

test("verify refuses all but a standing grant's token", async () => {
	stubNetwork();
	const limited = new Map<string, number>();
	const f = await setup({
		env: {
			RATE_LIMITER_AGENT: {
				async limit({ key }: { key: string }) {
					const count = (limited.get(key) ?? 0) + 1;
					limited.set(key, count);
					return { success: count <= 120 };
				},
			},
		},
	});
	const b = f.browser();
	const good = await connect(f, b, "fay@example.com");
	const grant = {
		sub: "fay",
		azp: CLIENT,
		client_id: CLIENT,
		organization_id: "acme",
	};
	const expectChallenge = (response: Response, label: string) => {
		assert.equal(response.status, 401, label);
		assert.equal(response.headers.get("www-authenticate"), CHALLENGE, label);
	};

	const ok = await verify(f, bearer(good.accessToken));
	assert.ok(!(ok instanceof Response));

	expectChallenge(answerOf(await verify(f, {})), "no bearer");
	expectChallenge(
		answerOf(
			await verify(f, {
				cookie: [...b.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
			}),
		),
		"a cookie alone",
	);
	const past = Math.floor(Date.now() / 1000) - 7200;
	expectChallenge(
		answerOf(
			await verify(
				f,
				bearer(
					await mint(f, grant, { claims: { iat: past, exp: past + 3600 } }),
				),
			),
		),
		"an expired token",
	);
	expectChallenge(
		answerOf(
			await verify(
				f,
				bearer(await mint(f, grant, { claims: { aud: `${ORIGIN}/other` } })),
			),
		),
		"another audience",
	);
	expectChallenge(
		answerOf(
			await verify(f, bearer(await mint(f, grant, { header: { typ: "JWT" } }))),
		),
		"another typ",
	);
	expectChallenge(
		answerOf(await verify(f, bearer("opaque-token-with-no-dots"))),
		"an opaque token",
	);
	expectChallenge(
		answerOf(await verify(f, bearer("not.a.jwt"))),
		"a malformed token",
	);
	expectChallenge(
		answerOf(await verify(f, { authorization: `Basic ${good.accessToken}` })),
		"a non-Bearer scheme",
	);
	expectChallenge(
		answerOf(
			await verify(
				f,
				bearer(await mint(f, { ...grant, organization_id: "beta" })),
			),
		),
		"a grant that does not stand",
	);

	// A token without `mcp` is not enough.
	const noScope = answerOf(
		await verify(
			f,
			bearer(await mint(f, grant, { claims: { scope: "offline_access" } })),
		),
	);
	assert.equal(noScope.status, 403);
	assert.match(
		noScope.headers.get("www-authenticate") ?? "",
		/^Bearer error="insufficient_scope", scope="mcp", resource_metadata="[^"]+", error_description="[^"]+"$/,
	);

	// A bearer token sent as DPoP is a DPoP challenge.
	const dpop = answerOf(
		await verify(f, { authorization: `DPoP ${good.accessToken}` }),
	);
	assert.equal(dpop.status, 401);
	assert.match(
		dpop.headers.get("www-authenticate") ?? "",
		/^DPoP error="invalid_token", error_description="[^"]+", algs="[^"]+"$/,
	);

	// The member's membership expired: the grant stands, the token is refused.
	f.client
		.update(membership)
		.set({ expiresAt: new Date(Date.now() - 1000) })
		.where(eq(membership.memberId, "m-fay"))
		.run();
	expectChallenge(
		answerOf(await verify(f, bearer(good.accessToken))),
		"an expired external member",
	);
	f.client
		.update(membership)
		.set({ expiresAt: new Date(Date.now() + 86_400_000) })
		.where(eq(membership.memberId, "m-fay"))
		.run();
	assert.ok(!((await verify(f, bearer(good.accessToken))) instanceof Response));

	// Revoked, the token is refused.
	assert.equal(
		await (await f.context()).oauth.revokeGrant(grantId(f, "fay", "acme")),
		true,
	);
	expectChallenge(
		answerOf(await verify(f, bearer(good.accessToken))),
		"a revoked grant",
	);
	assert.equal(
		await (await f.context()).oauth.revokeGrant("no-such-grant"),
		false,
	);

	// The 121st call of a grant in a minute is `429`, and the limiter's key is
	// the grant's id.
	const second = await connect(f, b, "fay@example.com");
	const id = grantId(f, "fay", "acme");
	limited.clear();
	for (let call = 1; call <= 120; call++) {
		assert.ok(
			!((await verify(f, bearer(second.accessToken))) instanceof Response),
			String(call),
		);
	}
	assert.deepEqual([...limited.keys()], [id]);
	const over = answerOf(await verify(f, bearer(second.accessToken)));
	assert.equal(over.status, 429);
});

test("the agent limiter is skipped under dev mode", async () => {
	stubNetwork();
	let calls = 0;
	const f = await setup({
		env: {
			STACK_DEV: "1",
			RATE_LIMITER_AGENT: {
				async limit() {
					calls++;
					return { success: false };
				},
			},
		},
	});
	const tokens = await connect(f, f.browser(), "bob@example.com");
	assert.ok(
		!((await verify(f, bearer(tokens.accessToken))) instanceof Response),
	);
	assert.equal(calls, 0);
});

test("refresh rotates and revocation ends it", async () => {
	stubNetwork();
	const f = await setup();
	const b = f.browser();
	const first = await connect(f, b, "bob@example.com");
	const id = grantId(f, "bob", "acme");

	const rotated = await refresh(b, first.refreshToken);
	assert.equal(rotated.status, 200);
	const pair = (await rotated.json()) as {
		access_token: string;
		refresh_token: string;
	};
	assert.notEqual(pair.refresh_token, first.refreshToken);
	assert.ok(
		!((await verify(f, bearer(pair.access_token))) instanceof Response),
	);
	assert.equal(claims(pair.access_token).organization_id, "acme");

	// The old token inside the reuse window answers the same pair.
	const replay = await refresh(b, first.refreshToken);
	assert.equal(replay.status, 200);
	assert.deepEqual(await replay.json(), pair);

	// Revoked, the next call is refused and the refresh is `invalid_grant`.
	const { oauth } = await f.context();
	assert.equal(await oauth.revokeGrant(id), true);
	assert.equal(
		answerOf(await verify(f, bearer(pair.access_token))).status,
		401,
	);
	const gone = await refresh(b, pair.refresh_token);
	assert.equal(gone.status, 400);
	assert.equal(
		((await gone.json()) as { error: string }).error,
		"invalid_grant",
	);

	// Reconnecting the same client to the same organization starts a new grant:
	// the pre-revoke tokens stay dead.
	await sleep(1100);
	const second = await connect(f, b, "bob@example.com");
	assert.ok(
		!((await verify(f, bearer(second.accessToken))) instanceof Response),
	);
	assert.equal(
		answerOf(await verify(f, bearer(pair.access_token))).status,
		401,
	);
	assert.equal(
		answerOf(await verify(f, bearer(first.accessToken))).status,
		401,
	);
	const old = await refresh(b, pair.refresh_token);
	assert.equal(
		((await old.json()) as { error: string }).error,
		"invalid_grant",
	);

	// A second connection under the standing grant leaves the first's refresh
	// token refreshing.
	const third = await connect(f, b, "bob@example.com");
	assert.notEqual(third.refreshToken, second.refreshToken);
	assert.equal((await refresh(b, second.refreshToken)).status, 200);
	assert.equal((await refresh(b, third.refreshToken)).status, 200);
});

// The rows a grant leaves in an organization, of every kind a removal ends.
function leftIn(f: Fixture, organizationId: string) {
	const where = (table: { referenceId: never }) =>
		eq(table.referenceId, organizationId);
	return {
		consents: f.client
			.select()
			.from(oauthSchema.oauthConsent)
			.where(where(oauthSchema.oauthConsent as never))
			.all().length,
		refresh: f.client
			.select()
			.from(oauthSchema.oauthRefreshToken)
			.where(where(oauthSchema.oauthRefreshToken as never))
			.all().length,
		access: f.client
			.select()
			.from(oauthSchema.oauthAccessToken)
			.where(where(oauthSchema.oauthAccessToken as never))
			.all().length,
	};
}

test("removing a member deletes their grants there", async () => {
	stubNetwork();
	const f = await setup();

	// Two connections of one grant: one with a resource (a JWT) and one
	// without (an opaque access-token row), so every kind of row exists.
	async function grantTo(email: string, id: string, org: string) {
		const b = f.browser();
		const jwt = await connect(f, b, email, { organizationId: org });
		await connect(f, b, email, { organizationId: org, resource: false });
		assert.ok(leftIn(f, org).consents >= 1);
		assert.ok(leftIn(f, org).refresh >= 1);
		assert.ok(leftIn(f, org).access >= 1);
		assert.ok(
			!((await verify(f, bearer(jwt.accessToken))) instanceof Response),
		);
		assert.equal(grantRows(f, id, org).length, 1);
		return jwt;
	}

	// An owner removes a member.
	const owner = f.browser();
	await signIn(f, owner, "ada@example.com");
	const bobToken = await grantTo("bob@example.com", "bob", "acme");
	const removed = await owner.send("/api/auth/organization/remove-member", {
		method: "POST",
		body: JSON.stringify({
			memberIdOrEmail: "bob@example.com",
			organizationId: "acme",
		}),
	});
	assert.equal(removed.status, 200, await removed.text());
	assert.deepEqual(leftIn(f, "acme"), { consents: 0, refresh: 0, access: 0 });
	assert.equal(
		answerOf(await verify(f, bearer(bobToken.accessToken))).status,
		401,
	);

	// A reconnect after they rejoin does not revive the old token.
	await sleep(1100);
	f.client
		.insert(orgSchema.member)
		.values({
			id: "m-bob-2",
			organizationId: "acme",
			userId: "bob",
			role: "member",
			createdAt: new Date(),
		})
		.run();
	const again = await connect(f, f.browser(), "bob@example.com");
	assert.ok(
		!((await verify(f, bearer(again.accessToken))) instanceof Response),
	);
	assert.equal(
		answerOf(await verify(f, bearer(bobToken.accessToken))).status,
		401,
	);

	// A member leaves.
	const bob = f.browser();
	await signIn(f, bob, "bob@example.com");
	const leaving = await grantTo("bob@example.com", "bob", "acme");
	const left = await bob.send("/api/auth/organization/leave", {
		method: "POST",
		body: JSON.stringify({ organizationId: "acme" }),
	});
	assert.equal(left.status, 200, await left.text());
	assert.deepEqual(
		{ ...leftIn(f, "acme"), bob: grantRows(f, "bob", "acme").length },
		{ consents: 0, refresh: 0, access: 0, bob: 0 },
	);
	assert.equal(
		answerOf(await verify(f, bearer(leaving.accessToken))).status,
		401,
	);

	// The organization is deleted.
	const betaToken = await grantTo("ada@example.com", "ada", "beta");
	const deleted = await owner.send("/api/auth/organization/delete", {
		method: "POST",
		body: JSON.stringify({ organizationId: "beta" }),
	});
	assert.equal(deleted.status, 200, await deleted.text());
	assert.deepEqual(leftIn(f, "beta"), { consents: 0, refresh: 0, access: 0 });
	assert.equal(
		answerOf(await verify(f, bearer(betaToken.accessToken))).status,
		401,
	);
});
