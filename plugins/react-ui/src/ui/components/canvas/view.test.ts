import assert from "node:assert/strict";
import { test } from "node:test";
import type { Box } from "./geometry.ts";
import { type Clearance, clearOfStack, fitTransform, inside } from "./view.ts";

const inset = 16;
// A phone's pane: the zoom stack at the bottom left reaches 70 px in and 150 up.
const phone = { width: 320, height: 600 };
const stack: Clearance = { left: 70, bottom: 0, stack: 150 };
const icon = { start: 12, end: 44 };

// The start node over a column, and a branch that runs far to its left.
const start: Box = { x: 0, y: 0, width: 240, height: 64 };
const low: Box = { x: 0, y: 520, width: 240, height: 64 };
const branch: Box = { x: -400, y: 260, width: 240, height: 64 };
const bounds: Box = { x: -400, y: 0, width: 640, height: 584 };

test("the opening view keeps the start node whole while it clears the zoom stack", () => {
	const view = fitTransform(bounds, phone, inset, stack, start, {
		nodes: [start, low, branch],
		icon,
	});
	assert.equal(view.k, 1);
	assert.ok(inside(start, view, phone, inset), "the start node stands whole");
	// No offset clears the low node whole and keeps the start whole, so its icon
	// stands clear of the stack.
	assert.ok(low.x + icon.start + view.x >= stack.left, "the icon is clear");
});

test("the opening view clears whole nodes where the start node allows it", () => {
	const wide = { width: 800, height: 600 };
	const view = fitTransform(bounds, wide, inset, stack, start, {
		nodes: [start, low, branch],
		icon,
	});
	assert.ok(inside(start, view, wide, inset));
	assert.ok(low.x + view.x >= stack.left, "the low node stands past the stack");
});

test("a framed view stands its start node on the room's middle, whatever its group heads", () => {
	const pane = { width: 422, height: 900 };
	// A graph that runs past the room on both sides of its start node.
	const across: Box = { x: -400, y: 0, width: 1040, height: 584 };
	const view = fitTransform(
		across,
		pane,
		inset,
		{ ...stack, stack: 0 },
		start,
		{ nodes: [start, low, branch], icon },
	);
	assert.ok(inside(start, view, pane, inset));
	const room = { x: stack.left, width: pane.width - inset - stack.left };
	const centre = view.x + start.x + start.width / 2;
	assert.ok(Math.abs(centre - (room.x + room.width / 2)) < 1);
});

test("Fit, under the text floor, frames the whole graph", () => {
	const pane = { width: 422, height: 900 };
	const view = fitTransform(
		bounds,
		pane,
		inset,
		{ ...stack, stack: 0 },
		start,
		{ nodes: [start, low, branch], icon },
		0.1,
	);
	assert.ok(view.k < 1);
	assert.ok(inside(bounds, view, pane, inset - 1e-6));
});

test("a graph that fits at its own size opens centred at scale 1", () => {
	const pane = { width: 1200, height: 900 };
	const view = fitTransform(bounds, pane, inset, NO_STACK, start);
	assert.equal(view.k, 1);
	assert.ok(inside(bounds, view, pane, inset));
});

const NO_STACK: Clearance = { left: 0, bottom: 0, stack: 0 };

test("a node zoomed to under the zoom stack moves past it, or over it where the pane is too narrow", () => {
	const wide = { width: 800, height: 600 };
	// The node's left edge at 40, its foot at 560: in the stack's corner.
	const under = { x: 40, y: 496, k: 1 };
	assert.deepEqual(clearOfStack(low, under, wide, inset, stack), {
		x: 70,
		y: 496,
		k: 1,
	});
	// A phone holds the node past the stack only to 310: it moves up over it.
	assert.deepEqual(clearOfStack(low, under, phone, inset, stack), {
		x: 40,
		y: 450 - 584,
		k: 1,
	});
	// A node clear of the stack's rows stays.
	const high = { x: 40, y: 0, k: 1 };
	assert.equal(clearOfStack(start, high, wide, inset, stack), high);
});
