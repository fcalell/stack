import assert from "node:assert/strict";
import { test } from "node:test";
import {
	chartHead,
	chartScale,
	currencyOf,
	tickReach,
	unitOf,
} from "../src/chart.ts";

test("four even steps over the peak, each the first whole multiple of its magnitude", () => {
	assert.deepEqual(chartScale([100]), { step: 30, bands: 4, top: 120 });
	assert.deepEqual(chartScale([130]), { step: 40, bands: 4, top: 160 });
});

test("a whole peak of 3 ticks 1, 2, 3 and stops at its top", () => {
	assert.deepEqual(chartScale([3, 2, 1]), { step: 1, bands: 3, top: 3 });
});

test("a whole peak of 1 draws one band", () => {
	assert.deepEqual(chartScale([1]), { step: 1, bands: 1, top: 1 });
	assert.deepEqual(chartScale([2]), { step: 1, bands: 2, top: 2 });
});

test("an empty chart keeps four bands over a step of 1", () => {
	assert.deepEqual(chartScale([]), { step: 1, bands: 4, top: 4 });
	assert.deepEqual(chartScale([0, 0]), { step: 1, bands: 4, top: 4 });
});

test("a whole peak whose derived step is already whole keeps four bands", () => {
	assert.deepEqual(chartScale([4]), { step: 1, bands: 4, top: 4 });
	assert.deepEqual(chartScale([5]), { step: 2, bands: 4, top: 8 });
	assert.deepEqual(chartScale([37]), { step: 10, bands: 4, top: 40 });
});

test("a fractional figure keeps the derived step and four bands", () => {
	assert.deepEqual(chartScale([3], [3, 0.5]), {
		step: 0.8,
		bands: 4,
		top: 3.2,
	});
	assert.equal(chartScale([0.3]).step, 0.08);
	assert.equal(chartScale([0.3]).bands, 4);
});

test("a stack's whole parts scale as whole figures", () => {
	assert.deepEqual(chartScale([3], [3, 2, 1]), { step: 1, bands: 3, top: 3 });
});

const SERIES: Array<{ value: number; parts: Record<string, number> }> = [
	{ value: 5, parts: { open: 3, closed: 2 } },
	{ value: 4, parts: { open: 1, closed: 3 } },
	{ value: 1, parts: { open: 1 } },
];

test("a flow's head is the sum of its bars and of each part", () => {
	assert.deepEqual(chartHead(SERIES, ["open", "closed"], false), {
		total: 10,
		parts: [5, 5],
	});
});

test("a level's head is the last bar's value and parts", () => {
	assert.deepEqual(chartHead(SERIES, ["open", "closed"], true), {
		total: 1,
		parts: [1, 0],
	});
});

test("a level with no bar reads 0", () => {
	assert.deepEqual(chartHead([], ["open"], true), { total: 0, parts: [0] });
});

test("a chart's unit takes its singular at one and its plural at every other count, and a bare word stays", () => {
	const flags = { one: "flag", other: "flags" };
	assert.equal(unitOf(flags, 1), "flag");
	assert.equal(unitOf(flags, 0), "flags");
	assert.equal(unitOf(flags, 6), "flags");
	assert.equal(unitOf("minutes", 1), "minutes");
});

test("a currency is a unit with no word, and a word names no currency", () => {
	const dollars = { currency: "USD" };
	assert.equal(currencyOf(dollars), "USD");
	assert.equal(unitOf(dollars, 31), undefined);
	assert.equal(currencyOf("minutes"), undefined);
	assert.equal(currencyOf({ one: "flag", other: "flags" }), undefined);
	assert.equal(currencyOf(undefined), undefined);
});

test("the top tick reaches half a meta line above the plot", () => {
	assert.equal(tickReach("desktop"), 9);
	assert.equal(tickReach("touch"), 11);
});
