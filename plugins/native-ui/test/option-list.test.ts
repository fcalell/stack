import { test } from "node:test";
import type { OptionListProps } from "../src/ui/components/option-list/index.tsx";

interface Scope {
	id: string;
	name: string;
}

const query = {
	data: [] as Scope[],
	isPending: false,
	isError: false,
	refetch: () => {},
};
const option = {
	value: (each: Scope) => each.id,
	label: (each: Scope) => each.name,
};
const chosen = { value: [], onChange: () => {} };

test("an OptionList takes `query` with `option`, `sentence` and `empty`", () => {
	const loaded: OptionListProps<string, Scope> = {
		...chosen,
		query,
		option,
		sentence: "The scopes did not load.",
		empty: "Nothing to grant.",
	};
	void loaded;
});

test("an OptionList takes static `options`, never beside a query", () => {
	const fixed: OptionListProps = {
		...chosen,
		options: [{ value: "a", label: "A" }],
	};
	// @ts-expect-error: a static set and a query never together
	const both: OptionListProps<string, Scope> = {
		...chosen,
		options: [],
		query,
		option,
		sentence: "x",
		empty: "x",
	};
	void fixed;
	void both;
});

test("a query's OptionList names its failure and its empty sentence", () => {
	// @ts-expect-error: a query needs its `sentence` and `empty`
	const bare: OptionListProps<string, Scope> = { ...chosen, query, option };
	void bare;
});
