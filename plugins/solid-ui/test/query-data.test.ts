import assert from "node:assert/strict";
import { test } from "node:test";
import type { QueryData } from "../src/ui/components/query-boundary/index.tsx";

// A query as solid-query types it: a union over its states, with no data
// until it answers.
type State = { isError: boolean; error: Error | null; refetch: () => void };
type Answer<T> =
	| (State & { data: undefined; isPending: true })
	| (State & { data: T; isPending: false });

type Same<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

// Checked by the package's type-check: the children draw once every query
// answered, so what they read is defined, and a null answer stays null.
const one: Same<QueryData<Answer<string[]>>, string[]> = true;
const nullable: Same<QueryData<Answer<string | null>>, string | null> = true;
const many: Same<
	QueryData<[Answer<string[]>, Answer<number>]>,
	[string[], number]
> = true;

test("a boundary's children read the answered data, never undefined", () => {
	assert.deepEqual([one, nullable, many], [true, true, true]);
});
