import assert from "node:assert/strict";
import { test } from "node:test";
import { columnFloor, gridFloor, levelOf, touchNamed } from "./list-state.ts";
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

test("a header of short words stands at the short measure; a long word asks for its room", () => {
	const short = "var(--container-measure-short)";
	assert.equal(columnFloor({ label: "Destination or tag manager" }), short);
	assert.equal(columnFloor({ label: "Currency" }), short);
	const long = columnFloor({ label: "Conversion attribution_window" });
	assert.ok(long.startsWith(`max(${short}, calc(19ch`));
	// The grid's floor sums the same floors.
	assert.equal(
		gridFloor([{ label: "Name" }, { label: "Currency" }], false),
		`calc(${short} + ${short})`,
	);
	assert.ok(
		gridFloor(
			[{ label: "Name" }, { label: "Conversion attribution_window" }],
			false,
		).includes(long),
	);
});

test("a track that scrolls sideways says which ends hold more", () => {
	assert.deepEqual(scrollEdges(0, 288, 288), { start: false, end: false });
	assert.deepEqual(scrollEdges(0, 288, 400), { start: false, end: true });
	assert.deepEqual(scrollEdges(60, 288, 400), { start: true, end: true });
	assert.deepEqual(scrollEdges(112, 288, 400), { start: true, end: false });
});
