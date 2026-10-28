import assert from "node:assert/strict";
import { subscribe, unsubscribe } from "node:diagnostics_channel";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import createWorker from "@fcalell/plugin-api/runtime";
import { createClient } from "@fcalell/plugin-db/sqlite";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as schema from "../schema/index.ts";
import authRuntime, {
	type AuthRuntimeInput,
	type BetterAuthPlugin,
} from "./index.ts";
import { SESSION_ENDED_CHANNEL } from "./session-ended.ts";

// The auth runtime on the real api worker over a real sqlite file: the core
// tables by hand (the adapter issues no DDL), and a sign-in of the app's own,
// as `callbacks.plugins` carries one, that mints a session and its cookie.

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
`;

function database() {
	const file = join(mkdtempSync(join(tmpdir(), "stack-auth-")), "auth.sqlite");
	const db = createClient(file, schema);
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

function authWorker(options: Partial<AuthRuntimeInput> = {}) {
	const db = database();
	return createWorker({ cors: [LOOPBACK] })
		.use({ name: "db", context: () => ({ db }) })
		.use(
			authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				emailOtp: false,
				trustedOrigins: [LOOPBACK],
				...options,
				callbacks: { plugins: [testSignIn()], ...options.callbacks },
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
