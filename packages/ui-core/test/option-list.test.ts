import assert from "node:assert/strict";
import { test } from "node:test";
import {
	type OptionSlots,
	optionShape,
	optionsOf,
	optionsShape,
} from "../src/list-state.ts";
import { ROSTER } from "../src/roster.ts";

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
