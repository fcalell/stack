import { test } from "node:test";
import type {
	OptionList,
	OptionListProps,
} from "../src/ui/components/option-list/index.tsx";

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

// The component's own signatures, called as JSX calls them; never run.
declare const optionList: typeof OptionList;
type Plan = "free" | "pro";
const PLANS: { value: Plan; label: string }[] = [
	{ value: "free", label: "Free" },
	{ value: "pro", label: "Pro" },
];
const plans = { ...query, data: [] as { id: Plan }[] };

test("one value or null types an inline `onChange` with one value", () => {
	const typed = (one: Plan | null) => [
		optionList({
			options: PLANS,
			value: one,
			onChange: (next) => {
				const picked: Plan = next;
				void picked;
			},
		}),
		optionList({
			options: PLANS,
			value: null,
			onChange: (next) => {
				const picked: Plan = next;
				void picked;
			},
		}),
		optionList({
			query: plans,
			option: { value: (each) => each.id, label: (each) => each.id },
			sentence: "x",
			empty: "x",
			value: one,
			onChange: (next) => {
				const picked: Plan = next;
				void picked;
			},
		}),
	];
	void typed;
});

test("a set types an inline `onChange` with the set, and each form refuses the other's", () => {
	const typed = (set: Plan[]) => [
		optionList({
			options: PLANS,
			value: set,
			onChange: (next) => {
				const picked: Plan[] = next;
				void picked;
			},
		}),
		optionList({
			query: plans,
			option: { value: (each) => each.id, label: (each) => each.id },
			sentence: "x",
			empty: "x",
			value: set,
			onChange: (next) => {
				const picked: Plan[] = next;
				void picked;
			},
		}),
		optionList({
			options: PLANS,
			value: set,
			onChange: (next) => {
				// @ts-expect-error: a set's onChange hears the set
				const picked: Plan = next;
				void picked;
			},
		}),
		optionList({
			options: PLANS,
			value: null,
			onChange: (next) => {
				// @ts-expect-error: one choice's onChange hears one value
				const picked: Plan[] = next;
				void picked;
			},
		}),
	];
	void typed;
});
