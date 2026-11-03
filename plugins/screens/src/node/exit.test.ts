import assert from "node:assert/strict";
import { test } from "node:test";
import { exitFailure } from "./exit.ts";

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
