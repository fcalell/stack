import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createTables } from "@fcalell/auth-testing";
import { createTestEntry, ORPCError } from "@fcalell/plugin-api/testing";
import { eq } from "@fcalell/plugin-db/orm";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import { makeSignature } from "better-auth/crypto";
import * as authSchema from "../src/schema/index.ts";
import * as organizationSchema from "../src/schema/organization.ts";
import authTesting from "../src/testing/index.ts";
import type { AppRouter } from "./fixtures/testing/worker.ts";
import type { AppRouter as AppRouterWithoutOrganization } from "./fixtures/testing/worker-without-organization.ts";

// One file, so its process holds one `virtual:stack-procedure` target.

const schema = { ...authSchema, ...organizationSchema };
const SECRET = "test-secret-at-least-32-characters";
const ROLES = ["owner", "admin", "editor", "viewer"] as const;

const fixture = (path: string) =>
	new URL(`./fixtures/testing/${path}`, import.meta.url);

// Stands in for plugin-db's `db` testing plugin on the sqlite dialect: a
// fresh database file per boot holding the auth tables, its path in the env
// the worker's `dbRuntime` reads, and the same client the worker gets.
const sqliteDb = {
	name: "db",
	async setup() {
		const env = {
			DB_FILE: join(
				mkdtempSync(join(tmpdir(), "stack-auth-testing-")),
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

function entry(env: Record<string, string> = {}) {
	return createTestEntry<AppRouter>({
		worker: fixture("worker.ts"),
		procedure: fixture("procedure.ts"),
		root: new URL("..", import.meta.url),
		prefix: "/rpc",
		env: {
			STACK_DEV: "1",
			AUTH_SECRET: SECRET,
			APP_URL: "http://localhost",
			...env,
		},
	});
}

const testing = entry()
	.use(sqliteDb)
	.use(
		authTesting({
			cookiePrefix: "probe",
			secretVar: "AUTH_SECRET",
			appUrlVar: "APP_URL",
			roles: ROLES,
		}),
	);

async function rejectsWith(promise: Promise<unknown>, code: string) {
	await assert.rejects(promise, (error: unknown) => {
		assert.ok(error instanceof ORPCError, String(error));
		assert.equal(error.code, code);
		return true;
	});
}

test("a member of a role in an organization calls a scoped procedure and gets the role back", async () => {
	await using app = await testing.boot();
	const org = await app.auth.organization();
	const { user, cookie } = await app.auth.member({
		organizationId: org.id,
		role: "editor",
	});
	assert.deepEqual(
		await app.client({ cookie }).probe.organization({ organizationId: org.id }),
		{ slug: org.slug, role: "editor" },
	);
	assert.ok(cookie.startsWith("probe.session_token="), cookie);
	const sessions = app.db
		.select()
		.from(authSchema.session)
		.where(eq(authSchema.session.userId, user.id))
		.all();
	assert.equal(sessions.length, 1);
});

test("another organization and no cookie are refused by code", async () => {
	await using app = await testing.boot();
	const org = await app.auth.organization();
	const other = await app.auth.organization();
	const { cookie } = await app.auth.member({
		organizationId: org.id,
		role: "editor",
	});
	await rejectsWith(
		app.client({ cookie }).probe.organization({ organizationId: other.id }),
		"NOT_FOUND",
	);
	await rejectsWith(
		app.client().probe.organization({ organizationId: org.id }),
		"UNAUTHORIZED",
	);
});

test("can refuses a role without the statement", async () => {
	await using app = await testing.boot();
	const org = await app.auth.organization();
	const owner = await app.auth.member({
		organizationId: org.id,
		role: "owner",
	});
	const viewer = await app.auth.member({
		organizationId: org.id,
		role: "viewer",
	});
	assert.deepEqual(
		await app
			.client({ cookie: owner.cookie })
			.probe.rename({ organizationId: org.id }),
		{ ok: true },
	);
	await rejectsWith(
		app
			.client({ cookie: viewer.cookie })
			.probe.rename({ organizationId: org.id }),
		"FORBIDDEN",
	);
});

test("the cookie name follows the app URL's scheme", async () => {
	await using app = await testing.boot({
		env: { APP_URL: "https://localhost" },
	});
	const org = await app.auth.organization();
	const { cookie } = await app.auth.member({
		organizationId: org.id,
		role: "admin",
	});
	assert.ok(cookie.startsWith("__Secure-probe.session_token="), cookie);
	assert.deepEqual(
		await app.client({ cookie }).probe.organization({ organizationId: org.id }),
		{ slug: org.slug, role: "admin" },
	);
});

test("a forged signature and an unknown role are refused", async () => {
	await using app = await testing.boot();
	const org = await app.auth.organization();
	const { cookie } = await app.auth.member({
		organizationId: org.id,
		role: "editor",
	});
	const eq = cookie.indexOf("=");
	const token = cookie.slice(eq + 1, cookie.lastIndexOf("."));
	const forged = `${cookie.slice(0, eq)}=${token}.${await makeSignature(token, "another-secret-at-least-32-characters")}`;
	await rejectsWith(
		app
			.client({ cookie: forged })
			.probe.organization({ organizationId: org.id }),
		"UNAUTHORIZED",
	);

	await assert.rejects(
		// @ts-expect-error: "god" is not a configured role.
		app.auth.member({ organizationId: org.id, role: "god" }),
		(error: unknown) => {
			assert.ok(error instanceof Error);
			for (const name of ["god", ...ROLES]) {
				assert.match(error.message, new RegExp(`\\b${name}\\b`));
			}
			return true;
		},
	);
});

test("without organizations a user still signs in and the handle has no organization helpers", async () => {
	await using app = await createTestEntry<AppRouterWithoutOrganization>({
		worker: fixture("worker-without-organization.ts"),
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
			}),
		)
		.boot();
	const user = await app.auth.user();
	const cookie = await app.auth.session(user.id);
	assert.equal(await app.client({ cookie }).probe.me(), user.id);
	assert.equal("organization" in app.auth, false);
	assert.equal("member" in app.auth, false);
	assert.throws(() =>
		// @ts-expect-error: no organization helpers without organizations.
		app.auth.member({ organizationId: "acme", role: "owner" }),
	);
});

test("a given user becomes the member and the session lasts the baked length", async () => {
	await using app = await entry()
		.use(sqliteDb)
		.use(
			authTesting({
				cookiePrefix: "probe",
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				expiresIn: 3600,
				roles: ROLES,
			}),
		)
		.boot();
	const org = await app.auth.organization();
	const user = await app.auth.user({ email: "ada@example.test", name: "Ada" });
	const before = Date.now();
	const minted = await app.auth.member({
		organizationId: org.id,
		role: "viewer",
		user,
	});
	assert.deepEqual(minted.user, user);
	assert.equal(minted.member.userId, user.id);
	const [row] = app.db
		.select()
		.from(authSchema.session)
		.where(eq(authSchema.session.userId, user.id))
		.all();
	const lasts = (row?.expiresAt.getTime() ?? 0) - before;
	assert.ok(lasts > 3500_000 && lasts <= 3601_000, String(lasts));
});

test("the setup refuses a missing secret or app URL by name", async () => {
	const plugin = authTesting({
		cookiePrefix: "probe",
		secretVar: "AUTH_SECRET",
		appUrlVar: "APP_URL",
		roles: ROLES,
	});
	const without = (name: string) =>
		createTestEntry<AppRouter>({
			worker: fixture("worker.ts"),
			procedure: fixture("procedure.ts"),
			root: new URL("..", import.meta.url),
			prefix: "/rpc",
			env: Object.fromEntries(
				Object.entries({
					STACK_DEV: "1",
					AUTH_SECRET: SECRET,
					APP_URL: "http://localhost",
				}).filter(([key]) => key !== name),
			),
		})
			.use(sqliteDb)
			.use(plugin)
			.boot();
	await assert.rejects(without("AUTH_SECRET"), /AUTH_SECRET/);
	await assert.rejects(without("APP_URL"), /APP_URL/);
});
