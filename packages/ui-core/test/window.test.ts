import assert from "node:assert/strict";
import { test } from "node:test";
import { type Placed, ranged, slotsOf } from "../src/window.ts";

// Rows 40px tall with `gap` between, as the virtualizer places them.
const place = (indices: number[], gap: number): Placed[] =>
	indices.map((index) => ({
		index,
		start: index * (40 + gap),
		end: index * (40 + gap) + 40,
	}));
const totalOf = (count: number, gap: number) => count * 40 + (count - 1) * gap;

// n unmounted rows take n rows and n - 1 gaps; a spacer stands for exactly
// that, its neighbours' gaps already added around it.
const taken = (n: number, gap: number) => n * 40 + (n - 1) * gap;

for (const gap of [0, 12]) {
	test(`spaces stand at the top, between and at the bottom (gap ${gap})`, () => {
		const slots = slotsOf(place([3, 4, 9], gap), 20, totalOf(20, gap), gap);
		assert.deepEqual(slots, [
			{ space: taken(3, gap), before: 3 },
			{ row: 3 },
			{ row: 4 },
			{ space: taken(4, gap), before: 9 },
			{ row: 9 },
			{ space: taken(10, gap), before: 20 },
		]);
	});
}

test("a contiguous range yields one run of rows", () => {
	const slots = slotsOf(place([0, 1, 2], 8), 3, totalOf(3, 8), 8);
	assert.deepEqual(slots, [{ row: 0 }, { row: 1 }, { row: 2 }]);
});

test("zero-height spaces are omitted", () => {
	const top = slotsOf(place([0, 1], 0), 5, totalOf(5, 0), 0);
	assert.deepEqual(top, [{ row: 0 }, { row: 1 }, { space: 120, before: 5 }]);
	const bottom = slotsOf(place([3, 4], 0), 5, totalOf(5, 0), 0);
	assert.deepEqual(bottom, [{ space: 120, before: 3 }, { row: 3 }, { row: 4 }]);
});

test("rows with nothing mounted give one space of the whole total", () => {
	assert.deepEqual(slotsOf([], 5, 200, 0), [{ space: 200, before: 5 }]);
	assert.deepEqual(slotsOf([], 0, 0, 0), []);
});

test("ranged adds the overscan and clips it to the count", () => {
	assert.deepEqual(
		ranged({ startIndex: 1, endIndex: 3, overscan: 2, count: 6 }, []),
		[0, 1, 2, 3, 4, 5],
	);
});

test("a kept index far from the range makes two runs", () => {
	const indices = ranged(
		{ startIndex: 0, endIndex: 2, overscan: 1, count: 100 },
		[50],
	);
	assert.deepEqual(indices, [0, 1, 2, 3, 50]);
	const slots = slotsOf(place(indices, 0), 100, totalOf(100, 0), 0);
	assert.equal(slots.filter((s) => "space" in s).length, 2);
});

test("a kept index inside the range, out of bounds or unset changes nothing", () => {
	const range = { startIndex: 4, endIndex: 6, overscan: 0, count: 10 };
	const plain = ranged(range, []);
	assert.deepEqual(ranged(range, [5, undefined, -1, 10, 99, 2.5]), [...plain]);
});

test("a kept index is sorted in and unique", () => {
	assert.deepEqual(
		ranged({ startIndex: 4, endIndex: 5, overscan: 0, count: 10 }, [9, 0, 4]),
		[0, 4, 5, 9],
	);
});
