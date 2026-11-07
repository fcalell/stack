import assert from "node:assert/strict";
import { test } from "node:test";
import { definitionsOneRow, ROW_TITLE_LINES } from "./fold.ts";
import { sizeOf, spacingOf } from "./scales.ts";
import { KNOB_DEFAULTS, MEASURE_CHARACTERS, SANS_ADVANCE } from "./tokens.ts";

const short = (size: number) =>
	2 *
	MEASURE_CHARACTERS["measure-short"] *
	SANS_ADVANCE *
	sizeOf("desktop", "body", size);

test("definitionsOneRow is two short measures and the gap at the default size", () => {
	const size = KNOB_DEFAULTS.size;
	assert.equal(
		definitionsOneRow(),
		Math.ceil(
			short(size) +
				spacingOf("desktop", "stack", size) +
				2 * spacingOf("desktop", "page", size),
		),
	);
});

test("definitionsOneRow follows the size knob", () => {
	assert.ok(
		definitionsOneRow(KNOB_DEFAULTS.size + 2) >
			definitionsOneRow(KNOB_DEFAULTS.size),
	);
	assert.ok(
		definitionsOneRow(KNOB_DEFAULTS.size - 1) <
			definitionsOneRow(KNOB_DEFAULTS.size),
	);
});

test("a two-line row's title wraps to three lines", () => {
	assert.equal(ROW_TITLE_LINES, 3);
});
