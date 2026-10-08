import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { deriveTheme } from "../src/derive.ts";
import { designMd } from "../src/design-md.ts";
import { SHEET_DOCKED_BODY_SHARE } from "../src/tokens.ts";

test("the committed DESIGN.md is the emitter's output", () => {
	const committed = readFileSync(
		new URL("../DESIGN.md", import.meta.url),
		"utf8",
	);
	assert.equal(
		committed,
		designMd(deriveTheme()),
		"DESIGN.md drifted: run `pnpm --filter @fcalell/ui-core design-md`",
	);
});

test("DESIGN.md states the docked sheet's body floor and share", () => {
	const md = designMd(deriveTheme());
	assert.ok(md.includes("A docked sheet's body keeps `docked-floor` ("));
	assert.ok(
		md.includes(
			`scrolls past ${SHEET_DOCKED_BODY_SHARE * 100}% of its foot's region.`,
		),
	);
});
