import assert from "node:assert/strict";
import { test } from "node:test";
import { expo } from "../src/index.ts";
import { aggregateEntry } from "../src/node/codegen.ts";

test("the entry draws a status bar that follows the color scheme", () => {
	const entry =
		aggregateEntry({
			imports: [],
			providers: [],
			appContextPath: "../src/app",
		}) ?? "";
	assert.match(entry, /^import \{ StatusBar \} from "expo-status-bar";$/m);
	assert.match(
		entry,
		/<Fragment><ExpoRoot [^>]*\/><StatusBar style="auto" \/><\/Fragment>/,
	);
	assert.ok(expo.cli.dependencies["expo-status-bar"]);
});
