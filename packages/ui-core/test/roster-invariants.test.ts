import assert from "node:assert/strict";
import { test } from "node:test";
import { heldSpellings, rosterEntries } from "../src/roster.ts";
import { STATUS_STATES } from "../src/tokens.ts";
import { STATUS_DOT } from "../src/variant-tables.ts";
import { statusContentTone } from "../src/variants.ts";

test("the gate's cells are held by the Gate alone", () => {
	for (const cell of [
		"GATE",
		"GATE_COLUMN",
		"GATE_FLOW",
		"GATE_LEAD",
		"GATE_HEAD",
		"GATE_MARK",
	]) {
		const holders = rosterEntries()
			.filter(([, , entry]) => entry.holds?.includes(cell))
			.map(([, name]) => name);
		assert.deepEqual(holders, ["Gate"], cell);
	}
});

test("no entry holds a docked foot: a Place and a filling Thread share it", () => {
	assert.ok(!heldSpellings().has("FOOT_DOCKED"));
});

test("running's mark is the spinner; every other state draws a dot", () => {
	assert.deepEqual(
		Object.keys(STATUS_DOT.variants.state),
		STATUS_STATES.filter((state) => state !== "running"),
	);
});

test("running wears the accent, as active does", () => {
	assert.equal(statusContentTone("running"), "accent-ink");
	assert.equal(statusContentTone("active"), "accent-ink");
});
