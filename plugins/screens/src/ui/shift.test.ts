import assert from "node:assert/strict";
import { test } from "node:test";
import { compare, type SectionBox } from "./shift.ts";

const box = (
	name: string,
	column: number,
	top: number,
	height: number,
): SectionBox => ({
	pane: 0,
	column,
	width: 400,
	name,
	top,
	height,
	rows: true,
});

test("a column's later Section is judged against its own column", () => {
	const waiting = [
		box("A", 0, 100, 100),
		box("B", 0, 220, 100),
		box("C", 500, 100, 100),
	];
	const loaded = [
		box("A", 0, 100, 400),
		box("B", 0, 520, 100),
		box("C", 500, 100, 100),
	];
	assert.deepEqual(compare(waiting, loaded), { fails: [], reports: [] });
});

test("a Section beside another is not moved by it", () => {
	// C is in the DOM after A and B, but stands in the other column.
	const waiting = [box("A", 0, 100, 100), box("C", 500, 100, 100)];
	const loaded = [box("A", 0, 100, 487), box("C", 500, 100, 100)];
	assert.equal(compare(waiting, loaded).fails.length, 0);
});

test("a first Section that moves fails", () => {
	const fails = compare([box("A", 0, 100, 100)], [box("A", 0, 150, 100)]).fails;
	assert.match(fails[0] ?? "", /first Section moved 50px/);
});

test("a later Section that moves by more than what grew above it fails", () => {
	const fails = compare(
		[box("A", 0, 100, 100), box("B", 0, 220, 100)],
		[box("A", 0, 100, 150), box("B", 0, 300, 100)],
	).fails;
	assert.match(fails[0] ?? "", /B: moved 80px, 50px was due/);
});

test("a Section gone loaded and a height change with no rows fail", () => {
	const flat = { ...box("A", 0, 100, 100), rows: false };
	const fails = compare(
		[flat, box("B", 0, 220, 100)],
		[{ ...flat, height: 140 }],
	).fails;
	assert.equal(fails.length, 2);
});

test("a move an arriving block caused is reported", () => {
	const banner = { ...box("banner", 0, 100, 40), aside: true };
	const { fails, reports } = compare(
		[box("A", 0, 100, 100)],
		[banner, box("A", 0, 140, 100)],
	);
	assert.equal(fails.length, 0);
	assert.equal(reports.length, 1);
});

const text = (name: string, top: number, height: number): SectionBox => ({
	...box(name, 0, top, height),
	text: true,
});

test("the first Section moves by what the text above it grew by", () => {
	const { fails } = compare(
		[text("text.lead", 60, 20), box("A", 0, 100, 100)],
		[text("text.lead", 60, 40), box("A", 0, 120, 100)],
	);
	assert.deepEqual(fails, []);
});

test("the first Section moving with no text grown above it fails", () => {
	const { fails } = compare([box("A", 0, 100, 100)], [box("A", 0, 120, 100)]);
	assert.match(fails[0] ?? "", /first Section moved 20px/);
});

test("the first Section moving by more than the text grew fails", () => {
	const { fails } = compare(
		[text("text.lead", 60, 20), box("A", 0, 100, 100)],
		[text("text.lead", 60, 40), box("A", 0, 150, 100)],
	);
	assert.match(fails[0] ?? "", /first Section moved 50px/);
});

test("a title growing a line and pills wrapping to a second row move the first Section by their sum", () => {
	const { fails } = compare(
		[
			text("text.title", 60, 24),
			text("text.facts", 90, 20),
			box("A", 0, 130, 100),
		],
		[
			text("text.title", 60, 48),
			text("text.facts", 114, 46),
			box("A", 0, 180, 100),
		],
	);
	assert.deepEqual(fails, []);
});

test("a bar above the first Section changing height still fails", () => {
	const bar = (height: number) => ({
		...box("bar", 0, 60, height),
		aside: true,
	});
	const { fails } = compare(
		[bar(30), box("A", 0, 100, 100)],
		[bar(50), box("A", 0, 120, 100)],
	);
	assert.match(fails[0] ?? "", /first Section moved 20px/);
});

test("a centred column shrinking 50px moves its first Section down by half", () => {
	const { fails } = compare(
		[{ ...box("A", 0, 200, 300), centred: 400 }],
		[{ ...box("A", 0, 225, 250), centred: 350 }],
	);
	assert.deepEqual(fails, []);
});

test("the same column top-anchored fails", () => {
	const { fails } = compare([box("A", 0, 200, 300)], [box("A", 0, 225, 250)]);
	assert.match(fails[0] ?? "", /first Section moved 25px/);
});

test("a block beside the Sections that grows with its data moves the Sections below it by its growth", () => {
	const diff = { ...box("div.diff", 0, 200, 100), aside: true };
	const { fails } = compare(
		[box("A", 0, 100, 80), diff, box("B", 0, 320, 100)],
		[box("A", 0, 100, 80), { ...diff, height: 200 }, box("B", 0, 420, 100)],
	);
	assert.deepEqual(fails, []);
});

