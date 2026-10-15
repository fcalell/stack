// Siblings by package name, never relative: this file ships as source for the
// bundler while `./client` ships compiled from dist, so a relative import would
// load a second copy of the registered client and the entity registry.
import {
	composeAbility,
	fetchOrgRules,
	orgRulesQueryKey,
	type PackedRulesLike,
} from "@fcalell/plugin-api/ability-client";
import { registerOperationContext } from "@fcalell/plugin-api/client";
import {
	type EntityName,
	handleMutationSuccess,
} from "@fcalell/plugin-api/query-invalidation";
import {
	type Datum,
	type Draft,
	type Drawn,
	draftFor,
	type Held,
	holdRoot,
	isRead,
	paintReads,
	placeholderData,
	planFrame,
	planSelections,
	type Read,
	readKey,
	type Selection,
	watchUnheld,
	withRead,
} from "@fcalell/plugin-api/read";
import { type Settle, settleReads } from "@fcalell/plugin-api/settle-reads";
import type { RouterClient } from "@fcalell/plugin-api/types";
import {
	createTanstackQueryUtils,
	OPERATION_CONTEXT_SYMBOL,
} from "@orpc/tanstack-query";
import {
	MutationCache,
	QueryClient,
	type QueryClientConfig,
	QueryClientProvider,
	type SkipToken,
	type UseInfiniteQueryOptions,
	useInfiniteQuery,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";

export type { PackedRulesLike } from "@fcalell/plugin-api/ability-client";
export {
	ORG_RULES_QUERY_KEY,
	orgRulesQueryKey,
} from "@fcalell/plugin-api/ability-client";
export type {
	Datum,
	Drawn,
	Held,
	Read,
	ReadHow,
	ReadKind,
	Selection,
} from "@fcalell/plugin-api/read";
export {
	combine,
	isPlaceholder,
	isRead,
	isSelection,
	moreOf,
	pagesOf,
	read,
} from "@fcalell/plugin-api/read";
export type { RouterClient } from "@fcalell/plugin-api/types";
export {
	experimental_streamedQuery as streamedQuery,
	QueryClient,
	QueryClientProvider,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";

// A query outside the API declares what it reads as `meta: { reads: [...] }`
// (see `query-invalidation.ts`); registering the shape types those names over
// the app's `EntityName`, on web and phone alike. Other meta keys stay open.
declare module "@tanstack/react-query" {
	interface Register {
		queryMeta: { reads?: readonly EntityName[] } & Record<string, unknown>;
	}
}

// Mobile-friendly defaults: a single retry (flaky cellular shouldn't hammer the
// worker) and a short freshness window so navigating between screens doesn't
// refetch on every mount.
const NATIVE_DEFAULTS: QueryClientConfig = {
	defaultOptions: {
		queries: {
			retry: 1,
			staleTime: 30_000,
		},
	},
};

// Auto-invalidate on every mutation success unless the caller supplied its
// own `mutationCache` (they own invalidation then) or the mutation opted out
// via `meta: { skipAutoInvalidation: true }`.
function createAutoInvalidationMutationCache(
	getQueryClient: () => QueryClient,
): MutationCache {
	return new MutationCache({
		onSuccess: (_data, _variables, _onMutateResult, mutation) => {
			if (mutation.meta?.skipAutoInvalidation) return;
			handleMutationSuccess(getQueryClient(), mutation.options.mutationKey);
		},
	});
}

export function createQueryClient(config?: QueryClientConfig): QueryClient {
	const queryClient: QueryClient = new QueryClient({
		...NATIVE_DEFAULTS,
		...config,
		defaultOptions: {
			...NATIVE_DEFAULTS.defaultOptions,
			...config?.defaultOptions,
			queries: {
				...NATIVE_DEFAULTS.defaultOptions?.queries,
				...config?.defaultOptions?.queries,
			},
		},
		mutationCache:
			config?.mutationCache ??
			createAutoInvalidationMutationCache(() => queryClient),
	});

	return queryClient;
}

// `.read(input)` on every procedure's utils, beside `.queryOptions`: the same
// input (`skipToken` included), the output typed, as a `Read` handle. A
// procedure whose output is stack's paginated envelope also gets `.pages(input)`
// (no `cursor`), a read of the flat list that pages in.
type Page<T> = { data: T[]; nextCursor: string | null };
type ReadsOf<C> = C extends (...a: infer A) => Promise<infer O>
	? {
			read(...a: { [K in keyof A]: A[K] | SkipToken }): Read<O>;
		} & (O extends Page<infer T>
			? { pages(input: Omit<A[0], "cursor"> | SkipToken): Read<T[]> }
			: unknown)
	: { [K in keyof C]: ReadsOf<C[K]> };

export type ApiQueryUtils<TRouter> = ReturnType<
	typeof createTanstackQueryUtils<RouterClient<TRouter>>
> &
	ReadsOf<RouterClient<TRouter>>;

// Wrap a typed oRPC client with TanStack Query helpers (`.queryOptions`,
// `.mutationOptions`, `.infiniteOptions`, and `.read`). The native analog of
// `createClient` from `@fcalell/plugin-api/client` — same router-typed surface,
// query-shaped. The client sends a query these utils make as GET: it learns the
// operation context's symbol here, from the copy of `@orpc/tanstack-query` the
// utils are.
export function createApiQueryUtils<TRouter>(
	client: RouterClient<TRouter>,
): ApiQueryUtils<TRouter> {
	registerOperationContext(OPERATION_CONTEXT_SYMBOL);
	return withRead(createTanstackQueryUtils(client));
}

export interface QueryProviderProps {
	client?: QueryClient;
	// How a read's first answer lands (`./settle-reads.ts`); a UI plugin passes it.
	settle?: Settle;
	children: ReactNode;
}

// The provider `plugin-native-ui` wraps the app root with (contributed to
// `plugin-expo.slots.providers`). Lazily builds a stable default client when
// none is supplied so a bare consumer gets sane behaviour with zero config.
export function QueryProvider(props: QueryProviderProps) {
	const [client] = useState(() => props.client ?? createQueryClient());
	const { settle } = props;
	useEffect(
		() => (settle ? settleReads(client, settle) : undefined),
		[client, settle],
	);
	useEffect(() => watchUnheld(client.getQueryCache()), [client]);
	return (
		<QueryClientProvider client={client}>{props.children}</QueryClientProvider>
	);
}

// A datum's value type: a selection's, or the constant itself. Distributive,
// so a `Datum<T>` prop gives `T`.
type Unwrap<D> = D extends Selection<infer T> ? T : D;

// The leaf's one subscription: each value that is a selection is read, the
// rest are constants. One `useQueries` for any count, so the hook count is
// fixed. A read still to land draws from the placeholder and says so (`painted`).
// The plan is memoized by `values`' identity, which keeps `combine` stable
// (`useQueries` re-runs it when its identity changes); the React Compiler gives
// a literal list that identity.
export function useSelections<const V extends readonly unknown[]>(
	values: V,
): {
	readonly [K in keyof V]: Drawn<Unwrap<V[K]>>;
} {
	const plan = useMemo(() => planSelections(values), [values]);
	useEffect(() => paintReads(plan.reads), [plan]);
	return useQueries({
		queries: plan.reads.map((r) => ({ ...r.options, placeholderData })),
		combine: plan.draw,
	}) as never;
}

// A frame's one subscription: the same observer a leaf makes (placeholder on),
// with `derive` run in `combine`, so the frame renders when its derived state
// changes (form, count, busy) and never on a value change. Pass a `derive` that
// is stable (a module function): its identity is the combine's. Given a read
// the frame holds its root, which the dev registry counts. `retry` refetches
// the frame's reads.
export function useFrameRead<S>(
	selection: Selection<unknown> | undefined,
	derive: (held: Held) => S,
): { state: S; retry: () => void } {
	const client = useQueryClient();
	const plan = useMemo(
		() =>
			planFrame(selection, derive, (r) => ({
				fetchMore:
					client.getQueryCache().find({ queryKey: r.options.queryKey })?.state
						.fetchMeta?.fetchMore?.direction === "forward",
			})),
		[selection, derive, client],
	);
	useEffect(
		() => (isRead(selection) ? holdRoot(selection) : undefined),
		[selection],
	);
	const state = useQueries({
		queries: plan.reads.map((r) => ({ ...r.options, placeholderData })),
		combine: plan.combine,
	});
	const retry = () => {
		for (const r of plan.reads) {
			void client.refetchQueries({ queryKey: r.options.queryKey, exact: true });
		}
	};
	return { state, retry };
}

export interface More {
	// Another page remains.
	next: boolean;
	fetching: boolean;
	failed: boolean;
	fetch: () => void;
}

// The collection's side of a pages read: an infinite observer that never
// fetches by mounting (`enabled: false`), so the query is the frame's and the
// leaf's, and a page is fetched only when the viewer asks.
export function useMore(read: Read<unknown>): More {
	const query = useInfiniteQuery({
		...(read.options as UseInfiniteQueryOptions),
		enabled: false,
	});
	return {
		next: query.hasNextPage,
		fetching: query.isFetchingNextPage,
		failed: query.isFetchNextPageError,
		fetch: () => {
			void query.fetchNextPage();
		},
	};
}

// A field's value: its selection until the viewer edits it, the edit after. An
// edit belongs to the read it was made over, so a selection over another read
// drops it (`draftFor`). A constant is the app's own state: it passes through,
// so a value the app changes shows, and `edit` has nothing to keep.
export function useDraft<T>(value: Datum<T>): {
	painted: boolean;
	value: T;
	edit: (next: T) => void;
} {
	const [drawn] = useSelections([value] as const);
	const key = readKey(value);
	const [draft, setDraft] = useState<Draft<T> | null>(null);
	const live = draftFor(draft, key);
	if (draft && !live) setDraft(null);
	return {
		painted: !live && drawn.painted,
		value: live ? live.value : (drawn.value as T),
		edit: (next) => {
			if (key !== undefined) setDraft({ key, value: next });
		},
	};
}

// The app's own subscription to a selection: real data, or `undefined` while
// the read waits, is idle or failed. The placeholder never reaches app code.
export function useRead<T>(selection: Selection<T>): T | undefined {
	const plan = useMemo(() => planSelections([selection]), [selection]);
	const combine = useMemo(
		() => (results: Parameters<typeof plan.draw>[0]) => {
			const [drawn] = plan.draw(results);
			return drawn?.painted ? undefined : (drawn?.value as T);
		},
		[plan],
	);
	return useQueries({
		queries: plan.reads.map((r) => r.options),
		combine,
	});
}

// WS6.3: org-level authority everywhere,
// layered with a `PackedRules` field off any query the caller already has
// (`useAbility(query.data.rules)`). Deny-all while the org rules query is
// loading or errored -- `query.data` is `undefined` then, and
// `composeAbility` treats "no org rules and no record rules" as deny-all;
// a record layer passed in that window still answers its own checks, since
// it's real data the caller already has, not something still loading.
//
// The rules are the caller's role in `organizationId`, cached per
// organization (`staleTime: Infinity`); a role change invalidates them when
// its mutation declares `writes` on an org subject (see
// `./ability-client.ts`'s `ORG_RULES_QUERY_KEY` comment). No organization
// yet: deny-all, with no request.
//
// The composed `MongoAbility` is a class instance and must never be read out
// of the query cache directly (it isn't -- `useQuery` here only ever caches
// the plain packed-rules array; composition happens on every call, memoized
// by array identity in `composeAbility`).
export function useAbility(
	organizationId: string | undefined,
	recordRules?: PackedRulesLike,
) {
	const query = useQuery({
		queryKey: orgRulesQueryKey(organizationId ?? ""),
		queryFn: () => fetchOrgRules(organizationId ?? ""),
		enabled: organizationId !== undefined,
		staleTime: Infinity,
	});
	return composeAbility(query.data, recordRules);
}
