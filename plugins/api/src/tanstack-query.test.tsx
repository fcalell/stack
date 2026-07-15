import { MutationCache, QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { STACK_READS_HEADER, STACK_WRITES_HEADER } from "./procedure";
import { captureEntityHeaders } from "./query-invalidation";
import { createApiQueryUtils, createQueryClient } from "./tanstack-query";
import type { Procedure, RouterClient } from "./types";

// Fake router shape driving real `createApiQueryUtils` key generation for
// the auto-invalidation tests below -- the proxy materializes `.queryKey()`
// / `.mutationKey()` for any accessed path without needing a real client.
// `RouterClient` only maps branded `Procedure<TIn, TOut>` members, so the
// fake carries the same brand real generated routers do.
type EntityFakeRouter = {
	todos: {
		list: Procedure<undefined, unknown[]>;
		create: Procedure<{ title: string }, unknown>;
	};
	users: {
		list: Procedure<undefined, unknown[]>;
	};
};

function fakeEntityOrpc() {
	// The oRPC utils proxy walks `client[prop]` at each path segment, so the
	// stand-in needs real nested objects (their values are never called; only
	// `.queryKey()` / `.mutationKey()` are exercised below).
	const client = {
		todos: { list: async () => [], create: async () => ({}) },
		users: { list: async () => [] },
	} as unknown as RouterClient<EntityFakeRouter>;
	return createApiQueryUtils(client);
}

describe("createQueryClient", () => {
	it("returns a QueryClient with mobile-friendly defaults", () => {
		const client = createQueryClient();
		expect(client).toBeInstanceOf(QueryClient);
		const queries = client.getDefaultOptions().queries;
		expect(queries?.retry).toBe(1);
		expect(queries?.staleTime).toBe(30_000);
	});

	it("honours an explicit config over the defaults", () => {
		const client = createQueryClient({
			defaultOptions: { queries: { retry: 5 } },
		});
		expect(client.getDefaultOptions().queries?.retry).toBe(5);
	});
});

describe("createApiQueryUtils", () => {
	it("wraps a client into lazily-keyed query-option builders", () => {
		// The oRPC utils proxy materializes paths on access, so a structural
		// stand-in for the typed client is enough to exercise the wiring. The
		// fake router shape isn't a real server router, so read the proxy back
		// through a structural cast to assert the runtime builders exist.
		type FakeRouter = { ping: () => Promise<string> };
		const client = {
			ping: async () => "pong",
		} as unknown as RouterClient<FakeRouter>;

		const utils = createApiQueryUtils(client) as unknown as {
			ping: { queryOptions: unknown; mutationOptions: unknown };
		};
		expect(typeof utils.ping.queryOptions).toBe("function");
		expect(typeof utils.ping.mutationOptions).toBe("function");
	});
});

describe("createQueryClient auto-invalidation (WS3.3)", () => {
	it("invalidates a query whose reads intersect a successful mutation's writes, leaves an unrelated query alone", async () => {
		const orpc = fakeEntityOrpc();
		const todosListKey = orpc.todos.list.queryKey();
		const usersListKey = orpc.users.list.queryKey();
		const todosCreateKey = orpc.todos.create.mutationKey();

		captureEntityHeaders(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		captureEntityHeaders(
			"users/list",
			new Headers({ [STACK_READS_HEADER]: "users" }),
		);
		captureEntityHeaders(
			"todos/create",
			new Headers({ [STACK_WRITES_HEADER]: "todos" }),
		);

		const queryClient = createQueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		queryClient.setQueryData(todosListKey, []);
		queryClient.setQueryData(usersListKey, []);

		// Non-component mutation execution path (TanStack Query v5): build a
		// Mutation directly from the client's MutationCache and execute it, the
		// same machinery `useMutation` drives under the hood.
		const mutation = queryClient.getMutationCache().build(queryClient, {
			mutationKey: todosCreateKey,
			mutationFn: async () => ({ created: true }),
		});
		await mutation.execute(undefined);

		expect(queryClient.getQueryState(todosListKey)?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(usersListKey)?.isInvalidated).toBe(false);
	});

	it("does not invalidate when the mutation carries meta.skipAutoInvalidation", async () => {
		const orpc = fakeEntityOrpc();
		const todosListKey = orpc.todos.list.queryKey();
		const todosCreateKey = orpc.todos.create.mutationKey();

		captureEntityHeaders(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		captureEntityHeaders(
			"todos/create",
			new Headers({ [STACK_WRITES_HEADER]: "todos" }),
		);

		const queryClient = createQueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		queryClient.setQueryData(todosListKey, []);

		const mutation = queryClient.getMutationCache().build(queryClient, {
			mutationKey: todosCreateKey,
			mutationFn: async () => ({ created: true }),
			meta: { skipAutoInvalidation: true },
		});
		await mutation.execute(undefined);

		expect(queryClient.getQueryState(todosListKey)?.isInvalidated).toBe(false);
	});

	it("honours a caller-supplied mutationCache instead of installing the auto-invalidation one", async () => {
		const orpc = fakeEntityOrpc();
		const todosListKey = orpc.todos.list.queryKey();
		const todosCreateKey = orpc.todos.create.mutationKey();

		captureEntityHeaders(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		captureEntityHeaders(
			"todos/create",
			new Headers({ [STACK_WRITES_HEADER]: "todos" }),
		);

		let sawSuccess = false;
		const queryClient = createQueryClient({
			mutationCache: new MutationCache({
				onSuccess: () => {
					sawSuccess = true;
				},
			}),
		});
		queryClient.setQueryData(todosListKey, []);

		const mutation = queryClient.getMutationCache().build(queryClient, {
			mutationKey: todosCreateKey,
			mutationFn: async () => ({ created: true }),
		});
		await mutation.execute(undefined);

		expect(sawSuccess).toBe(true);
		expect(queryClient.getQueryState(todosListKey)?.isInvalidated).toBe(false);
	});
});
