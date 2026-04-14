import {
	useInfiniteQuery as _useInfiniteQuery,
	useQuery as _useQuery,
	type CreateMutationResult,
	type QueryKey,
	useMutation,
	useQueryClient,
} from "@tanstack/solid-query";

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
export { useMutation, useQueryClient };

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

type MutationSource = {
	mutationKey?: QueryKey;
	// biome-ignore lint/suspicious/noExplicitAny: oRPC mutation functions have varying signatures
	mutationFn?: (...args: any[]) => Promise<any>;
};

type QueryUpdate<TVars, TData> = {
	queryKey: () => QueryKey;
	// biome-ignore lint/suspicious/noExplicitAny: query data is heterogeneous across callers
	updater?: (old: any[], vars: TVars) => any[];
	// biome-ignore lint/suspicious/noExplicitAny: query data is heterogeneous across callers
	onSuccessUpdater?: (old: any[], data: TData, vars: TVars) => any[];
};

type OptimisticMutationOptions<TVars, TData> = {
	mutation: () => MutationSource;
	updates: QueryUpdate<TVars, TData>[];
	onSuccess?: (data: TData, vars: TVars) => void;
	onError?: (error: unknown, vars: TVars) => boolean | undefined;
	errorMessage?: string;
	errorHandler?: (message: string) => void;
};

function useOptimisticMutation<TVars, TData>(
	options: () => OptimisticMutationOptions<TVars, TData>,
): CreateMutationResult<TData, unknown, TVars> {
	const queryClient = useQueryClient();

	return useMutation(() => {
		const opts = options();
		const { mutationKey, mutationFn } = opts.mutation();
		const hasOptimistic = opts.updates.some((u) => u.updater);
		const hasCacheUpdates =
			hasOptimistic || opts.updates.some((u) => u.onSuccessUpdater);

		return {
			mutationKey,
			mutationFn,
			meta: hasCacheUpdates ? { skipAutoInvalidation: true } : undefined,
			onMutate: hasOptimistic
				? async (variables: TVars) => {
						const snapshots = new Map<string, unknown>();

						await Promise.all(
							opts.updates
								.filter((u) => u.updater)
								.map((u) =>
									queryClient.cancelQueries({ queryKey: u.queryKey() }),
								),
						);

						for (const update of opts.updates) {
							if (!update.updater) continue;
							const key = update.queryKey();
							const keyStr = JSON.stringify(key);
							snapshots.set(keyStr, queryClient.getQueryData(key));
							// biome-ignore lint/suspicious/noExplicitAny: query cache stores untyped data
							queryClient.setQueryData(key, (old: any[] | undefined) =>
								update.updater?.(old ?? [], variables),
							);
						}

						return { snapshots };
					}
				: undefined,
			onSuccess: (
				data: TData,
				variables: TVars,
				_context: { snapshots: Map<string, unknown> } | undefined,
			) => {
				for (const update of opts.updates) {
					if (!update.onSuccessUpdater) continue;
					const key = update.queryKey();
					// biome-ignore lint/suspicious/noExplicitAny: query cache stores untyped data
					queryClient.setQueryData(key, (old: any[] | undefined) =>
						update.onSuccessUpdater?.(old ?? [], data, variables),
					);
				}
				opts.onSuccess?.(data, variables);
			},
			onError: (
				error: unknown,
				variables: TVars,
				context: { snapshots: Map<string, unknown> } | undefined,
			) => {
				if (context?.snapshots) {
					for (const update of opts.updates) {
						if (!update.updater) continue;
						const key = update.queryKey();
						const keyStr = JSON.stringify(key);
						const snapshot = context.snapshots.get(keyStr);
						if (snapshot !== undefined) {
							queryClient.setQueryData(key, snapshot);
						}
					}
				}
				const suppressed = opts.onError?.(error, variables);
				if (!suppressed) {
					const message = opts.errorMessage ?? "Operation failed.";
					if (opts.errorHandler) {
						opts.errorHandler(message);
					} else {
						console.error(message);
					}
				}
			},
		};
	});
}

export type {
	MutationSource,
	OptimisticMutationOptions,
	QueryLike,
	QueryUpdate,
};
export { combineQueries, useOptimisticMutation };
