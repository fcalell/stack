import assert from "node:assert/strict";
import { test } from "node:test";
import { changesChildren, takesStop } from "../src/ui/lib/scrolls.ts";

const column = {
	scrollWidth: 300,
	clientWidth: 300,
	scrollHeight: 900,
	clientHeight: 600,
};

test("a region that scrolls and holds nothing tabbable takes a tab stop", () => {
	assert.equal(takesStop(column, "y", false), true);
});

test("a region that holds a tabbable element takes none, its own stop already scrolls it", () => {
	assert.equal(takesStop(column, "y", true), false);
});

test("a region that fits along its axis takes none", () => {
	assert.equal(takesStop(column, "x", false), false);
	assert.equal(takesStop({ ...column, scrollHeight: 600 }, "y", false), false);
});

test("a region reads the axis it scrolls on", () => {
	const row = { ...column, scrollWidth: 800, scrollHeight: 600 };
	assert.equal(takesStop(row, "x", false), true);
	assert.equal(takesStop(row, "y", false), false);
});

test("a change to the region's own children rebinds what is watched, a deeper one only re-measures", () => {
	const node = {};
	const own = { type: "childList", target: node };
	const deeper = { type: "childList", target: {} };
	const attribute = { type: "attributes", target: node };
	assert.equal(changesChildren([own], node), true);
	assert.equal(changesChildren([deeper, attribute], node), false);
	assert.equal(changesChildren([deeper, own], node), true);
});
