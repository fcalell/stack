import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { ORPCError } from "@orpc/client";
import {
	hashKey,
	InfiniteQueryObserver,
	QueriesObserver,
	QueryClient,
} from "@tanstack/react-query";
import {
	combine,
	draftFor,
	type Held,
	holdReads,
	holdsOf,
	isRead,
	moreOf,
	paintReads,
	placeholderData,
	planFrame,
	type Read,
	read,
	readKey,
	retryOnce,
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
		planFrame(
			tasks,
			(held) => {
				seen.push(held);
				return held.reads?.[0]?.result.status;
			},
			() => undefined,
		),
	);
	const stop = observer.subscribe(() => {});
	assert.equal(state(), "success");
	assert.equal(seen.at(-1)?.drawn?.painted, true);
	assert.equal(seen.at(-1)?.reads?.[0]?.result.isPlaceholderData, true);
	await tick();
	assert.equal(state(), "error");
	assert.equal(seen.at(-1)?.reads?.[0]?.missing(new Error("no")), false);
	assert.equal(seen.at(-1)?.drawn?.painted, true);
	fail = false;
	await client.refetchQueries({ queryKey: ["tasks"] });
	assert.equal(state(), "success");
	assert.deepEqual(seen.at(-1)?.drawn, {
		painted: false,
		value: [1, 2],
		more: false,
	});
	stop();
});

const landed = (data: unknown) => ({
	data,
	isPlaceholderData: false,
	status: "success" as const,
	fetchStatus: "idle" as const,
	isEnabled: true,
	isRefetchError: false,
	error: null,
});

const hashOf = (r: Read<unknown>) => hashKey(r.options.queryKey);

test("a frame holds the one read of its selection that no enclosing frame holds", () => {
	const a = make("a", async () => 1);
	const b = make("b", async () => 2);
	const c = make("c", async () => 3);
	const plan = (
		selection: Parameters<typeof planFrame>[0],
		enclosing?: ReadonlySet<string>,
	) =>
		planFrame(
			selection,
			(h) => h,
			() => undefined,
			enclosing,
		);

	// A bare read, and an `at` of it, with no frame above: held.
	assert.equal(plan(a).held, a);
	assert.equal(plan(a.at((x) => x)).held, a);
	// Under a holder of the read: nothing is held, the drawn value stands, and
	// the read is still the frame's, so its form follows it.
	const above = new Set([hashOf(a)]);
	const under = plan(
		a.at((x) => x),
		above,
	);
	assert.equal(under.held, undefined);
	assert.deepEqual(under.combine([landed(1)]), {
		drawn: { painted: false, value: 1, more: false },
		reads: [
			{
				result: {
					...landed(1),
					streamed: false,
					hasNextPage: false,
					fetchingMore: false,
				},
				missing: a.missing,
				held: false,
			},
		],
	});
	// A combine holds its first read; the others are extra, in order.
	const all = combine([a, b, c], (x, y, z) => [x, y, z]);
	const first = plan(all);
	assert.equal(first.held, a);
	assert.deepEqual(first.extra, [b, c]);
	assert.deepEqual(
		first.combine([landed(1), landed(2), landed(3)]).reads?.map((r) => r.held),
		[true, false, false],
	);
	// Under a holder of one of them, the next unheld one.
	const some = plan(all, new Set([hashOf(a)]));
	assert.equal(some.held, b);
	assert.deepEqual(some.extra, [c]);
	// Two selections of one read hold it once.
	const twice = plan(combine([a, a.at((x) => x)], (x, y) => [x, y]));
	assert.equal(twice.held, a);
	assert.deepEqual(twice.extra, []);
	// Over nothing, nothing.
	const none = plan(undefined);
	assert.deepEqual(none.reads, []);
	assert.deepEqual(none.combine([]), { reads: [] });
});

test("a read used only through `or` is quiet: never held, never part of the form", () => {
	const a = make("quiet-a", async () => 1);
	const b = make("quiet-b", async () => 2);
	const quiet = planFrame(
		a.or(0),
		(h) => h,
		() => undefined,
	);
	assert.equal(quiet.held, undefined);
	assert.deepEqual(quiet.extra, []);
	assert.deepEqual(quiet.combine([landed(undefined)]).reads, []);
	// Beside a plain read it is subscribed and still quiet: the plain one is held.
	const both = planFrame(
		combine([a, b.or(0)], (x, y) => [x, y]),
		(h) => h,
		() => undefined,
	);
	assert.equal(both.held, a);
	assert.deepEqual(both.extra, []);
	assert.equal(both.reads.length, 2);
	// A read used plainly elsewhere in the selection is not quiet.
	const plain = planFrame(
		combine([a.or(0), a], (x, y) => [x, y]),
		(h) => h,
		() => undefined,
	);
	assert.equal(plain.held, a);
});

