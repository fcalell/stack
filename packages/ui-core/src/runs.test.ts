import assert from "node:assert/strict";
import { test } from "node:test";
import { factParts, flowRuns, META_TAIL, partRuns, partText } from "./runs.ts";

test("partRuns draws a quoted run in typographic quotes, whole", () => {
	const quoted = "x".repeat(120);
	assert.deepEqual(partRuns({ quoted }), [`“${quoted}”`]);
	assert.equal(partText([{ quoted }, " ok"]), `“${quoted}” ok`);
});

test("factParts drops an empty part", () => {
	assert.deepEqual(factParts(["a", "", { code: "" }, { strong: "" }, "b"]), [
		["a"],
		["b"],
	]);
});

test("flowRuns binds the dot to its words", () => {
	assert.deepEqual(flowRuns([["a"], ["b", { code: "c" }]]), [
		"a",
		META_TAIL,
		"b",
		{ code: "c" },
	]);
	assert.ok(META_TAIL.startsWith(" ") && META_TAIL.endsWith(" "));
});
