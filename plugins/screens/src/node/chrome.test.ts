import assert from "node:assert/strict";
import { test } from "node:test";
import { findChrome, NO_CHROME } from "./chrome.ts";

const on =
	(...paths: string[]) =>
	(path: string) =>
		paths.includes(path);

test("CHROME_PATH wins when it is an executable", () => {
	assert.equal(
		findChrome({ CHROME_PATH: "/x/chrome", PATH: "/bin" }, on("/x/chrome")),
		"/x/chrome",
	);
});

test("a CHROME_PATH that is no executable is one line naming it", () => {
	assert.throws(
		() => findChrome({ CHROME_PATH: "/nope" }, on()),
		(error: Error) =>
			error.message.includes("CHROME_PATH /nope") &&
			!error.message.includes("\n"),
	);
});

test("PATH is searched for chromium, then google-chrome", () => {
	const env = { PATH: "/a:/b" };
	assert.equal(
		findChrome(env, on("/b/chromium", "/a/google-chrome")),
		"/b/chromium",
	);
	assert.equal(
		findChrome(env, on("/b/google-chrome-stable")),
		"/b/google-chrome-stable",
	);
});

test("no Chrome is one actionable line", () => {
	assert.throws(() => findChrome({ PATH: "/a" }, on()), new Error(NO_CHROME));
	assert.equal(NO_CHROME.includes("\n"), false);
});