test("a nested frame's form follows its own selection while its flags are dropped", () => {
	const a = make("nested", async () => 1);
	const above = new Set([hashOf(a)]);
	const failed = {
		...landed(undefined),
		status: "error" as const,
		error: new Error("no"),
	};
	const inner = planFrame(
		a.at((x) => x),
		(h) => h,
		() => undefined,
		above,
	);
	const held = inner.combine([
		{ ...failed, isPlaceholderData: false, fetchStatus: "fetching" as const },
	]);
	assert.equal(held.reads?.length, 1);
	assert.equal(held.reads?.[0]?.held, false);
	assert.equal(held.reads?.[0]?.result.status, "error");
	assert.equal(held.drawn?.painted, true);
});

test("frames over the same keys share one holds identity", () => {
	const a = make("holds-a", async () => 1);
	const b = make("holds-b", async () => 1);
	const root = new Set<string>();
	assert.equal(holdsOf(root, undefined), root);
	const one = holdsOf(root, a);
	assert.deepEqual([...one], [hashOf(a)]);
	assert.equal(holdsOf(new Set(), a), one);
	const nested = holdsOf(one, b);
	assert.deepEqual([...nested], [hashOf(a), hashOf(b)]);
	assert.equal(holdsOf(holdsOf(new Set(), a), b), nested);
	assert.notEqual(holdsOf(root, b), nested);
});

