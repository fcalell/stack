import assert from "node:assert/strict";
import { test } from "node:test";
import {
	checkFonts,
	checkHeadings,
	type HeadingMeasure,
	isHeading,
	isMetricFallback,
} from "./walk-checks.ts";

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

test("a heading under aria-hidden or inert is not one, unless a modal Sheet hides it", () => {
	const drawn = { drawn: true, hidden: false, modal: false };
	assert.equal(isHeading(drawn), true);
	assert.equal(isHeading({ ...drawn, hidden: true }), false);
	// The Place's h1 behind an open modal is still the page's: the page is judged
	// as it stands once the Sheet closes, so it does not read as "no h1".
	assert.equal(isHeading({ ...drawn, hidden: true, modal: true }), true);
	// A heading that does not draw (a Pane folded away) is never one.
	assert.equal(isHeading({ ...drawn, drawn: false, modal: true }), false);
});

test("a metric fallback face that failed is no finding, a served face that failed is", () => {
	const failed = (face: string) => ({ face, atPaint: "unseen", now: "error" });
	// The headless browser has no Arial: the face a "→" asks for fails there.
	assert.deepEqual(
		checkFonts([failed('"IBM Plex Sans Fallback" 100 700 normal')]),
		[],
	);
	assert.deepEqual(
		checkFonts([failed("IBM Plex Mono Fallback 400 normal")]),
		[],
	);
	assert.equal(
		checkFonts([failed('"IBM Plex Sans" 100 700 normal')])[0]?.rule,
		"font-failed",
	);
	assert.equal(isMetricFallback("Fallback Serif 400 normal"), false);
});
