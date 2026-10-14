import assert from "node:assert/strict";
import { test } from "node:test";
import { compare, type SectionBox } from "../src/ui/shift.ts";

const box = (name: string, top: number, height: number, rows = true) => ({
	pane: 0,
	column: 0,
	name,
	top,
	height,
	rows,
});

const waiting: SectionBox[] = [
	box("Projects", 100, 200),
	box("Usage", 340, 100),
	box("Danger", 480, 80, false),
];

test("a page that holds still passes", () => {
	assert.deepEqual(compare(waiting, waiting), []);
});

test("Sections move by the growth of the rows above, and arrive below", () => {
	const loaded = [
		box("Projects", 100, 260),
		box("Usage", 400, 100),
		box("Danger", 540, 80, false),
		box("Extra", 640, 50),
	];
	assert.deepEqual(compare(waiting, loaded), []);
});

test("what stands above the first Section moves them all alike", () => {
	const loaded = waiting.map((b) => ({ ...b, top: b.top + 24 }));
	assert.equal(compare(waiting, loaded).length, 1);
	assert.match(
		compare(waiting, loaded)[0] ?? "",
		/^Projects: first Section moved 24px/,
	);
});

test("a Section that stood while waiting must still be there", () => {
	const loaded = waiting.filter((b) => b.name !== "Usage");
	assert.equal(
		compare(waiting, loaded)[0],
		"Usage: stood while waiting, gone loaded",
	);
});

test("a later Section moving with nothing above it changed fails", () => {
	const loaded = [
		waiting[0],
		{ ...waiting[1], top: 360 },
		{ ...waiting[2], top: 500 },
	] as SectionBox[];
	assert.match(
		compare(waiting, loaded)[0] ?? "",
		/^Usage: moved 20px, nothing above it changed/,
	);
});

test("a height changes only where rows, a chart or text fill the Section", () => {
	const loaded = [
		waiting[0],
		waiting[1],
		box("Danger", 480, 120, false),
	] as SectionBox[];
	assert.deepEqual(compare(waiting, loaded), [
		"Danger: height 80 -> 120 with no rows in it",
	]);
	assert.deepEqual(
		compare(waiting, [
			waiting[0],
			waiting[1],
			box("Danger", 480, 120, true),
		] as SectionBox[]),
		[],
	);
});

test("an arrival above a Section that stood fails", () => {
	const loaded = [box("Banner", 90, 10), ...waiting] as SectionBox[];
	assert.match(
		compare(waiting, loaded).join("\n"),
		/Banner: arrived at 90px, above a Section that stood/,
	);
});

test("each Pane and each column in it is judged by itself", () => {
	const two = [...waiting, { ...box("Aside", 100, 50), pane: 1 }];
	const loaded = [...waiting, { ...box("Aside", 100, 90), pane: 1 }];
	assert.deepEqual(compare(two, loaded), []);
	const beside = [...waiting, { ...box("Side", 100, 50), column: 400 }];
	assert.deepEqual(
		compare(beside, [...waiting, { ...box("Side", 100, 90), column: 400 }]),
		[],
	);
});