test("a frame over a combine draws the failure of any read it holds", async () => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const a = make("ok", async () => 1);
	const b = make("down", async () => {
		throw new Error("no");
	});
	const { observer, state } = observe(
		client,
		planFrame(
			combine([a, b], (x, y) => [x, y]),
			(h) => h.reads?.map((r) => r.result.status),
			() => undefined,
		),
	);
	const stop = observer.subscribe(() => {});
	await tick();
	assert.deepEqual(state(), ["success", "error"]);
	stop();
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

test("a frame with two unheld reads logs one error naming both keys", () => {
	const error = mock.method(console, "error", () => {});
	const a = make("holders-a", async () => 1);
	const b = make("holders-b", async () => 1);
	const release = holdReads([a, b]);
	assert.equal(error.mock.callCount(), 1);
	const message = String(error.mock.calls[0]?.arguments[0]);
	assert.match(message, /holders-a/);
	assert.match(message, /holders-b/);
	release();
	error.mock.restore();
});

test("sibling frames holding one read, or one frame holding one, log nothing", () => {
	const error = mock.method(console, "error", () => {});
	const a = make("holders-c", async () => 1);
	const release = [holdReads([a]), holdReads([a]), holdReads([])];
	release[0]?.();
	holdReads([a])();
	for (const r of release) r();
	assert.equal(error.mock.callCount(), 0);
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
	const unhold = holdReads([held]);
	await run("held");
	assert.equal(error.mock.callCount(), 1);
	unpaint();
	unpaintHeld();
	unhold();
	stop();
	error.mock.restore();
});

const pageOf = (n: number, last = false) => ({
	data: [n],
	nextCursor: last ? null : String(n + 1),
});

function pagesRead(key: string) {
	let n = 0;
	return read<unknown>(
		{
			queryKey: [key],
			queryFn: async () => {
				return pageOf(n++, n > 2);
			},
			initialPageParam: undefined,
			getNextPageParam: (last: { nextCursor: string | null }) =>
				last.nextCursor,
		} as never,
		{ kind: "pages" },
	);
}

test("moreOf is the last page's cursor, and false over nothing", () => {
	assert.equal(moreOf({ pages: [pageOf(0), pageOf(1)] }), true);
	assert.equal(moreOf({ pages: [pageOf(0), pageOf(1, true)] }), false);
	assert.equal(moreOf({ pages: [] }), false);
	assert.equal(moreOf(undefined), false);
	assert.equal(moreOf(placeholderData()), false);
});

test("a frame over a pages read has more, and a next page is fetchingMore", async () => {
	const client = new QueryClient();
	const pages = pagesRead("pages");
	const queryOf = () =>
		client.getQueryCache().find({ queryKey: pages.options.queryKey });
	const seen: Held[] = [];
	const { observer, state } = observe(
		client,
		planFrame(
			pages,
			(held) => {
				seen.push(held);
				return held;
			},
			(r) => ({
				fetchMore:
					client.getQueryCache().find({ queryKey: r.options.queryKey })?.state
						.fetchMeta?.fetchMore?.direction === "forward",
			}),
		),
	);
	const stop = observer.subscribe(() => {});
	// The first fetch is not a next page, and over the placeholder nothing remains.
	state();
	assert.equal(seen.at(-1)?.drawn?.more, false);
	assert.equal(seen.at(-1)?.reads?.[0]?.result.fetchingMore, false);
	assert.equal(seen.at(-1)?.reads?.[0]?.result.streamed, false);
	await tick();
	state();
	const loaded = seen.at(-1);
	assert.equal(loaded?.drawn?.more, true);
	assert.equal(loaded?.reads?.[0]?.result.hasNextPage, true);
	assert.deepEqual(loaded?.drawn?.value, [0]);
	const next = new InfiniteQueryObserver(client, {
		...pages.options,
		enabled: false,
	} as never);
	const fetching = next.fetchNextPage();
	// The query says a next page is being fetched; the plain observer cannot.
	assert.equal(queryOf()?.state.fetchMeta?.fetchMore?.direction, "forward");
	state();
	assert.equal(seen.at(-1)?.reads?.[0]?.result.fetchingMore, true);
	assert.deepEqual(seen.at(-1)?.drawn?.value, [0]);
	await fetching;
	await tick();
	state();
	assert.equal(seen.at(-1)?.reads?.[0]?.result.fetchingMore, false);
	assert.deepEqual(seen.at(-1)?.drawn?.value, [0, 1]);
	stop();
});

test("a next page that failed is not the frame's refetch error", async () => {
	const client = new QueryClient();
	const pages = read<unknown>(
		{
			queryKey: ["failing-pages"],
			queryFn: async ({ pageParam }: { pageParam?: string }) => {
				if (pageParam !== undefined) throw new Error("next fails");
				return pageOf(0);
			},
			initialPageParam: undefined,
			getNextPageParam: (last: { nextCursor: string | null }) =>
				last.nextCursor,
			retry: false,
		} as never,
		{ kind: "pages" },
	);
	let held: Held | undefined;
	const { observer, state } = observe(
		client,
		planFrame(
			pages,
			(each) => {
				held = each;
				return each;
			},
			(r) => ({
				fetchMore:
					client.getQueryCache().find({ queryKey: r.options.queryKey })?.state
						.fetchMeta?.fetchMore?.direction === "forward",
			}),
		),
	);
	const stop = observer.subscribe(() => {});
	await tick();
	state();
	const next = new InfiniteQueryObserver(client, {
		...pages.options,
		enabled: false,
	} as never);
	await next.fetchNextPage();
	await tick();
	state();
	// The query is in error over its first page; the frame reads it as loaded.
	assert.equal(
		client.getQueryCache().find({ queryKey: pages.options.queryKey })?.state
			.status,
		"error",
	);
	assert.equal(held?.reads?.[0]?.result.status, "success");
	assert.equal(held?.reads?.[0]?.result.isRefetchError, false);
	assert.deepEqual(held?.drawn?.value, [0]);
	stop();
});

test("a stream read says so, and a plain read has no more", async () => {
	const client = new QueryClient();
	const stream = read(
		{ queryKey: ["s"], queryFn: async () => 1 },
		{ kind: "stream" },
	);
	let held: Held | undefined;
	const { observer, state } = observe(
		client,
		planFrame(
			stream,
			(h) => (held = h),
			() => undefined,
		),
	);
	const stop = observer.subscribe(() => {});
	await tick();
	state();
	assert.equal(held?.reads?.[0]?.result.streamed, true);
	assert.equal(held?.reads?.[0]?.result.hasNextPage, false);
	assert.equal(held?.drawn?.more, false);
	stop();
});

test("the default retry gives a failure one more try and a not-found none", async () => {
	const gone = new ORPCError("NOT_FOUND");
	assert.equal(retryOnce(0, new Error("down")), true);
	assert.equal(retryOnce(1, new Error("down")), false);
	assert.equal(retryOnce(0, gone), false);
	const client = new QueryClient({
		defaultOptions: { queries: { retry: retryOnce, retryDelay: 0 } },
	});
	let calls = 0;
	const attempt = (key: string, error: unknown) =>
		client
			.fetchQuery({
				queryKey: [key],
				queryFn: async () => {
					calls++;
					throw error;
				},
			})
			.catch(() => {});
	await attempt("missing", gone);
	assert.equal(calls, 1);
	await attempt("down", new Error("down"));
	assert.equal(calls, 3);
});
