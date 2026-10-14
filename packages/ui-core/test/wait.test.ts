import assert from "node:assert/strict";
import { test } from "node:test";
import { WAIT_DELAY, WAIT_MIN, waitStep } from "../src/wait.ts";

test("a read that is waiting draws nothing until the delay has run", () => {
	assert.deepEqual(waitStep(true, undefined, 0), {
		kind: "delay",
		after: WAIT_DELAY,
	});
});

test("a read that settles inside the delay draws no form", () => {
	assert.deepEqual(waitStep(false, undefined, 50), { kind: "idle" });
});

test("a form once drawn stays while the read runs", () => {
	assert.deepEqual(waitStep(true, 1000, 1900), { kind: "drawn" });
});

test("a read that settles inside the minimum holds the form the rest of it", () => {
	assert.deepEqual(waitStep(false, 1000, 1100), {
		kind: "hold",
		after: WAIT_MIN - 100,
	});
});

test("a read that settles after the minimum takes the form away", () => {
	assert.deepEqual(waitStep(false, 1000, 1000 + WAIT_MIN), { kind: "gone" });
	assert.deepEqual(waitStep(false, 1000, 5000), { kind: "gone" });
});

test("the minimum is longer than the delay", () => {
	assert.ok(WAIT_MIN > WAIT_DELAY);
});
