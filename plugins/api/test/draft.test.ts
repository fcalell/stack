import assert from "node:assert/strict";
import { test } from "node:test";
import {
	MutationCache,
	MutationObserver,
	QueryClient,
	QueryObserver,
} from "@tanstack/react-query";
import { holdSave, whenSettled } from "../src/acts.ts";
import { type Read, read } from "../src/read.ts";

const tick = () => new Promise<void>((r) => setTimeout(r, 5));

// A save and its reads, on a client whose mutations invalidate on success the
// way `createQueryClient`'s do.
function setup() {
	const c: QueryClient = new QueryClient({
		mutationCache: new MutationCache({
			onSuccess: () => {
				void c.invalidateQueries({ queryKey: ["item"] });
			},
		}),
	});
	let refetch: () => void = () => {};
	let fetched = 0;
	const item: Read<number> = read({
		queryKey: ["item"],
		queryFn: () =>
			new Promise<number>((resolve) => {
				refetch = () => resolve(++fetched);
			}),
	});
	const cache = c.getQueryCache();
	const save = (fn: () => Promise<unknown> = async () => 1) =>
		new MutationObserver(c, { mutationFn: fn }).mutate();
	return {
		c,
		cache,
		item,
		save,
		refetch: () => refetch(),
		// The leaf's observer: invalidation refetches only what is observed.
		prime: async () => {
			const observer = new QueryObserver(c, item.options);
			observer.subscribe(() => {});
			refetch();
			await tick();
		},
	};
}

function outcome() {
	const log: string[] = [];
	let current = true;
	return {
		log,
		supersede: () => (current = false),
		to: {
			latest: () => current,
			release: () => log.push("release"),
			rollback: (e: unknown) => log.push(`rollback ${String(e)}`),
		},
	};
}

test("a resolved save releases once its read's refetch has settled", async () => {
	const s = setup();
	await s.prime();
	const o = outcome();
	holdSave(s.save(), [s.item], s.cache, o.to);
	await tick();
	// The invalidation is fetching still: the hold stays.
	assert.equal(
		s.cache.find({ queryKey: ["item"] })?.state.fetchStatus,
		"fetching",
	);
	assert.deepEqual(o.log, []);
	s.refetch();
	await tick();
	assert.deepEqual(o.log, ["release"]);
});

test("a save whose reads are idle releases without waiting", async () => {
	const s = setup();
	const o = outcome();
	holdSave(Promise.resolve(), [s.item], s.cache, o.to);
	await tick();
	assert.deepEqual(o.log, ["release"]);
	const none = outcome();
	holdSave(Promise.resolve(), [], s.cache, none.to);
	await tick();
	assert.deepEqual(none.log, ["release"]);
});

test("a newer edit while the refetch is in flight is kept", async () => {
	const s = setup();
	await s.prime();
	const o = outcome();
	holdSave(s.save(), [s.item], s.cache, o.to);
	await tick();
	o.supersede();
	s.refetch();
	await tick();
	assert.deepEqual(o.log, []);
});

test("a rejected save rolls back; a superseded one is ignored", async () => {
	const s = setup();
	const o = outcome();
	holdSave(Promise.reject("nope"), [s.item], s.cache, o.to);
	await tick();
	assert.deepEqual(o.log, ["rollback nope"]);

	const old = outcome();
	old.supersede();
	holdSave(Promise.reject(new Error("old")), [s.item], s.cache, old.to);
	await tick();
	assert.deepEqual(old.log, []);
});

test("whenSettled passes a stream, which stays fetching while it writes", async () => {
	const s = setup();
	const stream = read<number>(
		{ queryKey: ["s"], queryFn: () => new Promise(() => {}) },
		{ kind: "stream" },
	);
	void s.c.fetchQuery(stream.options).catch(() => {});
	await whenSettled(s.cache, [stream]);
});
