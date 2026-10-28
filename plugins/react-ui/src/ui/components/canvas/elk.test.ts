import assert from "node:assert/strict";
import { test } from "node:test";
import type { ElkNode } from "elkjs/lib/elk-api.js";
import { fromElk, wrapParts } from "./elk.ts";

// ELK's row of three top parts: two groups of one page each, side by side, and
// a loose node an edge links to the second group's page.
const output: ElkNode = {
	id: "root",
	children: [
		{
			id: "g:a",
			x: 16,
			y: 16,
			width: 312,
			height: 116,
			children: [{ id: "n:a1", x: 32, y: 56, width: 280, height: 60 }],
		},
		{
			id: "g:b",
			x: 344,
			y: 16,
			width: 312,
			height: 116,
			children: [{ id: "n:b1", x: 360, y: 56, width: 280, height: 60 }],
		},
		{ id: "n:c", x: 360, y: 200, width: 280, height: 60 },
	],
};
const edges = [{ from: "b1", to: "c" }];
const gaps = { across: 16, down: 40 };

test("a row of unlinked parts the room holds keeps ELK's places", () => {
	const positions = fromElk(output);
	assert.equal(wrapParts(output, positions, edges, 700, gaps), positions);
});

test("a row of unlinked parts wider than the room wraps them in a column", () => {
	const wrapped = wrapParts(output, fromElk(output), edges, 300, gaps);
	assert.deepEqual(wrapped.get("a1"), { x: 32, y: 56 });
	// The second part, the group and the node its edge links, stands under the
	// first, at the row's start, the `down` gap under it.
	assert.deepEqual(wrapped.get("b1"), { x: 32, y: 56 + 116 + 40 });
	assert.deepEqual(wrapped.get("c"), { x: 32, y: 200 + 116 + 40 });
});

test("one part, however wide, keeps ELK's places", () => {
	const positions = fromElk(output);
	const linked = [...edges, { from: "a1", to: "b1" }];
	assert.equal(wrapParts(output, positions, linked, 100, gaps), positions);
});
