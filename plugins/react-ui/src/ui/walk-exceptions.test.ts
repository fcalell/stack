import assert from "node:assert/strict";
import { test } from "node:test";
import { CENTRED } from "@fcalell/plugin-screens/shift";
import { EXCEPTIONS } from "@fcalell/plugin-screens/walk";
import { cn } from "@fcalell/ui-core/cn";
import {
	CARD,
	DEFINITION_BOX,
	DEFINITION_BOX_AREA,
	diffLine,
	FIELD_OPTIONAL_BOX,
	FORM_GROUP,
	fieldValue,
	ROWS,
	ROWS_HOST,
	ROWS_MEASURED,
	SUBGRID,
} from "@fcalell/ui-core/variants";
import {
	BAR_CHART_BODY,
	GATE_CENTRED,
	IMAGE_FRAME,
	SHEET_BACKDROP,
} from "./lib/walk-classes.ts";

const tokens = (classes: string) => classes.split(/\s+/).filter(Boolean);

// The class list each walk exception names, by the component that draws it.
// The ui-core classes are built from their constants in the walk itself; these
// are the react-ui-local ones, and the ui-core variants a component spells.
const OWNERS: Record<string, string> = {
	"BarChart body": BAR_CHART_BODY,
	"Sheet overlay": SHEET_BACKDROP,
	"Diff row": diffLine({ kind: "context" }),
	"image FRAME": IMAGE_FRAME,
	"code input": fieldValue({ kind: "code" }),
};

test("each walk exception names classes its component draws", () => {
	const named = EXCEPTIONS.filter((e) => e.owner !== undefined);
	assert.deepEqual(
		new Set(named.map((e) => e.owner)),
		new Set(Object.keys(OWNERS)),
		"every owner has its component's classes here and is used",
	);
	for (const e of named) {
		const drawn = tokens(OWNERS[e.owner ?? ""] ?? "");
		for (const token of tokens(e.classes ?? "")) {
			assert.ok(
				drawn.includes(token),
				`${e.rule} on ${e.owner}: "${token}" is not among the classes it draws (${drawn.join(" ")})`,
			);
		}
	}
	// The Gate's centred column, which the loading shift reads.
	for (const token of tokens(CENTRED)) {
		assert.ok(tokens(GATE_CENTRED).includes(token), token);
	}
});

test("the specimen exception matches only a marked main", () => {
	const specimen = EXCEPTIONS.find(
		(e) => e.rule === "type-size" && e.selector.includes("main"),
	);
	assert.equal(specimen?.selector, "main[data-specimen]");
	assert.ok(
		EXCEPTIONS.every((e) => !e.selector.includes("min-h-screen")),
		"no exception keys on a page's min-h-screen",
	);
});

test("the grid exceptions' tokens survive what a component merges over them", () => {
	// A row's own alignment (an optional name, a text area, a value of two
	// lines) replaces the box's `items-center`: the exception names what lays
	// the box out in the run's columns, which no merge drops.
	const drawn: [string, string][] = [
		[SUBGRID, cn(DEFINITION_BOX, FIELD_OPTIONAL_BOX)],
		[SUBGRID, cn(DEFINITION_BOX, DEFINITION_BOX_AREA)],
		[SUBGRID, cn(DEFINITION_BOX, "items-start")],
		[SUBGRID, cn(FORM_GROUP, "items-start")],
		[ROWS_HOST, cn(CARD, ROWS)],
		[ROWS_HOST, cn(ROWS_MEASURED)],
	];
	for (const [marker, classes] of drawn) {
		for (const token of tokens(marker)) {
			assert.ok(tokens(classes).includes(token), `${token} in ${classes}`);
		}
	}
	const grids = EXCEPTIONS.filter((e) => e.rule === "align-grid").map(
		(e) => e.classes,
	);
	assert.deepEqual(grids, [ROWS_HOST, SUBGRID]);
});
