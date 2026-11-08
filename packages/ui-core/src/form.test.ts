import assert from "node:assert/strict";
import { test } from "node:test";
import { derive, heldPick, isEmpty, pickWords, toShown } from "./form.ts";

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

const said = { none: "None", choose: "Choose" };

test("a required pick's placeholder is its empty word, else Choose", () => {
	assert.equal(pickWords({ required: true }, said).one, "Choose");
	assert.equal(pickWords({ required: true, empty: "Any" }, said).one, "Any");
	assert.equal(pickWords({ required: false }, said).one, undefined);
});

test("an optional pick of several reads None", () => {
	assert.equal(pickWords({ required: false }, said).several, "None");
	assert.equal(pickWords({ required: false, empty: "Any" }, said).none, "Any");
});

test("an untouched string pick holds nothing", () => {
	assert.equal(heldPick(""), undefined);
	assert.equal(heldPick("a"), "a");
});

test("an enum with a default always holds a value, so it is required; a truly optional one is not", () => {
	const schema = {
		type: "object",
		properties: {
			density: {
				type: "string",
				enum: ["compact", "full"],
				default: "compact",
			},
			kind: { type: "string", enum: ["a", "b"] },
			note: { anyOf: [{ type: "string", enum: ["a"] }, { type: "null" }] },
		},
	};
	const density = derive(schema, "density", undefined);
	assert.equal(density.required, true);
	assert.equal(toShown(density, undefined), "compact");
	assert.equal(derive(schema, "kind", undefined).required, false);
	assert.equal(derive(schema, "note", undefined).required, false);
});
