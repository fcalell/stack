import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
	notifyManager,
	QueryClient,
	QueryObserver,
} from "@tanstack/react-query";
import { flips, settleReads } from "../src/settle-reads.ts";

const tick = () => new Promise<void>((r) => setTimeout(r, 5));

let dispose: (() => void) | undefined;
afterEach(() => dispose?.());

// A leaf's observer on `key` (react-query subscribes through `batchCalls`,
// which queues the notification) whose answer the test holds back: `answer`
// resolves it. `settled` keeps the flushes `settle` was handed.
function setup() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } },
	});
	const settled: (() => void)[] = [];
	dispose = settleReads(client, (flush) => settled.push(flush));
	const notified: string[] = [];
	const watch = async (key: string, fail = false) => {
		let answer = () => {};
		const observer = new QueryObserver(client, {
			queryKey: [key],
			queryFn: () =>
				new Promise((resolve, reject) => {
					answer = () => (fail ? reject(new Error("no")) : resolve(key));
				}),
		});
		observer.subscribe(notifyManager.batchCalls(() => notified.push(key)));
		await tick();
		notified.length = 0;
		return { observer, answer: () => answer() };
	};
	return { client, settled, notified, watch };
}

test("a first answer goes through settle once, and flushes when settle says", async () => {
	const { settled, notified, watch } = setup();
	const a = await watch("a");
	a.answer();
	await tick();
	assert.equal(settled.length, 1);
	assert.deepEqual(notified, []);
	settled[0]?.();
	assert.deepEqual(notified, ["a"]);
});

test("a refetch with the same data takes the default scheduler", async () => {
	const { settled, notified, watch, client } = setup();
	const a = await watch("a");
	a.answer();
	await tick();
	settled.shift()?.();
	notified.length = 0;
	const refetch = client.refetchQueries({ queryKey: ["a"] });
	await tick();
	a.answer();
	await refetch;
	await tick();
	assert.equal(settled.length, 0);
	assert.ok(notified.length > 0);
});

test("a mark whose batch queues nothing does not leak into the next", async () => {
	const { settled, notified, watch, client } = setup();
	// Watches only the error: its first answer is a flip that queues no flush.
	const quiet = new QueryObserver(client, {
		queryKey: ["quiet"],
		queryFn: async () => 1,
		notifyOnChangeProps: ["error"],
	});
	quiet.subscribe(notifyManager.batchCalls(() => notified.push("quiet")));
	await tick();
	assert.equal(settled.length, 0);
	// The next read starts to fetch, and that batch is no flip.
	await watch("b");
	assert.equal(settled.length, 0);
});

test("a later batch joins the settle in flight", async () => {
	const { settled, notified, watch } = setup();
	const a = await watch("a");
	const b = await watch("b");
	a.answer();
	await tick();
	b.answer();
	await tick();
	assert.equal(settled.length, 1);
	assert.deepEqual(notified, []);
	settled[0]?.();
	assert.deepEqual(notified.sort(), ["a", "b"]);
});

test("a failure, then a retry that fails again, marks once", async () => {
	const { settled, client, watch } = setup();
	const bad = await watch("bad", true);
	bad.answer();
	await tick();
	assert.equal(settled.length, 1);
	settled.shift()?.();
	const retry = client.refetchQueries({ queryKey: ["bad"] });
	await tick();
	bad.answer();
	await retry;
	await tick();
	assert.equal(settled.length, 0);
});

test("flips names a first answer, a first failure and a reset", () => {
	const state = (over: object) => ({
		data: undefined,
		status: "pending",
		dataUpdateCount: 0,
		errorUpdateCount: 0,
		...over,
	});
	assert.equal(flips({ type: "success" }, state({ dataUpdateCount: 1 })), true);
	assert.equal(
		flips({ type: "success" }, state({ dataUpdateCount: 2 })),
		false,
	);
	assert.equal(flips({ type: "error" }, state({ errorUpdateCount: 1 })), true);
	assert.equal(
		flips({ type: "error" }, state({ data: 1, errorUpdateCount: 1 })),
		false,
	);
	assert.equal(flips({ type: "setState" }, state({})), true);
	assert.equal(flips({ type: "setState" }, state({ data: 1 })), false);
	assert.equal(flips({ type: "fetch" }, state({})), false);
});

test("disposing restores the default scheduler", async () => {
	const { settled, watch } = setup();
	dispose?.();
	dispose = undefined;
	const a = await watch("a");
	a.answer();
	await tick();
	assert.equal(settled.length, 0);
});
