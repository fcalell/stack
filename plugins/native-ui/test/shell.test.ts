import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = (path: string) =>
	readFileSync(new URL(`../src/ui/${path}`, import.meta.url), "utf8");

test("the toasts stand over the box the page draws above its docked foot: the Shell holds no footing, height or frame state, and no foot reports its height", () => {
	for (const shell of [
		source("components/shell/index.tsx"),
		source("components/shell/host.tsx"),
	]) {
		assert.doesNotMatch(shell, /\[(footing|height|frame),/);
		assert.doesNotMatch(shell, /onLayout|FootDocks/);
	}
	for (const path of [
		"lib/frame.ts",
		"components/place/index.tsx",
		"components/thread/index.tsx",
	])
		assert.doesNotMatch(source(path), /useFootDocks|FootDocks/, path);
	// A filling Thread's log holds the toasts' box over its own input.
	assert.match(source("components/thread/index.tsx"), /<ToastRoom \/>/);
});
