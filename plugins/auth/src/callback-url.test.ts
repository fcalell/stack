import assert from "node:assert/strict";
import { test } from "node:test";
import {
	isSafeCallbackURL,
	unsafeCallbackField,
} from "./worker/callback-url.ts";

const TRUSTED = [
	"https://app.example.com",
	"https://*.preview.example.com",
	"myapp://",
	"exp://*",
];

test("a path on the app passes", () => {
	assert.equal(isSafeCallbackURL("/", TRUSTED), true);
	assert.equal(isSafeCallbackURL("/dashboard?tab=1#top", TRUSTED), true);
	assert.equal(isSafeCallbackURL("/dashboard", []), true);
});

test("a protocol-relative or backslash path is refused", () => {
	assert.equal(isSafeCallbackURL("//evil.com", TRUSTED), false);
	assert.equal(isSafeCallbackURL("//app.example.com/x", TRUSTED), false);
	assert.equal(isSafeCallbackURL("/\\evil.com", TRUSTED), false);
	assert.equal(isSafeCallbackURL("\\\\evil.com", TRUSTED), false);
	assert.equal(isSafeCallbackURL("/\t/evil.com", TRUSTED), false);
});

test("a bare word or an empty string is refused", () => {
	assert.equal(isSafeCallbackURL("dashboard", TRUSTED), false);
	assert.equal(isSafeCallbackURL("", TRUSTED), false);
});

test("an absolute URL passes on a trusted origin only", () => {
	assert.equal(
		isSafeCallbackURL("https://app.example.com/a?b=1", TRUSTED),
		true,
	);
	assert.equal(isSafeCallbackURL("https://APP.example.com/a", TRUSTED), true);
	assert.equal(isSafeCallbackURL("https://evil.com/a", TRUSTED), false);
	assert.equal(isSafeCallbackURL("http://app.example.com/a", TRUSTED), false);
	assert.equal(
		isSafeCallbackURL("https://app.example.com:8443/a", TRUSTED),
		false,
	);
	assert.equal(
		isSafeCallbackURL("https://app.example.com.evil.com/a", TRUSTED),
		false,
	);
	assert.equal(isSafeCallbackURL("https://evil.com/a", []), false);
});

test("a userinfo lookalike is refused", () => {
	assert.equal(
		isSafeCallbackURL("https://app.example.com@evil.com/a", TRUSTED),
		false,
	);
	assert.equal(
		isSafeCallbackURL("https://user:pw@app.example.com/a", TRUSTED),
		false,
	);
});

test("a host wildcard matches subdomains of its suffix only", () => {
	assert.equal(
		isSafeCallbackURL("https://pr-1.preview.example.com/", TRUSTED),
		true,
	);
	assert.equal(
		isSafeCallbackURL("https://preview.example.com/", TRUSTED),
		false,
	);
	assert.equal(
		isSafeCallbackURL("https://x.preview.example.com.evil.com/", TRUSTED),
		false,
	);
	assert.equal(
		isSafeCallbackURL("https://evil.com/.preview.example.com", TRUSTED),
		false,
	);
});

test("a native scheme passes only when a trusted origin names it", () => {
	assert.equal(isSafeCallbackURL("myapp://dashboard", TRUSTED), true);
	assert.equal(isSafeCallbackURL("exp://192.168.1.2:8081/--/x", TRUSTED), true);
	assert.equal(isSafeCallbackURL("otherapp://dashboard", TRUSTED), false);
	assert.equal(isSafeCallbackURL("javascript:alert(1)", TRUSTED), false);
	assert.equal(isSafeCallbackURL("data:text/html,x", TRUSTED), false);
});

test("unsafeCallbackField names the first refused field", () => {
	const fields = [
		"callbackURL",
		"newUserCallbackURL",
		"errorCallbackURL",
	] as const;
	assert.equal(unsafeCallbackField({}, fields, TRUSTED), undefined);
	assert.equal(
		unsafeCallbackField(
			{ callbackURL: "/ok", errorCallbackURL: "/err" },
			fields,
			TRUSTED,
		),
		undefined,
	);
	assert.equal(
		unsafeCallbackField(
			{ callbackURL: "/ok", newUserCallbackURL: "https://evil.com/x" },
			fields,
			TRUSTED,
		),
		"newUserCallbackURL",
	);
});
