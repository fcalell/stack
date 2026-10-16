import assert from "node:assert/strict";
import { test } from "node:test";
import {
	actsShown,
	type FoldRoom,
	marksShown,
	TITLE_FLOOR,
} from "../src/fold.ts";
import { ROW_TEXT_FLOOR } from "../src/variants.ts";

// A 288 wide row, a 44 act, an 8 gap and a 52 lead: the title's floor takes
// 115.2, so 288 - 115.2 - 52 - 8 = 112.8 is left for the acts.
const ROOM: FoldRoom = {
	row: 288,
	fixed: 52,
	overhang: 0,
	unit: 44,
	gap: 8,
	acts: 4,
	more: false,
};

test("the title keeps two fifths of the row", () => {
	assert.equal(TITLE_FLOOR, 0.4);
	// A row's text group keeps the same floor (`ROW_TEXT_FLOOR`, `min-w-2/5`).
	assert.equal(
		ROW_TEXT_FLOOR,
		`basis-${Math.round(TITLE_FLOOR * 5)}/5 shrink-0`,
	);
});

test("acts that fit all stand, with no more act of their own", () => {
	assert.equal(actsShown({ ...ROOM, row: 600 }), 4);
});

test("acts that do not fit fold last first, the more act holding its place", () => {
	// 112.8 holds two boxes (96), so one act and the more act stand.
	assert.equal(actsShown(ROOM), 1);
	// 600 wide leaves 600 * 0.6 - 60 = 300: four acts and no more (4 * 44 + 3 * 8 = 200).
	assert.equal(actsShown({ ...ROOM, row: 600 }), 4);
	// 400 wide leaves 400 * 0.6 - 60 = 180: three acts and the more act (4 * 44 + 24 = 200) do not fit, two and more do (3 * 44 + 16 = 148).
	assert.equal(actsShown({ ...ROOM, row: 400 }), 2);
});

test("a head's own more menu stands whether or not an act folds", () => {
	// 600 wide: four acts and the more act are 5 * 44 + 32 = 252, under 300.
	assert.equal(actsShown({ ...ROOM, row: 600, more: true }), 4);
	// 500 wide leaves 240: four and more do not fit (252), three and more do (208).
	assert.equal(actsShown({ ...ROOM, row: 500, more: true }), 3);
	assert.equal(actsShown({ ...ROOM, row: 500 }), 4);
});

test("widening returns the folded acts, one at a time", () => {
	const shown = [250, 300, 350, 400, 450, 500, 600].map((row) =>
		actsShown({ ...ROOM, row }),
	);
	assert.deepEqual(
		shown,
		[...shown].sort((a, b) => a - b),
	);
	assert.equal(shown[0], 0);
	assert.equal(shown.at(-1), 4);
});

test("no room folds every act and keeps the more act", () => {
	assert.equal(actsShown({ ...ROOM, row: 100 }), 0);
});

test("an overhang adds room, and no acts fold nothing", () => {
	// 380 wide leaves 168 and holds two acts and the more act; 40 more holds all four.
	assert.equal(actsShown({ ...ROOM, row: 380 }), 2);
	assert.equal(actsShown({ ...ROOM, row: 380, overhang: 40 }), 4);
	assert.equal(actsShown({ ...ROOM, acts: 0 }), 0);
});

// A 288 wide row whose text group's floor takes 115.2; 100 is the leading and
// the other end items, so 288 - 115.2 - 100 = 72.8 is left for the marks.
test("a row's marks that fit stand whole, the later ones folding last first", () => {
	const room = { row: 288, fixed: 100, gap: 8 };
	// A status of 60 and a chip of 50: 60 + 8 + 50 = 118 does not fit 72.8.
	assert.equal(marksShown({ ...room, widths: [60, 50] }), 1);
	// Wider, both fit: 400 * 0.6 - 100 = 140.
	assert.equal(marksShown({ ...room, row: 400, widths: [60, 50] }), 2);
	// Three marks fold one at a time as the row narrows.
	const shown = [250, 300, 350, 400, 450].map((row) =>
		marksShown({ ...room, row, widths: [40, 40, 40] }),
	);
	assert.deepEqual(shown, [1, 1, 2, 3, 3]);
});

test("a row's first mark stands whatever the room, and the folded come back", () => {
	// No room at all, and a first mark wider than the room: it still stands.
	assert.equal(marksShown({ row: 100, fixed: 100, gap: 8, widths: [60] }), 1);
	assert.equal(
		marksShown({ row: 100, fixed: 100, gap: 8, widths: [90, 20] }),
		1,
	);
	// A row with no marks shows none.
	assert.equal(marksShown({ row: 288, fixed: 0, gap: 8, widths: [] }), 0);
	const shown = [200, 260, 320, 400, 600].map((row) =>
		marksShown({ row, fixed: 40, gap: 8, widths: [60, 50, 30] }),
	);
	assert.deepEqual(
		shown,
		[...shown].sort((a, b) => a - b),
	);
	assert.equal(shown.at(-1), 3);
});
