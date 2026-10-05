import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createTables } from "@fcalell/auth-testing";
import { createTestEntry, type McpRefusal } from "@fcalell/plugin-api/testing";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import * as authSchema from "../src/schema/index.ts";
import * as oauthSchema from "../src/schema/oauth.ts";
import * as organizationSchema from "../src/schema/organization.ts";
import authTesting from "../src/testing/index.ts";
import type { AppRouter } from "./fixtures/testing/worker-mcp.ts";

// One file, so its process holds one `virtual:stack-procedure` target.

const schema = { ...authSchema, ...organizationSchema, ...oauthSchema };
const SECRET = "test-secret-at-least-32-characters";
const fixture = (path: string) =>
	new URL(`./fixtures/testing/${path}`, import.meta.url);

// Stands in for plugin-db's `db` testing plugin on the sqlite dialect.
const sqliteDb = {
	name: "db",
	async setup() {
		const env = {
			DB_FILE: join(
				mkdtempSync(join(tmpdir(), "stack-auth-mcp-")),
				"app.sqlite",
			),
		};
		const { db } = await dbRuntime({ fileVar: "DB_FILE", schema }).context(
			env,
			{},
		);
		await createTables(db, schema);
		return { env, provides: { db } };
	},
};

const testing = createTestEntry<AppRouter>({
	worker: fixture("worker-mcp.ts"),
	procedure: fixture("procedure.ts"),
	root: new URL("..", import.meta.url),
	prefix: "/rpc",
	env: { STACK_DEV: "1", AUTH_SECRET: SECRET, APP_URL: "http://localhost" },
})
	.use(sqliteDb)
	.use(
		authTesting({
			cookiePrefix: "probe",
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			roles: ["owner", "admin", "editor", "viewer"],
			mcp: true,
		}),
	);

const body = (result: { structuredContent?: unknown }) =>
	result.structuredContent as Record<string, unknown>;

// One user, an owner of Acme and a viewer in Beta, with a grant to each.
async function connected() {
	const app = await testing.boot();
	const acme = await app.auth.organization();
	const beta = await app.auth.organization();
	const inAcme = await app.auth.member({
		organizationId: acme.id,
		role: "owner",
	});
	const inBeta = await app.auth.member({
		organizationId: beta.id,
		role: "viewer",
		user: inAcme.user,
	});
	const client = await app.auth.oauth.register();
	const toAcme = await app.auth.oauth.connect({
		member: inAcme,
		organizationId: acme.id,
		client,
	});
	const toBeta = await app.auth.oauth.connect({
		member: inBeta,
		organizationId: beta.id,
		client,
	});
	return { app, acme, beta, inAcme, toAcme, toBeta };
}

test("a granted token calls tools as its member in its organization", async () => {
	const { app, acme, beta, inAcme, toAcme, toBeta } = await connected();
	await using _app = app;

	const asAcme = app.mcp({ token: toAcme.accessToken });
	assert.deepEqual(body(await asAcme.callTool("probe.caller")), {
		userId: inAcme.user.id,
		agent: true,
	});
	assert.deepEqual(
		body(
			await asAcme.callTool("probe.organization", { organizationId: acme.id }),
		),
		{ role: "owner" },
	);
	// The member's other organization is outside the grant.
	const other = await asAcme.callTool("probe.organization", {
		organizationId: beta.id,
	});
	assert.equal(other.isError, true);
	assert.equal(body(other).code, "NOT_FOUND");

	// The member's role decides what the agent may do: a viewer cannot rename.
	const asBeta = app.mcp({ token: toBeta.accessToken, era: "legacy" });
	const rename = await asBeta.callTool("probe.rename", {
		organizationId: beta.id,
	});
	assert.equal(rename.isError, true);
	assert.equal(body(rename).code, "FORBIDDEN");
	assert.deepEqual(
		body(await asAcme.callTool("probe.rename", { organizationId: acme.id })),
		{ ok: true },
	);

	const { instructions } = await asAcme.listTools();
	assert.ok(instructions?.endsWith(acme.id));
});

test("one door each", async () => {
	const { app, inAcme, toAcme } = await connected();
	await using _app = app;
	const initialize = JSON.stringify({
		jsonrpc: "2.0",
		id: 1,
		method: "initialize",
		params: {
			protocolVersion: "2025-11-25",
			capabilities: {},
			clientInfo: { name: "test", version: "1.0.0" },
		},
	});
	const headers = {
		"content-type": "application/json",
		accept: "application/json, text/event-stream",
	};

	// The member's session cookie authenticates nothing at /mcp.
	const cookie = await app.fetch("/mcp", {
		method: "POST",
		headers: { ...headers, cookie: inAcme.cookie },
		body: initialize,
	});
	assert.equal(cookie.status, 401);
	assert.match(
		cookie.headers.get("www-authenticate") ?? "",
		/^Bearer resource_metadata="http:\/\/localhost\/\.well-known\/oauth-protected-resource/,
	);

	// The access token authenticates nothing outside it.
	const rpc = await app.fetch("/rpc/probe/caller", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${toAcme.accessToken}`,
		},
		body: JSON.stringify({}),
	});
	assert.equal(rpc.status, 401);
	const answer = (await rpc.json()) as { json: { code: string } };
	assert.equal(answer.json.code, "UNAUTHORIZED");

	// A revoked grant's next call is refused.
	const mcp = app.mcp({ token: toAcme.accessToken });
	assert.equal((await mcp.listTools()).tools.length, 3);
	assert.equal(
		await app.client().probe.revoke({ grantId: toAcme.grantId }),
		true,
	);
	await assert.rejects(mcp.listTools(), (error: unknown) => {
		const refusal = error as McpRefusal;
		assert.equal(refusal.status, 401);
		assert.match(refusal.wwwAuthenticate ?? "", /^Bearer resource_metadata=/);
		return true;
	});
});
