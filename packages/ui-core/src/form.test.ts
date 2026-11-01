import assert from "node:assert/strict";
import { test } from "node:test";
import { derive, isEmpty, toShown } from "./form.ts";

const input = (minItems?: number) => ({
	type: "object",
	properties: {
		helpers: {
			type: "array",
			items: { type: "string", enum: ["explore", "plan"] },
			...(minItems === undefined ? {} : { minItems }),
		},
	},
	required: ["helpers"],
});

test("a pick of several with no pick holds the empty list", () => {
	assert.equal(isEmpty(derive(input(), "helpers", undefined), []), false);
});

test("a pick of several that asks for one is empty with no pick", () => {
	assert.equal(isEmpty(derive(input(1), "helpers", undefined), []), true);
	assert.equal(
		isEmpty(derive(input(1), "helpers", undefined), ["explore"]),
		false,
	);
});

test("a typing control with no value is handed the empty string, a pick nothing", () => {
	const schema = {
		type: "object",
		properties: {
			args: { type: "object" },
			note: { type: "string" },
			mode: { type: "string", enum: ["a", "b"] },
		},
	};
	assert.equal(toShown(derive(schema, "args", "json"), null), "");
	assert.equal(toShown(derive(schema, "note", undefined), undefined), "");
	assert.equal(
		toShown(derive(schema, "mode", undefined), undefined),
		undefined,
	);
	assert.equal(
		toShown(derive(schema, "args", "json"), { a: 1 }),
		'{\n  "a": 1\n}',
	);
});
