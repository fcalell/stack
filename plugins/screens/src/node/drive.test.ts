import assert from "node:assert/strict";
import { test } from "node:test";
import { fill, parsePlan } from "./drive.ts";

const plan = (steps: unknown[], each?: unknown[]) =>
	JSON.stringify({ steps, each });

test("every step kind parses", () => {
	const parsed = parsePlan(
		plan([
			{ goto: "/" },
			{ open: "Menu" },
			{ key: "Escape" },
			{ type: "x" },
			{ fx: "/code" },
			{ shot: "a" },
			{ offline: true },
			{ scroll: 40, in: "main" },
		]),
	);
	assert.equal(parsed.steps.length, 8);
	assert.deepEqual(parsed.each, [
		{ width: 320, mode: "dark" },
		{ width: 1920, mode: "dark" },
	]);
});

test("an unknown step fails the plan", () => {
	assert.throws(
		() => parsePlan(plan([{ tap: "x" }])),
		/step 1.*exactly one of/,
	);
});

test("a step with the wrong type or two kinds fails", () => {
	assert.throws(() => parsePlan(plan([{ goto: 3 }])), /goto takes a string/);
	assert.throws(
		() => parsePlan(plan([{ goto: "/", shot: "a" }])),
		/exactly one/,
	);
});

test("each needs widths and a known mode", () => {
	assert.throws(
		() => parsePlan(plan([{ goto: "/" }], [{ mode: "dark" }])),
		/width/,
	);
	assert.throws(
		() => parsePlan(plan([{ goto: "/" }], [{ width: 320, mode: "blue" }])),
		/light or dark/,
	);
});

test("{{fx}} is replaced in a step's text", () => {
	assert.equal(fill("/link/{{fx}}?t={{fx}}", "abc"), "/link/abc?t=abc");
});
