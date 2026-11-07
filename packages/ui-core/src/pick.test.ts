import assert from "node:assert/strict";
import { test } from "node:test";
import { pickCurrent } from "./pick.ts";

const options = [
	{ value: null, label: "None" },
	{ value: "a", label: "A" },
];

test("a pick holding nothing reads as the empty choice", () => {
	assert.equal(pickCurrent(options, undefined, false)?.label, "None");
	assert.equal(pickCurrent(options, "a", false)?.label, "A");
});

test("a pick of several holding nothing reads as none", () => {
	assert.equal(pickCurrent(options, undefined, true), undefined);
});
