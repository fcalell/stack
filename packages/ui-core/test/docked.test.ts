import assert from "node:assert/strict";
import { test } from "node:test";
import { sizePx } from "../src/scales.ts";
import { dockedBodyMax, SHEET_DOCKED_BODY_SHARE } from "../src/tokens.ts";

const floor = 144;
const logFloor = 96;
const pinned = 190;

test("with room a docked body's cap is the share of the region, or the floor if larger", () => {
	assert.equal(
		dockedBodyMax({ region: 600, pinned, floor, logFloor }),
		SHEET_DOCKED_BODY_SHARE * 600,
	);
	assert.equal(
		dockedBodyMax({ region: 340, pinned: 60, floor, logFloor }),
		floor,
	);
});

test("short of room the body gives to the log's floor, then stops at its own", () => {
	assert.equal(
		dockedBodyMax({ region: 437, pinned, floor, logFloor }),
		437 - pinned - logFloor,
	);
	assert.equal(dockedBodyMax({ region: 400, pinned, floor, logFloor }), floor);
});

test("past that the log goes first, then the body below its floor, never the pinned parts", () => {
	assert.equal(
		dockedBodyMax({ region: 330, pinned, floor, logFloor }),
		330 - pinned,
	);
	assert.equal(dockedBodyMax({ region: 190, pinned, floor, logFloor }), 0);
	assert.equal(dockedBodyMax({ region: 150, pinned, floor, logFloor }), 0);
});

test("a region with no log has a zero log floor", () => {
	assert.equal(
		dockedBodyMax({ region: 437, pinned, floor, logFloor: 0 }),
		Math.max(floor, SHEET_DOCKED_BODY_SHARE * 437),
	);
});

test("the log's floor is two rows", () => {
	assert.equal(sizePx("touch", "docked-log-floor"), 96);
	assert.equal(sizePx("desktop", "docked-log-floor"), 64);
});
