import assert from "node:assert/strict";
import { test } from "node:test";
import type {
	EitherPick,
	MultiPick,
	Option,
	OptionPick,
	RuleTerms,
} from "../src/descriptors.ts";
import {
	isTyped,
	marked,
	PICKED_GLYPH,
	pairSet,
	termLabel,
	termSet,
} from "../src/rules.ts";

const OPTIONS: Option[] = [
	{ value: "page", label: "Page type" },
	{ value: "url", label: "URL", icon: "Link" },
	{ value: "who", label: "Visitor", avatar: {} },
	{ value: "state", label: "State", status: "active" },
];

const pick = (value?: string): { pick: OptionPick } => ({
	pick: { label: "Field", options: OPTIONS, value, onChange: () => {} },
});
const picks = (value: string[]): { picks: MultiPick } => ({
	picks: { label: "Values", options: OPTIONS, value, onChange: () => {} },
});
const either = (value: EitherPick["value"]): { either: EitherPick } => ({
	either: { label: "Source", options: OPTIONS, value, onChange: () => {} },
});

test("a term holds a value once it names an option, a member or text", () => {
	assert.equal(termSet(pick()), false);
	assert.equal(termSet(pick("page")), true);
	assert.equal(termSet(picks([])), false);
	assert.equal(termSet(picks(["page"])), true);
	assert.equal(termSet(either({})), false);
	assert.equal(termSet(either({ picked: "url" })), true);
	assert.equal(termSet(either({ typed: "" })), false);
	assert.equal(termSet(either({ typed: "checkout" })), true);
});

test("a pair's arrow waits for both sides, a condition has none", () => {
	const pair = (from: string, to?: string): RuleTerms => ({
		from: either(from ? { typed: from } : {}),
		to: pick(to),
	});
	assert.equal(pairSet(pair("", undefined)), false);
	assert.equal(pairSet(pair("x", undefined)), false);
	assert.equal(pairSet(pair("", "page")), false);
	assert.equal(pairSet(pair("x", "page")), true);
	assert.equal(
		pairSet({ field: pick("page").pick, operator: "in", value: picks(["a"]) }),
		false,
	);
});

test("a term is named by what it picks", () => {
	assert.equal(termLabel(pick()), "Field");
	assert.equal(termLabel(picks([])), "Values");
	assert.equal(termLabel(either({})), "Source");
});

test("a typed value is told from a picked one", () => {
	assert.equal(isTyped({ typed: "x" }), true);
	assert.equal(isTyped({ picked: "page" }), false);
	assert.equal(isTyped({}), false);
});

test("an option with no leading form leads with the picked glyph", () => {
	const flat = marked(OPTIONS) as Option[];
	assert.equal(flat[0]?.icon, PICKED_GLYPH);
	assert.equal(flat[1]?.icon, "Link");
	assert.equal(flat[2]?.icon, undefined);
	assert.equal(flat[3]?.icon, undefined);
	const empty = marked<string | null>([{ value: null, label: "Not set" }]);
	assert.equal((empty as Option<string | null>[])[0]?.icon, undefined);
});

test("grouped options keep their groups when marked", () => {
	const grouped = marked([
		{ label: "Page", options: [{ value: "page", label: "Page type" }] },
	]);
	assert.deepEqual(grouped, [
		{
			label: "Page",
			options: [{ value: "page", label: "Page type", icon: PICKED_GLYPH }],
		},
	]);
});
