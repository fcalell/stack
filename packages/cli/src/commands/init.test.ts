import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { StackError } from "../lib/errors.ts";
import { assertInitTarget } from "./init.ts";

const ok = { dirGiven: true, force: false, tty: false };

test("init refuses the cwd without a terminal", () => {
	const dir = mkdtempSync(join(tmpdir(), "stack-init-"));
	try {
		assert.throws(
			() => assertInitTarget(dir, { ...ok, dirGiven: false }),
			StackError,
		);
		assertInitTarget(dir, { ...ok, dirGiven: false, tty: true });
		assertInitTarget(dir, ok);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("init refuses a directory with a project unless forced", () => {
	for (const file of ["package.json", "stack.config.ts"]) {
		const dir = mkdtempSync(join(tmpdir(), "stack-init-"));
		try {
			writeFileSync(join(dir, file), "");
			assert.throws(
				() => assertInitTarget(dir, ok),
				/already has a project; use `stack add <plugin>`/,
			);
			assertInitTarget(dir, { ...ok, force: true });
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}
});
