import assert from "node:assert/strict";
import { subscribe, unsubscribe } from "node:diagnostics_channel";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import createWorker from "@fcalell/plugin-api/runtime";
import { createClient } from "@fcalell/plugin-db/sqlite";
import * as schema from "../schema/index.ts";
import * as oauthSchema from "../schema/oauth.ts";
import * as organizationSchema from "../schema/organization.ts";
import authRuntime, {
	type AuthRuntimeInput,
	type BetterAuthPlugin,
	createAuthEndpoint,
	customSession,
	setSessionCookie,
} from "./index.ts";
import { SESSION_ENDED_CHANNEL } from "./session-ended.ts";

// The auth runtime on the real api worker over a real sqlite file: the core
// tables by hand (the adapter issues no DDL), and a sign-in of the app's own,
// as `callbacks.plugins` carries one, that mints a session and its cookie
// with the helpers `./runtime` re-exports.

const LOOPBACK = "http://127.0.0.1:8788";
const SECRET = "a-test-secret-that-is-long-enough-for-better-auth";

const DDL = `
create table user (
	id text primary key, name text not null, email text not null unique,
	email_verified integer not null default 0, image text,
	created_at integer not null, updated_at integer not null
);
create table session (
	id text primary key, expires_at integer not null, token text not null unique,
	created_at integer not null, updated_at integer not null,
	ip_address text, user_agent text, user_id text not null references user(id) on delete cascade,
	active_organization_id text
);
create table account (
	id text primary key, account_id text not null, provider_id text not null,
	user_id text not null references user(id) on delete cascade,
	access_token text, refresh_token text, id_token text,
	access_token_expires_at integer, refresh_token_expires_at integer,
	scope text, password text, created_at integer not null, updated_at integer not null
);
create table passkey (
	id text primary key, name text, public_key text not null,
	user_id text not null references user(id) on delete cascade,
	credential_id text not null, counter integer not null, device_type text not null,
	backed_up integer not null, transports text, created_at integer, aaguid text
);
create table verification (
	id text primary key, identifier text not null, value text not null,
	expires_at integer not null, created_at integer not null, updated_at integer not null
);
create table organization (
	id text primary key, name text not null, slug text not null unique,
	logo text, created_at integer not null, metadata text
);
create table member (
	id text primary key, organization_id text not null, user_id text not null,
	role text not null, created_at integer not null
);
create table invitation (
	id text primary key, organization_id text not null, email text not null,
	role text, status text not null, expires_at integer not null,
	created_at integer not null, inviter_id text not null
);
create table oauth_client (
	id text primary key, client_id text not null unique, client_secret text,
	client_discovery_id text, disabled integer, skip_consent integer,
	enable_end_session integer, subject_type text, scopes text,
	client_credentials_scopes text, user_id text, created_at integer,
	updated_at integer, name text, uri text, icon text, contacts text, tos text,
	policy text, software_id text, software_version text, software_statement text,
	redirect_uris text not null, post_logout_redirect_uris text,
	backchannel_logout_uri text, backchannel_logout_session_required integer,
	token_endpoint_auth_method text, application_type text, jwks text,
	jwks_uri text, grant_types text, response_types text, require_pkce integer,
	dpop_bound_access_tokens integer, reference_id text, metadata text
);
create table oauth_consent (
	id text primary key, client_id text not null, user_id text, reference_id text,
	resources text, requested_user_info_claims text, scopes text not null,
	created_at integer, updated_at integer
);
create table oauth_refresh_token (
	id text primary key, token text not null unique, client_id text not null,
	session_id text, user_id text not null, reference_id text,
	authorization_code_id text, resources text, requested_user_info_claims text,
	expires_at integer, created_at integer, revoked integer, rotated_at integer,
	rotation_replay_response text, rotation_replay_expires_at integer,
	auth_time integer, confirmation text, scopes text not null
);
create table oauth_access_token (
	id text primary key, token text unique, client_id text not null,
	session_id text, user_id text, reference_id text, authorization_code_id text,
	resources text, requested_user_info_claims text, refresh_id text,
	expires_at integer, created_at integer, revoked integer, confirmation text,
	scopes text not null
);
`;

function database() {
	const file = join(mkdtempSync(join(tmpdir(), "stack-auth-")), "auth.sqlite");
	const db = createClient(file, {
		...schema,
		...oauthSchema,
		...organizationSchema,
	});
	(db as unknown as { $client: { exec(sql: string): void } }).$client.exec(DDL);
	return db;
}

