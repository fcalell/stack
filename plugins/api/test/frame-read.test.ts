import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { QueriesObserver, QueryClient } from "@tanstack/react-query";
import {
	draftFor,
	type Held,
	holdRoot,
	isRead,
	paintReads,
	placeholderData,
	planFrame,
	type Read,
	read,
	readKey,
	watchUnheld,
} from "../src/read.ts";

const tick = () => new Promise<void>((r) => setTimeout(r, 5));

function make(key: string, fn: () => Promise<unknown>): Read<unknown> {
	return read({ queryKey: [key], queryFn: fn });
}

// Runs the plan's reads through a real QueriesObserver, as `useQueries` does.
function observe<S>(
	client: QueryClient,
	plan: ReturnType<typeof planFrame<S>>,
) {
	const observer = new QueriesObserver(
		client,
		plan.reads.map((r) => ({ ...r.options, placeholderData })),
	);
	return { observer, state: () => plan.combine(observer.getCurrentResult()) };
}

test("isRead tells a read from a selection of it and from a constant", () => {
	const a = make("a", async () => ({ n: 1 }));
	assert.equal(isRead(a), true);
	assert.equal(isRead(a.at((x) => x)), false);
	assert.equal(isRead("a"), false);
	assert.equal(isRead(undefined), false);
});

test("a frame over a read holds its root and its drawn value", async () => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	let fail = true;
	const tasks = make("tasks", async () => {
		if (fail) throw new Error("no");
		return [1, 2];
	});
	const seen: Held[] = [];
	const { observer, state } = observe(
		client,
		planFrame(tasks, (held) => {
			seen.push(held);
			return held.root?.result.status;
		}),
	);
	const stop = observer.subscribe(() => {});
	assert.equal(state(), "success");
	assert.equal(seen.at(-1)?.drawn?.painted, true);
	assert.equal(seen.at(-1)?.root?.result.isPlaceholderData, true);
	await tick();
	assert.equal(state(), "error");
	assert.equal(seen.at(-1)?.root?.missing(new Error("no")), false);
	assert.equal(seen.at(-1)?.drawn?.painted, true);
	fail = false;
	await client.refetchQueries({ queryKey: ["tasks"] });
	assert.equal(state(), "success");
	assert.deepEqual(seen.at(-1)?.drawn, { painted: false, value: [1, 2] });
	stop();
});

test("a frame over a selection holds no root, and over nothing holds nothing", () => {
	const a = make("a", async () => 1);
	let held: Held | undefined;
	planFrame(
		a.at((x) => x),
		(h) => (held = h),
	).combine([
		{
			data: 3,
			isPlaceholderData: false,
			status: "success",
			fetchStatus: "idle",
			isEnabled: true,
			isRefetchError: false,
			error: null,
		},
	]);
	assert.deepEqual(held, { drawn: { painted: false, value: 3 } });
	const none = planFrame(undefined, (h) => h);
	assert.deepEqual(none.reads, []);
	assert.deepEqual(none.combine([]), {});
});

test("a draft stays with the read it was made over", () => {
	const a = make("a", async () => 1);
	const b = make("b", async () => 1);
	assert.equal(readKey(a), readKey(a.at((x) => x)));
	assert.notEqual(readKey(a), readKey(b));
	assert.equal(readKey("constant"), undefined);
	const draft = { key: readKey(a), value: "x" };
	assert.equal(draftFor(draft, readKey(a)), draft);
	assert.equal(draftFor(draft, readKey(b)), null);
	assert.equal(draftFor(null, readKey(a)), null);
	const constant = { key: undefined, value: "x" };
	assert.equal(draftFor(constant, readKey("other")), constant);
});

test("two holders of one read raise an error, one does not", () => {
	const error = mock.method(console, "error", () => {});
	const a = make("holders-a", async () => 1);
	const b = make("holders-b", async () => 1);
	const releaseA = holdRoot(a);
	holdRoot(b)();
	assert.equal(error.mock.callCount(), 0);
	const second = holdRoot(a);
	assert.equal(error.mock.callCount(), 1);
	assert.match(String(error.mock.calls[0]?.arguments[0]), /holders-a/);
	releaseA();
	second();
	holdRoot(a)();
	assert.equal(error.mock.callCount(), 1);
	error.mock.restore();
});

test("a failure with painters and no holder raises an error naming the read", async () => {
	const error = mock.method(console, "error", () => {});
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const stop = watchUnheld(client.getQueryCache());
	const fail = async () => {
		throw new Error("no");
	};
	const run = async (key: string) => {
		const r = make(key, fail);
		const observer = new QueriesObserver(client, [r.options]);
		const unobserve = observer.subscribe(() => {});
		await tick();
		unobserve();
		return r;
	};
	await run("nobody");
	assert.equal(error.mock.callCount(), 0);

	const painted = make("painted", fail);
	const unpaint = paintReads([painted]);
	await run("painted");
	assert.equal(error.mock.callCount(), 1);
	assert.match(String(error.mock.calls[0]?.arguments[0]), /painted/);

	const held = make("held", fail);
	const unpaintHeld = paintReads([held]);
	const unhold = holdRoot(held);
	await run("held");
	assert.equal(error.mock.callCount(), 1);
	unpaint();
	unpaintHeld();
	unhold();
	stop();
	error.mock.restore();
});
