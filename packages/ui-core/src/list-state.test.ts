import assert from "node:assert/strict";
import { test } from "node:test";
import {
	columnFloor,
	columnsChanged,
	columnsKey,
	columnWidth,
	gridFloor,
	levelOf,
	listedRows,
	nextSort,
	TOUCH_FACT_FITS,
	touchFacts,
	touchNamed,
} from "./list-state.ts";
import { scrollEdges } from "./pick.ts";

test("a touch row names the columns of a kind that stands more than once", () => {
	// Staging and Production are both statuses: each says its column.
	assert.deepEqual(
		[
			...touchNamed([
				{ key: "staging", kind: "status" },
				{ key: "production", kind: "status" },
				{ key: "kind" },
			]),
		],
		["staging", "production"],
	);
	// Expected and Observed are both words, a lone status among them is not named.
	assert.deepEqual(
		[
			...touchNamed([
				{ key: "expected" },
				{ key: "observed", kind: "text" },
				{ key: "verdict", kind: "status" },
			]),
		],
		["expected", "observed"],
	);
});

test("a further age names its column", () => {
	// The row's first age trails the row and is not among the columns.
	assert.deepEqual(
		[...touchNamed([{ key: "seen", kind: "age" }, { key: "kind" }])],
		["seen"],
	);
});

test("a lone value of its kind, a number, a change and a chip name nothing", () => {
	assert.deepEqual(
		[...touchNamed([{ key: "kind" }, { key: "seats", kind: "number" }])],
		[],
	);
	assert.deepEqual(
		[
			...touchNamed([
				{ key: "a", kind: "number" },
				{ key: "b", kind: "number" },
			]),
		],
		[],
	);
});

test("a meter of a goal is good when full and neutral short of it, never near or over", () => {
	assert.equal(levelOf(1, undefined, true), "met");
	assert.equal(levelOf(1.2, undefined, true), "met");
	assert.equal(levelOf(0.95, undefined, true), "under");
	assert.equal(levelOf(0.62, undefined, true), "under");
	// A quota keeps its levels.
	assert.equal(levelOf(0.95), "near");
	assert.equal(levelOf(1.2), "over");
	assert.equal(levelOf(0.5), "under");
});

test("a track that scrolls sideways says which ends hold more", () => {
	assert.deepEqual(scrollEdges(0, 288, 288), { start: false, end: false });
	assert.deepEqual(scrollEdges(0, 288, 400), { start: false, end: true });
	assert.deepEqual(scrollEdges(60, 288, 400), { start: true, end: true });
	assert.deepEqual(scrollEdges(112, 288, 400), { start: true, end: false });
});

// The characters of the longest age in English, "59 seconds ago".
const age = 14;

test("a header of short words stands at the short measure; a long word asks for its room", () => {
	const short = "var(--container-measure-short)";
	assert.equal(
		columnFloor({ label: "Destination or tag manager" }, age),
		short,
	);
	assert.equal(columnFloor({ label: "Currency" }, age), short);
	const long = columnFloor({ label: "Conversion attribution_window" }, age);
	assert.ok(long.startsWith(`max(${short}, calc(19ch`));
	// The grid's floor sums the same floors.
	assert.equal(
		gridFloor([{ label: "Name" }, { label: "Currency" }], false, 0, age),
		`calc(${short} + ${short})`,
	);
	assert.ok(
		gridFloor(
			[{ label: "Name" }, { label: "Conversion attribution_window" }],
			false,
			0,
			age,
		).includes(long),
	);
});

test("a figure column with no width stands at half the short measure, its header's word over it", () => {
	const half = "calc(var(--container-measure-short) / 2)";
	assert.equal(columnFloor({ label: "N", kind: "number" }, age), half);
	assert.ok(
		columnFloor({ label: "Plays", kind: "number" }, age).startsWith(
			`max(${half}, calc(6ch`,
		),
	);
	assert.equal(
		columnFloor(
			{ label: "Plays", kind: "number", width: "measure-short" },
			age,
		),
		"var(--container-measure-short)",
	);
});

