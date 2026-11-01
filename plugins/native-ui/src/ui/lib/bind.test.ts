import assert from "node:assert/strict";
import { test } from "node:test";
import { codeBound, codeWhole, titleBound } from "./bind.ts";

test("a hyphen that leads a word binds to it", () => {
	assert.equal(codeBound("--bg"), "-\u2060-\u2060bg");
	assert.equal(codeBound("a - b"), "a - b");
});

test("a URL breaks after its separators, never inside a run of them", () => {
	const out = codeWhole("https://stead.example/auth/webauthn-3");
	assert.ok(out.includes("//\u200Bstead"));
	assert.ok(out.includes("/\u200Bauth/\u200Bwebauthn"));
	assert.ok(!out.includes("/\u200B/"));
	// The last segment keeps its hyphen bound: no break inside "webauthn-3".
	assert.ok(out.endsWith("webauthn-\u20603"));
});

test("a title's hyphens bind its words whole", () => {
	assert.equal(titleBound("Pre-release builds"), "Pre-\u2060release builds");
	assert.equal(titleBound("A - B"), "A - B");
	assert.equal(titleBound("Rules"), "Rules");
});
