import assert from "node:assert/strict";
import { test } from "node:test";
import { checkHeadings, type HeadingMeasure } from "./walk-checks.ts";

const at = (level: number, name = `h${level}`): HeadingMeasure => ({
	path: `h${level}`,
	name,
	level,
});

test("one h1, then a level at a time, finds nothing", () => {
	assert.deepEqual(
		checkHeadings([at(1), at(2), at(3), at(3), at(2), at(3)]),
		[],
	);
});

test("a page whose Panes all draw h2 under the Place's h1 is held", () => {
	assert.deepEqual(
		checkHeadings([at(1, "Work"), at(2, "List"), at(2, "Item")]),
		[],
	);
});

test("no h1 is found", () => {
	const found = checkHeadings([at(2), at(3)]);
	assert.equal(found.length, 1);
	assert.equal(found[0]?.rule, "heading-one");
	assert.match(found[0]?.measured ?? "", /no h1/);
});

test("a second h1 is found (the old last-Pane h1 beside the Place's)", () => {
	const found = checkHeadings([at(1), at(2), at(1, "Item")]);
	assert.equal(found.length, 1);
	assert.equal(found[0]?.rule, "heading-one");
	assert.match(found[0]?.measured ?? "", /2 h1s/);
});

test("a skipped level is found", () => {
	const found = checkHeadings([at(1), at(3)]);
	assert.equal(found.length, 1);
	assert.equal(found[0]?.rule, "heading-order");
	assert.equal(found[0]?.measured, "h3 after h1");
});

test("a page with no headings finds nothing", () => {
	assert.deepEqual(checkHeadings([]), []);
});
