import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthClient } from "../src/client.ts";

test("the organization flag adds the organization methods", () => {
	const client = createAuthClient({
		passkey: false,
		emailOtp: true,
		organization: true,
	});
	assert.equal(typeof client.organization.create, "function");
	assert.equal(typeof client.organization.acceptInvitation, "function");
	assert.equal(typeof client.useSession, "function");
});

test("without the flag the organization methods are absent from the type", () => {
	const client = createAuthClient({
		passkey: false,
		emailOtp: true,
		organization: false,
	});
	// @ts-expect-error the organization plugin is off
	assert.ok(client.organization);
});
