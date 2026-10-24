import assert from "node:assert/strict";
import { test } from "node:test";
import { chromePathProblem, exitFailure, missingBrowser } from "./exit.ts";

test("a clean exit is no failure", () => {
	assert.equal(exitFailure("vitest", 0, null), null);
});

test("a nonzero exit names its code", () => {
	assert.equal(exitFailure("vitest", 1, null), "vitest exited with 1");
});

test("a process killed by a signal fails and names the signal", () => {
	assert.equal(
		exitFailure("vitest", null, "SIGKILL"),
		"vitest was killed by SIGKILL",
	);
	assert.equal(
		exitFailure("vitest", null, null),
		"vitest was killed by a signal",
	);
});

test("Playwright's missing executable becomes the install line", () => {
	const stderr =
		"Error: browserType.launch: Executable doesn't exist at /x/chrome-headless-shell\n";
	const line = missingBrowser(stderr);
	assert.ok(line?.includes("npx playwright install chromium"));
	assert.ok(line?.includes("CHROME_PATH"));
	assert.equal(line?.includes("\n"), false);
});

test("any other failure is not a missing browser", () => {
	assert.equal(missingBrowser("AssertionError: 3 axe violations"), null);
});

test("CHROME_PATH is checked only when set", () => {
	assert.equal(
		chromePathProblem(undefined, () => false),
		null,
	);
	assert.equal(
		chromePathProblem("", () => false),
		null,
	);
	assert.equal(
		chromePathProblem("/usr/bin/chrome", () => true),
		null,
	);
	assert.match(
		chromePathProblem("/nope/chrome", () => false) ?? "",
		/CHROME_PATH \/nope\/chrome does not exist/,
	);
});
