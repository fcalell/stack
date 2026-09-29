import { ApiError } from "@fcalell/plugin-api/error";
import {
	handleMutationSuccess,
	invalidateForWrites,
} from "@fcalell/plugin-api/query-invalidation";
import type { RouterClient } from "@fcalell/plugin-api/types";
import {
	createTanstackQueryUtils,
	type RouterUtils,
} from "@orpc/tanstack-query";
import {
	useInfiniteQuery as _useInfiniteQuery,
	useMutation as _useMutation,
	useQuery as _useQuery,
	type CreateMutationResult,
	type dataTagSymbol,
	MutationCache,
	type MutationFunction,
	type MutationFunctionContext,
	QueryClient,
	type QueryKey,
	useQueryClient,
} from "@tanstack/solid-query";
import { type Answered, answered } from "#lib/refusal.ts";
import { toast } from "#lib/toast.ts";

// The default client `createApp` builds when the caller supplies no
// `queryClient` auto-invalidates on every mutation success, unless the
// mutation opted out via `meta: { skipAutoInvalidation: true }`: the
// writes the procedure declared, and the `writes` a source outside the API
// names (`meta.writes`, set by `useMutation`). A
// consumer-supplied `options.queryClient` is used as-is: they own
// invalidation then.
export function createDefaultQueryClient(): QueryClient {
	const queryClient: QueryClient = new QueryClient({
		mutationCache: new MutationCache({
			onSuccess: (_data, _variables, _onMutateResult, mutation) => {
				if (mutation.meta?.skipAutoInvalidation) return;
				handleMutationSuccess(queryClient, mutation.options.mutationKey);
				const writes = mutation.meta?.writes;
				if (Array.isArray(writes)) invalidateForWrites(queryClient, writes);
			},
		}),
	});
	return queryClient;
}

// Wrap a typed oRPC client with TanStack Query helpers (`.queryOptions`,
// `.mutationOptions`, `.key`). Their keys carry the procedure path the
// server's entity headers are captured under, so a mutation's declared
// writes invalidate every query that read them, with no hand-written key.
// The helpers' type, named here so a consumer's `q` exports without
// reaching into oRPC's own package.
export type ApiQueryUtils<TRouter> = RouterUtils<RouterClient<TRouter>>;

export function createApiQueryUtils<TRouter>(
	client: RouterClient<TRouter>,
): ApiQueryUtils<TRouter> {
	return createTanstackQueryUtils(client);
}

function makeSafe<T extends { data: unknown; isPending: boolean }>(
	query: T,
): T {
	return Object.create(query, {
		data: {
			get() {
				return query.isPending ? undefined : query.data;
			},
			enumerable: true,
		},
	}) as T;
}

export const useQuery = ((...args: unknown[]) =>
	makeSafe(
		(_useQuery as (...a: unknown[]) => ReturnType<typeof _useQuery>)(...args),
	)) as typeof _useQuery;

export const useInfiniteQuery = ((...args: unknown[]) =>
	makeSafe(
		(
			_useInfiniteQuery as (
				...a: unknown[]
			) => ReturnType<typeof _useInfiniteQuery>
		)(...args),
	)) as typeof _useInfiniteQuery;

export type { CreateQueryResult, QueryClient } from "@tanstack/solid-query";
export type { CreateMutationResult, QueryKey };
export { useQueryClient };

type QueryLike<TData, TError> = {
	data: TData | undefined;
	isPending: boolean;
	isError: boolean;
	error: TError | null;
	refetch: () => void;
};

type ExtractData<T extends QueryLike<unknown, unknown>[]> = {
	[K in keyof T]: T[K] extends QueryLike<infer D, unknown> ? D : never;
};

