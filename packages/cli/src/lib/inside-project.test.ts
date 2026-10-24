import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { StackError } from "./errors.ts";
import { insideProject } from "./inside-project.ts";

const cwd = resolve("/tmp/proj");

test("a path inside the project resolves against it", () => {
	assert.equal(insideProject(cwd, "src/app"), resolve(cwd, "src/app"));
	assert.equal(insideProject(cwd, "./a/../b.ts"), resolve(cwd, "b.ts"));
	assert.equal(insideProject(cwd, "..foo"), resolve(cwd, "..foo"));
});

test("the root, a parent, an escape and an absolute path outside are refused", () => {
	for (const bad of [
		"",
		".",
		"..",
		"../x",
		"a/../../x",
		"/etc/passwd",
		resolve("/tmp/proj-other/x"),
	]) {
		assert.throws(() => insideProject(cwd, bad), StackError, bad);
	}
});

test("an absolute path inside the project is accepted", () => {
	assert.equal(insideProject(cwd, resolve(cwd, "src")), resolve(cwd, "src"));
});
