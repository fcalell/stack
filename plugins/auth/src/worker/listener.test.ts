import assert from "node:assert/strict";
import { test } from "node:test";
import { appUrlOf, listenerOrigin, passkeyFor } from "./listener.ts";

const BAKED = {
	rpID: "example.com",
	rpName: "App",
	origin: ["https://example.com", "https://app.example.com"],
	devOrigin: ["http://localhost:5173"],
};

test("the listener's origin stands before the app's URL var", () => {
	assert.equal(
		appUrlOf({ APP_URL: "http://127.0.0.1:8788" }, "APP_URL"),
		"http://127.0.0.1:8788",
	);
	assert.equal(
		appUrlOf(
			{ APP_URL: "http://127.0.0.1:8788", STACK_ORIGIN: "https://a.example" },
			"APP_URL",
		),
		"https://a.example",
	);
	assert.equal(listenerOrigin({ STACK_ORIGIN: "" }), null);
	assert.equal(listenerOrigin({}), null);
});

test("passkeys keep the baked options with no listener origin, and swap in dev", () => {
	const { devOrigin: _, ...production } = BAKED;
	assert.deepEqual(passkeyFor(BAKED, {}, false), production);
	assert.deepEqual(passkeyFor(BAKED, { STACK_ORIGIN: "https://x.net" }, true), {
		...production,
		rpID: "localhost",
		origin: BAKED.devOrigin,
	});
});

test("a listener origin under the baked relying party joins its origins", () => {
	assert.deepEqual(
		passkeyFor(BAKED, { STACK_ORIGIN: "https://admin.example.com" }, false),
		{
			rpID: "example.com",
			rpName: "App",
			origin: [
				"https://example.com",
				"https://app.example.com",
				"https://admin.example.com",
			],
		},
	);
});

test("a listener origin the baked relying party cannot cover becomes it", () => {
	const loopback = {
		rpID: "localhost",
		rpName: "Stead",
		origin: "http://127.0.0.1:8788",
	};
	assert.deepEqual(
		passkeyFor(loopback, { STACK_ORIGIN: "https://stead.tail1.ts.net" }, false),
		{
			rpID: "stead.tail1.ts.net",
			rpName: "Stead",
			origin: ["http://127.0.0.1:8788", "https://stead.tail1.ts.net"],
		},
	);
});
