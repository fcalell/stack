import assert from "node:assert/strict";
import { test } from "node:test";
import { PAGE_BODY, splitMain, THREAD_COLUMN } from "@fcalell/ui-core/variants";
import {
	BODY_FILLED,
	COLUMN_FILLED,
	MAIN_FILLED,
} from "../src/ui/components/thread/fill.ts";

const MARK = "[&:has(>[data-fill])]:";
const GROUP_MARK = "group-[:has(>[data-fill])]/main:";

// The sides an inset class sets: `p-*`, `px-*` and `py-*` spread to the sides
// they cover, and a `0` takes a side away; a `max-w` is a cap, `none` its end.
const SIDES: Record<string, readonly string[]> = {
	p: ["pt", "pr", "pb", "pl"],
	px: ["pr", "pl"],
	py: ["pt", "pb"],
	pt: ["pt"],
	pr: ["pr"],
	pb: ["pb"],
	pl: ["pl"],
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
const unmarked = (form: string, mark: string) =>
	form
		.split(" ")
		.map((name) => {
			assert.ok(name.startsWith(mark), `${name} stands under the fill mark`);
			return name.slice(mark.length);
		})
		.join(" ");

test("a Split's main under the fill mark turns its `rest` cell into its `fills` one", () => {
	assert.deepEqual(
		insets(splitMain({ state: "rest" }), unmarked(MAIN_FILLED, MARK)),
		insets(splitMain({ state: "fills" })),
	);
});

test("a Place's body under the fill mark draws no `PAGE_BODY` inset", () => {
	assert.deepEqual(insets(PAGE_BODY, unmarked(BODY_FILLED, MARK)), {});
});

test("a record's head under its main's fill mark stands in `THREAD_COLUMN`, centred", () => {
	assert.equal(unmarked(COLUMN_FILLED, GROUP_MARK), `${THREAD_COLUMN} mx-auto`);
});
