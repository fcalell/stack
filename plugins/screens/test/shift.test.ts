import assert from "node:assert/strict";
import { test } from "node:test";
import { compare, measure, type SectionBox } from "../src/ui/shift.ts";

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
	assert.deepEqual(compare(waiting, waiting), { fails: [], reports: [] });
});

test("Sections move by the growth of the rows above, and arrive below", () => {
	const loaded = [
		box("Projects", 100, 260),
		box("Usage", 400, 100),
		box("Danger", 540, 80, false),
		box("Extra", 640, 50),
	];
	assert.deepEqual(compare(waiting, loaded).fails, []);
});

test("what stands above the first Section moves them all alike", () => {
	const loaded = waiting.map((b) => ({ ...b, top: b.top + 24 }));
	assert.equal(compare(waiting, loaded).fails.length, 1);
	assert.match(
		compare(waiting, loaded).fails[0] ?? "",
		/^Projects: first Section moved 24px/,
	);
});

test("a Section that stood while waiting must still be there", () => {
	const loaded = waiting.filter((b) => b.name !== "Usage");
	assert.equal(
		compare(waiting, loaded).fails[0],
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
		compare(waiting, loaded).fails[0] ?? "",
		/^Usage: moved 20px, nothing above it changed/,
	);
});

test("a height changes only where rows, a chart or text fill the Section", () => {
	const loaded = [
		waiting[0],
		waiting[1],
		box("Danger", 480, 120, false),
	] as SectionBox[];
	assert.deepEqual(compare(waiting, loaded).fails, [
		"Danger: height 80 -> 120 with no rows in it",
	]);
	assert.deepEqual(
		compare(waiting, [
			waiting[0],
			waiting[1],
			box("Danger", 480, 120, true),
		] as SectionBox[]).fails,
		[],
	);
});

test("a block that arrives with its data above the Sections is reported, not failed", () => {
	// The Banner's 10px and the 14px gap under it move every Section by 24.
	const loaded = [
		box("Banner", 90, 10),
		...waiting.map((b) => ({ ...b, top: b.top + 24 })),
	] as SectionBox[];
	const found = compare(waiting, loaded);
	assert.deepEqual(found.fails, []);
	assert.equal(found.reports.length, 1);
	assert.match(found.reports[0] ?? "", /^Projects: moved 24px for Banner/);
});

test("an arrival between Sections is reported once and the ones after move with it", () => {
	const loaded = [
		waiting[0],
		box("Note", 330, 20),
		{ ...waiting[1], top: 374 },
		{ ...waiting[2], top: 514 },
	] as SectionBox[];
	const found = compare(waiting, loaded);
	assert.deepEqual(found.fails, []);
	assert.equal(found.reports.length, 1);
	assert.match(found.reports[0] ?? "", /^Usage: moved 34px for Note/);
});

test("a move larger than nothing, or smaller than the arrival, still fails", () => {
	const none = waiting.map((b) => ({ ...b, top: b.top + 24 }));
	assert.equal(compare(waiting, none).fails.length, 1);
	const small = [
		box("Banner", 90, 40),
		...waiting.map((b) => ({ ...b, top: b.top + 12 })),
	] as SectionBox[];
	assert.match(compare(waiting, small).fails[0] ?? "", /^Projects: first/);
	// An arrival below every Section moves nothing and says nothing.
	const below = [...waiting, box("Extra", 600, 50)];
	assert.deepEqual(compare(waiting, below), { fails: [], reports: [] });
});

test("any other move still fails beside an arrival, and a gone block fails", () => {
	const loaded = [
		box("Banner", 90, 10),
		...waiting.map((b) => ({ ...b, top: b.top + 24 })),
	].map((b) => (b.name === "Danger" ? { ...b, top: b.top + 30 } : b));
	assert.match(
		compare(waiting, loaded).fails[0] ?? "",
		/^Danger: moved 54px, 24px was due/,
	);
	const gone = loaded.filter((b) => b.name !== "Usage");
	assert.ok(
		compare(waiting, gone).fails.includes(
			"Usage: stood while waiting, gone loaded",
		),
	);
});

// A Pane with no Section is measured by its body's direct blocks, which
// `measure` hands over as boxes named by block; the same judgement holds.
test("a section-less Pane's blocks are judged like Sections", () => {
	const blocks = [box("div.flex", 120, 400, false)];
	assert.deepEqual(compare(blocks, blocks), { fails: [], reports: [] });
	assert.match(
		compare(blocks, [{ ...blocks[0], top: 146 }] as SectionBox[]).fails[0] ??
			"",
		/^div\.flex: first Section moved 26px/,
	);
	assert.deepEqual(
		compare(blocks, [
			box("div.banner", 120, 12, false),
			{ ...blocks[0], top: 146 },
		] as SectionBox[]).fails,
		[],
	);
});

test("each Pane and each column in it is judged by itself", () => {
	const two = [...waiting, { ...box("Aside", 100, 50), pane: 1 }];
	const loaded = [...waiting, { ...box("Aside", 100, 90), pane: 1 }];
	assert.deepEqual(compare(two, loaded).fails, []);
	const beside = [...waiting, { ...box("Side", 100, 50), column: 400 }];
	assert.deepEqual(
		compare(beside, [...waiting, { ...box("Side", 100, 90), column: 400 }])
			.fails,
		[],
	);
});

test("an aside that arrives explains the move, and one that goes fails nothing", () => {
	const aside = (name: string, top: number, height: number) => ({
		...box(name, top, height, false),
		aside: true,
	});
	const standing = [aside("div.bar", 60, 20), ...waiting] as SectionBox[];
	const loaded = [
		aside("div.banner", 60, 40),
		...waiting.map((b) => ({ ...b, top: b.top + 56 })),
	] as SectionBox[];
	const found = compare(standing, loaded);
	assert.deepEqual(found.fails, []);
	assert.match(found.reports[0] ?? "", /^Projects: moved 56px for div\.banner/);
	// The same move with no aside arriving above fails.
	assert.equal(
		compare(
			standing,
			waiting.map((b) => ({ ...b, top: b.top + 56 })),
		).fails.length,
		1,
	);
});

// `measure` against a drawn page, stubbed down to what it reads: one Pane with
// no Section, a head and a scrolling body of two blocks.
test("measure takes a section-less Pane's body's direct blocks", () => {
	const rect = (left: number, top: number, height: number) => () => ({
		left,
		top,
		height,
	});
	const block = (cls: string, top: number, height: number) => ({
		tagName: "DIV",
		classList: [cls],
		children: [],
		querySelector: () => null,
		querySelectorAll: () => [],
		getBoundingClientRect: rect(8, top, height),
	});
	const body = {
		tagName: "DIV",
		overflowY: "auto",
		children: [block("banner", 60, 12), block("ground", 90, 300)],
	};
	const head = { tagName: "HEADER", overflowY: "visible", children: [] };
	const region = { tagName: "DIV", overflowY: "visible", children: [body] };
	const pane = { children: [head, region] };
	const g = globalThis as Record<string, unknown>;
	const saved = [g.document, g.window, g.getComputedStyle];
	g.window = { scrollY: 0 };
	g.getComputedStyle = (el: { overflowY: string }) => el;
	g.document = {
		querySelectorAll: (selector: string) =>
			selector === "[data-page]" ? [pane] : [],
	};
	try {
		assert.deepEqual(
			measure().map((b) => [b.pane, b.name, b.top, b.height]),
			[
				[0, "div.banner", 60, 12],
				[0, "div.ground", 90, 300],
			],
		);
	} finally {
		[g.document, g.window, g.getComputedStyle] = saved;
	}
});
