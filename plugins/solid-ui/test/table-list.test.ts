import assert from "node:assert/strict";
import { test } from "node:test";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import { listedRow } from "../src/ui/lib/table-list.ts";

const COLUMNS: TableColumn[] = [
	{ key: "name", label: "Page" },
	{ key: "url", label: "URL pattern", kind: "source" },
	{ key: "type", label: "Type", kind: "chip", family: 1 },
	{ key: "state", label: "Status", kind: "status" },
	{ key: "tagged", label: "Tagged", kind: "check" },
	{ key: "seen", label: "Seen", kind: "age" },
];

test("the first column titles the row, a status leads it, an age trails it", () => {
	const listed = listedRow(COLUMNS, {
		id: "p1",
		cells: {
			name: "Product",
			url: "/p/*",
			type: "Product",
			state: { status: "done", label: "Validated" },
			tagged: true,
			seen: "2026-09-29T10:00:00.000Z",
		},
	});
	assert.deepEqual(listed, {
		title: "Product",
		leading: { status: "done" },
		meta: ["/p/*", "Product", "Tagged"],
		trailing: { age: "2026-09-29T10:00:00.000Z" },
	});
});

test("empty and unticked cells leave the meta line", () => {
	const listed = listedRow(COLUMNS, {
		id: "p2",
		cells: { name: "Cart", url: null, tagged: false },
	});
	assert.deepEqual(listed, {
		title: "Cart",
		leading: undefined,
		meta: undefined,
		trailing: undefined,
	});
});

test("a picked value reads as its option's label", () => {
	const listed = listedRow(
		[
			{ key: "name", label: "Page" },
			{
				key: "kind",
				label: "Kind",
				edit: {
					control: "picker",
					options: [{ value: "pdp", label: "Product detail" }],
				},
			},
		],
		{ id: "p3", cells: { name: "Shoe", kind: "pdp" } },
	);
	assert.deepEqual(listed.meta, ["Product detail"]);
});
