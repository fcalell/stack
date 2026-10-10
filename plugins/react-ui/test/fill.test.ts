import assert from "node:assert/strict";
import { test } from "node:test";
import { PAGE_BODY, splitMain, THREAD_COLUMN } from "@fcalell/ui-core/variants";
import {
	BODY_FILLED,
	COLUMN_FILLED,
	MAIN_FILLED,
	PART_ABOVE_FILLED,
} from "../src/ui/components/thread/fill.ts";

const MARK = "[&:has(>[data-fill])]:";
const GROUP_MARK = "group-[:has(>[data-fill])]/main:";
const PART_MARKS = [
	"[&:has(>[data-fill])>:not([data-fill])]:",
	"[&:has(>[data-fill])>:first-child:not([data-fill])]:",
];

// The sides an inset class sets: `p-*`, `px-*` and `py-*` spread to the sides
// they cover, and a `0` takes a side away; a `max-w` is a cap, `none` its end.
// A part's margin stands in the inset the body gave up, so `mx-*` and `mt-*`
// read as the sides they keep.
const SIDES: Record<string, readonly string[]> = {
	p: ["pt", "pr", "pb", "pl"],
	px: ["pr", "pl"],
	py: ["pt", "pb"],
	pt: ["pt"],
	pr: ["pr"],
	pb: ["pb"],
	pl: ["pl"],
	mx: ["pr", "pl"],
	mt: ["pt"],
	gap: ["gap"],
	"max-w": ["max-w"],
};

function insets(...cells: string[]): Record<string, string> {
	const set: Record<string, string> = {};
	for (const name of cells.join(" ").split(" ").filter(Boolean)) {
		const [, property = "", value = ""] =
			/^(max-w|[a-z]+)-(.+)$/.exec(name) ?? [];
		const sides = SIDES[property];
		assert.ok(sides, `${name} is no inset`);
		for (const side of sides) {
			if (value === "0" || value === "none") delete set[side];
			else set[side] = value;
		}
	}
	return set;
}

// The classes a marked form applies once its mark stands.
const unmarked = (form: string, ...marks: string[]) =>
	form
		.split(" ")
		.map((name) => {
			const mark = marks.find((one) => name.startsWith(one));
			assert.ok(mark, `${name} stands under the fill mark`);
			return name.slice(mark.length);
		})
		.join(" ");

test("a Split's main under the fill mark turns its `rest` cell into its `fills` one", () => {
	assert.deepEqual(
		insets(splitMain({ state: "rest" }), unmarked(MAIN_FILLED, MARK)),
		insets(splitMain({ state: "fills" })),
	);
});

test("a Place's body under the fill mark draws no `PAGE_BODY` inset and keeps its gap", () => {
	assert.deepEqual(insets(PAGE_BODY, unmarked(BODY_FILLED, MARK)), {
		gap: insets(PAGE_BODY).gap,
	});
});

test("a part above the Thread keeps the `PAGE_BODY` inset at the sides and the top, the Thread alone bleeding", () => {
	const { gap, pb, ...kept } = insets(PAGE_BODY);
	assert.ok(gap && pb, "PAGE_BODY sets a gap and a bottom inset");
	assert.deepEqual(insets(unmarked(PART_ABOVE_FILLED, ...PART_MARKS)), kept);
});

test("a record's head under its main's fill mark stands in `THREAD_COLUMN` at its start", () => {
	assert.equal(unmarked(COLUMN_FILLED, GROUP_MARK), THREAD_COLUMN);
});
