import assert from "node:assert/strict";
import { test } from "node:test";
import {
	checkClip,
	checkDigits,
	checkFocus,
	checkFonts,
	checkHeights,
	checkRadii,
	checkRegions,
	checkRootMargins,
	checkSpacing,
	checkType,
	format,
	isBareNumber,
	type Tokens,
} from "../src/ui/walk-checks.ts";

// The checks judge by the tokens the page emits; these stand for a page.
const tokens: Tokens = {
	text: [{ name: "body", px: 14 }],
	spacing: [
		{ name: "inside", px: 6 },
		{ name: "card", px: 16 },
		{ name: "sections", px: 32 },
	],
	controls: [
		{ name: "control", px: 32 },
		{ name: "field", px: 38 },
	],
	rows: [
		{ name: "row", px: 32 },
		{ name: "row-2", px: 52 },
	],
	radius: [
		{ name: "control", px: 6 },
		{ name: "card", px: 8 },
	],
};
const at = { path: "div.box", name: "Box" };
const rules = (found: Array<{ rule: string }>) => found.map((f) => f.rule);

test("a text under 12px, and a seventh size, are found", () => {
	assert.deepEqual(checkType([{ ...at, size: 12 }]), []);
	assert.deepEqual(rules(checkType([{ ...at, size: 10 }])), ["type-size"]);
	const sizes = [12, 13, 14, 16, 18, 22].map((size) => ({ ...at, size }));
	assert.deepEqual(checkType(sizes), []);
	const seven = [...sizes, { ...at, size: 28 }];
	assert.deepEqual(rules(checkType(seven)), ["type-sizes"]);
	// 14 and 14.4 are one size on the screen.
	assert.deepEqual(
		checkType([...sizes, { ...at, size: 14.4 }]).map((f) => f.rule),
		[],
	);
});

test("a control or a row of a height no token names is found, a token's within half a pixel is not", () => {
	const ok = { ...at, kind: "button", height: 32.4 };
	assert.deepEqual(checkHeights([ok], [], tokens), []);
	const found = checkHeights([{ ...ok, height: 30 }], [], tokens);
	assert.deepEqual(rules(found), ["control-height"]);
	assert.match(found[0]?.fix ?? "", /nearest: control, 32px/);
	// A control that sets a floor grows past it, when the floor is a token.
	const grown = { ...ok, height: 74, floor: 32 };
	assert.deepEqual(checkHeights([grown], [], tokens), []);
	const badFloor = checkHeights([{ ...grown, floor: 30 }], [], tokens);
	assert.deepEqual(rules(badFloor), ["control-height"]);
	assert.match(badFloor[0]?.measured ?? "", /floor \(min-height\) 30px/);
	assert.deepEqual(
		rules(checkHeights([{ ...grown, height: 20 }], [], tokens)),
		["control-height"],
	);
	// A row is a floor its content grows past.
	const row = { ...ok, kind: "row" };
	assert.deepEqual(checkHeights([], [{ ...row, height: 40 }], tokens), []);
	assert.deepEqual(rules(checkHeights([], [{ ...row, height: 24 }], tokens)), [
		"row-height",
	]);
});

test("a gap or an inset that is neither 0 nor a spacing token is found", () => {
	const box = {
		...at,
		rowGap: 0,
		columnGap: 6,
		padding: [16, 16, 16, 16] as [number, number, number, number],
	};
	assert.deepEqual(checkSpacing([box], tokens), []);
	const found = checkSpacing(
		[{ ...box, columnGap: 7, padding: [16, 10, 16, 16] }],
		tokens,
	);
	assert.deepEqual(rules(found), ["gap", "inset"]);
	assert.match(found[1]?.measured ?? "", /padding-right 10px/);
	// Equal gaps and equal sides are one finding each.
	assert.deepEqual(
		rules(
			checkSpacing(
				[{ ...box, rowGap: 5, columnGap: 5, padding: [3, 3, 3, 3] }],
				tokens,
			),
		),
		["gap", "inset"],
	);
});

test("a radius off the roles is found, a pill and a concentric corner are not", () => {
	const box = { ...at, width: 100, height: 40 };
	const same = (r: number): [number, number, number, number] => [r, r, r, r];
	assert.deepEqual(checkRadii([{ ...box, radii: same(6) }], tokens), []);
	// Four corners at one radius are one finding.
	const off = checkRadii([{ ...box, radii: same(5) }], tokens);
	assert.deepEqual(rules(off), ["radius"]);
	assert.match(
		off[0]?.measured ?? "",
		/^top-left\/top-right\/bottom-right\/bottom-left radius 5px/,
	);
	assert.deepEqual(
		rules(checkRadii([{ ...box, radii: [6, 5, 6, 3] }], tokens)),
		["radius", "radius"],
	);
	// A pill: at least half the shorter side.
	assert.deepEqual(checkRadii([{ ...box, radii: same(20) }], tokens), []);
	assert.deepEqual(checkRadii([{ ...box, radii: same(9999) }], tokens), []);
	// Inside an 8px card at 2px: 6px. At 4px inside the card, 4px is expected.
	const inside = (radius: number, inset: number) =>
		checkRadii(
			[
				{
					...box,
					radii: same(radius),
					outer: {
						path: "div.card",
						half: 100,
						radii: same(8),
						insets: same(inset),
					},
				},
			],
			tokens,
		);
	assert.deepEqual(inside(6, 2), []);
	assert.deepEqual(rules(inside(6, 4)).slice(0, 1), ["nested-radius"]);
	// Standing a whole radius in or more, nothing is concentric to hold.
	assert.deepEqual(inside(6, 8), []);
	// A knob in a pill track: both radii draw as half their side.
	const knob = checkRadii(
		[
			{
				...at,
				width: 14,
				height: 14,
				radii: same(9999),
				outer: {
					path: "span.track",
					half: 9,
					radii: same(9999),
					insets: same(2),
				},
			},
		],
		tokens,
	);
	assert.deepEqual(knob, []);
});

