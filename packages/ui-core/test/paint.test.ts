import assert from "node:assert/strict";
import { test } from "node:test";
import {
	PAINT_ROWS,
	type PaintRole,
	painting,
	paintText,
} from "../src/paint.ts";

const ROLES: PaintRole[] = [
	"title",
	"name",
	"word",
	"phrase",
	"sentence",
	"paragraph",
	"figure",
	"id",
];

test("the same role and place paint the same text, every time", () => {
	for (const role of ROLES) {
		for (let at = 0; at < PAINT_ROWS; at++) {
			assert.equal(paintText(role, at), paintText(role, at));
		}
	}
});

test("neighbouring places paint different lengths of a role", () => {
	for (const role of ROLES) {
		const lengths = new Set(
			Array.from({ length: PAINT_ROWS }, (_, at) => paintText(role, at).length),
		);
		assert(lengths.size > 1, `${role} paints one length`);
	}
});

test("text is whole words of letters, a figure or id is zeros, none empty or edged by a space", () => {
	for (const role of ROLES) {
		for (let at = 0; at < 6; at++) {
			const text = paintText(role, at);
			assert(text.length > 0 && text === text.trim(), `${role} ${at}`);
			const pattern =
				role === "figure" || role === "id" ? /^0+$/ : /^[a-z]+( [a-z]+)*$/;
			assert.match(text, pattern);
		}
	}
});

test("a slot that throws over the filler paints as the item, a slot that answers is run", () => {
	const warn = console.warn;
	console.warn = () => {};
	try {
		const item = { n: 1 };
		assert.equal(
			painting(() => {
				throw new Error("no field");
			}, item),
			item,
		);
	} finally {
		console.warn = warn;
	}
	assert.equal(
		painting((x: { n: number }) => x.n + 1, { n: 1 }),
		2,
	);
});
