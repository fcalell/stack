import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = (path: string) =>
	readFileSync(new URL(`../src/ui/${path}`, import.meta.url), "utf8");

test("a Place or Split chooses its body by the filling Thread's mark: no `ThreadFills`, no `fills` state", () => {
	for (const path of [
		"components/place/index.tsx",
		"components/split/index.tsx",
		"components/thread/index.tsx",
		"lib/frame.ts",
	]) {
		const code = source(path);
		assert.doesNotMatch(code, /ThreadFills|setFills|\[fills\b/, path);
	}
	assert.match(source("components/thread/index.tsx"), /data-fill\n/);
	assert.match(source("components/place/index.tsx"), /BODY_FILLED/);
	assert.match(source("components/split/index.tsx"), /MAIN_FILLED/);
});
