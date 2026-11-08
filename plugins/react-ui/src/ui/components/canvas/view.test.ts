import assert from "node:assert/strict";
import { test } from "node:test";
import type { Box } from "./geometry.ts";
import {
	type Clearance,
	clearOfStack,
	fitTransform,
	inside,
	OPEN_UNDER,
	overviewTransform,
	solveScale,
	standIn,
	standsIn,
} from "./view.ts";

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

test("an overview opens at the highest scale its drawing holds across the room, each step measured again", () => {
	// Glyphs, a frame's padding and a name keep their size on screen: the drawing
	// takes a constant of 40 px and the centres' 300 flow units at the scale.
	const taken = (k: number) => 40 + 300 * k;
	const room = phone.width - inset - stack.left;
	const { k, whole } = solveScale(taken, 300, room, 0.5);
	assert.ok(whole && k >= 0.5 && k < OPEN_UNDER);
	assert.ok(taken(k) <= room + 1e-6, "it holds in the room");
	assert.ok(taken(k + 0.02) > room, "and nothing higher does");
	// A drawing the room holds at the cap opens at the cap, just under the text floor.
	assert.equal(solveScale(() => 40, 300, room, 0.5).k, OPEN_UNDER);
	// One it holds only under `lowest` opens at `lowest`, not whole.
	assert.deepEqual(
		solveScale((at) => 400 + 300 * at, 300, room, 0.5),
		{
			k: 0.5,
			whole: false,
		},
	);
	// Frames that grow in steps as the zoom moves are measured at the scale asked.
	const stepped = (at: number) => 40 + 300 * at + (at > 0.7 ? 30 : 0);
	assert.ok(stepped(solveScale(stepped, 300, room, 0.5).k) <= room + 1e-6);
});

test("an overview stands clear of the zoom stack, whole where it holds and against the room's start where it does not", () => {
	const room = phone.width - inset - stack.left;
	// What it draws at 0.5: 400 px of glyphs, frames and names is wider than the
	// room, 150 is not. The first node stands at the top of the drawing.
	const first: Box = { x: 100, y: 0, width: 44, height: 44 };
	const held = overviewTransform(
		{ x: 0, y: 0, width: 300, height: 400 },
		0.5,
		phone,
		inset,
		stack,
		first,
	);
	// 150 px across: centred in the room past the stack.
	assert.equal(held.x, stack.left + (room - 150) / 2);
	const cut = overviewTransform(
		{ x: 0, y: 0, width: 800, height: 400 },
		0.5,
		phone,
		inset,
		stack,
		first,
	);
	// 400 px across: its start at the room's start, so the leftmost node is whole
	// and past the stack, and the first node is in the pane.
	assert.equal(cut.x, stack.left);
	assert.ok(inside(first, cut, phone, inset));
});

test("an overview moves back only as far as its anchor needs, and its anchor stands clear of the stack", () => {
	// The anchor is far along, a running node near the far end of the drawing.
	const far: Box = { x: 700, y: 0, width: 44, height: 44 };
	const view = overviewTransform(
		{ x: 0, y: 0, width: 800, height: 400 },
		0.5,
		phone,
		inset,
		stack,
		far,
	);
	assert.ok(inside(far, view, phone, inset), "the anchor stands whole");
	// And one deep in the pane's foot is lifted past the stack's rows.
	const deep: Box = { x: 0, y: 900, width: 44, height: 44 };
	const lowered = overviewTransform(
		{ x: 0, y: 0, width: 800, height: 1000 },
		0.5,
		phone,
		inset,
		stack,
		deep,
	);
	assert.ok(inside(deep, lowered, phone, inset));
	assert.ok(
		deep.x * lowered.k + lowered.x >= stack.left ||
			(deep.y + deep.height) * lowered.k + lowered.y <=
				phone.height - stack.stack,
		"the anchor is not under the stack",
	);
});

test("a framed view lifts its anchor into the room when it stands below the pane's foot", () => {
	const tall: Box = { x: -400, y: 0, width: 1040, height: 2000 };
	const running: Box = { x: 0, y: 1500, width: 240, height: 64 };
	const view = fitTransform(
		tall,
		phone,
		inset,
		{ ...stack, stack: 0 },
		running,
		{
			nodes: [start, running],
			icon,
		},
	);
	assert.ok(view.k === 1);
	const bottom = (running.y + running.height) * view.k + view.y;
	assert.ok(bottom <= phone.height - inset, "the running node is in the room");
	assert.ok(running.y * view.k + view.y >= inset);
});

test("a node brought into view stands centred in the room the stack leaves, and never under it", () => {
	const wide = { width: 800, height: 600 };
	const room = { x: stack.left, width: wide.width - inset - stack.left };
	const view = standIn(low, 1, wide, inset, stack);
	assert.ok(standsIn(low, view, wide, inset, stack));
	assert.ok(
		Math.abs(view.x + low.x + low.width / 2 - (room.x + room.width / 2)) < 1,
		"centred across the room past the stack's column",
	);
	// A phone's room is narrower than the node, which would stand over the stack's
	// column: it moves up out of the stack's rows instead.
	const narrow = standIn(low, 1, phone, inset, stack);
	assert.ok(
		(low.y + low.height) * narrow.k + narrow.y <= phone.height - stack.stack,
		"above the stack's rows",
	);
	// In view, but under the stack: not a place to stay.
	const under = { x: 40, y: 496, k: 1 };
	assert.equal(standsIn(low, under, wide, inset, stack), false);
	assert.equal(
		standsIn(start, { x: 100, y: 100, k: 1 }, wide, inset, stack),
		true,
	);
});

test("an overview stands the boxes the canvas draws past the zoom stack, not only its glyphs", () => {
	// A glyph is narrower than the card box round it, which reaches back past the
	// room's start: the box of a node low in the pane would stand in the stack.
	const glyph: Box = { x: 98, y: 0, width: 44, height: 44 };
	const low: Box = { x: 0, y: 900, width: 240, height: 86 };
	const drawn: Box = { x: 0, y: 0, width: 240, height: 86 };
	const view = overviewTransform(
		{ x: 98, y: 0, width: 800, height: 1000 },
		0.5,
		phone,
		inset,
		stack,
		glyph,
		[drawn, low],
	);
	assert.ok(
		low.x * view.k + view.x >= stack.left,
		"the low box is past the stack",
	);
	assert.ok(inside(glyph, view, phone, inset), "the anchor stands whole");
});
