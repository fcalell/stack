import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER } from "@fcalell/ui-core/roster";
import type { ComparisonProps } from "../src/ui/components/comparison/index.tsx";
import type { Closed } from "../src/ui/lib/closed.ts";

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function assertType<T extends true>(_: T): void {}

// Every key of every member of a union.
type Keys<U> = U extends unknown ? keyof U : never;

const PROPS = ["label", "columns", "row", "items"] as const;

test("a Comparison takes columns, items and a row map, and lists its loading state", () => {
	assertType<
		Equal<Exclude<Keys<ComparisonProps>, keyof Closed>, (typeof PROPS)[number]>
	>(true);
	const entry = ROSTER.content.Comparison;
	assert.deepEqual([...(entry?.props ?? [])].sort(), [...PROPS].sort());
});
