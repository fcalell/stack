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
				return held.roots?.[0]?.result.status;
			},
			() => undefined,
		),
	);
	const stop = observer.subscribe(() => {});
	assert.equal(state(), "success");
	assert.equal(seen.at(-1)?.drawn?.painted, true);
	assert.equal(seen.at(-1)?.roots?.[0]?.result.isPlaceholderData, true);
	await tick();
	assert.equal(state(), "error");
	assert.equal(seen.at(-1)?.roots?.[0]?.missing(new Error("no")), false);
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

test("a frame holds the reads of its selection that no enclosing frame holds", () => {
	const a = make("a", async () => 1);
	const b = make("b", async () => 2);
	const c = make("c", async () => 3);
	const all = combine([a, b, c], (x, y, z) => [x, y, z]);
	const results = [landed(1), landed(2), landed(3)];
	const roots = (
		selection: Parameters<typeof planFrame>[0],
		enclosing?: ReadonlySet<string>,
	) =>
		planFrame(
			selection,
			(h) => h,
			() => undefined,
			enclosing,
		).combine(results.slice(0, readsLength(selection))).roots?.length;
	const readsLength = (selection: Parameters<typeof planFrame>[0]) =>
		planFrame(
			selection,
			(h) => h,
			() => undefined,
		).reads.length;

	// A bare read, and an `at` of it, with no frame above: held.
	assert.deepEqual(
		planFrame(
			a,
			(h) => h,
			() => undefined,
		).held,
		[a],
	);
	assert.deepEqual(
		planFrame(
			a.at((x) => x),
			(h) => h,
			() => undefined,
		).held,
		[a],
	);
	// Under a holder of the read: nothing, and the drawn value stands.
	const above = new Set([hashOf(a)]);
	const under = planFrame(
		a.at((x) => x),
		(h) => h,
		() => undefined,
		above,
	);
	assert.deepEqual(under.held, []);
	assert.deepEqual(under.combine([landed(1)]), {
		drawn: { painted: false, value: 1, more: false },
		roots: [],
	});
	assert.equal(roots(a, above), 0);
	// A combine under a read-less Pane holds all three, in order.
	assert.deepEqual(
		planFrame(
			all,
			(h) => h,
			() => undefined,
		).held,
		[a, b, c],
	);
	assert.equal(roots(all), 3);
	// Under a holder of one of them, the other two.
	const some = planFrame(
		all,
		(h) => h,
		() => undefined,
		new Set([hashOf(b)]),
	);
	assert.deepEqual(some.held, [a, c]);
	assert.equal(some.combine(results).roots?.length, 2);
	// Two selections of one read hold it once.
	assert.equal(
		planFrame(
			combine([a, a.at((x) => x)], (x, y) => [x, y]),
			(h) => h,
			() => undefined,
		).held.length,
		1,
	);
	// Over nothing, nothing.
	const none = planFrame(
		undefined,
		(h) => h,
		() => undefined,
	);
	assert.deepEqual(none.reads, []);
	assert.deepEqual(none.combine([]), { roots: [] });
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
			(h) => h.roots?.map((r) => r.result.status),
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

test("sibling frames may each hold a read, and nothing is raised", () => {
	const error = mock.method(console, "error", () => {});
	const a = make("holders-a", async () => 1);
	const release = [holdReads([a]), holdReads([a])];
	for (const one of release) one();
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
	assert.equal(seen.at(-1)?.roots?.[0]?.result.fetchingMore, false);
	assert.equal(seen.at(-1)?.roots?.[0]?.result.streamed, false);
	await tick();
	state();
	const loaded = seen.at(-1);
	assert.equal(loaded?.drawn?.more, true);
	assert.equal(loaded?.roots?.[0]?.result.hasNextPage, true);
	assert.deepEqual(loaded?.drawn?.value, [0]);
	const next = new InfiniteQueryObserver(client, {
		...pages.options,
		enabled: false,
	} as never);
	const fetching = next.fetchNextPage();
	// The query says a next page is being fetched; the plain observer cannot.
	assert.equal(queryOf()?.state.fetchMeta?.fetchMore?.direction, "forward");
	state();
	assert.equal(seen.at(-1)?.roots?.[0]?.result.fetchingMore, true);
	assert.deepEqual(seen.at(-1)?.drawn?.value, [0]);
	await fetching;
	await tick();
	state();
	assert.equal(seen.at(-1)?.roots?.[0]?.result.fetchingMore, false);
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
	assert.equal(held?.roots?.[0]?.result.status, "success");
	assert.equal(held?.roots?.[0]?.result.isRefetchError, false);
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
	assert.equal(held?.roots?.[0]?.result.streamed, true);
	assert.equal(held?.roots?.[0]?.result.hasNextPage, false);
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
