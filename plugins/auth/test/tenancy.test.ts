import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";
import { browser, CookieJar, createTables } from "@fcalell/auth-testing";
import { createProcedure } from "@fcalell/plugin-api/procedure";
import createWorker, { type AppBuilder } from "@fcalell/plugin-api/runtime";
import { sqliteTable, text } from "@fcalell/plugin-db/orm";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import type { defaultOrgStatements } from "../src/access.ts";
import * as authSchema from "../src/schema/index.ts";
import * as orgSchema from "../src/schema/organization.ts";
import { defineScope, organization } from "../src/scope.ts";
import { mintSession } from "../src/testing/index.ts";
import authRuntime, { type AuthRuntimeInput } from "../src/worker/index.ts";

const ORIGIN = "http://localhost";
const SECRET = "test-secret-at-least-32-characters-long";

// A consumer's tenancy: projects under an organization, pages under a
// project.
const project = sqliteTable("project", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull(),
	slug: text("slug").notNull(),
});
const page = sqliteTable("page", {
	id: text("id").primaryKey(),
	projectId: text("project_id").notNull(),
	title: text("title").notNull(),
});
const projectScope = defineScope({
	name: "project",
	table: project,
	parent: [organization, project.organizationId],
	slug: project.slug,
});
const pageScope = defineScope({
	name: "page",
	table: page,
	parent: [projectScope, page.projectId],
});
const schema = { ...authSchema, ...orgSchema, project, page };

// Ada owns Acme and is a plain member of Beta; Grace belongs to neither.
// Each organization has one project with one page.
async function setup() {
	const env = {
		DB_FILE: join(mkdtempSync(join(tmpdir(), "stack-tenancy-")), "app.sqlite"),
		AUTH_SECRET: SECRET,
		APP_URL: ORIGIN,
	};
	const authOptions = {
		secretVar: "AUTH_SECRET",
		appUrlVar: "APP_URL",
		trustedOrigins: [ORIGIN],
		emailOtp: false,
		organization: true,
		scopes: { projectScope, pageScope },
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
				({ context }) => ({
					slug: context.organization.slug,
					role: context.member.role,
				}),
			),
			rename: procedure({
				auth: true,
				scope: organization,
				can: ["update", "organization"],
			}).mutation(() => ({ ok: true })),
			page: procedure({ auth: true, scope: pageScope }).query(
				({ context }) => ({
					title: context.page.title,
					project: context.project.slug,
					organization: context.organization.slug,
				}),
			),
		},
	});

	const { db: client } = await db.context(env, {});
	await createTables(client, schema);
	client
		.insert(authSchema.user)
		.values([
			{ id: "ada", name: "Ada", email: "ada@example.com" },
			{ id: "grace", name: "Grace", email: "grace@example.com" },
		])
		.run();
	const createdAt = new Date();
	client
		.insert(orgSchema.organization)
		.values([
			{ id: "acme", name: "Acme", slug: "acme", createdAt },
			{ id: "beta", name: "Beta", slug: "beta", createdAt },
		])
		.run();
	client
		.insert(orgSchema.member)
		.values([
			{
				id: "m1",
				organizationId: "acme",
				userId: "ada",
				role: "owner",
				createdAt,
			},
			{
				id: "m2",
				organizationId: "beta",
				userId: "ada",
				role: "member",
				createdAt,
			},
		])
		.run();
	client
		.insert(project)
		.values([
			{ id: "p-acme", organizationId: "acme", slug: "site" },
			{ id: "p-beta", organizationId: "beta", slug: "site" },
		])
		.run();
	client
		.insert(page)
		.values([
			{ id: "home-acme", projectId: "p-acme", title: "Home" },
			{ id: "home-beta", projectId: "p-beta", title: "Home" },
		])
		.run();

	const fetchPath = async (path: string, init?: RequestInit) =>
		worker.fetch(new Request(`${ORIGIN}${path}`, init), env, undefined);

	async function as(userId: string) {
		// The worker signs with SECRET, no prefix option, over an http app URL.
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
			const reads = response.headers.get("x-stack-reads");
			return {
				status: response.status,
				data: body.json,
				...(reads === null ? {} : { reads }),
			};
		};
	}
	return { as };
}

