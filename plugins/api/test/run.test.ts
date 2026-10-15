import assert from "node:assert/strict";
import { test } from "node:test";
import { type RunState, startRun } from "../src/acts.ts";

const tick = () => new Promise<void>((r) => setTimeout(r, 5));

function runner<K>() {
	const states: RunState<K>[] = [];
	let seq = 0;
	return {
		states,
		get last() {
			return states[states.length - 1];
		},
		run(key: K, onAct: () => unknown) {
			const mine = ++seq;
			startRun(
				key,
				onAct,
				() => mine === seq,
				(s) => states.push(s),
			);
		},
	};
}

test("a run is pending until its promise settles", async () => {
	const r = runner<string>();
	let done!: () => void;
	r.run("a", () => new Promise<void>((res) => (done = res)));
	assert.deepEqual(r.last, { pending: "a" });
	done();
	await tick();
	assert.deepEqual(r.last, {});
});

test("a rejection is the failure until the next run", async () => {
	const r = runner<string>();
	const boom = new Error("boom");
	r.run("a", () => Promise.reject(boom));
	await tick();
	assert.deepEqual(r.last, { failure: { key: "a", error: boom } });
	r.run("b", () => new Promise(() => {}));
	assert.deepEqual(r.last, { pending: "b" });
});

test("only the latest run's outcome counts", async () => {
	const r = runner<string>();
	let first!: (e: unknown) => void;
	let second!: () => void;
	r.run("a", () => new Promise((_, rej) => (first = rej)));
	r.run("b", () => new Promise<void>((res) => (second = res)));
	first(new Error("old"));
	await tick();
	assert.deepEqual(r.last, { pending: "b" });
	second();
	await tick();
	assert.deepEqual(r.last, {});
});

test("an act that returns no promise is done at once; a sync throw rethrows", () => {
	const r = runner<true>();
	r.run(true, () => undefined);
	assert.deepEqual(r.last, {});
	assert.throws(
		() =>
			r.run(true, () => {
				throw new Error("sync");
			}),
		/sync/,
	);
	assert.deepEqual(r.last, {});
});