test("a clipping box with more inside than it shows is found unless it ends in an ellipsis or a clamp", () => {
	const clipped = {
		...at,
		overflowX: "hidden",
		textOverflow: "clip",
		lineClamp: "none",
		scrollWidth: 120,
		clientWidth: 100,
	};
	assert.deepEqual(rules(checkClip([clipped])), ["clip"]);
	assert.deepEqual(checkClip([{ ...clipped, textOverflow: "ellipsis" }]), []);
	assert.deepEqual(checkClip([{ ...clipped, lineClamp: "2" }]), []);
	assert.deepEqual(checkClip([{ ...clipped, overflowX: "auto" }]), []);
	assert.deepEqual(checkClip([{ ...clipped, scrollWidth: 101 }]), []);
});

test("a face still loading at the first frame, or failed, is found", () => {
	const face = "IBM Plex Sans 400 normal";
	assert.deepEqual(
		checkFonts([{ face, atPaint: "loaded", now: "loaded" }]),
		[],
	);
	assert.deepEqual(
		checkFonts([{ face, atPaint: "unseen", now: "unloaded" }]),
		[],
	);
	assert.deepEqual(
		rules(checkFonts([{ face, atPaint: "loading", now: "loaded" }])),
		["font-late"],
	);
	assert.deepEqual(
		rules(checkFonts([{ face, atPaint: "loading", now: "error" }])),
		["font-failed"],
	);
});

test("a bare number is digits with separators, a sign, a percent, a currency or a short unit", () => {
	for (const text of [
		"42",
		"1,234.50",
		"-3",
		"+12%",
		"$9.99",
		"€ 12",
		"340 ms",
		"12:30",
	])
		assert.ok(isBareNumber(text), text);
	for (const text of ["Deploy 42", "2 of 5", "42 minutes ago", "v2", ""])
		assert.equal(isBareNumber(text), false, text);
});

test("a bare number without tabular figures is found, a sentence with digits is not", () => {
	const number = { ...at, text: "1,234", variantNumeric: "normal" };
	assert.deepEqual(rules(checkDigits([number])), ["tabular-digits"]);
	assert.deepEqual(
		checkDigits([{ ...number, variantNumeric: "tabular-nums" }]),
		[],
	);
	assert.deepEqual(
		checkDigits([{ ...number, text: "Deploy 1,234 failed" }]),
		[],
	);
	// A monospaced face has one width for every digit already.
	assert.deepEqual(checkDigits([{ ...number, monospace: true }]), []);
});

test("a region inside a region of its name is found, one inside another name is not", () => {
	const region = (name: string, outer: string) => ({
		...at,
		regionName: name,
		within: [{ path: "section", regionName: outer }],
	});
	assert.deepEqual(
		rules(checkRegions([region("Architecture", "Architecture")])),
		["region-name"],
	);
	assert.deepEqual(checkRegions([region("Tree", "Architecture")]), []);
	assert.deepEqual(
		checkRegions([{ ...at, regionName: "Tree", within: [] }]),
		[],
	);
});

test("a root with any margin is found, a negative one included", () => {
	const root = (margin: [number, number, number, number]) => ({
		...at,
		margin,
	});
	assert.deepEqual(checkRootMargins([root([0, 0, 0, 0])]), []);
	assert.deepEqual(rules(checkRootMargins([root([0, 0, 8, 0])])), [
		"root-margin",
	]);
	assert.deepEqual(rules(checkRootMargins([root([-4, 0, 0, 0])])), [
		"root-margin",
	]);
});

test("a focused element under a fixed or sticky element is found, one under a plain overlap is not", () => {
	assert.deepEqual(checkFocus(null), []);
	assert.deepEqual(checkFocus({ ...at, hit: "self" }), []);
	assert.deepEqual(
		checkFocus({ ...at, hit: { covered: "div.bar", positioned: false } }),
		[],
	);
	assert.deepEqual(
		rules(checkFocus({ ...at, hit: { covered: "div.bar", positioned: true } })),
		["focus-covered"],
	);
});

test("equal findings are one line with a count, in the order they were found", () => {
	const lines = format([
		...checkType([
			{ ...at, size: 10 },
			{ ...at, size: 10 },
		]),
		...checkRootMargins([{ ...at, path: "p", margin: [1, 0, 0, 0] }]),
	]);
	assert.equal(lines.length, 2);
	assert.match(
		lines[0] ?? "",
		/^type-size: div\.box "Box" ×2 measured 10px, expected at least 12px; fix: /,
	);
	assert.match(
		lines[1] ?? "",
		/^root-margin: p "Box" measured margin 1px 0px 0px 0px/,
	);
});
