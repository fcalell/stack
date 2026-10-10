import assert from "node:assert/strict";
import { test } from "node:test";
import type { TableColumn } from "../src/descriptors.ts";
import {
	cellEdit,
	cellLocked,
	changeKind,
	changeMeta,
	isChangeCell,
	isStatusCell,
	order,
	type Sort,
	shown,
	sorted,
	tickable,
} from "../src/list-state.ts";

const words = {
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

test("a change cell sets X → Y on touch, the word added or removed before a lone value", () => {
	const changed = { before: "30s", after: "60s" };
	assert.equal(changeMeta(changed, words), "30s → 60s");
	const added = { before: null, after: "60s" };
	assert.equal(changeMeta(added, words), "Added 60s");
	const removed = { before: "30s", after: null };
	assert.equal(changeMeta(removed, words), "Removed 30s");
	assert.equal(changeMeta({ before: null, after: null }, words), "");
});

const record = (locked?: readonly string[]) => ({
	id: "1",
	href: undefined,
	locked,
	warning: undefined,
	change: undefined,
	blocked: undefined,
	moved: undefined,
	cells: {},
});
const editable: TableColumn = {
	key: "role",
	label: "Role",
	cell: () => "",
	edit: { control: "input" },
};
const held: TableColumn = { ...editable, locked: true };
const plain: TableColumn = { key: "role", label: "Role", cell: () => "" };

test("a cell edits through its column, unless the row or the column locks it", () => {
	assert.deepEqual(cellEdit(editable, false, true, record()), {
		control: "input",
	});
	assert.equal(cellEdit(editable, false, false, record()), undefined);
	assert.equal(cellEdit(editable, true, true, record()), undefined);
	assert.equal(cellEdit(editable, false, true, record(["role"])), undefined);
	assert.equal(cellEdit(held, false, true, record()), undefined);
});

test("a cell its row locks draws the lock; a locked column draws it in its head alone", () => {
	assert.equal(cellLocked(editable, false, true, record(["role"])), true);
	assert.equal(cellLocked(editable, false, true, record(["name"])), false);
	assert.equal(cellLocked(editable, false, false, record(["role"])), false);
	assert.equal(cellLocked(editable, true, true, record(["role"])), false);
	assert.equal(cellLocked(held, false, true, record(["role"])), false);
	assert.equal(cellLocked(plain, false, true, record(["role"])), false);
});

test("a cell is a change cell or a status cell by the key it holds", () => {
	assert.equal(isStatusCell({ status: "done" }), true);
	assert.equal(isStatusCell({ before: null, after: "1" }), false);
	assert.equal(isStatusCell("done"), false);
	assert.equal(isStatusCell(null), false);
	assert.equal(isStatusCell(undefined), false);
});

const PICK: TableColumn = {
	key: "role",
	label: "Role",
	cell: () => "",
	edit: {
		control: "picker",
		options: [
			{ label: "Admin", value: "admin" },
			{ label: "Viewer", value: "viewer" },
		],
	},
};
const GROUPED: TableColumn = {
	...PICK,
	edit: {
		control: "picker",
		options: [
			{ label: "Roles", options: [{ label: "Admin", value: "admin" }] },
		],
	},
};
const AGE: TableColumn = {
	key: "seen",
	label: "Seen",
	kind: "age",
	cell: () => "",
};
const ago = (moment: string) => `ago ${moment}`;

test("a cell reads as its option's label, its status word, its age, or its value", () => {
	assert.equal(shown(PICK, "viewer", ago), "Viewer");
	assert.equal(shown(GROUPED, "admin", ago), "Admin");
	assert.equal(shown(PICK, "other", ago), "other");
	assert.equal(shown(plain, 4, ago), "4");
	assert.equal(
		shown(plain, { status: "done", label: "Shipped" }, ago),
		"Shipped",
	);
	assert.equal(shown(plain, { status: "done" }, ago), "");
	assert.equal(shown(plain, { before: "a", after: "b" }, ago), "b");
	assert.equal(shown(AGE, "2026-01-01", ago), "ago 2026-01-01");
	assert.equal(shown(plain, null, ago), "");
	assert.equal(shown(plain, true, ago), "");
});

test("a cell sorts by its number, its moment, its flag or the text it reads as", () => {
	assert.equal(order(plain, null), "");
	assert.equal(order(plain, 7), 7);
	assert.equal(order(plain, true), 1);
	assert.equal(order(plain, false), 0);
	assert.equal(order(PICK, "viewer"), "Viewer");
	assert.equal(
		order(AGE, "2026-01-01T00:00:00Z"),
		Date.parse("2026-01-01T00:00:00Z"),
	);
	assert.equal(order(plain, { status: "done" }), "done");
	assert.equal(order(plain, { status: "done", label: "Shipped" }), "Shipped");
	assert.equal(order(plain, { before: "a", after: "b" }), "b");
});

const column = (key: string, kind?: "number"): TableColumn =>
	kind
		? { key, label: key, kind, cell: () => "" }
		: { key, label: key, cell: () => "" };
const recordsOf = (key: string, ...cells: (string | number | null)[]) =>
	cells.map((cell, at) => ({
		...record(),
		id: String(at),
		cells: { [key]: cell },
	}));
const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);

test("rows sort by the column, numbers as numbers and text in numeric order, an empty cell last either way", () => {
	const numbers = recordsOf("n", 10, 2, null, 5);
	const by = (direction: Sort["direction"]) =>
		ids(sorted(numbers, [column("n", "number")], { key: "n", direction }));
	assert.deepEqual(by("descending"), ["0", "3", "1", "2"]);
	assert.deepEqual(by("ascending"), ["1", "3", "0", "2"]);
	const text = recordsOf("t", "item 10", "item 9", "item 1");
	assert.deepEqual(
		ids(sorted(text, [column("t")], { key: "t", direction: "ascending" })),
		["2", "1", "0"],
	);
});

test("rows keep their order with no sort or no such column", () => {
	const text = recordsOf("t", "b", "a");
	assert.equal(sorted(text, [column("t")], undefined), text);
	assert.equal(
		sorted(text, [column("t")], { key: "x", direction: "ascending" }),
		text,
	);
});

test("the rows a tick reaches are those with no blocked reason", () => {
	const held = { ...record(), id: "b", blocked: "Owner" };
	assert.deepEqual(ids(tickable([{ ...record(), id: "a" }, held])), ["a"]);
	assert.deepEqual(tickable([held]), []);
});
