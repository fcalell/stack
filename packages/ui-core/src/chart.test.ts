import assert from "node:assert/strict";
import { test } from "node:test";
import { axisStride } from "./chart.ts";

test("every category is named while the names fit under their bars", () => {
	assert.equal(axisStride(24, 720, 2), 1);
	assert.equal(axisStride(7, 320, 3), 1);
});

test("the names thin by a stride once they would touch", () => {
	assert.equal(axisStride(24, 320, 5), 4);
	assert.equal(axisStride(24, 160, 2), 4);
});

test("an unmeasured plot names every bar", () => {
	assert.equal(axisStride(24, undefined, 8), 1);
	assert.equal(axisStride(24, 0, 8), 1);
});
