import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "./client";
import { STACK_READS_HEADER } from "./procedure";
import { invalidateForWrites } from "./query-invalidation";
import type { Procedure } from "./types";

// `RouterClient` only maps branded `Procedure<TIn, TOut>` members (never
// plain function types), so the fake router shape uses the same brand real
// generated routers carry; the client-side test double casts through
// `RouterClient` since the runtime only ever calls `list`.
type FakeRouter = {
	todos: { list: Procedure<Record<string, unknown>, unknown[]> };
};

// `config.fetch` is the injectable seam `ClientConfig` exists for -- stub
// only globalThis-level fetch, never oRPC internals.
function stubReadsResponse(entities: string) {
	return vi.fn(
		async () =>
			new Response(JSON.stringify({ json: [] }), {
				headers: {
					"content-type": "application/json",
					[STACK_READS_HEADER]: entities,
				},
			}),
	) as unknown as typeof globalThis.fetch;
}

// Asserts the default registry recorded `["todos"]` reads for "todos/list"
// by driving the same public invalidation path production code uses --
// `captureEntityHeaders` (called inside `createClient`'s fetch wrapper) has
// no other observable surface.
function expectTodosListReadsCaptured() {
	const queryClient = new QueryClient();
	const todosListKey = [["todos", "list"], { type: "query" }];
	queryClient.setQueryData(todosListKey, []);
	invalidateForWrites(queryClient, ["todos"]);
	expect(queryClient.getQueryState(todosListKey)?.isInvalidated).toBe(true);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("createClient entity header capture (WS3.3)", () => {
	it("captures the pathKey for an absolute url config", async () => {
		const client = createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: stubReadsResponse("todos"),
		});

		await client.todos.list({});

		expectTodosListReadsCaptured();
	});

	it("captures the pathKey for the default relative /rpc url config", async () => {
		// oRPC's RPCLink resolves the request URL via `new URL(baseUrl)` with no
		// `base` argument, so a relative "/rpc" only works once resolved against
		// an origin -- `createClient` does this via `location.origin` when
		// present (verified against the installed @orpc/client: a bare relative
		// url throws "Invalid URL" otherwise).
		vi.stubGlobal("location", { origin: "http://localhost:3000" });

		const client = createClient<FakeRouter>({
			fetch: stubReadsResponse("todos"),
		});

		await client.todos.list({});

		expectTodosListReadsCaptured();
	});

	it("never throws when the stubbed response carries no entity headers", async () => {
		const client = createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: vi.fn(
				async () =>
					new Response(JSON.stringify({ json: [] }), {
						headers: { "content-type": "application/json" },
					}),
			) as unknown as typeof globalThis.fetch,
		});

		await expect(client.todos.list({})).resolves.toEqual([]);
	});
});