test("a block beside the Sections that grows while the Section below it stands still fails", () => {
	const diff = { ...box("div.diff", 0, 200, 100), aside: true };
	const { fails } = compare(
		[box("A", 0, 100, 80), diff, box("B", 0, 320, 100)],
		[box("A", 0, 100, 80), { ...diff, height: 200 }, box("B", 0, 320, 100)],
	);
	assert.match(fails[0] ?? "", /B: moved 0px, 100px was due/);
});

test("a block beside the Sections with no rows that changes height fails", () => {
	const bar = { ...box("div.bar", 0, 200, 40), aside: true, rows: false };
	const { fails } = compare(
		[box("A", 0, 100, 80), bar],
		[box("A", 0, 100, 80), { ...bar, height: 60 }],
	);
	assert.match(fails[0] ?? "", /div.bar: height 40 -> 60 with no rows/);
});

const slotted = (
	name: string,
	column: number,
	top: number,
	height: number,
): SectionBox => ({ ...box(name, column, top, height), section: true });

test("a painted title pairs with the loaded title at its slot", () => {
	const { fails } = compare(
		[slotted("xqz tuvw nopr", 0, 100, 120)],
		[slotted("Release notes", 0, 100, 120)],
	);
	assert.deepEqual(fails, []);
});

test("Sections the loaded form draws beyond the waiting ones are not findings", () => {
	const { fails, reports } = compare(
		[slotted("xqz tuvw nopr", 0, 100, 120)],
		[
			slotted("First note", 0, 100, 120),
			slotted("Second note", 0, 240, 200),
			slotted("Third note", 0, 460, 80),
		],
	);
	assert.deepEqual({ fails, reports }, { fails: [], reports: [] });
});

test("a waiting Section with no Section at its slot loaded still fails", () => {
	const { fails } = compare(
		[
			slotted("xqz tuvw nopr", 0, 100, 120),
			slotted("abc def ghi", 0, 240, 120),
		],
		[slotted("First note", 0, 100, 120)],
	);
	assert.equal(fails.length, 1);
	assert.match(fails[0] ?? "", /abc def ghi: stood while waiting, gone loaded/);
});

test("a paired Section moving still fails whatever its titles are", () => {
	const { fails } = compare(
		[slotted("xqz tuvw nopr", 0, 100, 120), slotted("abc def", 0, 240, 120)],
		[slotted("First note", 0, 100, 120), slotted("Second note", 0, 300, 120)],
	);
	assert.match(fails[0] ?? "", /moved 60px/);
});

test("a head's growth is credited, and a failure names what it left unexplained", () => {
	// The head grew 72px, the Stats strip under it shrank 6px: the Section moved 66.
	const waiting = [
		text("text.text-title", 60, 32),
		text("text.text-body", 100, 48),
		box("A", 0, 200, 100),
	];
	const grown = [
		text("text.text-title", 60, 64),
		text("text.text-body", 132, 88),
		box("A", 0, 266, 100),
	];
	const { fails } = compare(waiting, grown);
	assert.match(fails[0] ?? "", /first Section moved 66px/);
	assert.match(
		fails[0] ?? "",
		/72px of it the text's growth, -6px unexplained/,
	);
	// With the strip's painted height right, the head's growth is all there is.
	assert.deepEqual(
		compare(waiting, [
			grown[0] as SectionBox,
			grown[1] as SectionBox,
			box("A", 0, 272, 100),
		]).fails,
		[],
	);
});

test("a Sheet's head is its own region: its growth moves the Sheet's first Section, not the page's", () => {
	const sheet = (name: string, top: number, height: number): SectionBox => ({
		...box(name, 0, top, height),
		pane: 1,
	});
	const sheetText = (
		name: string,
		top: number,
		height: number,
	): SectionBox => ({
		...sheet(name, top, height),
		text: true,
	});
	// The page's own Contract stands still; the Sheet's title grows from one line
	// to two, which moves the Sheet's Section by 30px.
	const waiting = [
		box("Contract", 0, 100, 200),
		sheetText("text.text-heading", 400, 24),
		{ ...sheet("Contract #2", 460, 100), section: true },
	];
	const loaded = [
		box("Contract", 0, 100, 200),
		sheetText("text.text-heading", 400, 54),
		{ ...sheet("Contract #2", 490, 100), section: true },
	];
	assert.deepEqual(compare(waiting, loaded).fails, []);
	// The same Section moving by more than its head grew still fails.
	const fails = compare(waiting, [
		loaded[0] as SectionBox,
		loaded[1] as SectionBox,
		{ ...sheet("Contract #2", 520, 100), section: true },
	]).fails;
	assert.match(fails[0] ?? "", /Contract #2: first Section moved 60px/);
});

test("a Banner painted while waiting and gone loaded is reported, not failed", () => {
	const banner = { ...box("Banner", 0, 100, 48), section: false, aside: true };
	const section = (top: number) => ({
		...box("A", 0, top, 100),
		section: true,
	});
	const result = compare([banner, section(160)], [section(112)]);
	assert.deepEqual(result.fails, []);
	assert.equal(result.reports.length, 1);
	// A move short of the banner's height is not its.
	assert.equal(compare([banner, section(160)], [section(150)]).fails.length, 1);
});