// No test below writes a row another reads (each sign-in mints its own
// session), so they share one worker and database.
let as: Awaited<ReturnType<typeof setup>>["as"];
before(async () => {
	({ as } = await setup());
});

test("a member reaches their organization by id, with their role in context", async () => {
	const ada = await as("ada");
	assert.deepEqual(
		await ada("probe/organization", { organizationId: "acme" }),
		{
			status: 200,
			data: { slug: "acme", role: "owner" },
		},
	);
});

test("another organization and an unknown id answer the same NOT_FOUND", async () => {
	const grace = await as("grace");
	const ada = await as("ada");
	const foreign = await grace("probe/organization", { organizationId: "acme" });
	const unknown = await ada("probe/organization", { organizationId: "nope" });
	assert.equal(foreign.status, 404);
	assert.equal(unknown.status, 404);
});

test("can checks the role in the organization the input names", async () => {
	const ada = await as("ada");
	assert.equal(
		(await ada("probe/rename", { organizationId: "acme" })).status,
		200,
	);
	assert.equal(
		(await ada("probe/rename", { organizationId: "beta" })).status,
		403,
	);
});

test("org rules follow the organization in the input, with no active organization", async () => {
	const ada = await as("ada");
	const owner = await ada("auth/orgRules", { organizationId: "acme" });
	const plain = await ada("auth/orgRules", { organizationId: "beta" });
	assert.equal(owner.status, 200);
	assert.equal(plain.status, 200);
	assert.notDeepEqual(owner.data, plain.data);
});

test("a page resolves its project and organization from the rows", async () => {
	const ada = await as("ada");
	assert.deepEqual(await ada("probe/page", { pageId: "home-beta" }), {
		status: 200,
		data: { title: "Home", project: "site", organization: "beta" },
	});
});

test("a page in an organization the caller is no member of answers NOT_FOUND", async () => {
	const grace = await as("grace");
	assert.equal(
		(await grace("probe/page", { pageId: "home-acme" })).status,
		404,
	);
});

test("a scope's parent column must be on its own table", () => {
	assert.throws(
		() =>
			defineScope({
				name: "stray",
				table: page,
				parent: [projectScope, project.organizationId],
			}),
		/parent column belongs to another table/,
	);
});

test("the organization's slug resolves to it and the caller's membership", async () => {
	const ada = await as("ada");
	const found = await ada("auth/scope/organization/bySlug", { slug: "acme" });
	assert.equal(found.status, 200);
	const entries = found.data as {
		organization: { id: string };
		member: { role: string };
	};
	assert.equal(entries.organization.id, "acme");
	assert.equal(entries.member.role, "owner");
	const grace = await as("grace");
	assert.equal(
		(await grace("auth/scope/organization/bySlug", { slug: "acme" })).status,
		404,
	);
});

test("a slug below the organization resolves within its parent", async () => {
	const ada = await as("ada");
	const found = await ada("auth/scope/project/bySlug", {
		slug: "site",
		parentId: "beta",
	});
	assert.equal(found.status, 200);
	const entries = found.data as {
		project: { id: string };
		organization: { id: string };
	};
	assert.equal(entries.project.id, "p-beta");
	assert.equal(entries.organization.id, "beta");
	const grace = await as("grace");
	assert.equal(
		(
			await grace("auth/scope/project/bySlug", {
				slug: "site",
				parentId: "acme",
			})
		).status,
		404,
	);
});

test("a lookup reads its chain's tables and the membership", async () => {
	const ada = await as("ada");
	const organizationLookup = await ada("auth/scope/organization/bySlug", {
		slug: "acme",
	});
	assert.equal(organizationLookup.reads, "member,organization");
	const projectLookup = await ada("auth/scope/project/bySlug", {
		slug: "site",
		parentId: "acme",
	});
	assert.equal(projectLookup.reads, "member,organization,project");
});

test("a scope without a slug has no lookup", async () => {
	const ada = await as("ada");
	assert.equal(
		(await ada("auth/scope/page/bySlug", { slug: "home", parentId: "p-acme" }))
			.status,
		404,
	);
});
