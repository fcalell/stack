import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, skipToken } from "@tanstack/react-query";
import { bindClient, boundClient, preload } from "../src/preload.ts";
import { combine, type Read, read } from "../src/read.ts";

function counted() {
	const calls: string[] = [];
	const make = (key: string): Read<string> =>
		read({
			queryKey: [key],
			queryFn: async () => {
				calls.push(key);
				return key;
			},
		});
	return { calls, make };
}

const bound = () => {
	const client = new QueryClient({
		defaultOptions: { queries: { staleTime: 30_000, retry: false } },
	});
	bindClient(client);
	return client;
};

test("one prefetch per distinct key across selections and combine", async () => {
	const client = bound();
	const { calls, make } = counted();
	const a = make("a");
	const b = make("b");
	preload(
		a,
		a.at((x) => x),
		combine([a, b], (x, y) => x + y),
		make("a"),
	);
	await client.getQueryCache().find({ queryKey: ["a"] })?.promise;
	await client.getQueryCache().find({ queryKey: ["b"] })?.promise;
	assert.deepEqual(calls.sort(), ["a", "b"]);
	assert.equal(client.getQueryData(["b"]), "b");
});

test("a fresh read is a no-op", async () => {
	const client = bound();
	const { calls, make } = counted();
	client.setQueryData(["fresh"], "have");
	preload(make("fresh"));
	await Promise.resolve();
	assert.deepEqual(calls, []);
});

test("a stream and an idle read are skipped", () => {
	const client = bound();
	const { calls, make } = counted();
	const stream = read(
		{ queryKey: ["s"], queryFn: async () => calls.push("s") },
		{ kind: "stream" },
	);
	const skipped = read({ queryKey: ["skip"], queryFn: skipToken });
	const off = read({
		queryKey: ["off"],
		queryFn: async () => calls.push("off"),
		enabled: false,
	});
	preload(stream, skipped, off);
	assert.deepEqual(calls, []);
	for (const key of ["s", "skip", "off"]) {
		assert.equal(client.getQueryCache().find({ queryKey: [key] }), undefined);
	}
	preload(make("on"));
	assert.ok(client.getQueryCache().find({ queryKey: ["on"] }));
});

test("a pages read prefetches its first page as an infinite query", async () => {
	const client = bound();
	const seen: unknown[] = [];
	const pages = read(
		{
			queryKey: ["pages"],
			queryFn: async ({ pageParam }: { pageParam?: unknown }) => {
				seen.push(pageParam);
				return { data: [1], nextCursor: "c" };
			},
			initialPageParam: undefined,
			getNextPageParam: (last: { nextCursor: string | null }) =>
				last.nextCursor,
			// biome-ignore lint/suspicious/noExplicitAny: infinite options on a read's options type
		} as any,
		{ kind: "pages" },
	);
	preload(pages);
	const query = client.getQueryCache().find({ queryKey: ["pages"] });
	await query?.promise;
	assert.deepEqual(seen, [undefined]);
	assert.deepEqual(client.getQueryData(["pages"]), {
		pages: [{ data: [1], nextCursor: "c" }],
		pageParams: [undefined],
	});
});

test("unbound, preload does nothing", () => {
	const { calls, make } = counted();
	const was = boundClient();
	// biome-ignore lint/suspicious/noExplicitAny: unbinding for the test
	bindClient(undefined as any);
	try {
		assert.doesNotThrow(() => preload(make("x")));
		assert.deepEqual(calls, []);
	} finally {
		if (was) bindClient(was);
	}
});

test("a rejected fetch does not throw", async () => {
	const client = bound();
	const failing = read({
		queryKey: ["bad"],
		queryFn: async () => {
			throw new Error("down");
		},
	});
	assert.doesNotThrow(() => preload(failing));
	await client
		.getQueryCache()
		.find({ queryKey: ["bad"] })
		?.promise?.catch(() => {});
	assert.equal(client.getQueryState(["bad"])?.status, "error");
});

test("the last bound client wins", async () => {
	const first = bound();
	const second = bound();
	assert.equal(boundClient(), second);
	const { make } = counted();
	preload(make("k"));
	assert.ok(second.getQueryCache().find({ queryKey: ["k"] }));
	assert.equal(first.getQueryCache().find({ queryKey: ["k"] }), undefined);
});
