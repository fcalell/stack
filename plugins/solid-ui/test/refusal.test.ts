import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@fcalell/plugin-api/error";
import { answered, refusalOf } from "../src/ui/lib/refusal.ts";

test("a better-auth refusal is an ApiError with its code and message", () => {
	const refusal = refusalOf({
		data: null,
		error: {
			code: "INVALID_OTP",
			message: "Invalid OTP",
			status: 400,
			statusText: "BAD_REQUEST",
		},
	});
	assert.ok(refusal instanceof ApiError);
	assert.equal(refusal.code, "INVALID_OTP");
	assert.equal(refusal.message, "Invalid OTP");
	assert.equal(refusal.status, 400);
});

test("a server failure is an internal error the form's message covers", () => {
	const refusal = refusalOf({
		data: null,
		error: { message: "boom", status: 502, statusText: "Bad Gateway" },
	});
	assert.equal(refusal?.code, "INTERNAL_SERVER_ERROR");
	assert.equal(refusal?.status, 502);
});

test("a success, or an output that is not better-auth's answer, is no refusal", () => {
	for (const result of [
		{ data: { user: {} }, error: null },
		{ error: { status: 400 } },
		{ data: null, error: { message: "x" } },
		undefined,
		"ok",
		{ id: "x" },
	]) {
		assert.equal(refusalOf(result), undefined, JSON.stringify(result));
	}
});

test("an answer unwraps to its data, throws its refusal, and leaves other values", () => {
	assert.deepEqual(answered({ data: { id: "m1" }, error: null }), { id: "m1" });
	assert.throws(
		() => answered({ data: null, error: { code: "FORBIDDEN", status: 403 } }),
		(error) => error instanceof ApiError && error.code === "FORBIDDEN",
	);
	for (const value of [{ id: "x" }, "ok", undefined, 3]) {
		assert.equal(answered(value), value);
	}
});

test("a refusal that names its fields carries them where a form reads them", () => {
	const refusal = refusalOf({
		data: null,
		error: {
			code: "ORGANIZATION_SLUG_RESERVED",
			message: "The address /login is reserved. Choose another.",
			fieldErrors: { slug: "The address /login is reserved. Choose another." },
			status: 400,
			statusText: "BAD_REQUEST",
		},
	});
	assert.deepEqual(refusal?.data, {
		fieldErrors: { slug: "The address /login is reserved. Choose another." },
	});
	assert.equal(
		refusalOf({ data: null, error: { code: "X", status: 400 } })?.data,
		undefined,
	);
});
