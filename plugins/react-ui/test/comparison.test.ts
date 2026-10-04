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

const PROPS = [
	"label",
	"columns",
	"query",
	"sentence",
	"empty",
	"row",
	"items",
	"loading",
] as const;

test("a Comparison takes columns, a query or items, a row map, sentence and empty, and lists its failed and empty states", () => {
	assertType<
		Equal<Exclude<Keys<ComparisonProps>, keyof Closed>, (typeof PROPS)[number]>
	>(true);
	const entry = ROSTER.content.Comparison;
	assert.deepEqual([...(entry?.props ?? [])].sort(), [...PROPS].sort());
	assert.ok(!entry?.props.includes("rows"));
	assert.ok(entry?.states.includes("error"));
	assert.ok(entry?.states.includes("empty"));
});
