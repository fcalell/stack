import assert from "node:assert/strict";
import { test } from "node:test";
import { formatterFor } from "../src/format.ts";

test("a formatter is built once per kind, language and options", () => {
	const percent = { style: "percent", maximumFractionDigits: 0 } as const;
	const first = formatterFor("number", "en", percent);
	assert.equal(formatterFor("number", "en", { ...percent }), first);
	assert.equal(first.format(0.5), "50%");
	assert.equal(formatterFor("relative"), formatterFor("relative", undefined));
});

test("another language, other options or another kind build a new one", () => {
	const english = formatterFor("number", "en");
	assert.notEqual(formatterFor("number", "de"), english);
	assert.notEqual(
		formatterFor("number", "en", { maximumFractionDigits: 1 }),
		english,
	);
	assert.notEqual(formatterFor("date", "en"), formatterFor("relative", "en"));
	assert.equal(formatterFor("number", "de").format(1234.5), "1.234,5");
});