const testSignIn = (): BetterAuthPlugin => ({
	id: "test-sign-in",
	endpoints: {
		testSignIn: createAuthEndpoint(
			"/test/sign-in",
			{ method: "POST" },
			async (ctx) => {
				const { internalAdapter } = ctx.context;
				const user = await internalAdapter.createUser(
					{
						email: `${crypto.randomUUID()}@example.com`,
						name: "Operator",
						emailVerified: true,
					},
					{ method: "test-sign-in" },
				);
				const session = await internalAdapter.createSession(user.id);
				await setSessionCookie(ctx, { session, user });
				return ctx.json({ sessionId: session.id });
			},
		),
	},
});

function authWorker(options: Partial<AuthRuntimeInput> = {}, db = database()) {
	return createWorker({ cors: [LOOPBACK] })
		.use({ name: "db", context: () => ({ db }) })
		.use(
			authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				emailOtp: false,
				trustedOrigins: [LOOPBACK],
				...options,
				callbacks: {
					...options.callbacks,
					plugins: [testSignIn(), ...(options.callbacks?.plugins ?? [])],
				},
			}),
		)
		.handler();
}

function post(
	worker: ReturnType<typeof authWorker>,
	env: Record<string, string>,
	path: string,
	headers: Record<string, string> = {},
) {
	const base = env.STACK_ORIGIN ?? LOOPBACK;
	return worker.fetch(
		new Request(`${base}/api/auth${path}`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: base,
				...headers,
			},
			body: "{}",
		}),
		env,
		undefined,
	);
}

// The `name=value` pairs a response's Set-Cookie headers hold, as a Cookie
// header.
function cookieOf(response: Response): string {
	return response.headers
		.getSetCookie()
		.map((line) => line.split(";")[0])
		.join("; ");
}

test("a session Better Auth deletes is announced for the Node target", async () => {
	const worker = authWorker();
	const env = { AUTH_SECRET: SECRET, APP_URL: LOOPBACK };
	const ended: unknown[] = [];
	const listen = (message: unknown) => ended.push(message);
	subscribe(SESSION_ENDED_CHANNEL, listen);
	try {
		const signIn = await post(worker, env, "/test/sign-in");
		assert.equal(signIn.status, 200);
		const { sessionId } = (await signIn.json()) as { sessionId: string };
		const signOut = await post(worker, env, "/sign-out", {
			cookie: cookieOf(signIn),
		});
		assert.equal(signOut.status, 200);
		assert.equal(ended.length, 1);
		assert.equal((ended[0] as { sessionId: string }).sessionId, sessionId);
	} finally {
		unsubscribe(SESSION_ENDED_CHANNEL, listen);
	}
});

const NETWORK = "https://stead.example";

test("on a listener's own origin auth signs in at that origin, Secure", async () => {
	const worker = authWorker();
	const loopback = { AUTH_SECRET: SECRET, APP_URL: LOOPBACK };
	const network = { ...loopback, STACK_ORIGIN: NETWORK };

	const local = await post(worker, loopback, "/test/sign-in");
	const [localCookie] = local.headers.getSetCookie();
	assert.match(localCookie ?? "", /^better-auth\.session_token=/);
	assert.doesNotMatch(localCookie ?? "", /;\s*Secure/i);

	const remote = await post(worker, network, "/test/sign-in");
	const [remoteCookie] = remote.headers.getSetCookie();
	assert.match(remoteCookie ?? "", /^__Secure-better-auth\.session_token=/);
	assert.match(remoteCookie ?? "", /;\s*Secure/i);

	// The listener's origin is trusted where it serves, and nowhere else.
	const signOut = await post(worker, network, "/sign-out", {
		cookie: cookieOf(remote),
	});
	assert.equal(signOut.status, 200);
	const elsewhere = await post(worker, loopback, "/sign-out", {
		origin: NETWORK,
		cookie: cookieOf(local),
	});
	assert.equal(elsewhere.status, 403);
});

