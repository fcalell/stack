import assert from "node:assert/strict";
import { test } from "node:test";
import { splitMain, THREAD_FOOT, THREAD_LOG } from "../src/variants.ts";

test("a Split's main filled by a Thread keeps the page inset over the head alone", () => {
	assert.equal(splitMain({ state: "fills" }), "px-page pt-page");
	// The log and the docked foot carry the side and bottom inset themselves.
	for (const cell of [THREAD_LOG, THREAD_FOOT])
		assert.match(cell, /\bpx-page\b/);
	assert.match(THREAD_FOOT, /\bpb-page\b/);
});
