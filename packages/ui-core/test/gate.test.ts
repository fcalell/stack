import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER, rosterEntries } from "../src/roster.ts";
import { WIDTH_VALUE } from "../src/tokens.ts";
import { FORM } from "../src/variant-tables.ts";
import {
	GATE,
	GATE_COLUMN,
	GATE_FLOW,
	GATE_HEAD,
	GATE_LEAD,
	GATE_MARK,
} from "../src/variants.ts";

test("the gate is a layout frame at the auth width", () => {
	const gate = ROSTER.layout.Gate;
	assert.ok(gate);
	assert.deepEqual(gate.props, [
		"title",
		"description",
		"step",
		"mark",
		"banner",
		"children",
	]);
	// A column cell is a width and nothing else.
	assert.equal(GATE_COLUMN, "w-full max-w-auth");
	assert.equal(WIDTH_VALUE.auth, "400px");
	for (const cell of [
		"GATE",
		"GATE_COLUMN",
		"GATE_FLOW",
		"GATE_LEAD",
		"GATE_HEAD",
		"GATE_MARK",
	]) {
		assert.ok(gate.holds?.includes(cell), `Gate holds ${cell}`);
		const holders = rosterEntries()
			.filter(([, , entry]) => entry.holds?.includes(cell))
			.map(([, name]) => name);
		assert.deepEqual(holders, ["Gate"]);
	}
	// The page is the surface at the page inset; the column's parts are a
	// sections gap apart, the lead a fields gap, the head a pair.
	assert.match(GATE, /\bbg-surface\b/);
	assert.match(GATE, /\bp-page\b/);
	assert.match(GATE_FLOW, /\bgap-sections\b/);
	assert.match(GATE_LEAD, /\bgap-fields\b/);
	assert.match(GATE_HEAD, /\bgap-pair\b/);
	assert.match(GATE_MARK, /\bsize-avatar\b/);
});

test("a form in a gate is the gate's column", () => {
	assert.equal(FORM.variants.in.auth, "");
});
