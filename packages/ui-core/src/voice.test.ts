import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// `guide/voice.md` states a length by its token. A px value stands only as the
// value at the default `size` (or `radius`) knob, written
// "`token` (32 px, 44 px on touch, at the default `size`)", or is a true
// constant below: a number no knob moves. A formula never joins this list.
const CONSTANTS: readonly { phrase: string; reason: string }[] = [
	{ phrase: "1 px edge", reason: "the hairline (HAIRLINE_PX), fixed" },
	{ phrase: "1 px rail", reason: "the hairline (HAIRLINE_PX), fixed" },
	{ phrase: "2 px ink underline", reason: "the chosen tab's underline, fixed" },
	{
		phrase: "3 px accent bar",
		reason: "the current bar, three hairlines, fixed",
	},
	{ phrase: "`tablet` (768 px)", reason: "a breakpoint" },
	{ phrase: "a target 24 px", reason: "the target floor (WCAG 2.5.8)" },
	{
		phrase: "44 px for a primary act on touch",
		reason: "the touch target (TARGET_PX.touch), declared",
	},
];

const PX = /\d+(?:\.\d+)? px/g;
// A token, then words with no sentence break, then a parenthesis of px values
// (or ch) ending "at the default `size`" or "`radius`".
const STATED =
	/`[a-z-]+`[^.;(`]*\(\d+(?:\.\d+)? (?:px|ch)(?: on touch)?(?:, \d+(?:\.\d+)? (?:px|ch)(?: on touch)?)*(?:, | )at the default `(?:size|radius)`\)/g;

const lines = readFileSync(
	new URL("../guide/voice.md", import.meta.url),
	"utf8",
).split("\n");

test("voice.md states every px value beside a token or as a listed constant", () => {
	const bare: string[] = [];
	lines.forEach((line, index) => {
		let rest = line;
		for (const { phrase } of CONSTANTS) rest = rest.replaceAll(phrase, "");
		rest = rest.replace(STATED, "");
		for (const value of rest.match(PX) ?? []) {
			bare.push(`voice.md:${index + 1}: bare ${value}`);
		}
	});
	assert.deepEqual(bare, []);
});

test("every listed constant stands in voice.md", () => {
	const text = lines.join("\n");
	for (const { phrase, reason } of CONSTANTS) {
		assert.ok(
			text.includes(phrase),
			`${phrase} (${reason}) is not in voice.md`,
		);
	}
});
