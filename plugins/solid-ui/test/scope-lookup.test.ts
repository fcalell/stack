import assert from "node:assert/strict";
import { test } from "node:test";
import { isNotFound, scopeLookup } from "../src/ui/lib/scope-lookup.ts";

const organization = { name: "organization", parent: null };
const project = { name: "project", parent: [organization, null] as const };

test("the organization is looked up by its slug alone", () => {
	assert.deepEqual(scopeLookup(organization, "acme", undefined), {
		slug: "acme",
	});
});

test("a nested scope sends its parent's id from the boundary above", () => {
	assert.deepEqual(
		scopeLookup(project, "site", { organization: { id: "org-1" } }),
		{ slug: "site", parentId: "org-1" },
	);
});

test("a nested scope with no boundary above for its parent has no lookup", () => {
	assert.equal(scopeLookup(project, "site", undefined), null);
});

test("only a NOT_FOUND error is the boundary's to draw", () => {
	assert.equal(isNotFound({ code: "NOT_FOUND" }), true);
	assert.equal(isNotFound({ code: "INTERNAL_SERVER_ERROR" }), false);
	assert.equal(isNotFound(new Error("offline")), false);
});
