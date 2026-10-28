import assert from "node:assert/strict";
import { test } from "node:test";
import { derive, isEmpty } from "./form.ts";

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
