import assert from "node:assert/strict";
import { test } from "node:test";
import { claudeMdTemplate } from "../src/templates/claude-md.ts";

test("a missing CLAUDE.md becomes the guide's import", () => {
	assert.equal(claudeMdTemplate(null), "@.stack/guide.md\n");
});

test("an existing CLAUDE.md gains the import after its content", () => {
	assert.equal(
		claudeMdTemplate("# My app\n\nRules.\n"),
		"# My app\n\nRules.\n\n@.stack/guide.md\n",
	);
});

test("a CLAUDE.md that already imports the guide is left alone", () => {
	assert.equal(claudeMdTemplate("# My app\n@.stack/guide.md\nMore.\n"), null);
});
