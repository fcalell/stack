import assert from "node:assert/strict";
import { test } from "node:test";
import { changesChildren, takesStop } from "../src/ui/lib/scrolls.ts";

const column = { scrollHeight: 900, clientHeight: 600 };

test("a region that scrolls and holds nothing tabbable takes a tab stop", () => {
	assert.equal(takesStop(column, false), true);
});

test("a region that holds a tabbable element takes none, its own stop already scrolls it", () => {
	assert.equal(takesStop(column, true), false);
});

test("a region that fits takes none", () => {
	assert.equal(takesStop({ ...column, scrollHeight: 600 }, false), false);
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
