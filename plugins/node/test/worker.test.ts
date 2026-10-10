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
	registerPasskey,
	SoftwareAuthenticator,
	signInWithPasskey,
} from "@fcalell/auth-testing";
import type { TsExpression } from "@fcalell/cli/ast";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { createProcedure } from "@fcalell/plugin-api/procedure";
import createWorker, { type AppBuilder } from "@fcalell/plugin-api/runtime";
import { auth } from "@fcalell/plugin-auth";
import authRuntime from "@fcalell/plugin-auth/runtime";
import * as authSchema from "@fcalell/plugin-auth/schema";
import * as passkeySchema from "@fcalell/plugin-auth/schema/passkey";
import { mintSession } from "@fcalell/plugin-auth/testing";
import { sqliteTable, text } from "@fcalell/plugin-db/orm";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import { vite } from "@fcalell/plugin-vite";
import { node } from "../src/index.ts";
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
		staticRoot: null,
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
		const enrolled = new CookieJar();
		// Signed as the worker signs: its secret, no prefix option, an http app URL.
		const { name, value } = await mintSession(
			db,
			{ secret: env.AUTH_SECRET, cookiePrefix: "better-auth", secure: false },
			"u1",
		);
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

// The graph `stack dev` resolves for api + auth + node, plus vite when its
// config is given; auth is OAuth-only so no callbacks file is needed.
function devGraph(viteConfig?: ReturnType<typeof vite>) {
	const plugins = [
		{ factory: api, config: api() },
		{ factory: auth, config: auth({ emailOtp: false }) },
		{ factory: node, config: node() },
		...(viteConfig ? [{ factory: vite, config: viteConfig }] : []),
	];
	const discovered = plugins.map(
		({ factory, config }) =>
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "dev-origin", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-dev-origin-")),
	});
	return graph;
}

// The dev origin lists as codegen bakes them: `createWorker({ devCors })`
// from api's `workerBase` and `devTrustedOrigins` from auth's options.
async function bakedDevLists(graph: ReturnType<typeof devGraph>) {
	const workerBase = await graph.resolve(api.slots.workerBase);
	const workerOptions =
		workerBase.kind === "call" ? workerBase.args[0] : undefined;
	const devCors =
		workerOptions?.kind === "object"
			? workerOptions.properties.find((p) => p.key === "devCors")?.value
			: undefined;
	const authOptions = await graph.resolve(auth.slots.runtimeOptions);
	return {
		devCors: strings(devCors),
		devTrustedOrigins: strings(authOptions.devTrustedOrigins),
	};
}

function strings(expression: TsExpression | undefined): string[] {
	if (expression?.kind !== "array") throw new Error("expected an array");
	return expression.items.map((item) => {
		if (item.kind !== "string") throw new Error("expected a string");
		return item.value;
	});
}

test("with no frontend, APP_URL's dev default is the node server's origin", async () => {
	const graph = devGraph();
	const processes = await graph.resolve(cliSlots.devProcesses);
	const devEnv = processes.find((p) => p.name === "node")?.env ?? {};
	assert.equal(devEnv.APP_URL, "http://localhost:8788");
	assert.equal(devEnv.STACK_DEV, "1");

	// The worker as the codegen composes it: the dev lists as baked, every
	// other list from the graph, the env the dev process hands it, and a
	// database file of its own.
	const cors = await graph.resolve(api.slots.cors);
	const { devCors, devTrustedOrigins } = await bakedDevLists(graph);
	assert.deepEqual(devCors, ["http://localhost:8788"]);
	assert.deepEqual(devTrustedOrigins, devCors);
	const envChecks = (await graph.resolve(api.slots.env)).map((spec) => ({
		name: spec.name,
		...spec.validate,
	}));
	const env = {
		...devEnv,
		DB_FILE: join(mkdtempSync(join(tmpdir(), "stack-node-")), "app.sqlite"),
	};
	const db = dbRuntime({ fileVar: "DB_FILE", schema: authSchema });
	await createTables((await db.context(env, {})).db, authSchema);
	const worker = createWorker({ cors, devCors, envChecks })
		.use(db)
		.use(
			authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				emailOtp: false,
				trustedOrigins: cors,
				devTrustedOrigins,
			}),
		)
		.handler();

	const response = await worker.fetch(
		new Request(`${devEnv.APP_URL}/api/auth/get-session`, {
			headers: { origin: devEnv.APP_URL ?? "" },
		}),
		env,
		undefined,
	);
	assert.equal(response.status, 200, await response.clone().text());
	assert.equal(await response.json(), null);
});

// Port 9000 sorts after the node server's 8788, so the preference for the
// frontend's origin has to come from the slot it rides, not from sorting.
test("with vite, APP_URL's dev default and the dev lists lead with vite's origin", async () => {
	const graph = devGraph(vite({ port: 9000 }));
	const processes = await graph.resolve(cliSlots.devProcesses);
	assert.equal(
		processes.find((p) => p.name === "node")?.env?.APP_URL,
		"http://localhost:9000",
	);
	const { devCors, devTrustedOrigins } = await bakedDevLists(graph);
	assert.deepEqual(devCors, ["http://localhost:9000", "http://localhost:8788"]);
	assert.deepEqual(devTrustedOrigins, devCors);
});
