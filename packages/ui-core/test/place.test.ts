import assert from "node:assert/strict";
import { test } from "node:test";
import { heldSpellings, rosterEntries } from "../src/roster.ts";
import { FOOT, PAGE_BODY } from "../src/variants.ts";

const entry = (name: string) =>
	rosterEntries().find(([, each]) => each === name)?.[2];

test("a Place docks a `foot` at its bottom on the shared foot cell", () => {
	const place = entry("Place");
	assert.ok(place);
	assert.ok(place.props.includes("foot"));
	assert.ok(place.draws.includes("FOOT"));
});

test("a Place's foot and a filling Thread's input dock on one cell no entry holds", () => {
	assert.ok(entry("Thread")?.draws.includes("FOOT"));
	assert.ok(!heldSpellings().has("FOOT"));
});

test("the docked foot stands at the page inset the sections scroll at", () => {
	assert.match(FOOT, /\bpx-page\b/);
	assert.match(FOOT, /\bpb-page\b/);
	assert.match(PAGE_BODY, /\bp-page\b/);
});
