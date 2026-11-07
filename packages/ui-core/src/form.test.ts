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

test("an enum with a default always holds a value, so it is required; a truly optional one is not", () => {
	const schema = {
		type: "object",
		properties: {
			scope: { type: "string", enum: ["event", "user"], default: "event" },
			kind: { type: "string", enum: ["a", "b"] },
			note: { anyOf: [{ type: "string", enum: ["a"] }, { type: "null" }] },
		},
	};
	const scope = derive(schema, "scope", undefined);
	assert.equal(scope.required, true);
	assert.equal(toShown(scope, undefined), "event");
	assert.equal(derive(schema, "kind", undefined).required, false);
	assert.equal(derive(schema, "note", undefined).required, false);
});
