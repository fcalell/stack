import assert from "node:assert/strict";
import { test } from "node:test";
import {
	choose,
	chosenOf,
	isOneChoice,
	type OneChoice,
	type OptionSlots,
	optionBlocked,
	optionShape,
	optionsOf,
	optionsShape,
	type SetChoice,
} from "../src/list-state.ts";
import { ROSTER } from "../src/roster.ts";
import { OPTION_RADIO_DOT, optionRadio } from "../src/variants.ts";

interface Scope {
	id: string;
	name: string;
	about?: string;
	area: string;
	suggested?: boolean;
}

const SCOPES: Scope[] = [
	{ id: "read", name: "Read repos", area: "Code", about: "Every branch" },
	{ id: "issues", name: "Issues", area: "Planning" },
	{ id: "write", name: "Write repos", area: "Code", suggested: true },
];

test("the roster's OptionList takes a query beside static options and lists its error and empty states", () => {
	const entry = ROSTER.shared.OptionList;
	assert.ok(entry);
	for (const prop of ["options", "query", "option", "sentence", "empty"])
		assert.ok(entry.props.includes(prop), prop);
	assert.ok(entry.states.includes("error"));
	assert.ok(entry.states.includes("empty"));
});

test("a pending OptionList whose option declares no description draws one-line skeleton rows", () => {
	const option: OptionSlots<Scope, string> = {
		value: (scope) => scope.id,
		label: (scope) => scope.name,
	};
	assert.deepEqual(optionShape(option), { description: false, group: false });
	assert.deepEqual(
		optionShape({ ...option, description: (scope: Scope) => scope.about }),
		{ description: true, group: false },
	);
});

test("a static set waits in the shape its options hold", () => {
	assert.deepEqual(optionsShape([{ value: "a", label: "A" }]), {
		description: false,
		group: false,
	});
	assert.deepEqual(
		optionsShape([
			{ label: "G", options: [{ value: "a", label: "A", description: "d" }] },
		]),
		{ description: true, group: true },
	);
});

test("a query's items project into options, grouped in first-seen order", () => {
	assert.deepEqual(
		optionsOf(SCOPES, { value: (s) => s.id, label: (s) => s.name }),
		[
			{ value: "read", label: "Read repos" },
			{ value: "issues", label: "Issues" },
			{ value: "write", label: "Write repos" },
		],
	);
	assert.deepEqual(
		optionsOf(SCOPES, {
			value: (s) => s.id,
			label: (s) => s.name,
			description: (s) => s.about,
			recommended: (s) => s.suggested,
			group: (s) => s.area,
		}),
		[
			{
				label: "Code",
				options: [
					{ value: "read", label: "Read repos", description: "Every branch" },
					{ value: "write", label: "Write repos", recommended: true },
				],
			},
			{ label: "Planning", options: [{ value: "issues", label: "Issues" }] },
		],
	);
});

test("one value or null is one choice; a set is several", () => {
	const one: OneChoice<string> = { value: null, onChange: () => {} };
	const set: SetChoice<string> = { value: [], onChange: () => {} };
	assert.equal(isOneChoice(one), true);
	assert.equal(isOneChoice({ ...one, value: "a" }), true);
	assert.equal(isOneChoice(set), false);
	assert.deepEqual(chosenOf(one), []);
	assert.deepEqual(chosenOf({ ...one, value: "a" }), ["a"]);
	assert.deepEqual(chosenOf({ ...set, value: ["b", "a"] }), ["b", "a"]);
});

test("choosing an option hears one value, or the set with it toggled", () => {
	const values: string[] = [];
	const one: OneChoice<string> = {
		value: "a",
		onChange: (v) => values.push(v),
	};
	choose(one, "b");
	choose(one, "a");
	assert.deepEqual(values, ["b"], "the chosen radio again changes nothing");
	const sets: string[][] = [];
	const set: SetChoice<string> = {
		value: ["a"],
		onChange: (v) => sets.push(v),
	};
	choose(set, "b");
	choose(set, "a");
	assert.deepEqual(sets, [["a", "b"], []]);
});

test("the OptionList holds its radio: a ring at the box size, the chosen one in the toggle fill around its dot", () => {
	const entry = ROSTER.shared.OptionList;
	assert.ok(entry);
	for (const cell of ["OPTION_RADIO", "OPTION_RADIO_DOT"]) {
		assert.ok(entry.draws.includes(cell), cell);
		assert.ok(entry.holds?.includes(cell), cell);
	}
	assert.equal(
		optionRadio({ state: "unchecked" }),
		"size-check rounded-full border border-edge-strong",
	);
	assert.equal(
		optionRadio({ state: "checked" }),
		"size-check rounded-full border border-toggle-on",
	);
	assert.equal(OPTION_RADIO_DOT, "size-dot rounded-full bg-toggle-on");
});

test("an option is blocked only while it is not in the value", () => {
	const option = {
		value: "reviewer",
		label: "Reviewer",
		blocked: "lacks brief.flag",
	};
	assert.equal(optionBlocked(option, false), "lacks brief.flag");
	assert.equal(optionBlocked(option, true), undefined);
	assert.equal(optionBlocked({ value: "dev", label: "Dev" }, false), undefined);
});
