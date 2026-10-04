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