test("a passkey on a listener's own origin is that origin's", async () => {
	const worker = authWorker({
		passkey: { rpID: "localhost", rpName: "Stead", origin: [LOOPBACK] },
	});
	const network = {
		AUTH_SECRET: SECRET,
		APP_URL: LOOPBACK,
		STACK_ORIGIN: NETWORK,
	};
	const signIn = await post(worker, network, "/test/sign-in");
	const options = await worker.fetch(
		new Request(`${NETWORK}/api/auth/passkey/generate-register-options`, {
			headers: { cookie: cookieOf(signIn), origin: NETWORK },
		}),
		network,
		undefined,
	);
	assert.equal(options.status, 200);
	const body = (await options.json()) as { rp: { id: string; name: string } };
	assert.deepEqual(body.rp, { id: "stead.example", name: "Stead" });
});

test("a session of the app's own shape reads through customSession from ./runtime", async () => {
	const worker = authWorker({
		callbacks: {
			plugins: [
				customSession(async ({ user, session }) => ({
					user,
					session,
					device: "this machine",
				})),
			],
		},
	});
	const env = { AUTH_SECRET: SECRET, APP_URL: LOOPBACK };
	const signIn = await post(worker, env, "/test/sign-in");
	const read = await worker.fetch(
		new Request(`${LOOPBACK}/api/auth/get-session`, {
			headers: { cookie: cookieOf(signIn) },
		}),
		env,
		undefined,
	);
	const body = (await read.json()) as { device?: string };
	assert.equal(body.device, "this machine");
});

// ---------- the grants of `mcp` ----------

type Database = ReturnType<typeof database>;

function sql(db: Database) {
	return (db as unknown as { $client: Sqlite }).$client;
}

interface Sqlite {
	exec(sql: string): void;
	prepare(sql: string): {
		run(...values: unknown[]): unknown;
		get(...values: unknown[]): unknown;
		all(...values: unknown[]): unknown[];
	};
}

// A member with a session, and the user id the session belongs to.
async function member(
	worker: ReturnType<typeof authWorker>,
	db: Database,
	env: Record<string, string>,
) {
	const signIn = await post(worker, env, "/test/sign-in");
	const { sessionId } = (await signIn.json()) as { sessionId: string };
	const row = sql(db)
		.prepare("select user_id from session where id = ?")
		.get(sessionId) as { user_id: string };
	return { cookie: cookieOf(signIn), userId: row.user_id };
}

function client(
	db: Database,
	clientId: string,
	name: string | null,
	uri: string | null,
) {
	sql(db)
		.prepare(
			"insert into oauth_client (id, client_id, client_secret, name, uri, redirect_uris) values (?, ?, 'a-secret', ?, ?, '[\"https://client.example/callback\"]')",
		)
		.run(clientId, clientId, name, uri);
}

// A grant: the consent and one access and one refresh token under it.
function grant(
	db: Database,
	id: string,
	clientId: string,
	userId: string,
	createdAt: number,
) {
	const handle = sql(db);
	handle
		.prepare(
			"insert into oauth_consent (id, client_id, user_id, reference_id, scopes, created_at, updated_at) values (?, ?, ?, 'org_a', '[\"mcp\",\"offline_access\"]', ?, ?)",
		)
		.run(id, clientId, userId, createdAt, createdAt);
	for (const kind of ["refresh", "access"]) {
		handle
			.prepare(
				`insert into oauth_${kind}_token (id, token, client_id, user_id, reference_id, scopes, created_at) values (?, ?, ?, ?, 'org_a', '["mcp"]', ?)`,
			)
			.run(`${id}_${kind}`, `${id}_${kind}_token`, clientId, userId, createdAt);
	}
}

function rows(db: Database, table: string, userId: string): number {
	return sql(db)
		.prepare(`select count(*) as n from ${table} where user_id = ?`)
		.all(userId)
		.map((row) => (row as { n: number }).n)[0] as number;
}

async function rpc(
	worker: ReturnType<typeof authWorker>,
	env: Record<string, string>,
	cookie: string,
	path: string,
	input?: unknown,
) {
	const response = await worker.fetch(
		new Request(`${LOOPBACK}/rpc/auth/oauth/grants/${path}`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: LOOPBACK,
				cookie,
			},
			body: JSON.stringify(input === undefined ? {} : { json: input }),
		}),
		env,
		undefined,
	);
	return { status: response.status, body: (await response.json()) as never };
}

function mcpWorker() {
	const db = database();
	return {
		db,
		worker: authWorker({ organization: true, mcp: true }, db),
		env: { AUTH_SECRET: SECRET, APP_URL: LOOPBACK },
	};
}

