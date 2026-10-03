import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { browser, CookieJar, createTables } from "@fcalell/auth-testing";
import { createProcedure } from "@fcalell/plugin-api/procedure";
import createWorker, { type AppBuilder } from "@fcalell/plugin-api/runtime";
import { integer, sql, sqliteTable, text } from "@fcalell/plugin-db/orm";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import type { defaultOrgStatements } from "../src/access.ts";
import * as authSchema from "../src/schema/index.ts";
import * as orgSchema from "../src/schema/organization.ts";
import {
	defineMembership,
	defineScope,
	type MemberRow,
	organization,
} from "../src/scope.ts";
import { mintSession } from "../src/testing/index.ts";
import authRuntime, { type AuthRuntimeInput } from "../src/worker/index.ts";

const ORIGIN = "http://localhost";
const SECRET = "test-secret-at-least-32-characters-long";

// A consumer whose members may expire and be restricted to some projects,
// with standards visible through their bindings to visible projects.
const membership = sqliteTable("membership", {
	memberId: text("member_id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
});
const memberProject = sqliteTable("member_project", {
	memberId: text("member_id").notNull(),
	projectId: text("project_id").notNull(),
});
const project = sqliteTable("project", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull(),
	slug: text("slug").notNull(),
});
const standard = sqliteTable("standard", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull(),
});
const bindingContent = sqliteTable("binding_content", {
	id: text("id").primaryKey(),
	projectId: text("project_id").notNull(),
	assetId: text("asset_id").notNull(),
	changeSetId: text("change_set_id"),
	toVersion: integer("to_version"),
});
const page = sqliteTable("page", {
	id: text("id").primaryKey(),
	projectId: text("project_id").notNull(),
});

const unexpired = defineMembership(
	sql`not exists (select 1 from ${membership} where ${membership.memberId} = ${orgSchema.member.id} and ${membership.expiresAt} <= cast(unixepoch('subsecond') * 1000 as integer))`,
);
const unrestricted = (m: MemberRow) =>
	sql`not exists (select 1 from ${memberProject} where ${memberProject.memberId} = ${m.id})`;
const projectScope = defineScope({
	name: "project",
	table: project,
	parent: [organization, project.organizationId],
	slug: project.slug,
	where: (m) =>
		sql`${unrestricted(m)} or exists (select 1 from ${memberProject} where ${memberProject.memberId} = ${m.id} and ${memberProject.projectId} = ${project.id})`,
});
const standardScope = defineScope({
	name: "standard",
	table: standard,
	parent: [organization, standard.organizationId],
	where: (m) =>
		sql`${unrestricted(m)} or exists (select 1 from ${bindingContent} inner join ${memberProject} on ${memberProject.projectId} = ${bindingContent.projectId} where ${bindingContent.assetId} = ${standard.id} and ${bindingContent.toVersion} is null and ${memberProject.memberId} = ${m.id})`,
});
const pageScope = defineScope({
	name: "page",
	table: page,
	parent: [projectScope, page.projectId],
});
const schema = {
	...authSchema,
	...orgSchema,
	membership,
	memberProject,
	project,
	standard,
	bindingContent,
	page,
};

// In Acme: Ada owns it, Rex is a plain member restricted to project A, Eve's
// membership has expired, Fay's expires tomorrow. Project B is invisible to
// Rex. Standards: one bound to A by a head row, one to B by a draft row, one
// to A by a closed row, one unbound.
async function setup() {
	const env = {
		DB_FILE: join(
			mkdtempSync(join(tmpdir(), "stack-tenancy-predicates-")),
			"app.sqlite",
		),
		AUTH_SECRET: SECRET,
		APP_URL: ORIGIN,
	};
	const authOptions = {
		secretVar: "AUTH_SECRET",
		appUrlVar: "APP_URL",
		trustedOrigins: [ORIGIN],
		emailOtp: false,
		organization: true,
		scopes: { unexpired, projectScope, standardScope, pageScope },
	} satisfies AuthRuntimeInput;
	const db = dbRuntime({ fileVar: "DB_FILE", schema });
	const chain = createWorker({ prefix: "/rpc", cors: [ORIGIN] })
		.use(db)
		.use(authRuntime(authOptions));
	type Context = typeof chain extends AppBuilder<infer C> ? C : never;
	const procedure = createProcedure<
		Context,
		typeof defaultOrgStatements,
		string
	>();
	const worker = chain.handler({
		probe: {
			organization: procedure({ auth: true, scope: organization }).query(
				({ context }) => ({ slug: context.organization.slug }),
			),
			project: procedure({ auth: true, scope: projectScope }).query(
				({ context }) => ({ id: context.project.id }),
			),
			rename: procedure({
				auth: true,
				scope: projectScope,
				can: ["update", "organization"],
			}).mutation(() => ({ ok: true })),
			standard: procedure({ auth: true, scope: standardScope }).query(
				({ context }) => ({ id: context.standard.id }),
			),
			page: procedure({ auth: true, scope: pageScope }).query(
				({ context }) => ({ id: context.page.id, project: context.project.id }),
			),
		},
	});

	const { db: client } = await db.context(env, {});
	await createTables(client, schema);
	const users = ["ada", "rex", "eve", "fay"];
	client
		.insert(authSchema.user)
		.values(users.map((id) => ({ id, name: id, email: `${id}@example.com` })))
		.run();
	const createdAt = new Date();
	client
		.insert(orgSchema.organization)
		.values({ id: "acme", name: "Acme", slug: "acme", createdAt })
		.run();
	client
		.insert(orgSchema.member)
		.values(
			users.map((id) => ({
				id: `m-${id}`,
				organizationId: "acme",
				userId: id,
				role: id === "ada" ? "owner" : "member",
				createdAt,
			})),
		)
		.run();
	const day = 24 * 60 * 60 * 1000;
	client
		.insert(membership)
		.values([
			{ memberId: "m-eve", expiresAt: new Date(Date.now() - day) },
			{ memberId: "m-fay", expiresAt: new Date(Date.now() + day) },
		])
		.run();
	client
		.insert(project)
		.values([
			{ id: "p-a", organizationId: "acme", slug: "a" },
			{ id: "p-b", organizationId: "acme", slug: "b" },
		])
		.run();
	client
		.insert(memberProject)
		.values({ memberId: "m-rex", projectId: "p-a" })
		.run();
	client
		.insert(page)
		.values([
			{ id: "page-a", projectId: "p-a" },
			{ id: "page-b", projectId: "p-b" },
		])
		.run();
	client
		.insert(standard)
		.values(
			["s-head", "s-draft", "s-closed", "s-unbound"].map((id) => ({
				id,
				organizationId: "acme",
			})),
		)
		.run();
	client
		.insert(bindingContent)
		.values([
			{ id: "b-head", projectId: "p-a", assetId: "s-head" },
			{
				id: "b-draft",
				projectId: "p-b",
				assetId: "s-draft",
				changeSetId: "cs-1",
			},
			{ id: "b-closed", projectId: "p-a", assetId: "s-closed", toVersion: 3 },
		])
		.run();

	const fetchPath = async (path: string, init?: RequestInit) =>
		worker.fetch(new Request(`${ORIGIN}${path}`, init), env, undefined);

	async function as(userId: string) {
		const { name, value } = await mintSession(
			client,
			{ secret: SECRET, cookiePrefix: "better-auth", secure: false },
			userId,
		);
		const jar = new CookieJar();
		jar.cookies.set(name, value);
		const send = browser(fetchPath, ORIGIN, jar);
		return async (path: string, input: unknown) => {
			const response = await send(`/rpc/${path}`, {
				method: "POST",
				body: JSON.stringify({ json: input }),
			});
			const body = (await response.json()) as { json: unknown };
			return { status: response.status, data: body.json };
		};
	}
	return { as };
}

