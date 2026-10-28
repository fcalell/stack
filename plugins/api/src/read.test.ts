import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceEqualDeep } from "@tanstack/react-query";
import {
	createMarks,
	isPlaceholder,
	isSelection,
	isStreamQuery,
	read,
	sampleOf,
} from "./read.ts";

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

test("a list selection's sample is one record as its selector maps it", () => {
	const list = read<{ id: string; on: boolean }[]>({
		queryKey: ["list"],
		queryFn: async () => [],
	});
	const rows = list.at((records) =>
		records.map((r) => ({ key: r.id, title: `${r.id}`, dot: r.on })),
	);
	const sample = sampleOf(rows);
	assert.ok(sample);
	assert.equal(sample.title, "");
	assert.equal(isPlaceholder(sample.key), false);
	assert.deepEqual(Object.keys(sample), ["key", "title", "dot"]);
	// A group's rows found first map one row too.
	const groups = read<{ id: string; rows: { at: string }[] }[]>({
		queryKey: ["groups"],
		queryFn: async () => [],
	});
	const grouped = groups.at((all) =>
		(all.find((g) => g.id === "open")?.rows ?? []).map((r) => ({
			title: r.at,
			leading: { status: "done" },
		})),
	);
	assert.deepEqual(sampleOf(grouped), {
		title: "",
		leading: { status: "done" },
	});
	// The read itself and a selector that throws keep no sample.
	assert.equal(sampleOf(list), undefined);
	assert.equal(
		sampleOf(
			list.at((records) =>
				records.map(() => {
					throw new Error("no");
				}),
			),
		),
		undefined,
	);
});

test("of the frames holding one read, the first to take it draws its mark", () => {
	const marks = createMarks();
	let heard = 0;
	marks.subscribe(() => {
		heard++;
	});
	const releaseA = marks.take("landing", "a");
	marks.take("landing", "b");
	marks.take("other", "c");
	assert.equal(marks.marks("landing", "a"), true);
	assert.equal(marks.marks("landing", "b"), false);
	assert.equal(marks.marks("other", "c"), true);
	releaseA();
	assert.equal(marks.marks("landing", "a"), false);
	assert.equal(marks.marks("landing", "b"), true);
	assert.equal(heard, 4);
});
