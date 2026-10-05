import assert from "node:assert/strict";
import { test } from "node:test";
import {
	changeKind,
	changeMeta,
	changeReading,
	isChangeCell,
} from "../src/list-state.ts";
import { TABLE_EMPTY, tableChangeValue } from "../src/variants.ts";

test("an empty grid's EmptyState stands a page inset under the header, across the grid's width", () => {
	assert.equal(TABLE_EMPTY, "pt-page");
});

const words = {
	changed: "from {before} to {after}",
	added: "Added",
	removed: "Removed",
};

test("a change cell is added without a before, removed without an after, and empty with neither", () => {
	assert.equal(changeKind({ before: "30s", after: "60s" }), "changed");
	assert.equal(changeKind({ before: null, after: "60s" }), "added");
	assert.equal(changeKind({ before: "30s", after: null }), "removed");
	assert.equal(changeKind({ before: null, after: null }), undefined);
	assert.equal(isChangeCell({ before: null, after: "1" }), true);
	assert.equal(isChangeCell({ status: "done" }), false);
	assert.equal(isChangeCell("1"), false);
});

test("a change cell reads aloud from X to Y, and touch sets X → Y", () => {
	const changed = { before: "30s", after: "60s" };
	assert.equal(changeReading(changed, words), "from 30s to 60s");
	assert.equal(changeMeta(changed, words), "30s → 60s");
	const added = { before: null, after: "60s" };
	assert.equal(changeReading(added, words), "Added 60s");
	assert.equal(changeMeta(added, words), "Added 60s");
	const removed = { before: "30s", after: null };
	assert.equal(changeReading(removed, words), "Removed 30s");
	assert.equal(changeMeta({ before: null, after: null }, words), "");
});

test("a changed value is neutral; only added and removed take a ground, the removed struck", () => {
	assert.doesNotMatch(tableChangeValue({ kind: "before" }), /bg-/);
	assert.doesNotMatch(tableChangeValue({ kind: "after" }), /bg-/);
	assert.match(tableChangeValue({ kind: "added" }), /bg-ok-soft/);
	const removed = tableChangeValue({ kind: "removed" });
	assert.match(removed, /bg-danger-soft/);
	assert.match(removed, /line-through/);
});