function combineQueries<T extends QueryLike<unknown, unknown>[]>(
	...queries: T
): QueryLike<ExtractData<T>, Error> {
	return {
		get data() {
			// Guard: never access q.data while any query is pending (no data yet).
			// TanStack Solid Query backs useQuery with createResource — reading
			// .data on a pending resource throws a Promise (Suspense), which
			// corrupts Switch/Match internals.
			if (queries.some((q) => q.isPending)) return undefined;
			return queries.every((q) => q.data !== undefined)
				? (queries.map((q) => q.data) as ExtractData<T>)
				: undefined;
		},
		get isPending() {
			return queries.some((q) => q.isPending);
		},
		get isError() {
			return queries.some((q) => q.isError);
		},
		get error() {
			const err = queries.find((q) => q.error)?.error;
			return err instanceof Error ? err : null;
		},
		refetch() {
			for (const q of queries) q.refetch();
		},
	};
}

// What `mutation` returns: oRPC's `.mutationOptions()`, or any object with
// the same two fields. `useMutation` reads its variables and its answer off
// `mutationFn`, so a call site names no type. A call outside the API (a
// better-auth client call) has no procedure to declare its writes, so it
// names them: the entity names a procedure's `writes` would. A better-auth
// call's `{ data, error }` answer is unwrapped (`Answered`): the mutation's
// data is `data`, and a refusal is its error.
type MutationSource<TVars, TData> = {
	mutationKey?: QueryKey;
	mutationFn?: MutationFunction<TData, TVars>;
	writes?: readonly string[];
};

// A cached query the mutation changes, typed by the query's data through its
// tagged key (`q.x.queryKey(...)`), so a list and a single record are
// described the same way. An update that finds nothing cached leaves the
// cache alone.
// biome-ignore lint/suspicious/noExplicitAny: the default for a call site that names only `TVars` and `TData`
type QueryUpdate<TVars, TData, TQuery = any> = {
	queryKey: () => QueryKey & { [dataTagSymbol]: TQuery };
	// Optimistic: applied as the mutation starts, rolled back if it fails.
	updater?: (old: TQuery, vars: TVars) => TQuery;
	// Applied with the server's answer.
	onSuccessUpdater?: (old: TQuery, data: TData, vars: TVars) => TQuery;
};

// Each position's query data is its own type parameter, inferred from its
// key: TypeScript infers a tuple position directly, where a mapped tuple
// loses every element whose updater leaves its parameters untyped.
// TODO: four updates per mutation; add a position when a mutation changes a
// fifth cached query.
type QueryUpdates<TVars, TData, Q1, Q2, Q3, Q4> = readonly [
	QueryUpdate<TVars, TData, Q1>?,
	QueryUpdate<TVars, TData, Q2>?,
	QueryUpdate<TVars, TData, Q3>?,
	QueryUpdate<TVars, TData, Q4>?,
];

// The update positions' data defaults to `any`, for a call site that names
// `TVars` and `TData` itself.
type MutationOptions<
	TVars,
	TData,
	// biome-ignore lint/suspicious/noExplicitAny: see `QueryUpdate`
	Q1 = any,
	// biome-ignore lint/suspicious/noExplicitAny: see `QueryUpdate`
	Q2 = any,
	// biome-ignore lint/suspicious/noExplicitAny: see `QueryUpdate`
	Q3 = any,
	// biome-ignore lint/suspicious/noExplicitAny: see `QueryUpdate`
	Q4 = any,
> = {
	mutation: () => MutationSource<TVars, TData>;
	updates?: QueryUpdates<TVars, Answered<TData>, Q1, Q2, Q3, Q4>;
	onSuccess?: (data: Answered<TData>, vars: TVars) => void;
	onError?: (error: unknown, vars: TVars) => boolean | undefined;
	errorMessage?: string;
	errorHandler?: (message: string) => void;
};

