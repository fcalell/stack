import assert from "node:assert/strict";
import { test } from "node:test";
import { deviceCredential } from "./devices.ts";

const key = `stk_${"a".repeat(48)}`;

test("deviceCredential reads a device key off the bearer header", () => {
	assert.equal(
		deviceCredential(new Headers({ authorization: `Bearer ${key}` })),
		key,
	);
	assert.equal(
		deviceCredential(new Headers({ authorization: `bearer  ${key} ` })),
		key,
	);
});

test("deviceCredential leaves every other credential alone", () => {
	assert.equal(deviceCredential(undefined), null);
	assert.equal(deviceCredential(new Headers()), null);
	// A session token, an OAuth access token and a Basic header are not ours.
	assert.equal(
		deviceCredential(new Headers({ authorization: "Bearer abc.def" })),
		null,
	);
	assert.equal(
		deviceCredential(new Headers({ authorization: "Bearer eyJhbGciOi.x.y" })),
		null,
	);
	assert.equal(
		deviceCredential(new Headers({ authorization: `Basic ${key}` })),
		null,
	);
	// The key in any other header is not read.
	assert.equal(deviceCredential(new Headers({ "x-api-key": key })), null);
});