interface Listed {
	json: {
		id: string;
		name: string;
		uri: string | null;
		organizationId: string;
		scopes: string[];
		createdAt: string;
	}[];
}

test("auth.oauth.grants.list answers the caller's grants, newest first, with the client's public fields only", async () => {
	const { db, worker, env } = mcpWorker();
	const owner = await member(worker, db, env);
	client(
		db,
		"https://claude.example/client.json",
		"Claude",
		"https://claude.example",
	);
	client(db, "https://bare.example/client.json", null, null);
	grant(
		db,
		"consent_old",
		"https://claude.example/client.json",
		owner.userId,
		1_000,
	);
	grant(
		db,
		"consent_new",
		"https://bare.example/client.json",
		owner.userId,
		2_000,
	);

	const listed = await rpc(worker, env, owner.cookie, "list");
	assert.equal(listed.status, 200);
	const { json } = listed.body as Listed;
	assert.deepEqual(
		json.map((row) => row.id),
		["consent_new", "consent_old"],
	);
	assert.deepEqual(json[0], {
		id: "consent_new",
		name: "https://bare.example/client.json",
		uri: null,
		organizationId: "org_a",
		scopes: ["mcp", "offline_access"],
		createdAt: json[0]?.createdAt,
	});
	assert.equal(json[1]?.name, "Claude");
	assert.equal(json[1]?.uri, "https://claude.example");
	assert.doesNotMatch(JSON.stringify(listed.body), /a-secret|callback/);
});

test("auth.oauth.grants.list does not answer another member's grant", async () => {
	const { db, worker, env } = mcpWorker();
	const owner = await member(worker, db, env);
	const other = await member(worker, db, env);
	client(db, "https://claude.example/client.json", "Claude", null);
	grant(
		db,
		"consent_owner",
		"https://claude.example/client.json",
		owner.userId,
		1_000,
	);

	const listed = await rpc(worker, env, other.cookie, "list");
	assert.deepEqual((listed.body as Listed).json, []);
});

test("auth.oauth.grants.revoke ends the caller's grant, its tokens and its place in the list", async () => {
	const { db, worker, env } = mcpWorker();
	const owner = await member(worker, db, env);
	client(db, "https://claude.example/client.json", "Claude", null);
	grant(
		db,
		"consent_owner",
		"https://claude.example/client.json",
		owner.userId,
		1_000,
	);

	const revoked = await rpc(worker, env, owner.cookie, "revoke", {
		id: "consent_owner",
	});
	assert.equal(revoked.status, 200);
	assert.equal(rows(db, "oauth_consent", owner.userId), 0);
	assert.equal(rows(db, "oauth_access_token", owner.userId), 0);
	assert.equal(rows(db, "oauth_refresh_token", owner.userId), 0);
	const listed = await rpc(worker, env, owner.cookie, "list");
	assert.deepEqual((listed.body as Listed).json, []);
});

test("auth.oauth.grants.revoke answers another member's grant and an unknown id the same, and leaves the grant", async () => {
	const { db, worker, env } = mcpWorker();
	const owner = await member(worker, db, env);
	const other = await member(worker, db, env);
	client(db, "https://claude.example/client.json", "Claude", null);
	grant(
		db,
		"consent_owner",
		"https://claude.example/client.json",
		owner.userId,
		1_000,
	);

	const foreign = await rpc(worker, env, other.cookie, "revoke", {
		id: "consent_owner",
	});
	const unknown = await rpc(worker, env, other.cookie, "revoke", {
		id: "consent_nobody",
	});
	assert.equal(foreign.status, 404);
	assert.deepEqual(foreign, unknown);
	assert.equal(rows(db, "oauth_consent", owner.userId), 1);
	assert.equal(rows(db, "oauth_access_token", owner.userId), 1);
	assert.equal(rows(db, "oauth_refresh_token", owner.userId), 1);
});

test("auth.oauth.grants.* are absent without mcp", async () => {
	const db = database();
	const worker = authWorker({ organization: true }, db);
	const env = { AUTH_SECRET: SECRET, APP_URL: LOOPBACK };
	const owner = await member(worker, db, env);
	assert.equal((await rpc(worker, env, owner.cookie, "list")).status, 404);
	assert.equal(
		(await rpc(worker, env, owner.cookie, "revoke", { id: "consent_owner" }))
			.status,
		404,
	);
});
