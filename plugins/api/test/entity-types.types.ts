import { queryOptions } from "@tanstack/react-query";
import {
	createEntityRegistry,
	type EntityName,
	invalidateForWrites,
} from "../src/query-invalidation.ts";
// Loads the module's own `queryMeta` registration, as an app's program does.
import type {} from "../src/tanstack-query.tsx";
import { assertType, type Equal } from "./types.ts";

// `tsc` runs over this file in `pnpm check`: each `@ts-expect-error` fails the
// build when its line stops being an error.

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

declare const queryClient: { invalidateQueries(filters: unknown): void };

// EntityName is the registered union.
assertType<Equal<EntityName, "member" | "org">>(true);

// Never called: the write helpers and a query's meta.reads take registered
// entities only.
function _registeredEntitiesOnly() {
	invalidateForWrites(queryClient, ["member", "org"]);
	// @ts-expect-error a typo is no entity
	invalidateForWrites(queryClient, ["membr"]);

	const registry = createEntityRegistry();
	registry.invalidateForWrites(queryClient, ["org"]);
	// @ts-expect-error a typo is no entity
	registry.invalidateForWrites(queryClient, ["orgs"]);

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
}
