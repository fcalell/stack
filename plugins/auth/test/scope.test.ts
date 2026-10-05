import assert from "node:assert/strict";
import { test } from "node:test";
import type { InferSelectModel } from "@fcalell/plugin-db/orm";
import { sqliteTable, text } from "@fcalell/plugin-db/orm";
import { defineScope, organization, type ScopeContext } from "../src/scope.ts";
import type { Tenancy } from "../src/worker/tenancy.ts";

const project = sqliteTable("project", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull(),
});

// Every key a scoped procedure's context carries before the scope's row
// lands at its name.
const CONTEXT_KEYS = [
	"env",
	"httpRequest",
	"reqHeaders",
	"resHeaders",
	"executionCtx",
	"_devMode",
	"db",
	"auth",
	"tenancy",
	"_rateLimiter",
	"user",
	"session",
	"organization",
	"member",
];

for (const name of CONTEXT_KEYS) {
	test(`a scope named "${name}" is refused`, () => {
		assert.throws(
			() =>
				defineScope({
					name,
					table: project,
					parent: [organization, project.organizationId],
				}),
			new RegExp(
				`defineScope: "${name}" is a key of the procedure context; pick another scope name\\.`,
			),
		);
	});
}

test("a scope named after a consumer table is accepted", () => {
	for (const name of ["project", "request"]) {
		const scope = defineScope({
			name,
			table: project,
			parent: [organization, project.organizationId],
		});
		assert.equal(scope.name, name);
	}
});

// Compile-time equality, so a resolver that loses its scope's context fails
// `check-types`.
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function assertType<T extends true>(_: T): void {}

test("a tenancy answers the context its scope names", () => {
	const scope = defineScope({
		name: "project",
		table: project,
		parent: [organization, project.organizationId],
	});
	// Never called: the types of what a tenancy would answer.
	async function answers(tenancy: Tenancy) {
		return {
			resolved: await tenancy.resolve(scope, "id", "user"),
			bySlug: await tenancy.bySlug(scope, "slug", "parent", "user"),
		};
	}
	type Answers = Awaited<ReturnType<typeof answers>>;
	type Context = ScopeContext<typeof scope>;
	assertType<Equal<Answers["resolved"], Context | null>>(true);
	assertType<Equal<Answers["bySlug"], Context | null>>(true);
	assertType<Equal<Context["project"], InferSelectModel<typeof project>>>(true);
});