// A mutation through the API. Its procedure's declared `writes` invalidate
// every query that read them, as every mutation's do
// (`createDefaultQueryClient`); `updates` change the cache in addition,
// never instead, so the invalidation still refetches what the server holds.
function useMutation<
	TVars,
	TData,
	// biome-ignore lint/suspicious/noExplicitAny: see `QueryUpdate`
	Q1 = any,
	// biome-ignore lint/suspicious/noExplicitAny: see `QueryUpdate`
	Q2 = any,
	// biome-ignore lint/suspicious/noExplicitAny: see `QueryUpdate`
	Q3 = any,
	// biome-ignore lint/suspicious/noExplicitAny: see `QueryUpdate`
	Q4 = any,
>(
	options: () => MutationOptions<TVars, TData, Q1, Q2, Q3, Q4>,
): CreateMutationResult<Answered<TData>, unknown, TVars> {
	const queryClient = useQueryClient();
	return _useMutation(() => mutationObserverOptions(options(), queryClient));
}

// The TanStack options `useMutation` hands solid-query, apart so a test
// drives them through a plain `MutationObserver`.
function mutationObserverOptions<TVars, TData, Q1, Q2, Q3, Q4>(
	opts: MutationOptions<TVars, TData, Q1, Q2, Q3, Q4>,
	queryClient: QueryClient,
) {
	const updates = (opts.updates ?? []).filter(
		(update) => update !== undefined,
	) as QueryUpdate<TVars, Answered<TData>, unknown>[];
	const { mutationKey, mutationFn, writes } = opts.mutation();
	const optimistic = updates.filter((u) => u.updater);

	return {
		mutationKey,
		// A better-auth call resolves `{ data, error }`: its refusal rejects
		// and its success unwraps to `data`, so the error path and the
		// caller's `onSuccess` see what an API call's would.
		mutationFn: mutationFn
			? async (variables: TVars, context: MutationFunctionContext) =>
					answered(await mutationFn(variables, context))
			: undefined,
		meta: writes ? { writes } : undefined,
		onMutate:
			optimistic.length > 0
				? async (variables: TVars) => {
						const snapshots = new Map<string, unknown>();
						await Promise.all(
							optimistic.map((u) =>
								queryClient.cancelQueries({ queryKey: u.queryKey() }),
							),
						);
						for (const update of optimistic) {
							const key = update.queryKey();
							snapshots.set(JSON.stringify(key), queryClient.getQueryData(key));
							queryClient.setQueryData<unknown>(key, (old: unknown) =>
								old === undefined
									? undefined
									: update.updater?.(old, variables),
							);
						}
						return { snapshots };
					}
				: undefined,
		onSuccess: (data: Answered<TData>, variables: TVars) => {
			for (const update of updates) {
				if (!update.onSuccessUpdater) continue;
				queryClient.setQueryData<unknown>(update.queryKey(), (old: unknown) =>
					old === undefined
						? undefined
						: update.onSuccessUpdater?.(old, data, variables),
				);
			}
			opts.onSuccess?.(data, variables);
		},
		onError: (
			error: unknown,
			variables: TVars,
			context: { snapshots: Map<string, unknown> } | undefined,
		) => {
			for (const update of optimistic) {
				const key = update.queryKey();
				const snapshot = context?.snapshots.get(JSON.stringify(key));
				if (snapshot !== undefined) queryClient.setQueryData(key, snapshot);
			}
			const suppressed = opts.onError?.(error, variables);
			if (!suppressed) {
				// A refusal the procedure phrased (an ApiError with a code of
				// its own) is shown as phrased; the caller's message covers
				// the rest, as a `failed` toast, unless the caller shows
				// it its own way.
				const phrased =
					error instanceof ApiError &&
					error.code !== "INTERNAL_SERVER_ERROR" &&
					error.message
						? error.message
						: undefined;
				const message = phrased ?? opts.errorMessage ?? "Operation failed.";
				if (opts.errorHandler) opts.errorHandler(message);
				else toast(message, { state: "failed" });
			}
		},
	};
}

export type { MutationOptions, MutationSource, QueryLike, QueryUpdate };
export { combineQueries, mutationObserverOptions, useMutation };
