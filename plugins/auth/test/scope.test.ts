import assert from "node:assert/strict";
import { test } from "node:test";
import { sqliteTable, text } from "@fcalell/plugin-db/orm";
import { defineScope, organization } from "../src/scope.ts";

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
