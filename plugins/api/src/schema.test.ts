import assert from "node:assert/strict";
import { test } from "node:test";
import { inputJsonSchema, routerSchema, z } from "./schema.ts";

const built = (inputSchema: z.ZodType | undefined) => ({
	"~orpc": { inputSchema, meta: { kind: "query" } },
});

test("no input, an undefined input and a void input are the empty object", () => {
	for (const schema of [undefined, z.undefined(), z.void()]) {
		assert.deepEqual(inputJsonSchema(schema), { type: "object" });
	}
	const out = routerSchema({
		none: built(undefined),
		undef: built(z.undefined()),
		void: built(z.void()),
	});
	for (const name of ["none", "undef", "void"]) {
		assert.deepEqual(out[name], {
			input: { type: "object" },
			kind: "query",
			scope: null,
		});
	}
});

test("an undefined inside an object still has no JSON Schema form", () => {
	assert.throws(
		() => routerSchema({ bad: built(z.object({ a: z.undefined() })) }),
		/bad: a undefined has no JSON Schema form/,
	);
});
