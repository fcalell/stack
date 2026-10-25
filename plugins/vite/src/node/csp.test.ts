import assert from "node:assert/strict";
import { test } from "node:test";
import { composeMap, SlotConflictError } from "@fcalell/cli/slots";
import { vite } from "../index.ts";
import { headerKey, mergeClientHeader, mergeCsp } from "./csp.ts";

test("two policies with disjoint directives keep every directive in first-seen order", () => {
	assert.equal(
		mergeCsp("frame-ancestors 'none'", "default-src 'self'; img-src data:"),
		"frame-ancestors 'none'; default-src 'self'; img-src data:",
	);
});

test("the same directive is unioned in first-seen order, without repeats", () => {
	assert.equal(
		mergeCsp(
			"script-src 'self' https://a.example",
			"script-src https://b.example 'self'",
		),
		"script-src 'self' https://a.example https://b.example",
	);
});

test("'none' beside real sources drops, in either order", () => {
	assert.equal(
		mergeCsp("frame-ancestors 'none'", "frame-ancestors 'self'"),
		"frame-ancestors 'self'",
	);
	assert.equal(
		mergeCsp(
			"frame-ancestors 'self' https://a.example",
			"frame-ancestors 'none'",
		),
		"frame-ancestors 'self' https://a.example",
	);
});

test("'none' on every contribution stays 'none'", () => {
	assert.equal(
		mergeCsp("object-src 'none'", "object-src 'none'"),
		"object-src 'none'",
	);
	assert.equal(
		mergeCsp("object-src 'none'", "object-src"),
		"object-src 'none'",
	);
});

test("three policies combine independently of the grouping", () => {
	const a = "frame-ancestors 'none'; script-src 'self'";
	const b = "frame-ancestors 'self'; script-src 'none'";
	const c = "frame-ancestors 'none'; script-src https://a.example";
	const left = mergeCsp(mergeCsp(a, b), c);
	const right = mergeCsp(a, mergeCsp(b, c));
	assert.equal(left, right);
	assert.equal(
		left,
		"frame-ancestors 'self'; script-src 'self' https://a.example",
	);
});

test("directive names compare case-insensitively and keep their first spelling", () => {
	assert.equal(
		mergeCsp("Script-Src 'self'", "script-src https://a.example"),
		"Script-Src 'self' https://a.example",
	);
});

test("whitespace, empty segments and a directive without sources are normalised", () => {
	assert.equal(
		mergeCsp(
			"  default-src   'self' ;; upgrade-insecure-requests ;",
			"img-src data:",
		),
		"default-src 'self'; upgrade-insecure-requests; img-src data:",
	);
});

test("the merge is deterministic", () => {
	const a = "frame-ancestors 'none'";
	const b = "img-src data:; default-src 'self'; frame-ancestors 'self'";
	assert.equal(mergeCsp(a, b), mergeCsp(a, b));
	assert.equal(
		mergeCsp(a, b),
		"frame-ancestors 'self'; img-src data:; default-src 'self'",
	);
});

test("only the Content-Security-Policy key merges", () => {
	assert.equal(
		mergeClientHeader(
			"a 'self'",
			"a https://x.example",
			"content-security-policy",
		),
		"a 'self' https://x.example",
	);
	assert.equal(
		mergeClientHeader("DENY", "SAMEORIGIN", "x-frame-options"),
		undefined,
	);
});

test("headerKey folds the name", () => {
	assert.equal(headerKey("Content-Security-Policy"), "content-security-policy");
});

// The slot itself, composed as the graph composes it.
const headers = vite.slots.clientHeaders;
const compose = (...contributions: Array<Record<string, string>>) =>
	composeMap(
		headers,
		contributions.map((value, i) => ({ plugin: `p${i}`, value })),
	);

test("the default frame-ancestors survives a consumer policy that does not name it", () => {
	const merged = compose(
		{
			"Content-Security-Policy": "frame-ancestors 'none'",
			"X-Frame-Options": "DENY",
		},
		{ "Content-Security-Policy": "default-src 'self'; script-src 'self'" },
	);
	assert.deepEqual(merged, {
		"Content-Security-Policy":
			"frame-ancestors 'none'; default-src 'self'; script-src 'self'",
		"X-Frame-Options": "DENY",
	});
});

test("a consumer's header name in another case merges into the first spelling", () => {
	const merged = compose(
		{ "Content-Security-Policy": "frame-ancestors 'none'" },
		{ "content-security-policy": "img-src data:" },
	);
	assert.deepEqual(merged, {
		"Content-Security-Policy": "frame-ancestors 'none'; img-src data:",
	});
});

test("two contributions of any other header still conflict, whatever the case", () => {
	assert.throws(
		() =>
			compose(
				{ "X-Frame-Options": "DENY" },
				{ "x-frame-options": "SAMEORIGIN" },
			),
		SlotConflictError,
	);
	assert.throws(
		() => compose({ "X-Test": "1" }, { "X-Test": "2" }),
		SlotConflictError,
	);
});
