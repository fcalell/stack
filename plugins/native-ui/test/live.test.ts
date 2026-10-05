import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const ui = new URL("../src/ui/", import.meta.url);

test("only lib/live names the live-region and announce APIs: every other site announces through useLive", () => {
	const files = readdirSync(ui, { recursive: true, encoding: "utf8" }).filter(
		(path) => /\.tsx?$/.test(path) && path !== "lib/live.ts",
	);
	assert.ok(files.length > 0);
	for (const path of files)
		assert.doesNotMatch(
			readFileSync(new URL(path, ui), "utf8"),
			/accessibilityLiveRegion|announceForAccessibility/,
			path,
		);
});
