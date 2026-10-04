import assert from "node:assert/strict";
import { test } from "node:test";
import { ENGLISH, STATUS_STATES } from "../src/tokens.ts";
import { STATUS_DOT } from "../src/variant-tables.ts";
import { STATUS_SPINNER, statusContentTone } from "../src/variants.ts";

test("running is a status state with its own word", () => {
	assert.ok(STATUS_STATES.includes("running"));
	assert.equal(ENGLISH.running, "Running");
	assert.equal(ENGLISH.active, "Active");
});

test("running wears the accent, as active does", () => {
	assert.equal(statusContentTone("running"), "accent-ink");
	assert.equal(statusContentTone("active"), "accent-ink");
	assert.equal(STATUS_SPINNER, "text-accent-ink");
});

test("running's mark is the spinner; every other state draws a dot", () => {
	const dots = Object.keys(STATUS_DOT.variants.state);
	assert.ok(!dots.includes("running"));
	assert.deepEqual(
		dots,
		STATUS_STATES.filter((state) => state !== "running"),
	);
	assert.equal(STATUS_DOT.variants.state.active, "bg-accent-ink");
});
