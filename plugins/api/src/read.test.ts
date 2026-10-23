import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceEqualDeep } from "@tanstack/react-query";
import { isSelection, isStreamQuery, read } from "./read.ts";

const one = read({ queryKey: ["one"], queryFn: async () => 1 });

// TanStack's structural sharing runs over every `combine` result a leaf draws:
// a selection it rebuilds must still be one.
test("a selection survives structural sharing", () => {
	const before = { value: one.at((n) => n + 1) };
	const after = { value: one.at((n) => n + 2) };
	const shared = replaceEqualDeep(before, after) as typeof after;
	assert.equal(shared.value, after.value);
	assert.equal(isSelection(shared.value), true);
	assert.equal(
		isSelection(
			replaceEqualDeep(
				{ value: one },
				{ value: read({ queryKey: ["one"], queryFn: async () => 1 }) },
			).value,
		),
		true,
	);
});

test("a read is its own selection", () => {
	assert.equal(isSelection(one), true);
	assert.equal(isSelection(one.or(0)), true);
	assert.equal(typeof one.at, "function");
	assert.equal(one.kind, "query");
});

test("a stream read's query carries meta.stream beside its own meta, a query read's does not", () => {
	const options = { queryKey: ["m"], queryFn: () => 1, meta: { reads: ["a"] } };
	const stream = read(options, { kind: "stream" }).options;
	assert.deepEqual(stream.meta, { reads: ["a"], stream: true });
	assert.equal(
		isStreamQuery(stream as { meta?: Record<string, unknown> }),
		true,
	);
	assert.equal(
		isStreamQuery(read(options).options as { meta?: Record<string, unknown> }),
		false,
	);
});
