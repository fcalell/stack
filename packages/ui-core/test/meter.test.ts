import assert from "node:assert/strict";
import { test } from "node:test";
import { ENGLISH, filled, levelOf, METER_NEAR } from "../src/tokens.ts";

test("a meter is under below METER_NEAR, near from it, over past the max", () => {
	assert.equal(levelOf(0), "under");
	assert.equal(levelOf(METER_NEAR - 0.01), "under");
	assert.equal(levelOf(METER_NEAR), "near");
	assert.equal(levelOf(1), "near");
	assert.equal(levelOf(1.01), "over");
});

test("a mark replaces METER_NEAR as the near point, and over still wins", () => {
	assert.equal(levelOf(0.5, 0.6), "under");
	assert.equal(levelOf(0.6, 0.6), "near");
	assert.equal(levelOf(0.95, 0.6), "near");
	assert.equal(levelOf(1.2, 0.6), "over");
});

test("the mark word names the mark and its value", () => {
	assert.equal(
		filled(ENGLISH.meterMark, { name: "Reserve", value: "80 GB" }),
		"Reserve at 80 GB",
	);
});
