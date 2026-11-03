import assert from "node:assert/strict";
import { test } from "node:test";
import {
	accepts,
	DRAG_SLOP,
	edgeSpeed,
	HOLD_SLOP,
	movedTo,
	moveEntry,
	moveOf,
	pressed,
	SCROLL_EDGE,
	SCROLL_MAX,
	sideOf,
	stepOf,
} from "./drag.ts";

const ids = ["a", "b", "c", "d"];

test("a mouse press is a drag past the slop, a finger after its hold", () => {
	assert.equal(pressed("mouse", DRAG_SLOP - 1, false), "wait");
	assert.equal(pressed("mouse", DRAG_SLOP, false), "drag");
	assert.equal(pressed("pen", DRAG_SLOP, false), "drag");
	assert.equal(pressed("touch", 0, false), "wait");
	assert.equal(pressed("touch", HOLD_SLOP + 1, false), "cancel");
	assert.equal(pressed("touch", 2, true), "drag");
});

test("the side of a row is the half the pointer is in", () => {
	assert.equal(sideOf(10, 0, 32), "before");
	assert.equal(sideOf(16, 0, 32), "after");
	assert.equal(sideOf(100, 90, 20), "after");
});

test("a move names its index and the rows it stands between", () => {
	assert.deepEqual(movedTo(ids, "d", 0), {
		index: 0,
		after: null,
		before: "a",
	});
	assert.deepEqual(movedTo(ids, "a", 3), {
		index: 3,
		after: "d",
		before: null,
	});
	assert.deepEqual(movedTo(ids, "a", 2), {
		index: 2,
		after: "c",
		before: "d",
	});
	assert.equal(movedTo(ids, "x", 1), undefined);
	assert.equal(movedTo(ids, "a", 4), undefined);
});

test("a neighbour that is not loaded ends the move", () => {
	const window = ["a", undefined, "c", "d"];
	assert.equal(movedTo(window, "d", 2), undefined);
	assert.deepEqual(movedTo(window, "d", 3), {
		index: 3,
		after: "c",
		before: null,
	});
	assert.equal(movedTo(window, "a", 1), undefined);
});

test("a drop on a row lands before or after it; beside its own place it moves nothing", () => {
	assert.deepEqual(moveOf(ids, "a", "c", "before"), {
		index: 1,
		after: "b",
		before: "c",
	});
	assert.deepEqual(moveOf(ids, "a", "c", "after"), {
		index: 2,
		after: "c",
		before: "d",
	});
	assert.deepEqual(moveOf(ids, "d", "a", "before"), {
		index: 0,
		after: null,
		before: "a",
	});
	assert.equal(moveOf(ids, "b", "b", "before"), undefined);
	assert.equal(moveOf(ids, "b", "b", "after"), undefined);
	assert.equal(moveOf(ids, "b", "a", "after"), undefined);
	assert.equal(moveOf(ids, "b", "c", "before"), undefined);
	assert.equal(moveOf(ids, "b", "zz", "before"), undefined);
});

test("a step moves a row one place or to an end, and stops there", () => {
	assert.deepEqual(stepOf(ids, "b", "up"), {
		index: 0,
		after: null,
		before: "a",
	});
	assert.deepEqual(stepOf(ids, "b", "down"), {
		index: 2,
		after: "c",
		before: "d",
	});
	assert.deepEqual(stepOf(ids, "b", "last"), {
		index: 3,
		after: "d",
		before: null,
	});
	assert.deepEqual(stepOf(ids, "c", "first"), {
		index: 0,
		after: null,
		before: "a",
	});
	assert.equal(stepOf(ids, "a", "up"), undefined);
	assert.equal(stepOf(ids, "a", "first"), undefined);
	assert.equal(stepOf(ids, "d", "down"), undefined);
	assert.equal(stepOf(ids, "d", "last"), undefined);
});

test("an entry moves in a list and the others keep their order", () => {
	assert.deepEqual(moveEntry(ids, 0, 2), ["b", "c", "a", "d"]);
	assert.deepEqual(moveEntry(ids, 3, 0), ["d", "a", "b", "c"]);
	assert.deepEqual(ids, ["a", "b", "c", "d"]);
});

test("a scroller is carried near its edges and not in the middle", () => {
	assert.equal(edgeSpeed(300, 0, 600), 0);
	assert.equal(edgeSpeed(SCROLL_EDGE, 0, 600), 0);
	assert.equal(edgeSpeed(0, 0, 600), -SCROLL_MAX);
	assert.equal(edgeSpeed(-50, 0, 600), -SCROLL_MAX);
	assert.equal(edgeSpeed(600, 0, 600), SCROLL_MAX);
	assert.equal(edgeSpeed(700, 0, 600), SCROLL_MAX);
	const half = edgeSpeed(SCROLL_EDGE / 2, 0, 600);
	assert.ok(half < 0 && half > -SCROLL_MAX);
	// a view shorter than two edges splits at its middle
	assert.equal(edgeSpeed(50, 0, 100), 0);
});

test("a drop takes the kinds it accepts", () => {
	assert.ok(accepts("track", "track"));
	assert.ok(accepts(["track", "album"], "album"));
	assert.ok(!accepts("track", "album"));
	assert.ok(!accepts(["track"], undefined));
});
