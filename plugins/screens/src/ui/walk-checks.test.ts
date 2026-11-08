import assert from "node:assert/strict";
import { test } from "node:test";
import {
	type Above,
	type CanvasMeasure,
	checkCanvases,
	checkCentres,
	checkCovered,
	checkFigures,
	checkFonts,
	checkHeadings,
	checkTables,
	checkWords,
	contentCentre,
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
	// The face the theme emits declares no weight, so the browser says `normal`.
	assert.deepEqual(
		checkFonts([failed('"IBM Plex Sans Fallback" normal normal')]),
		[],
	);
	assert.deepEqual(
		checkFonts([failed("IBM Plex Mono Fallback normal normal")]),
		[],
	);
	assert.equal(
		checkFonts([failed('"IBM Plex Sans" 100 700 normal')])[0]?.rule,
		"font-failed",
	);
	assert.equal(isMetricFallback("Fallback Serif 400 normal"), false);
});

const rect = (left: number, top: number, width: number, height: number) => ({
	left,
	top,
	right: left + width,
	bottom: top + height,
});

// A phone's canvas: the pane 320 wide, the zoom stack in its lower-left corner.
const phone = (
	nodes: CanvasMeasure["nodes"],
	stack = rect(16, 440, 44, 132),
): CanvasMeasure => ({
	path: "section[aria-label=Flow]",
	name: "Flow",
	pane: rect(0, 0, 320, 600),
	stack,
	nodes,
});

test("a canvas whose nodes stand whole and clear of the zoom stack is held", () => {
	assert.deepEqual(
		checkCanvases([
			phone([
				{ name: "start", rect: rect(80, 20, 44, 44) },
				{ name: "end", rect: rect(200, 480, 44, 44) },
				// A node wholly beyond the pane's far side is the viewer's to pan to.
				{ name: "far", rect: rect(340, 20, 44, 44) },
			]),
		]),
		[],
	);
});

