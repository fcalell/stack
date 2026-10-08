import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createTanstackQueryUtils,
	OPERATION_CONTEXT_SYMBOL,
} from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
	createClient,
	isNotFound,
	registerOperationContext,
} from "../src/client.ts";
import { ApiError } from "../src/error.ts";
import { createProcedure } from "../src/procedure.ts";
import createWorker from "../src/worker/index.ts";

registerOperationContext(OPERATION_CONTEXT_SYMBOL);

const procedure = createProcedure<Record<string, unknown>>();
const routes = {
	items: {
		get: procedure()
			.input(z.object({ id: z.string() }))
			.query(async () => {
				throw new ApiError("NOT_FOUND");
			}),
		broken: procedure().query(async () => {
			throw new Error("boom");
		}),
		remove: procedure()
			.input(z.object({ id: z.string() }))
			.mutation(async () => {
				throw new ApiError("NOT_FOUND");
			}),
	},
};

type Router = typeof routes;

const ORIGIN = "https://app.test";

function boot() {
	const worker = createWorker({ cors: [ORIGIN] }).handler(routes);
	const seen: Response[] = [];
	const fetch = async (request: Request | string | URL, init?: RequestInit) => {
		const req =
			request instanceof Request ? request : new Request(request, init);
		const response = await worker.fetch(req, { STACK_QUIET: "1" }, undefined);
		seen.push(response.clone());
		return response;
	};
	const client = createClient<Router>({
		url: "http://stack.test/rpc",
		fetch: fetch as typeof globalThis.fetch,
	});
	return { client, seen, fetch };
}

const READ = `http://stack.test/rpc/items/get?data=${encodeURIComponent(JSON.stringify({ json: { id: "x" } }))}`;

test("the worker answers a read's not found with a 200 and the header", async () => {
	const { fetch } = boot();
	const response = await fetch(READ);
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("x-stack-not-found"), "1");
	const body = (await response.json()) as { json: { code: string } };
	assert.equal(body.json.code, "NOT_FOUND");
});

test("a mutation's not found stays a 404", async () => {
	const { fetch } = boot();
	const response = await fetch("http://stack.test/rpc/items/remove", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ json: { id: "x" } }),
	});
	assert.equal(response.status, 404);
	assert.equal(response.headers.get("x-stack-not-found"), null);
});

test("a read that fails stays a 500, and an unmatched route stays a 404", async () => {
	const { fetch } = boot();
	const broken = await fetch("http://stack.test/rpc/items/broken");
	assert.equal(broken.status, 500);
	assert.equal(broken.headers.get("x-stack-not-found"), null);
	const unmatched = await fetch("http://stack.test/rpc/items/nowhere");
	assert.equal(unmatched.status, 404);
	assert.equal(unmatched.headers.get("x-stack-not-found"), null);
});

test("a cross-origin client may read the header", async () => {
	const { fetch } = boot();
	const response = await fetch(READ, { headers: { origin: ORIGIN } });
	assert.match(
		response.headers.get("access-control-expose-headers") ?? "",
		/x-stack-not-found/i,
	);
});

test("the client turns a read's not found back into the 404 oRPC decodes", async () => {
	const { client, seen } = boot();
	const orpc = createTanstackQueryUtils(client);
	const queries = new QueryClient();
	const failure = await queries
		.fetchQuery({
			...orpc.items.get.queryOptions({ input: { id: "x" } }),
			retry: false,
		})
		.then(
			() => undefined,
			(error: unknown) => error,
		);
	assert.equal(seen[0]?.status, 200);
	assert.ok(isNotFound(failure));
});

test("a failed read still reaches the client as an error that is not a not found", async () => {
	const { client } = boot();
	const orpc = createTanstackQueryUtils(client);
	const queries = new QueryClient();
	const failure = await queries
		.fetchQuery({ ...orpc.items.broken.queryOptions(), retry: false })
		.then(
			() => undefined,
			(error: unknown) => error,
		);
	assert.ok(failure instanceof Error);
	assert.equal(isNotFound(failure), false);
});

test("a mutation's not found is a not found to the client", async () => {
	const { client } = boot();
	const failure = await client.items.remove({ id: "x" }).then(
		() => undefined,
		(error: unknown) => error,
	);
	assert.ok(isNotFound(failure));
});