test("a head counts a tree's top-level rows, less the rows that are no step", () => {
	const journey = [
		{ key: "entry", counted: false as const },
		{ key: "a", children: [{ key: "a1" }, { key: "a2" }] },
		{ key: "b" },
		{ key: "ref", counted: false as const },
		{ key: "end", counted: false as const },
	];
	assert.equal(listedRows(journey).length, 2);
	assert.equal(listedRows([{ key: "x" }, { key: "y" }]).length, 2);
});

test("a head counts a nested row that says it is a step, at any depth", () => {
	const branching = [
		{ key: "entry", counted: false as const },
		{
			key: "a",
			children: [
				{
					key: "option-1",
					counted: false as const,
					children: [
						{ key: "b", counted: true as const },
						{ key: "end-b", counted: false as const },
					],
				},
				{
					key: "option-2",
					counted: false as const,
					children: [
						{ key: "c", counted: true as const, children: [{ key: "c-part" }] },
						{ key: "ref", counted: false as const },
					],
				},
			],
		},
	];
	assert.deepEqual(
		listedRows(branching).map((row) => (row as { key: string }).key),
		["a", "b", "c"],
	);
});

test("a touch row keeps the short values as facts and says the long ones whole", () => {
	const long = "After the change: $480 a month, from 14 October";
	const short = "Current: Not included";
	assert.ok(long.length > TOUCH_FACT_FITS);
	assert.ok(short.length <= TOUCH_FACT_FITS);
	assert.deepEqual(touchFacts([short, long], undefined), {
		facts: [short],
		said: [long],
	});
	// The reason a rule moved a tick leads the facts, whatever its length.
	assert.deepEqual(touchFacts([short], long), {
		facts: [long, short],
		said: [],
	});
	assert.deepEqual(touchFacts([], undefined), { facts: [], said: [] });
});

test("an age column stands at its longest word, a chip or status column at the short measure", () => {
	assert.equal(
		columnFloor({ label: "Added", kind: "age" }, 14),
		"calc(14ch + 2 * var(--spacing-pad) + 2 * var(--spacing-hairline))",
	);
	assert.equal(columnWidth({ kind: "chip" }), "measure-short");
	assert.equal(columnWidth({ kind: "text" }), undefined);
	assert.equal(columnWidth({ kind: "chip", width: "1/4" }), "1/4");
});

test("a chip column with no width stands at its widest chip where the short measure cannot hold it", () => {
	const short = "var(--container-measure-short)";
	const chip = { label: "Kind", kind: "chip" as const };
	assert.equal(columnFloor(chip, age), short);
	const wide = columnFloor(chip, age, 17);
	assert.ok(wide.startsWith(`max(${short}, calc(17ch`));
	// A chip column with a width of its own keeps it.
	assert.equal(
		columnFloor({ ...chip, width: "measure-short" }, age, 17),
		short,
	);
	assert.ok(gridFloor([chip], false, 0, age, [17]).includes(wide));
});

test("a column sorts from A or largest first, turns over, then is off", () => {
	const words = { key: "title", kind: "text" as const };
	const figures = { key: "plays", kind: "number" as const };
	const first = nextSort(undefined, words);
	assert.deepEqual(first, { key: "title", direction: "ascending" });
	const second = nextSort(first, words);
	assert.deepEqual(second, { key: "title", direction: "descending" });
	assert.equal(nextSort(second, words), undefined);
	assert.deepEqual(nextSort(undefined, figures), {
		key: "plays",
		direction: "descending",
	});
});

test("the columns key is the table's name, so a column added keeps the choice", () => {
	assert.equal(
		columnsKey([{ key: "a" }], "Library"),
		columnsKey([{ key: "a" }, { key: "b" }], "Library"),
	);
	assert.equal(
		columnsKey([{ key: "a" }, { key: "b" }], undefined),
		columnsKey([{ key: "b" }, { key: "a" }], undefined),
	);
	assert.notEqual(
		columnsKey([{ key: "a" }], undefined),
		columnsKey([{ key: "a" }, { key: "b" }], undefined),
	);
});

test("the columns differ from the table's own once the viewer's choice does", () => {
	const columns = [{ key: "a" }, { key: "b" }, { key: "c", hidden: true }];
	assert.equal(columnsChanged(columns, {}), false);
	assert.equal(columnsChanged(columns, { b: false }), true);
	assert.equal(columnsChanged(columns, { c: true }), true);
	assert.equal(columnsChanged(columns, { b: true, c: false }), false);
});
