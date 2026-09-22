import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	browser,
	CookieJar,
	createTables,
	mintSessionCookie,
	registerPasskey,
	SoftwareAuthenticator,
	signInWithPasskey,
} from "@fcalell/auth-testing";
import createWorker from "@fcalell/plugin-api/runtime";
import { sqliteTable, text } from "@fcalell/plugin-db/orm";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import * as authSchema from "../src/schema/index.ts";
import * as passkeySchema from "../src/schema/passkey.ts";
import authRuntime, { type AuthRuntimeInput } from "../src/worker/index.ts";

const ORIGIN = "http://localhost";

// The worker as the codegen composes it for a node consumer: the sqlite db
// runtime, then auth with literal options, over a fresh database file that
// holds the schema's tables and one user. The worker's CORS lists mirror
// auth's trusted origins, as both derive from the same slots.
async function setup(
	schema: Record<string, unknown>,
	auth: Partial<AuthRuntimeInput>,
	extraEnv: Record<string, string> = {},
) {
	const env = {
		DB_FILE: join(mkdtempSync(join(tmpdir(), "stack-auth-")), "app.sqlite"),
		AUTH_SECRET: "test-secret-at-least-32-characters-long",
		APP_URL: ORIGIN,
		...extraEnv,
	};
	const db = dbRuntime({ fileVar: "DB_FILE", schema });
	const authOptions: AuthRuntimeInput = {
		secretVar: "AUTH_SECRET",
		appUrlVar: "APP_URL",
		trustedOrigins: [ORIGIN],
		emailOtp: false,
		...auth,
	};
	const worker = createWorker({
		cors: authOptions.trustedOrigins ?? [],
		devCors: authOptions.devTrustedOrigins,
	})
		.use(db)
		.use(authRuntime(authOptions))
		.handler();

	const { db: client } = await db.context(env, {});
	await createTables(client, schema);
	client
		.insert(authSchema.user)
		.values({ id: "u1", name: "Ada", email: "ada@example.com" })
		.run();
	const { auth: instance } = await authRuntime(authOptions).context(env, {
		db: client,
	});

	const fetchPath = async (path: string, init?: RequestInit) =>
		worker.fetch(new Request(`${ORIGIN}${path}`, init), env, undefined);
	return { client, instance, fetchPath };
}

async function sessionUser(send: (path: string) => Promise<Response>) {
	const response = await send("/api/auth/get-session");
	const body = (await response.json()) as { user?: { email: string } } | null;
	return body?.user?.email;
}

test("a passkey registered on a session signs the user in", async () => {
	const schema = { ...authSchema, ...passkeySchema };
	const { client, instance, fetchPath } = await setup(schema, {
		passkey: { rpID: "localhost", rpName: "Stack", origin: ORIGIN },
	});
	const authenticator = await SoftwareAuthenticator.create("localhost", ORIGIN);

	const [cookieName, cookieValue] = await mintSessionCookie(instance, "u1");
	const signedIn = new CookieJar();
	signedIn.cookies.set(cookieName, cookieValue);
	const registration = await registerPasskey(
		browser(fetchPath, ORIGIN, signedIn),
		authenticator,
	);
	assert.equal(registration.status, 200, await registration.text());
	const rows = client.select().from(passkeySchema.passkey).all();
	assert.equal(rows.length, 1);
	assert.equal(rows[0]?.credentialID, authenticator.id);
	assert.equal(rows[0]?.userId, "u1");

	const fresh = new CookieJar();
	const send = browser(fetchPath, ORIGIN, fresh);
	const signIn = await signInWithPasskey(send, authenticator);
	assert.equal(signIn.status, 200, await signIn.text());
	assert.ok(fresh.cookies.has(cookieName));
	assert.equal(await sessionUser(send), "ada@example.com");
});

test("under STACK_DEV a passkey ceremony runs against the localhost dev origin", async () => {
	const schema = { ...authSchema, ...passkeySchema };
	// What codegen bakes for app.domain "example.com" with a dev frontend at
	// ORIGIN: production rpID and origins, the dev origins beside them.
	const { client, instance, fetchPath } = await setup(
		schema,
		{
			trustedOrigins: ["https://example.com"],
			devTrustedOrigins: [ORIGIN],
			passkey: {
				rpID: "example.com",
				rpName: "Stack",
				origin: ["https://example.com"],
				devOrigin: [ORIGIN],
			},
		},
		{ STACK_DEV: "1" },
	);
	const authenticator = await SoftwareAuthenticator.create("localhost", ORIGIN);

	const [cookieName, cookieValue] = await mintSessionCookie(instance, "u1");
	const signedIn = new CookieJar();
	signedIn.cookies.set(cookieName, cookieValue);
	const registration = await registerPasskey(
		browser(fetchPath, ORIGIN, signedIn),
		authenticator,
	);
	assert.equal(registration.status, 200, await registration.text());
	assert.equal(client.select().from(passkeySchema.passkey).all().length, 1);

	const send = browser(fetchPath, ORIGIN, new CookieJar());
	const signIn = await signInWithPasskey(send, authenticator);
	assert.equal(signIn.status, 200, await signIn.text());
	assert.equal(await sessionUser(send), "ada@example.com");
});

test("with email OTP on, a callbacks file without sendOTP refuses to build", async () => {
	await assert.rejects(setup(authSchema, { emailOtp: true, callbacks: {} }), {
		name: "MissingSendOtpError",
	});
});

// A consumer's own sign-in flow: one endpoint that records the mint in the
// consumer's own table and hands the user a session.
const mintLog = sqliteTable("mint_log", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
});

const mint = {
	id: "mint",
	schema: {
		mintLog: { fields: { userId: { type: "string", required: true } } },
	},
	endpoints: {
		mint: createAuthEndpoint(
			"/mint",
			{ method: "POST", body: z.object({ userId: z.string() }) },
			async (ctx) => {
				const { userId } = ctx.body;
				await ctx.context.adapter.create({
					model: "mintLog",
					data: { userId },
				});
				const session = await ctx.context.internalAdapter.createSession(userId);
				const user = await ctx.context.internalAdapter.findUserById(userId);
				if (!user) throw new Error("no user");
				await setSessionCookie(ctx, { session, user });
				return ctx.json({ ok: true });
			},
		),
	},
} satisfies BetterAuthPlugin;

test("a consumer plugin from the callbacks file serves under /api/auth", async () => {
	const { client, fetchPath } = await setup(
		{ ...authSchema, mintLog },
		{ callbacks: { plugins: [mint] } },
	);

	const jar = new CookieJar();
	const send = browser(fetchPath, ORIGIN, jar);
	const response = await send("/api/auth/mint", {
		method: "POST",
		body: JSON.stringify({ userId: "u1" }),
	});
	assert.equal(response.status, 200, await response.text());
	assert.deepEqual(
		client.select({ userId: mintLog.userId }).from(mintLog).all(),
		[{ userId: "u1" }],
	);
	assert.equal(await sessionUser(send), "ada@example.com");
});
