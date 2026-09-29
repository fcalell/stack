import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { deriveTheme } from "../src/derive.ts";
import { designMd } from "../src/design-md.ts";

test("the committed DESIGN.md is the emitter's output", () => {
	const committed = readFileSync(
		new URL("../../../DESIGN.md", import.meta.url),
		"utf8",
	);
	assert.equal(
		committed,
		designMd(deriveTheme()),
		"DESIGN.md drifted: run `pnpm --filter @fcalell/ui-core design-md`",
	);
});
