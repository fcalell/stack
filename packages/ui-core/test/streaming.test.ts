import assert from "node:assert/strict";
import { test } from "node:test";
import { closeOpenRuns } from "../src/streaming.ts";

const cases: ReadonlyArray<[string, string]> = [
	["*Sign", "*Sign*"],
	["*Sign in* then", "*Sign in* then"],
	["a **bold", "a **bold**"],
	["a **bold *and", "a **bold *and***"],
	["a ~~gone", "a ~~gone~~"],
	["run `npm", "run `npm`"],
	["run ``a ` b", "run ``a ` b``"],
	["see [the docs", "see [the docs]()"],
	["see [the docs](https://x.", "see [the docs](https://x.)"],
	["see [the docs](https://x.dev) now", "see [the docs](https://x.dev) now"],
	["```ts\nconst a", "```ts\nconst a\n```"],
	["```ts\nconst a\n", "```ts\nconst a\n```"],
	["```ts\nconst a\n```\nthen *x", "```ts\nconst a\n```\nthen *x*"],
];

test("a run left open at the end of a reply is closed in its own form", () => {
	for (const [open, closed] of cases) assert.equal(closeOpenRuns(open), closed);
});

test("a marker no text follows, a spaced marker and a snake_case word stay text", () => {
	for (const text of [
		"Sign *",
		"Sign **",
		"2 * 3 * 4",
		"- item\n* item",
		"snake_case_name",
		"a `",
		"price \\*not",
		"done.",
		"",
	])
		assert.equal(closeOpenRuns(text), text);
});

test("an open run ends at a blank line, and a closed text is a fixed point", () => {
	assert.equal(closeOpenRuns("*a\n\nnext *b"), "*a\n\nnext *b*");
	for (const [, closed] of cases)
		assert.equal(closeOpenRuns(closed), closed, closed);
});