test("a node cut at the pane's start, or under the zoom stack, is found", () => {
	const found = checkCanvases([
		phone([
			{ name: "left", rect: rect(-30, 20, 240, 64) },
			{ name: "low", rect: rect(40, 470, 240, 64) },
		]),
	]);
	assert.deepEqual(
		found.map((one) => [one.rule, one.name]),
		[
			["canvas-open", "left"],
			["canvas-open", "low"],
		],
	);
	assert.match(found[0]?.measured ?? "", /cut by 30px at the pane's start/);
	assert.match(found[1]?.measured ?? "", /under the zoom stack/);
});

test("a Table in a measured Pane is found, in a wide Pane or none is not", () => {
	const table = (pane: { wide: boolean } | null) => ({
		path: "table[grid]",
		name: "Tasks",
		pane: pane && {
			path: "section",
			name: "Projects",
			wide: pane.wide,
			last: false,
			before: null,
		},
	});
	const found = checkTables([table({ wide: false })]);
	assert.equal(found.length, 1);
	assert.equal(found[0]?.rule, "table-pane");
	assert.match(found[0]?.measured ?? "", /Projects/);
	assert.deepEqual(checkTables([table({ wide: true }), table(null)]), []);
});

test("a Table in a wide Pane standing last after another Pane is found, naming both", () => {
	const table = (last: boolean, before: boolean) => ({
		path: "table[grid]",
		name: "Tasks",
		pane: {
			path: "section#tasks",
			name: "Tasks",
			wide: true,
			last,
			before: before ? { path: "section#projects", name: "Projects" } : null,
		},
	});
	const found = checkTables([table(true, true)]);
	assert.equal(found.length, 1);
	assert.equal(found[0]?.rule, "table-pane");
	assert.match(found[0]?.measured ?? "", /"Tasks".*"Projects"/);
	assert.match(found[0]?.fix ?? "", /gives way.*`cover`/);
	// Alone (nothing standing before), or not last, it takes the room.
	assert.deepEqual(checkTables([table(true, false), table(false, true)]), []);
});

test("a Table in a wide Pane that covers is held: the Pane before it is hidden", () => {
	// The walker reads `before` as the nearest Pane that shows, and a covered
	// Pane is `display: none`, so a `wide cover` Pane has none.
	assert.deepEqual(
		checkTables([
			{
				path: "table[grid]",
				name: "Tasks",
				pane: {
					path: "section#tasks",
					name: "Tasks",
					wide: true,
					last: true,
					before: null,
				},
			},
		]),
		[],
	);
});

const above = (over: Partial<Above> = {}): Above => ({
	path: "div.act",
	name: "Open",
	related: false,
	paints: true,
	layer: false,
	sticky: false,
	...over,
});
const own = above({
	path: "p",
	name: "sentence",
	related: true,
	paints: false,
});
const covered = (...stack: Above[]) => [
	{ path: "p", name: "A sentence that wraps", samples: [stack] },
];

test("a painted box over the last line of a text is found (a Banner's act on touch)", () => {
	const found = checkCovered(covered(above(), own));
	assert.equal(found.length, 1);
	assert.equal(found[0]?.rule, "text-covered");
	assert.match(found[0]?.measured ?? "", /div\.act/);
});

test("a text with only its own boxes at every point is not covered", () => {
	assert.deepEqual(checkCovered(covered(own)), []);
	assert.deepEqual(checkCovered(covered()), []);
});

test("a transparent box, a layer and a sticky box are no cover", () => {
	assert.deepEqual(checkCovered(covered(above({ paints: false }), own)), []);
	assert.deepEqual(checkCovered(covered(above({ layer: true }), own)), []);
	assert.deepEqual(checkCovered(covered(above({ sticky: true }), own)), []);
});

test("a relative above the text is no cover", () => {
	assert.deepEqual(checkCovered(covered(above({ related: true }), own)), []);
});

test("the Banner canary: the act over the sentence's last line fails, the act under it passes", () => {
	const sentence = { path: "p", name: "A sentence that wraps" };
	// Before d17a4ced on touch: the act is inline-flex after the sentence, its
	// target taller than the line, so it stands over the last line's end.
	const before = [{ ...sentence, samples: [[own], [own], [above(), own]] }];
	// After: a column, the act in a row of its own under the sentence.
	const after = [{ ...sentence, samples: [[own], [own], [own]] }];
	assert.equal(checkCovered(before).length, 1);
	assert.deepEqual(checkCovered(after), []);
});

test("a short word on two lines is found, whole words and long ones are not", () => {
	const at = { path: "p", name: "" };
	const found = checkWords([
		{ ...at, word: "Sprint", lines: 2 },
		{ ...at, word: "Echo", lines: 1 },
	]);
	assert.equal(found.length, 1);
	assert.equal(found[0]?.rule, "word-split");
	assert.deepEqual(checkWords([{ ...at, word: "Echo", lines: 1 }]), []);
});

test("a figure cut by its clipping box is found, a whole one and a word are not", () => {
	const at = { path: "p", name: "" };
	const found = checkFigures([
		{ ...at, text: "4,583", over: 20 },
		{ ...at, text: "4,583", over: 0 },
		{ ...at, text: "Playing time", over: 20 },
	]);
	assert.equal(found.length, 1);
	assert.equal(found[0]?.rule, "figure-cut");
});

test("a row's centre is its content box's: padding that is symmetric moves nothing, a taller foot lifts it", () => {
	assert.equal(contentCentre(100, 40, 8, 8), 120);
	assert.equal(contentCentre(100, 60, 8, 28), 120);
	const row = (ends: number) => ({
		path: "r",
		name: "r",
		kind: "row",
		centre: contentCentre(100, 60, 8, 28),
		ends: [{ path: "e", name: "e", centre: ends }],
	});
	assert.deepEqual(checkCentres([row(120)]), []);
	assert.equal(checkCentres([row(130)]).length, 1);
});
