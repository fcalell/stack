import assert from "node:assert/strict";
import { test } from "node:test";
import { TEXT } from "./variant-tables.ts";
import {
	FIGURES,
	ITEM_OVERLINE,
	placeTabContentTone,
	YIELDS_FIRST,
	YIELDS_LAST,
	YIELDS_LAST_EACH,
} from "./variants.ts";

const weight = (name: string) =>
	Number(/shrink-\[?([\d.]+)\]?/.exec(name)?.[1]);

// Tailwind reads a class as written, so the each-child form is spelled whole
// and kept in step with the weight here.
test("the last weight's each-child form is the weight on each child", () => {
	assert.equal(YIELDS_LAST_EACH, `*:${YIELDS_LAST}`);
});

test("the first weight is above the default of 1 and the last below it", () => {
	assert.ok(weight(YIELDS_FIRST) > 1);
	assert.ok(weight(YIELDS_LAST) < 1);
});

test("the overline is the meta role with its figures at one width", () => {
	assert.equal(ITEM_OVERLINE, `${TEXT.variants.role.meta} ${FIGURES}`);
});

test("a place tab's tone is its text colour, never the selected tab's border", () => {
	assert.equal(placeTabContentTone("idle"), "ink-meta");
	assert.equal(placeTabContentTone("selected"), "ink-body");
});
