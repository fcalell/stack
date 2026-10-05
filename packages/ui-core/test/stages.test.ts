import assert from "node:assert/strict";
import { test } from "node:test";
import { stagesShown } from "../src/tokens.ts";

const steps = [
	{ label: "Submitted", state: "done" },
	{ label: "In spec", state: "done" },
	{ label: "In build", state: "current" },
	{ label: "Live", state: "later" },
];

test("a rail that has not ended draws every stage", () => {
	assert.deepEqual(stagesShown(steps, false), steps);
});

test("an ended rail keeps the stages up to the last done one", () => {
	assert.deepEqual(
		stagesShown(steps, true).map((step) => step.label),
		["Submitted", "In spec"],
	);
});

test("an ended rail with nothing done keeps no stage", () => {
	assert.deepEqual(stagesShown(steps.slice(2), true), []);
});
