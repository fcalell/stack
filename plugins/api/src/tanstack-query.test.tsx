import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createApiQueryUtils, createQueryClient } from "./tanstack-query";
import type { RouterClient } from "./types";

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
