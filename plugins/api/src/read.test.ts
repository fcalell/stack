import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceEqualDeep } from "@tanstack/react-query";
import { isSelection, isStreamQuery, lift, read } from "./read.ts";

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

const pickOf = (selection: unknown, data: unknown[]) =>
	(
		selection as {
			[key: symbol]: { pick: (d: unknown[], r: boolean[]) => unknown };
		}
	)[Symbol.for("@fcalell/plugin-api/selection")]?.pick(
		data,
		data.map(() => true),
	);

test("lift makes a constant whose text props hold selections one selection", () => {
	const reason = one.at((n) => (n > 1 ? "Too many" : undefined));
	const act = { label: "Run", blocked: reason, onAct: () => 1 };
	const lifted = lift(act, ["label", "blocked"]);
	assert.equal(isSelection(lifted), true);
	assert.equal(lift(act, ["label", "blocked"]), lifted);
	const drawn = pickOf(lifted, [2]) as typeof act;
	assert.equal(drawn.blocked, "Too many");
	assert.equal(drawn.label, "Run");
	assert.equal(drawn.onAct, act.onAct);
});

test("lift walks a list, and a group's options", () => {
	const note = one.at((n) => `n${n}`);
	const options = [
		{ label: "A", options: [{ value: "a", label: "A", description: note }] },
	];
	const drawn = pickOf(lift(options, ["description"]), [3]) as typeof options;
	assert.equal(drawn[0]?.options[0]?.description, "n3");
});

test("lift leaves a value with no selection, or a selection, as it is", () => {
	const plain = { label: "Run", onAct: () => 1 };
	assert.equal(lift(plain, ["label", "blocked"]), plain);
	assert.equal(lift(one, ["label"]), one);
	assert.equal(lift(undefined, ["label"]), undefined);
});
