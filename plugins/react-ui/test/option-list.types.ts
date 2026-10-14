import type { Datum, Selection } from "@fcalell/plugin-api/tanstack-query";
import type {
	OptionList,
	OptionListProps,
} from "../src/ui/components/option-list/index.tsx";

interface Scope {
	id: string;
	name: string;
}

declare const scopes: Selection<readonly Scope[]>;
const option = {
	value: (each: Scope) => each.id,
	label: (each: Scope) => each.name,
};
const chosen = { value: [], onChange: () => {} };

// an OptionList takes `items`, constants or a selection, with `option`
{
	const loaded: OptionListProps<string, Scope> = {
		...chosen,
		items: scopes,
		option,
	};
	const constant: OptionListProps<string, Scope> = {
		...chosen,
		items: [],
		option,
	};
	void loaded;
	void constant;
}

// an OptionList takes static `options`, never beside `items`
{
	const fixed: OptionListProps = {
		...chosen,
		options: [{ value: "a", label: "A" }],
	};
	// @ts-expect-error: a static set and items never together
	const both: OptionListProps<string, Scope> = {
		...chosen,
		options: [],
		items: scopes,
		option,
	};
	void fixed;
	void both;
}

// items need their `option` map, and no query, sentence or loading remain
{
	// @ts-expect-error: items need their `option` map
	const bare: OptionListProps<string, Scope> = { ...chosen, items: scopes };
	const gone: OptionListProps<string, Scope> = {
		...chosen,
		items: scopes,
		option,
		// @ts-expect-error: the frame draws the failed and empty forms
		sentence: "x",
	};
	void bare;
	void gone;
}

// The component's own signatures, called as JSX calls them; never run.
declare const optionList: typeof OptionList;
type Plan = "free" | "pro";
const PLANS: { value: Plan; label: string }[] = [
	{ value: "free", label: "Free" },
	{ value: "pro", label: "Pro" },
];
declare const plans: Selection<readonly { id: Plan }[]>;
declare const picked: Selection<Plan | null>;
declare const pickedSet: Selection<readonly Plan[]>;

// one value or null types an inline `onChange` with one value
{
	const typed = (one: Datum<Plan | null>) => [
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
			options: PLANS,
			value: picked,
			onChange: (next) => {
				const picked: Plan = next;
				void picked;
			},
		}),
		optionList({
			items: plans,
			option: { value: (each) => each.id, label: (each) => each.id },
			value: null,
			onChange: (next) => {
				const picked: Plan = next;
				void picked;
			},
		}),
	];
	void typed;
}

// a set types an inline `onChange` with the set, and each form refuses the other's
{
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
			options: PLANS,
			value: pickedSet,
			onChange: (next) => {
				const picked: Plan[] = next;
				void picked;
			},
		}),
		optionList({
			items: plans,
			option: { value: (each) => each.id, label: (each) => each.id },
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
}
