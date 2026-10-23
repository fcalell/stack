import assert from "node:assert/strict";
import { test } from "node:test";
import type { QueryClient } from "@fcalell/plugin-api/tanstack-query";
import { fetchingReads } from "./busy.ts";

// Only the part of the client the count reads: the fetching queries' meta.
const clientOf = (...metas: (Record<string, unknown> | undefined)[]) =>
	({
		getQueryCache: () => ({
			findAll: () => metas.map((meta) => ({ meta })),
		}),
	}) as unknown as QueryClient;

test("a stream query fetching is not counted, any other is", () => {
	assert.equal(fetchingReads(clientOf({ stream: true })), 0);
	assert.equal(fetchingReads(clientOf({ stream: true }, undefined)), 1);
	assert.equal(
		fetchingReads(clientOf({ reach: 1, stream: true }, { hold: 1 }, {})),
		2,
	);
});

test("no client is no read", () => {
	assert.equal(fetchingReads(undefined), 0);
});
