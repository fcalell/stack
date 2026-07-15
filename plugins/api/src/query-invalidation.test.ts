import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { STACK_READS_HEADER, STACK_WRITES_HEADER } from "./procedure";
import { createEntityRegistry } from "./query-invalidation";

describe("EntityRegistry.capture", () => {
	it("records both reads and writes from a Headers instance", () => {
		const registry = createEntityRegistry();
		registry.capture(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos, users" }),
		);
		registry.capture(
			"todos/create",
			new Headers({ [STACK_WRITES_HEADER]: "todos" }),
		);

		// Observable only through invalidation behavior -- exercise it via
		// invalidateForWrites rather than reaching into registry internals.
		const client = new QueryClient();
		client.setQueryData([["todos", "list"], { type: "query" }], []);
		registry.invalidateForWrites(client, ["todos"]);
		expect(
			client.getQueryState([["todos", "list"], { type: "query" }])
				?.isInvalidated,
		).toBe(true);
	});

	it("leaves a pathKey's entries untouched when its header is absent", () => {
		const registry = createEntityRegistry();
		registry.capture(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		// A second capture for the same pathKey with no writes header must not
		// clear the previously recorded reads.
		registry.capture("todos/list", new Headers());

		const client = new QueryClient();
		client.setQueryData([["todos", "list"], { type: "query" }], []);
		registry.invalidateForWrites(client, ["todos"]);
		expect(
			client.getQueryState([["todos", "list"], { type: "query" }])
				?.isInvalidated,
		).toBe(true);
	});

	it("records nothing when neither header is present", () => {
		const registry = createEntityRegistry();
		registry.capture("todos/list", new Headers());

		const client = new QueryClient();
		client.setQueryData([["todos", "list"], { type: "query" }], []);
		registry.invalidateForWrites(client, ["todos"]);
		expect(
			client.getQueryState([["todos", "list"], { type: "query" }])
				?.isInvalidated,
		).toBe(false);
	});
});

describe("EntityRegistry.invalidateForWrites", () => {
	it("invalidates a query whose recorded reads intersect the writes, leaves others alone", () => {
		const registry = createEntityRegistry();
		registry.capture(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		registry.capture(
			"users/list",
			new Headers({ [STACK_READS_HEADER]: "users" }),
		);

		const client = new QueryClient();
		client.setQueryData([["todos", "list"], { type: "query" }], []);
		client.setQueryData([["users", "list"], { type: "query" }], []);

		registry.invalidateForWrites(client, ["todos"]);

		expect(
			client.getQueryState([["todos", "list"], { type: "query" }])
				?.isInvalidated,
		).toBe(true);
		expect(
			client.getQueryState([["users", "list"], { type: "query" }])
				?.isInvalidated,
		).toBe(false);
	});

	it("is a no-op for an empty writes list", () => {
		const registry = createEntityRegistry();
		registry.capture(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		const client = new QueryClient();
		client.setQueryData([["todos", "list"], { type: "query" }], []);

		registry.invalidateForWrites(client, []);

		expect(
			client.getQueryState([["todos", "list"], { type: "query" }])
				?.isInvalidated,
		).toBe(false);
	});

	it("skips a query whose queryKey doesn't match the oRPC [path, options] shape", () => {
		const registry = createEntityRegistry();
		registry.capture(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		const client = new QueryClient();
		client.setQueryData(["not-an-orpc-key"], []);

		registry.invalidateForWrites(client, ["todos"]);

		expect(client.getQueryState(["not-an-orpc-key"])?.isInvalidated).toBe(
			false,
		);
	});
});

describe("EntityRegistry.handleMutationSuccess", () => {
	it("invalidates queries whose reads intersect the recorded writes for the mutation's pathKey", () => {
		const registry = createEntityRegistry();
		registry.capture(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		registry.capture(
			"todos/create",
			new Headers({ [STACK_WRITES_HEADER]: "todos" }),
		);

		const client = new QueryClient();
		client.setQueryData([["todos", "list"], { type: "query" }], []);

		registry.handleMutationSuccess(client, [
			["todos", "create"],
			{ type: "mutation" },
		]);

		expect(
			client.getQueryState([["todos", "list"], { type: "query" }])
				?.isInvalidated,
		).toBe(true);
	});

	it("no-ops when the mutation's pathKey recorded no writes", () => {
		const registry = createEntityRegistry();
		registry.capture(
			"todos/list",
			new Headers({ [STACK_READS_HEADER]: "todos" }),
		);
		const client = new QueryClient();
		client.setQueryData([["todos", "list"], { type: "query" }], []);

		registry.handleMutationSuccess(client, [
			["todos", "create"],
			{ type: "mutation" },
		]);

		expect(
			client.getQueryState([["todos", "list"], { type: "query" }])
				?.isInvalidated,
		).toBe(false);
	});

	it("no-ops when the mutation key is undefined", () => {
		const registry = createEntityRegistry();
		const client = new QueryClient();
		expect(() =>
			registry.handleMutationSuccess(client, undefined),
		).not.toThrow();
	});
});
