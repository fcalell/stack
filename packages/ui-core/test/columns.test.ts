import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER } from "../src/roster.ts";
import {
	ACTION_BAR_SELECTION,
	EMPTY_COLUMN,
	PAGE_BODY,
	SHEET_BODY,
	SPLIT_LIST,
	SPLIT_LIST_STACK,
	SPLIT_PANE,
	splitMain,
	THREAD_COLUMN,
} from "../src/variants.ts";

test("a column cell is a width and nothing else: the region centres it", () => {
	assert.equal(THREAD_COLUMN, "w-full max-w-measure");
	assert.equal(ACTION_BAR_SELECTION, "w-full max-w-selection");
	for (const cell of [THREAD_COLUMN, ACTION_BAR_SELECTION, EMPTY_COLUMN])
		assert.doesNotMatch(cell, /\bmx-/);
});

test("a region holding a page's sections stands them a sections gap apart", () => {
	for (const cell of [
		PAGE_BODY,
		SHEET_BODY,
		SPLIT_PANE,
		SPLIT_LIST_STACK,
		splitMain({ state: "rest" }),
	])
		assert.match(cell, /\bgap-sections\b/);
	assert.match(SPLIT_LIST, /\bpy-inside\b/);
});

test("the Split holds the list's sections rhythm as its own cell", () => {
	const split = ROSTER.layout.Split;
	assert.ok(split?.draws.includes("SPLIT_LIST_STACK"));
	assert.ok(split?.holds?.includes("SPLIT_LIST_STACK"));
});
