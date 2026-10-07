import assert from "node:assert/strict";
import { test } from "node:test";
import { queryOptions } from "@tanstack/react-query";
import {
	createEntityRegistry,
	type EntityName,
	invalidateForWrites,
} from "../src/query-invalidation.ts";
// Loads the module's own `queryMeta` registration, as an app's program does.
import type {} from "../src/tanstack-query.tsx";
import { assertType, type Equal } from "./types.ts";

// What `.stack/procedure.ts` renders for an app whose entities are these two.
// An app has one copy of the module; this program has two, the source the
// helpers run from and the package build `tanstack-query.tsx` imports by name.
declare module "../src/query-invalidation.ts" {
	interface Register {
		entity: "member" | "org";
	}
}
declare module "@fcalell/plugin-api/query-invalidation" {
	interface Register {
		entity: "member" | "org";
	}
}

function recorder() {
	const calls: unknown[] = [];
	return {
		calls,
		queryClient: {
			invalidateQueries(filters: unknown) {
				calls.push(filters);
			},
		},
	};
}

// Checked by `check-types`: each `@ts-expect-error` fails the build when its
// line stops being an error.
test("EntityName is the registered union", () => {
	assertType<Equal<EntityName, "member" | "org">>(true);
});

test("invalidateForWrites takes registered entities only", () => {
	const { calls, queryClient } = recorder();
	invalidateForWrites(queryClient, ["member", "org"]);
	// @ts-expect-error a typo is no entity
	invalidateForWrites(queryClient, ["membr"]);
	assert.equal(calls.length, 2);
});

test("a registry's invalidateForWrites takes registered entities only", () => {
	const { queryClient } = recorder();
	const registry = createEntityRegistry();
	registry.invalidateForWrites(queryClient, ["org"]);
	// @ts-expect-error a typo is no entity
	registry.invalidateForWrites(queryClient, ["orgs"]);
});

test("a query's meta.reads takes registered entities only", () => {
	queryOptions({
		queryKey: ["session"],
		queryFn: () => null,
		meta: { reads: ["member"] },
	});
	queryOptions({
		queryKey: ["session"],
		queryFn: () => null,
		meta: { reads: ["member"], label: "another key stays open" },
	});
	queryOptions({
		queryKey: ["session"],
		queryFn: () => null,
		// @ts-expect-error a typo is no entity
		meta: { reads: ["membr"] },
	});
});
