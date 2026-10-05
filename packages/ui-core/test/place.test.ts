import assert from "node:assert/strict";
import { test } from "node:test";
import { heldSpellings, rosterEntries } from "../src/roster.ts";
import { WIDTH_VALUE } from "../src/tokens.ts";
import {
	ACTION_BAR_ALL,
	ACTION_BAR_SELECTION,
	FOOT_DOCKED,
	PAGE_BODY,
	PILL_ACT,
} from "../src/variants.ts";

const entry = (name: string) =>
	rosterEntries().find(([, each]) => each === name)?.[2];

test("a Place docks a `foot` at its bottom on the docked foot cell", () => {
	const place = entry("Place");
	assert.ok(place);
	assert.ok(place.props.includes("foot"));
	assert.ok(place.draws.includes("FOOT_DOCKED"));
});

test("no entry holds a docked foot, and a filling Thread's input docks on the same cell", () => {
	assert.ok(entry("Thread")?.draws.includes("FOOT_DOCKED"));
	assert.ok(!heldSpellings().has("FOOT_DOCKED"));
});

test("the docked foot stands at the page inset the sections scroll at", () => {
	assert.match(FOOT_DOCKED, /\bpx-page\b/);
	assert.match(PAGE_BODY, /\bp-page\b/);
});

test("the docked foot is a region of its own: a hairline on a raised surface", () => {
	assert.match(FOOT_DOCKED, /\bborder-t\b/);
	assert.match(FOOT_DOCKED, /\bborder-edge-raised\b/);
	assert.match(FOOT_DOCKED, /\bbg-raised\b/);
	assert.match(FOOT_DOCKED, /\bshadow-float\b/);
});

test("a selection bar's column stands at the pattern's table-wide width, centred", () => {
	assert.match(ACTION_BAR_SELECTION, /\bmax-w-selection\b/);
	assert.match(ACTION_BAR_SELECTION, /\bmx-auto\b/);
	assert.equal(WIDTH_VALUE.selection, "1060px");
});

test("the bar's choose-all act is at the filled act's radius, not a pill", () => {
	assert.match(ACTION_BAR_ALL, /\brounded-control\b/);
	assert.doesNotMatch(ACTION_BAR_ALL, /\brounded-full\b/);
	assert.match(PILL_ACT, /\brounded-full\b/);
});
