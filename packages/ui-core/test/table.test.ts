import assert from "node:assert/strict";
import { test } from "node:test";
import { TABLE_EMPTY } from "../src/variants.ts";

test("an empty grid's EmptyState stands a page inset under the header, across the grid's width", () => {
	assert.equal(TABLE_EMPTY, "pt-page");
});
