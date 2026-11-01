import assert from "node:assert/strict";
import { test } from "node:test";
import { boundPieces } from "./bound.ts";

// The pieces that stay whole: every odd entry.
const whole = (text: string) =>
	boundPieces(text).filter((_, at) => at % 2 === 1);

test("a flag is one piece with its leading hyphens", () => {
	assert.deepEqual(whole("sudo tailscale serve --bg --https=443"), [
		"--bg",
		"--https=443",
	]);
});

test("a hyphen inside a word is no piece: the browser breaks after it", () => {
	assert.deepEqual(whole("A-repository-with-a-name-long-enough-to-wrap"), []);
	assert.deepEqual(whole("Pre-release builds"), []);
});

test("a flag keeps the hyphen that ends it, so a line never starts on one", () => {
	assert.deepEqual(whole("--bg-color-primary"), ["--bg-"]);
	assert.equal(
		boundPieces("--bg-color-primary").join(""),
		"--bg-color-primary",
	);
});

test("a hyphen before a digit stays with the digit", () => {
	assert.deepEqual(whole("--x-3 webauthn-3"), ["--x-3"]);
});

test("a lone dash between words is text", () => {
	assert.deepEqual(whole("a - b"), []);
});

test("the pieces rejoin to the source", () => {
	for (const text of ["--bg", "a-b --c-d-e f", "-", "x- -y", "https://a/b-c"])
		assert.equal(boundPieces(text).join(""), text);
});
