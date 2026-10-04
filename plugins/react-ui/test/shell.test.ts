import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = (path: string) =>
	readFileSync(new URL(`../src/ui/${path}`, import.meta.url), "utf8");

test("the toasts stand above a docked foot by layout: the Shell holds no footing, height or frame state, and no foot reports its height", () => {
	const shell = source("components/shell/index.tsx");
	assert.doesNotMatch(shell, /\[(footing|height|frame),/);
	assert.doesNotMatch(shell, /FootDocks/);
	for (const path of [
		"lib/frame.ts",
		"components/place/index.tsx",
		"components/thread/index.tsx",
	])
		assert.doesNotMatch(source(path), /useFootDocks|FootDocks/, path);
	assert.match(shell, /anchor\(--docked-foot_top/);
	for (const path of [
		"components/place/index.tsx",
		"components/thread/index.tsx",
	])
		assert.match(source(path), /anchor-name:--docked-foot/, path);
});
