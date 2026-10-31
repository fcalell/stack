import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { icons } from "lucide";

// `IconName` is Lucide's names written out (`scripts/icon-name.ts`), so ui-core's types need no
// Lucide; this holds the list to the Lucide the roster is built against.
test("IconName lists exactly the names Lucide exports", () => {
	const source = readFileSync(
		new URL("./icon-name.ts", import.meta.url),
		"utf8",
	);
	const listed = [...source.matchAll(/\| "([A-Za-z0-9]+)"/g)].map(
		(match) => match[1],
	);
	assert.deepEqual(listed, Object.keys(icons).sort());
});
