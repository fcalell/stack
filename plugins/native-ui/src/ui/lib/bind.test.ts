import assert from "node:assert/strict";
import { test } from "node:test";
import { codeBound, codeWhole, titleBound } from "./bind.ts";

test("a hyphen that leads a word binds to it", () => {
	assert.equal(codeBound("--bg"), "-\u2060-\u2060bg");
	assert.equal(codeBound("a - b"), "a - b");
});

test("a URL breaks after its separators, never inside a run of them", () => {
	const out = codeWhole("https://app.example.com/auth/webauthn-3");
	assert.ok(out.includes("//\u200Bapp"));
	assert.ok(out.includes("/\u200Bauth/\u200Bwebauthn"));
	assert.ok(!out.includes("/\u200B/"));
	// A hyphen inside a word is the platform's own: "webauthn-3" is untouched.
	assert.ok(out.endsWith("webauthn-3"));
});

test("a flag's hyphen after a word is no leading one", () => {
	assert.equal(codeBound("--bg-color"), "-\u2060-\u2060bg-color");
});

test("a title breaks after a hyphen, never before one", () => {
	assert.equal(titleBound("Pre-release builds"), "Pre\u2060-release builds");
	assert.equal(titleBound("A - B"), "A - B");
	assert.equal(titleBound("Rules"), "Rules");
});