test("an expired membership answers NOT_FOUND on a scoped procedure and the organization lookup", async () => {
	const { as } = await setup();
	const calls = [
		["probe/organization", { organizationId: "acme" }],
		["auth/scope/organization/bySlug", { slug: "acme" }],
		["auth/orgRules", { organizationId: "acme" }],
	] as const;
	const eve = await as("eve");
	const fay = await as("fay");
	for (const [path, input] of calls) {
		assert.equal((await eve(path, input)).status, 404, `eve on ${path}`);
		assert.equal((await fay(path, input)).status, 200, `fay on ${path}`);
	}
});

test("a restricted member reaches only the projects of their rows", async () => {
	const { as } = await setup();
	for (const [user, invisible] of [
		["rex", 404],
		["ada", 200],
	] as const) {
		const call = await as(user);
		assert.equal(
			(await call("probe/project", { projectId: "p-a" })).status,
			200,
		);
		assert.equal(
			(await call("auth/scope/project/bySlug", { slug: "a", parentId: "acme" }))
				.status,
			200,
		);
		assert.equal(
			(await call("probe/project", { projectId: "p-b" })).status,
			invisible,
		);
		assert.equal(
			(await call("auth/scope/project/bySlug", { slug: "b", parentId: "acme" }))
				.status,
			invisible,
		);
	}
});

test("a level below an invisible level is refused", async () => {
	const { as } = await setup();
	assert.equal(pageScope.where, null);
	const rex = await as("rex");
	assert.deepEqual(await rex("probe/page", { pageId: "page-a" }), {
		status: 200,
		data: { id: "page-a", project: "p-a" },
	});
	assert.equal((await rex("probe/page", { pageId: "page-b" })).status, 404);
});

test("a standard is visible through a head or draft binding to a visible project", async () => {
	const { as } = await setup();
	const rex = await as("rex");
	const status = async (standardId: string) =>
		(await rex("probe/standard", { standardId })).status;
	assert.equal(await status("s-head"), 200);
	assert.equal(await status("s-draft"), 404);
	assert.equal(await status("s-closed"), 404);
	assert.equal(await status("s-unbound"), 404);
	const ada = await as("ada");
	assert.equal(
		(await ada("probe/standard", { standardId: "s-unbound" })).status,
		200,
	);
});

test("an invisible row answers NOT_FOUND before can runs", async () => {
	const { as } = await setup();
	const rex = await as("rex");
	assert.equal((await rex("probe/rename", { projectId: "p-b" })).status, 404);
	assert.equal((await rex("probe/rename", { projectId: "p-a" })).status, 403);
});

test("an invisible row and a missing row answer the same response", async () => {
	const { as } = await setup();
	const rex = await as("rex");
	const invisible = await rex("probe/project", { projectId: "p-b" });
	const missing = await rex("probe/project", { projectId: "nope" });
	assert.equal(invisible.status, 404);
	assert.deepEqual(invisible, missing);
});

test("two membership declarations in the scopes module are refused", () => {
	assert.throws(
		() =>
			authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				trustedOrigins: [ORIGIN],
				emailOtp: false,
				organization: true,
				scopes: {
					unexpired,
					alsoUnexpired: defineMembership(sql`1 = 1`),
				},
			}),
		/"unexpired", "alsoUnexpired"/,
	);
});
