import assert from "node:assert/strict";
import { test } from "node:test";
import { rosterEntries } from "@fcalell/ui-core/roster";
import { showcaseCells, showcaseFrames } from "../src/ui/showcase/cells.ts";

test("every roster component has frames, and every cell id is unique", () => {
	const ids = showcaseCells();
	assert.equal(new Set(ids).size, ids.length);
	const drawn = new Set(showcaseFrames().map((frame) => frame.component));
	for (const [, name] of rosterEntries()) assert.ok(drawn.has(name), name);
	assert.ok(ids.includes("Button/BUTTON.act.primary/rest/light/touch"));
	assert.ok(ids.includes("Table/TABLE_ROW.state.selected/empty/dark/desktop"));
	assert.ok(
		!ids.some((id) => id.startsWith("Button/") && id.includes("/empty/")),
	);
	assert.ok(
		!ids.some((id) => id.startsWith("Text/") && !id.includes("/rest/")),
	);
});
