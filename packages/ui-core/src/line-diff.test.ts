import assert from "node:assert/strict";
import { test } from "node:test";
import type { Hunk } from "./descriptors.ts";
import { lineHunks } from "./line-diff.ts";

// A hunk's lines as git prints them: the mark, then the text.
const printed = (hunks: Hunk[]) =>
	hunks.flatMap((hunk) =>
		hunk.lines.map(
			(line) =>
				`${line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}${line.text}`,
		),
	);

const json = (...lines: string[]) => `${lines.join("\n")}\n`;

test("a block added after the last member draws the closing line changed and the block whole", () => {
	const before = json("{", '  "entity": {', '    "kind": "string"', "  }", "}");
	const after = json(
		"{",
		'  "entity": {',
		'    "kind": "string"',
		"  },",
		'  "colour": {',
		'    "kind": "string"',
		"  }",
		"}",
	);
	const hunks = lineHunks(before, after);
	assert.deepEqual(printed(hunks), [
		" {",
		'   "entity": {',
		'     "kind": "string"',
		"-  }",
		"+  },",
		'+  "colour": {',
		'+    "kind": "string"',
		"+  }",
		" }",
	]);
	assert.equal(hunks[0]?.header, "@@ -1,5 +1,8 @@");
	// The numbers follow the lines as drawn: the old close is the old fourth
	// line, the block's own close the new seventh.
	assert.deepEqual(
		hunks[0]?.lines.slice(3).map((line) => [line.before, line.after]),
		[
			[4, undefined],
			[undefined, 4],
			[undefined, 5],
			[undefined, 6],
			[undefined, 7],
			[5, 8],
		],
	);
});

test("a last member removed draws the same way, mirrored", () => {
	const before = json(
		"{",
		'  "entity": {',
		'    "kind": "string"',
		"  },",
		'  "colour": {',
		'    "kind": "string"',
		"  }",
		"}",
	);
	const after = json("{", '  "entity": {', '    "kind": "string"', "  }", "}");
	assert.deepEqual(printed(lineHunks(before, after)), [
		" {",
		'   "entity": {',
		'     "kind": "string"',
		"-  },",
		'-  "colour": {',
		'-    "kind": "string"',
		"-  }",
		"+  }",
		" }",
	]);
});

test("an object inserted between equal closing lines of a list stands whole", () => {
	const before = json(
		"[",
		"  {",
		'    "entity": "lamp"',
		"  },",
		"  {",
		'    "entity": "fan"',
		"  }",
		"]",
	);
	const after = json(
		"[",
		"  {",
		'    "entity": "lamp"',
		"  },",
		"  {",
		'    "colour": "red"',
		"  },",
		"  {",
		'    "entity": "fan"',
		"  }",
		"]",
	);
	const added = printed(lineHunks(before, after)).filter((line) =>
		line.startsWith("+"),
	);
	assert.deepEqual(added, ["+  {", '+    "colour": "red"', "+  },"]);
});

test("a member inserted after a comma'd sibling stays whole", () => {
	const before = json(
		"{",
		'  "entity": {',
		'    "kind": "string"',
		"  },",
		'  "other": 3',
		"}",
	);
	const after = json(
		"{",
		'  "entity": {',
		'    "kind": "string"',
		"  },",
		'  "colour": {',
		'    "kind": "string"',
		"  },",
		'  "other": 3',
		"}",
	);
	assert.deepEqual(
		printed(lineHunks(before, after)).filter((line) => !line.startsWith(" ")),
		['+  "colour": {', '+    "kind": "string"', "+  },"],
	);
});

test("a function inserted between two keeps its blank line after it, as git does", () => {
	const before = json(
		"function a() {",
		"  return 1;",
		"}",
		"",
		"function c() {",
		"  return 3;",
		"}",
	);
	const after = json(
		"function a() {",
		"  return 1;",
		"}",
		"",
		"function b() {",
		"  return 2;",
		"}",
		"",
		"function c() {",
		"  return 3;",
		"}",
	);
	assert.deepEqual(
		printed(lineHunks(before, after)).filter((line) => !line.startsWith(" ")),
		["+function b() {", "+  return 2;", "+}", "+"],
	);
});

test("a change that slides nowhere is git's unified diff", () => {
	const before = json("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k");
	const after = json("a", "b", "c", "D", "e", "f", "g", "h", "i", "j", "K");
	const hunks = lineHunks(before, after);
	// Six kept lines between the two changes join them into one hunk.
	assert.deepEqual(
		hunks.map((hunk) => hunk.header),
		["@@ -1,11 +1,11 @@"],
	);
	const apart = lineHunks(
		json("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"),
		json("A", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "L"),
	);
	assert.deepEqual(
		apart.map((hunk) => hunk.header),
		["@@ -1,4 +1,4 @@", "@@ -9,4 +9,4 @@"],
	);
});

test("a new file is one hunk of added lines from nothing", () => {
	const hunks = lineHunks("", json("one", "two"));
	assert.equal(hunks[0]?.header, "@@ -0,0 +1,2 @@");
	assert.deepEqual(hunks[0]?.lines, [
		{ kind: "added", text: "one", after: 1 },
		{ kind: "added", text: "two", after: 2 },
	]);
	assert.deepEqual(lineHunks("same\n", "same\n"), []);
});

test("a last line that gains its line end draws changed, its text alone", () => {
	assert.deepEqual(printed(lineHunks("a\nb", "a\nb\n")), [" a", "-b", "+b"]);
});
