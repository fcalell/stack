import assert from "node:assert/strict";
import { test } from "node:test";
import { noSuch } from "./procedure.ts";

test("a scope's refusal is a NOT_FOUND naming the scope in lower-case words", () => {
	const said = (name: string) => noSuch({ name }).message;
	assert.equal(noSuch({ name: "project" }).code, "NOT_FOUND");
	assert.equal(said("project"), "No such project");
	assert.equal(said("lineItem"), "No such line item");
	assert.equal(said("line_item"), "No such line item");
	assert.equal(said("LineItem"), "No such line item");
	assert.equal(said("apiKeyV2"), "No such api key v2");
	assert.equal(said("HTTPServer"), "No such http server");
});
