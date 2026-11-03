import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceEqualDeep } from "@tanstack/react-query";
import {
	createMarks,
	isPlaceholder,
	isSelection,
	isStreamQuery,
	lift,
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

test("the sample is a placeholder, and a walk over it that never ends is cut off", () => {
	const list = read<{ id: string; parent?: string }[]>({
		queryKey: ["walk"],
		queryFn: async () => [],
	});
	// A selector that follows `parent` while there is one reads a key that is always
	// there over the placeholder and the sample: it throws, never loops. The
	// sample takes none and the selection's slot stands as the placeholder.
	const depthOf = (records: { id: string; parent?: string }[]) => {
		const byId = new Map(records.map((r) => [r.id, r]));
		let node: { id: string; parent?: string } | undefined = records[0];
		let depth = 0;
		while (node?.parent) {
			node =
				byId.get(node.parent) ??
				({ id: "", parent: node.parent } as typeof node);
			depth++;
		}
		return [{ depth }];
	};
	assert.equal(sampleOf(list.at(depthOf)), undefined);
	// A selector that guards its walk with `isPlaceholder` ends on the sample, which
	// it now finds (it did not, so the walk went on).
	const walk = list.at((records) => {
		let node: unknown = records[0];
		let depth = 0;
		while (!isPlaceholder(node) && depth < 3) {
			node = (node as { parent?: string }).parent;
			depth++;
		}
		return [{ depth }];
	});
	assert.deepEqual(sampleOf(walk), { depth: 0 });
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
