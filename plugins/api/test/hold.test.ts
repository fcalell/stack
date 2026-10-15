import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import {
	MutationObserver,
	notifyManager,
	QueryClient,
	QueryObserver,
} from "@tanstack/react-query";
import { read, retryOnce, withHold } from "../src/read.ts";

// The minimum hold with `waitDelay` 400 and `waitMin` 300: a load that has not
// outlasted the delay is not held, one that has waits until 700 ms in all.
const hold = (elapsed: number) =>
	elapsed < 400 ? 0 : Math.max(0, 700 - elapsed);

const flush = async () => {
	for (let i = 0; i < 8; i++) await Promise.resolve();
};

beforeEach(() => {
	mock.timers.enable({ apis: ["setTimeout", "Date"] });
	notifyManager.setScheduler((cb) => queueMicrotask(cb));
});
afterEach(() => {
	mock.timers.reset();
	notifyManager.setScheduler((cb) => setTimeout(cb, 0));
});

// A read that answers `after` ms in, on a client holding by `hold`.
function setup(after: number) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, meta: { hold } } },
	});
	const handle = read({
		queryKey: ["held", after],
		queryFn: () =>
			new Promise<string>((done) => setTimeout(() => done("data"), after)),
	});
	const observer = new QueryObserver(client, handle.options);
	const stop = observer.subscribe(() => {});
	return { client, observer, stop };
}

const pass = async (ms: number) => {
	mock.timers.tick(ms);
	await flush();
};

test("a first load answering past the delay writes no earlier than the minimum", async () => {
	const { observer, stop } = setup(500);
	await pass(500);
	assert.equal(observer.getCurrentResult().status, "pending");
	await pass(199);
	assert.equal(observer.getCurrentResult().status, "pending");
	await pass(1);
	assert.equal(observer.getCurrentResult().data, "data");
	stop();
});

test("a load that answers before the delay is not held", async () => {
	const { observer, stop } = setup(100);
	await pass(100);
	assert.equal(observer.getCurrentResult().data, "data");
	stop();
});

test("a refetch with data is not held", async () => {
	const { client, observer, stop } = setup(500);
	await pass(700);
	assert.equal(observer.getCurrentResult().data, "data");
	void observer.refetch();
	await pass(500);
	assert.equal(observer.getCurrentResult().isFetching, false);
	assert.equal(client.getQueryState(["held", 500])?.dataUpdateCount, 2);
	stop();
});

test("a cancelled fetch is let go at once and writes nothing late", async () => {
	const { client, observer, stop } = setup(500);
	await pass(500);
	await client.cancelQueries({ queryKey: ["held", 500] });
	await flush();
	await pass(1000);
	assert.equal(observer.getCurrentResult().data, undefined);
	assert.equal(observer.getCurrentResult().fetchStatus, "idle");
	stop();
});

test("a mutation's pending notifies while another read's first write is held", async () => {
	const { client, observer, stop } = setup(500);
	await pass(500);
	assert.equal(observer.getCurrentResult().status, "pending");
	const act = new MutationObserver(client, {
		mutationFn: () => new Promise<void>(() => {}),
	});
	const seen: boolean[] = [];
	const off = act.subscribe((result) => seen.push(result.isPending));
	void act.mutate().catch(() => {});
	await flush();
	assert.equal(seen.at(-1), true);
	assert.equal(observer.getCurrentResult().status, "pending");
	off();
	stop();
});

test("supplying the hold to a client keeps the client's other defaults", () => {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: retryOnce, staleTime: 5000, meta: { reads: [] } },
			mutations: { retry: 2 },
		},
	});
	withHold(client, hold);
	const defaults = client.getDefaultOptions();
	assert.equal(defaults.queries?.retry, retryOnce);
	assert.equal(defaults.queries?.staleTime, 5000);
	assert.equal(defaults.mutations?.retry, 2);
	assert.deepEqual(defaults.queries?.meta?.["reads"], []);
	assert.equal(defaults.queries?.meta?.["hold"], hold);
});
