import assert from "node:assert/strict";
import { test } from "node:test";
import { composeMap, SlotConflictError, slot } from "./slots.ts";

const results = (...values: Array<Record<string, number>>) =>
	values.map((value, i) => ({ plugin: `p${i}`, value }));

test("a map slot with no merge throws on a duplicate key", () => {
	const s = slot.map<number>({ source: "t", name: "plain" });
	assert.throws(
		() => composeMap(s, results({ a: 1 }, { a: 2 })),
		SlotConflictError,
	);
	assert.deepEqual(composeMap(s, results({ a: 1 }, { b: 2 })), { a: 1, b: 2 });
});

test("a map slot's merge combines the duplicates of a key pairwise", () => {
	const s = slot.map<number>({
		source: "t",
		name: "sum",
		merge: (a, b) => a + b,
	});
	assert.deepEqual(composeMap(s, results({ a: 1 }, { a: 2 }, { a: 4, b: 1 })), {
		a: 7,
		b: 1,
	});
});

test("merge declining with undefined leaves the duplicate a conflict, and sees the key", () => {
	const seen: string[] = [];
	const s = slot.map<number>({
		source: "t",
		name: "some",
		merge: (a, b, key) => {
			seen.push(key);
			return key === "sum" ? a + b : undefined;
		},
	});
	assert.deepEqual(composeMap(s, results({ sum: 1 }, { sum: 2 })), { sum: 3 });
	assert.throws(
		() => composeMap(s, results({ x: 1 }, { x: 2 })),
		SlotConflictError,
	);
	assert.deepEqual(seen, ["sum", "x"]);
});

test("keyOf makes keys of one identity one entry under the first spelling", () => {
	const s = slot.map<number>({
		source: "t",
		name: "fold",
		keyOf: (k) => k.toLowerCase(),
		merge: (a, b) => a + b,
	});
	assert.deepEqual(composeMap(s, results({ Key: 1 }, { KEY: 2 })), { Key: 3 });
	const plain = slot.map<number>({
		source: "t",
		name: "foldplain",
		keyOf: (k) => k.toLowerCase(),
	});
	assert.throws(
		() => composeMap(plain, results({ Key: 1 }, { KEY: 2 })),
		SlotConflictError,
	);
});
