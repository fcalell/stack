import assert from "node:assert/strict";
import { test } from "node:test";
import { touchNamed } from "./list-state.ts";
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

test("a track that scrolls sideways says which ends hold more", () => {
	assert.deepEqual(scrollEdges(0, 288, 288), { start: false, end: false });
	assert.deepEqual(scrollEdges(0, 288, 400), { start: false, end: true });
	assert.deepEqual(scrollEdges(60, 288, 400), { start: true, end: true });
	assert.deepEqual(scrollEdges(112, 288, 400), { start: true, end: false });
});
