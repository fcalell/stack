import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
	CALLBACK_MARKERS,
	pendingCallbacks,
	requiredCallbacks,
	stubbedCallbacksMessage,
} from "./callback-stubs.ts";

const template = readFileSync(
	new URL("../templates/callbacks.ts", import.meta.url),
	"utf-8",
);

test("every marker is a line of the scaffolded template", () => {
	for (const marker of Object.values(CALLBACK_MARKERS)) {
		assert.ok(template.includes(marker), marker);
	}
});

test("the scaffold is pending for sendOTP and sendInvitation", () => {
	assert.deepEqual(pendingCallbacks(template, ["sendOTP", "sendInvitation"]), [
		"sendOTP",
		"sendInvitation",
	]);
});

test("a callback whose marker is gone is not pending", () => {
	const edited = template.replace(CALLBACK_MARKERS.sendOTP, "// sends via SES");
	assert.deepEqual(pendingCallbacks(edited, ["sendOTP"]), []);
	assert.deepEqual(pendingCallbacks(edited, ["sendInvitation"]), [
		"sendInvitation",
	]);
});

test("only the callbacks the options require are checked", () => {
	assert.deepEqual(requiredCallbacks({}), ["sendOTP"]);
	assert.deepEqual(requiredCallbacks({ emailOtp: false }), []);
	assert.deepEqual(
		requiredCallbacks({ emailOtp: false, magicLink: true, organization: true }),
		["sendMagicLink", "sendInvitation"],
	);
	assert.deepEqual(
		pendingCallbacks(template, requiredCallbacks({ emailOtp: false })),
		[],
	);
});

test("the message names the file and the callback to implement", () => {
	const message = stubbedCallbacksMessage("src/worker/plugins/auth.ts", [
		"sendOTP",
	]);
	assert.match(message, /src\/worker\/plugins\/auth\.ts/);
	assert.match(message, /`sendOTP`/);
	assert.match(message, /\/\/ TODO: send OTP email/);
});
