import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { type AddressInfo, createServer } from "node:net";
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
import { createProcedure } from "@fcalell/plugin-api/procedure";
import createWorker, { type AppBuilder } from "@fcalell/plugin-api/runtime";
import authRuntime from "@fcalell/plugin-auth/runtime";
import * as authSchema from "@fcalell/plugin-auth/schema";
import * as passkeySchema from "@fcalell/plugin-auth/schema/passkey";
import { sqliteTable, text } from "@fcalell/plugin-db/orm";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import { createNodeServer } from "../src/server/create-node-server.ts";

// The consumer's own table, beside the auth tables it re-exports.
const notes = sqliteTable("notes", {
	id: text("id").primaryKey(),
	body: text("body").notNull(),
});
const schema = { ...authSchema, ...passkeySchema, notes };

async function freePort(): Promise<number> {
	const probe = createServer();
	await new Promise<void>((resolve) => probe.listen(0, resolve));
	const { port } = probe.address() as AddressInfo;
	await new Promise((resolve) => probe.close(resolve));
	return port;
}

test("a node app signs in with a passkey and reads a SQLite row", async () => {
	const port = await freePort();
	const origin = `http://localhost:${port}`;
	const env = {
		DB_FILE: join(mkdtempSync(join(tmpdir(), "stack-node-")), "app.sqlite"),
		AUTH_SECRET: "test-secret-at-least-32-characters-long",
		APP_URL: origin,
	};
	const authOptions = {
		secretVar: "AUTH_SECRET",
		appUrlVar: "APP_URL",
		emailOtp: false,
		trustedOrigins: [origin],
		passkey: { rpID: "localhost", rpName: "Stack", origin },
	};

	// Composed as the codegen composes `.stack/worker.ts` and
	// `.stack/procedure.ts` for a node consumer with sqlite and passkeys.
	const chain = createWorker({
		prefix: "/rpc",
		envChecks: [{ name: "DB_FILE" }, { name: "AUTH_SECRET", minLength: 32 }],
	})
		.use(dbRuntime({ fileVar: "DB_FILE", schema }))
		.use(authRuntime(authOptions));
	type Context = typeof chain extends AppBuilder<infer C> ? C : never;
	const procedure = createProcedure<Context, Record<never, never>, "notes">();
	const worker = chain.handler({
		notes: {
			list: procedure({ auth: true, reads: ["notes"] }).query(({ context }) =>
				context.db.select().from(notes).all(),
			),
		},
	});

	const server = createNodeServer({
		port,
		worker,
		workerPaths: ["/rpc", "/api/auth"],
		env,
		log: { info: () => {}, error: console.error },
	});
	await server.start();
	try {
		const { db } = await dbRuntime({ fileVar: "DB_FILE", schema }).context(
			env,
			{},
		);
		await createTables(db, schema);
		db.insert(authSchema.user)
			.values({ id: "u1", name: "Ada", email: "ada@example.com" })
			.run();
		db.insert(notes).values({ id: "n1", body: "first row" }).run();

		const http = (path: string, init?: RequestInit) =>
			fetch(`${origin}${path}`, init);
		const listNotes = (send: typeof http) =>
			send("/rpc/notes/list", { method: "POST", body: "{}" });

		const anonymous = browser(http, origin, new CookieJar());
		assert.equal((await listNotes(anonymous)).status, 401);

		// Registration needs a signed-in user: mint the session the way an
		// earlier sign-in would have, then enrol the authenticator on it.
		const authenticator = await SoftwareAuthenticator.create(
			"localhost",
			origin,
		);
		const { auth } = await authRuntime(authOptions).context(env, { db });
		const enrolled = new CookieJar();
		const [name, value] = await mintSessionCookie(auth, "u1");
		enrolled.cookies.set(name, value);
		const registration = await registerPasskey(
			browser(http, origin, enrolled),
			authenticator,
		);
		assert.equal(registration.status, 200, await registration.text());

		const jar = new CookieJar();
		const send = browser(http, origin, jar);
		const signIn = await signInWithPasskey(send, authenticator);
		assert.equal(signIn.status, 200, await signIn.text());

		const response = await listNotes(send);
		assert.equal(response.status, 200, await response.clone().text());
		assert.deepEqual(((await response.json()) as { json: unknown }).json, [
			{ id: "n1", body: "first row" },
		]);
	} finally {
		await server.stop();
	}
});
