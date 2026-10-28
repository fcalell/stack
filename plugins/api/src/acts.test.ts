import assert from "node:assert/strict";
import { test } from "node:test";
import { ORPCError } from "@orpc/client";
import { retries, Unreached } from "./acts.ts";

const answered = (status: number) =>
	new ORPCError("FAILED", { status, message: "Not now." });

test("a refusal the server answered is not run again", () => {
	for (const status of [400, 401, 403, 404, 409, 422]) {
		assert.equal(retries(answered(status)), false, String(status));
	}
});

test("a fault, a timeout or a rate limit is run again", () => {
	for (const status of [408, 429, 500, 502, 503]) {
		assert.equal(retries(answered(status)), true, String(status));
	}
	assert.equal(retries(new TypeError("Failed to fetch")), true);
});

test("a connection known to be out is the banner's", () => {
	assert.equal(retries(new Unreached()), false);
});
