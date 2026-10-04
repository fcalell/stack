import { test } from "node:test";
import type { ListProps } from "../src/ui/components/list/index.tsx";

interface Changed {
	path: string;
	added: number;
	removed: number;
}

const file = {
	key: (each: Changed) => each.path,
	path: (each: Changed) => each.path,
	added: (each: Changed) => each.added,
	removed: (each: Changed) => each.removed,
};
const row = { key: (each: Changed) => each.path, title: String };

test("a List takes `file` as an item map over FileRow's slots", () => {
	const files: ListProps<Changed> = { items: [], file };
	void files;
});

test("a List holds one item kind: `row` and `file` together fail the type-check", () => {
	// @ts-expect-error: one List holds one row kind
	const both: ListProps<Changed> = { items: [], row, file };
	void both;
});

interface Limit {
	label: string;
	used: number;
	max: number;
}

const meter = {
	key: (each: Limit) => each.label,
	label: (each: Limit) => each.label,
	value: (each: Limit) => each.used,
	max: (each: Limit) => each.max,
};

test("a List takes `meter` as an item map over Meter's slots", () => {
	const limits: ListProps<Limit> = { items: [], meter };
	void limits;
});

test("a List holds one item kind: `meter` and `row` together fail the type-check", () => {
	const title = (each: Limit) => each.label;
	// @ts-expect-error: one List holds one item kind
	const both: ListProps<Limit> = {
		items: [],
		row: { key: title, title },
		meter,
	};
	void both;
});
