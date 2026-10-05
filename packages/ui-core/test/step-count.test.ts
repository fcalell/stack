import assert from "node:assert/strict";
import { test } from "node:test";
import { ENGLISH, filled, stepStateOf } from "../src/tokens.ts";

test("the steps before the current one are done, it is current, the rest later", () => {
	const states = [1, 2, 3, 4].map((step) => stepStateOf(step, 2));
	assert.deepEqual(states, ["done", "current", "later", "later"]);
});

test("the step word says where the flow stands", () => {
	assert.equal(filled(ENGLISH.stepOf, { at: "2", of: "3" }), "Step 2 of 3");
});
