import {
	STACK_READS_HEADER,
	STACK_WRITES_HEADER,
} from "@fcalell/plugin-api/procedure";
import { captureEntityHeaders } from "@fcalell/plugin-api/query-invalidation";
import { describe, expect, it } from "vitest";
import { createDefaultQueryClient } from "./query";

// WS3.3 (docs/prd/backend-hardening.md): `createApp`'s default client (built
// by `createDefaultQueryClient` when the caller supplies no `queryClient`)
// gets the same auto-invalidation wiring as plugin-api's React client.
// Exercised directly against the real `@tanstack/solid-query` `QueryClient`
// -- no component rendering needed, the wiring lives entirely in the client
// construction.
describe("createDefaultQueryClient auto-invalidation (WS3.3)", () => {
	it("invalidates a query whose reads intersect a successful mutation's writes", async () => {
		captureEntityHeaders(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		captureEntityHeaders(
			"todos/create",
			new Headers({ [STACK_WRITES_HEADER]: "todos" }),
		);

		const queryClient = createDefaultQueryClient();
		const todosListKey = [["todos", "list"], { type: "query" }];
		queryClient.setQueryData(todosListKey, []);

		const mutation = queryClient.getMutationCache().build(queryClient, {
			mutationKey: [["todos", "create"], { type: "mutation" }],
			mutationFn: async () => ({ created: true }),
		});
		await mutation.execute(undefined);

		expect(queryClient.getQueryState(todosListKey)?.isInvalidated).toBe(true);
	});

	it("does not invalidate when the mutation carries meta.skipAutoInvalidation", async () => {
		captureEntityHeaders(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		captureEntityHeaders(
			"todos/create",
			new Headers({ [STACK_WRITES_HEADER]: "todos" }),
		);

		const queryClient = createDefaultQueryClient();
		const todosListKey = [["todos", "list"], { type: "query" }];
		queryClient.setQueryData(todosListKey, []);

		const mutation = queryClient.getMutationCache().build(queryClient, {
			mutationKey: [["todos", "create"], { type: "mutation" }],
			mutationFn: async () => ({ created: true }),
			meta: { skipAutoInvalidation: true },
		});
		await mutation.execute(undefined);

		expect(queryClient.getQueryState(todosListKey)?.isInvalidated).toBe(false);
	});
});
