import assert from "node:assert/strict";
import { test } from "node:test";
import { sqliteTable, text } from "@fcalell/plugin-db/orm";
import { defineScope, organization } from "../src/scope.ts";

const project = sqliteTable("project", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull(),
});

// A resolved level's row lands in the procedure context under its scope's
// name, so a scope named after a key the context already carries is refused.
test("a scope named after a procedure-context key is refused", () => {
	assert.throws(
		() =>
			defineScope({
				name: "organization",
				table: project,
				parent: [organization, project.organizationId],
			}),
		/defineScope: "organization" is a key of the procedure context; pick another scope name\./,
	);
});

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
