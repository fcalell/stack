import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER } from "../src/roster.ts";
import { FOOT, SPLIT_BESIDE, splitMain, THREAD_LOG } from "../src/variants.ts";

test("a Split's main filled by a Thread keeps the page inset over the head alone", () => {
	assert.equal(splitMain({ state: "fills" }), "px-page pt-page");
	// The log and the docked foot carry the side and bottom inset themselves.
	for (const cell of [THREAD_LOG, FOOT]) assert.match(cell, /\bpx-page\b/);
	assert.match(FOOT, /\bpb-page\b/);
});

test("a record the main opened stands beside it at a structural half, never a width token", () => {
	assert.equal(SPLIT_BESIDE, "grow basis-0");
	assert.doesNotMatch(SPLIT_BESIDE, /\bw-/);
});

test("a Split takes the record its main opened, `beside`, and holds its cell", () => {
	const split = ROSTER.layout.Split;
	assert.ok(split);
	assert.ok(split.props.includes("beside"));
	assert.ok(split.draws.includes("SPLIT_BESIDE"));
	assert.ok(split.holds?.includes("SPLIT_BESIDE"));
});
