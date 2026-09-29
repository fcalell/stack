import { STACK_READS_HEADER, STACK_WRITES_HEADER } from "./wire.ts";

// WS3.3: the client-side half of entity-based
// cache invalidation. Framework-agnostic core -- no react/solid/node imports
// -- consumed by `./client.ts` (capture point), `./tanstack-query.tsx`
// (React wiring), and `plugin-solid-ui`'s app shell (Solid wiring).
//
// Query/mutation keys are oRPC's `@orpc/tanstack-query` shape:
// `[path: readonly string[], { input?, type?, fnOptions? }]`. The path
// segments joined with "/" (`["todos", "list"]` -> "todos/list") are the same
// pathKey the server middleware derives its procedure path from, so captured
// headers key on the identical string the client-side queryKey produces.

interface EntityEntry {
	reads: string[];
	writes: string[];
}

// Structural subset of `@tanstack/react-query` and `@tanstack/solid-query`'s
// `QueryClient` -- both satisfy this without plugin-api depending on either.
export interface InvalidatableQueryClient {
	invalidateQueries(filters: {
		predicate: (query: {
			queryKey: readonly unknown[];
			meta?: Record<string, unknown> | undefined;
		}) => boolean;
	}): unknown;
}

// What a query outside the API (a better-auth client call) reads, declared
// on its options as `meta: { reads: [...] }`: the entity names a
// procedure's `reads` would, and the counterpart of a mutation source's
// `writes`. An API query's reads come from its response headers instead.
function declaredReads(
	meta: Record<string, unknown> | undefined,
): readonly string[] | undefined {
	const reads = meta?.reads;
	return Array.isArray(reads) &&
		reads.every((entity) => typeof entity === "string")
		? reads
		: undefined;
}

export interface EntityRegistry {
	/** Parses `x-stack-reads` / `x-stack-writes` off `headers` for `pathKey`. An absent header leaves that side untouched. */
	capture(pathKey: string, headers: Headers): void;
	/** Invalidates every cached query whose recorded or declared (`meta.reads`) reads intersect `writes`. */
	invalidateForWrites(
		queryClient: InvalidatableQueryClient,
		writes: readonly string[],
	): void;
	/** Looks up the writes recorded for `mutationKey`'s pathKey and invalidates for them. No-op when nothing was recorded. */
	handleMutationSuccess(
		queryClient: InvalidatableQueryClient,
		mutationKey: readonly unknown[] | undefined,
	): void;
}

function splitHeaderValue(value: string): string[] {
	return value
		.split(",")
		.map((entity) => entity.trim())
		.filter((entity) => entity.length > 0);
}

// Derives the "todos/list" pathKey from an oRPC operation key's path segment
// (index 0 of the `[path, options]` tuple `@orpc/tanstack-query` produces for
// both query and mutation keys).
function pathKeyFromOperationKey(
	key: readonly unknown[] | undefined,
): string | undefined {
	if (!key) return undefined;
	const path = key[0];
	if (!Array.isArray(path) || !path.every((seg) => typeof seg === "string")) {
		return undefined;
	}
	return (path as string[]).join("/");
}

export function createEntityRegistry(): EntityRegistry {
	const entries = new Map<string, EntityEntry>();

	function capture(pathKey: string, headers: Headers): void {
		const reads = headers.get(STACK_READS_HEADER);
		const writes = headers.get(STACK_WRITES_HEADER);
		if (reads === null && writes === null) return;

		const entry = entries.get(pathKey) ?? { reads: [], writes: [] };
		if (reads !== null) entry.reads = splitHeaderValue(reads);
		if (writes !== null) entry.writes = splitHeaderValue(writes);
		entries.set(pathKey, entry);
	}

	function invalidateForWrites(
		queryClient: InvalidatableQueryClient,
		writes: readonly string[],
	): void {
		if (writes.length === 0) return;
		const writeSet = new Set(writes);

		queryClient.invalidateQueries({
			predicate: (query) => {
				const pathKey = pathKeyFromOperationKey(query.queryKey);
				const reads =
					declaredReads(query.meta) ??
					(pathKey ? entries.get(pathKey)?.reads : undefined);
				return reads?.some((entity) => writeSet.has(entity)) ?? false;
			},
		});
	}

	function handleMutationSuccess(
		queryClient: InvalidatableQueryClient,
		mutationKey: readonly unknown[] | undefined,
	): void {
		const pathKey = pathKeyFromOperationKey(mutationKey);
		if (!pathKey) return;
		const writes = entries.get(pathKey)?.writes;
		if (!writes || writes.length === 0) return;
		invalidateForWrites(queryClient, writes);
	}

	return { capture, invalidateForWrites, handleMutationSuccess };
}

// The registry `./client.ts`, `./tanstack-query.tsx`, and `plugin-solid-ui`
// share by default. Tests that need isolation from other tests' captured
// headers build their own via `createEntityRegistry()` instead.
//
// Per-JS-isolate, single-user assumption: like `ability-client.ts`'s
// registered-client singleton, this module-level registry assumes one
// client's captured headers for the lifetime of the isolate (CSR/native) --
// it is NOT per-request. An SSR target that reuses the same isolate across
// requests/users must not reuse it: user A's captured entity headers could
// drive user B's cache invalidation. Build a request-scoped registry via
// `createEntityRegistry()` instead.
export const defaultEntityRegistry: EntityRegistry = createEntityRegistry();

export function captureEntityHeaders(pathKey: string, headers: Headers): void {
	defaultEntityRegistry.capture(pathKey, headers);
}

export function invalidateForWrites(
	queryClient: InvalidatableQueryClient,
	writes: readonly string[],
): void {
	defaultEntityRegistry.invalidateForWrites(queryClient, writes);
}

export function handleMutationSuccess(
	queryClient: InvalidatableQueryClient,
	mutationKey: readonly unknown[] | undefined,
): void {
	defaultEntityRegistry.handleMutationSuccess(queryClient, mutationKey);
}
