import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createTanstackQueryUtils,
	OPERATION_CONTEXT_SYMBOL,
} from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { createClient, registerOperationContext } from "../src/client.ts";
import { createProcedure } from "../src/procedure.ts";
import createWorker from "../src/worker/index.ts";

// `createApiQueryUtils` (a .tsx module this test cannot load) makes this call.
registerOperationContext(OPERATION_CONTEXT_SYMBOL);

const procedure = createProcedure<Record<string, unknown>>();
const routes = {
	items: {
		list: procedure()
			.input(z.object({ q: z.string() }))
			.query(async ({ input }) => [input.q]),
		create: procedure()
			.input(z.object({ name: z.string() }))
			.mutation(async ({ input }) => ({ name: input.name })),
		bare: procedure().handler(async () => "bare"),
		read: procedure({ reads: ["items"] }).query(async () => "read"),
	},
};

type Router = typeof routes;

// The real client on the real worker, recording the method of each request.
function boot() {
	const worker = createWorker().handler(routes);
	const seen: Array<{ method: string; url: string }> = [];
	const fetch = (request: Request | string | URL, init?: RequestInit) => {
		const req =
			request instanceof Request ? request : new Request(request, init);
		seen.push({ method: req.method, url: req.url });
		return Promise.resolve(worker.fetch(req, { STACK_QUIET: "1" }, undefined));
	};
	const client = createClient<Router>({
		url: "http://stack.test/rpc",
		fetch: fetch as typeof globalThis.fetch,
	});
	return { client, seen, fetch };
}

test("a query through TanStack Query travels as GET with its input in the URL", async () => {
	const { client, seen } = boot();
	const orpc = createTanstackQueryUtils(client);
	const queries = new QueryClient();
	const out = await queries.fetchQuery(
		orpc.items.list.queryOptions({ input: { q: "acme" } }),
	);
	assert.deepEqual(out, ["acme"]);
	assert.equal(seen.length, 1);
	assert.equal(seen[0]?.method, "GET");
	const url = new URL(seen[0]?.url ?? "");
	assert.equal(url.pathname, "/rpc/items/list");
	assert.deepEqual(JSON.parse(url.searchParams.get("data") ?? ""), {
		json: { q: "acme" },
	});
});

test("an infinite query travels as GET", async () => {
	const { client, seen } = boot();
	const orpc = createTanstackQueryUtils(client);
	const queries = new QueryClient();
	await queries.fetchInfiniteQuery(
		orpc.items.list.infiniteOptions({
			input: (page: string) => ({ q: page }),
			initialPageParam: "a",
			getNextPageParam: () => undefined,
		}),
	);
	assert.equal(seen[0]?.method, "GET");
});

test("a mutation through TanStack Query travels as POST", async () => {
	const { client, seen } = boot();
	const orpc = createTanstackQueryUtils(client);
	const options = orpc.items.create.mutationOptions();
	assert.deepEqual(
		await options.mutationFn?.({ name: "Acme" }, undefined as never),
		{
			name: "Acme",
		},
	);
	assert.equal(seen[0]?.method, "POST");
});

test("a direct call outside TanStack Query is a POST, queries included", async () => {
	const { client, seen } = boot();
	assert.deepEqual(await client.items.list({ q: "x" }), ["x"]);
	assert.equal(seen[0]?.method, "POST");
});

test("the worker answers a GET for a query only", async () => {
	const { fetch } = boot();
	const data = encodeURIComponent(JSON.stringify({ json: { name: "Acme" } }));
	const mutation = await fetch(
		`http://stack.test/rpc/items/create?data=${data}`,
	);
	assert.equal(mutation.status, 405);
	const bare = await fetch("http://stack.test/rpc/items/bare");
	assert.equal(bare.status, 405);
	const query = await fetch(
		`http://stack.test/rpc/items/list?data=${encodeURIComponent(JSON.stringify({ json: { q: "a" } }))}`,
	);
	assert.equal(query.status, 200);
	assert.deepEqual(await query.json(), { json: ["a"] });
});

test("a POST still needs a JSON content type, a GET needs none", async () => {
	const { fetch } = boot();
	const post = await fetch("http://stack.test/rpc/items/create", {
		method: "POST",
		headers: { "content-type": "text/plain" },
		body: "{}",
	});
	assert.equal(post.status, 415);
	const get = await fetch(
		`http://stack.test/rpc/items/list?data=${encodeURIComponent(JSON.stringify({ json: { q: "a" } }))}`,
	);
	assert.equal(get.status, 200);
});

test("a GET query carries the entity headers a POST does", async () => {
	const { fetch } = boot();
	const response = await fetch("http://stack.test/rpc/items/read");
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("x-stack-reads"), "items");
});
