// Siblings by package name, never relative: this file ships as source for the
// bundler while `./client` ships compiled from dist, so a relative import would
// load a second copy of the registered client and the entity registry.
import type { MongoAbility } from "@casl/ability";
import {
	composeAbility,
	orgRules,
	type PackedRulesLike,
} from "@fcalell/plugin-api/ability-client";
import {
	drew,
	heldAct,
	holdSave,
	isThenable,
	pausedStore,
	type RunState,
	startRun,
	watchActs,
} from "@fcalell/plugin-api/acts";
import { registerOperationContext } from "@fcalell/plugin-api/client";
import { bindClient } from "@fcalell/plugin-api/preload";
import {
	type EntityName,
	handleMutationSuccess,
} from "@fcalell/plugin-api/query-invalidation";
import {
	type Datum,
	type Drawn,
	draftFor,
	type Held,
	type Holds,
	holdReads,
	type Draft as Kept,
	NO_HOLDS,
	paintReads,
	placeholderData,
	planFrame,
	planSelections,
	type Read,
	readKey,
	readsOf,
	retryOnce,
	type Selection,
	watchUnheld,
	withRead,
} from "@fcalell/plugin-api/read";
import {
	listenQueries,
	type QueryListeners,
	type Settle,
	settleReads,
} from "@fcalell/plugin-api/settle-reads";
import type { RouterClient } from "@fcalell/plugin-api/types";
import {
	createTanstackQueryUtils,
	OPERATION_CONTEXT_SYMBOL,
} from "@orpc/tanstack-query";
import {
	hashKey,
	MutationCache,
	QueryClient,
	type QueryClientConfig,
	QueryClientProvider,
	type SkipToken,
	type UseInfiniteQueryOptions,
	useInfiniteQuery,
	useQueries,
	useQueryClient,
} from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	use,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";

export type { PackedRulesLike } from "@fcalell/plugin-api/ability-client";
export {
	ability,
	ORG_RULES_QUERY_KEY,
	orgRulesQueryKey,
} from "@fcalell/plugin-api/ability-client";
export {
	drew,
	heldAct,
	isThenable,
	refusal,
} from "@fcalell/plugin-api/acts";
export { preload } from "@fcalell/plugin-api/preload";
export type {
	Datum,
	Drawn,
	Held,
	Holds,
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
export type { QueryListeners } from "@fcalell/plugin-api/settle-reads";
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

// Mobile-friendly defaults: a single retry of a failure that may pass (flaky
// cellular shouldn't hammer the worker) and a short freshness window so navigating between screens doesn't
// refetch on every mount.
const NATIVE_DEFAULTS: QueryClientConfig = {
	defaultOptions: {
		queries: {
			retry: retryOnce,
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
	// How the online and focus managers learn their state, where the platform
	// has no window events (the phone). The web passes nothing.
	listen?: QueryListeners;
	children: ReactNode;
}

// The provider `plugin-native-ui` wraps the app root with (contributed to
// `plugin-expo.slots.providers`). Lazily builds a stable default client when
// none is supplied so a bare consumer gets sane behaviour with zero config.
export function QueryProvider(props: QueryProviderProps) {
	const [client] = useState(() => props.client ?? createQueryClient());
	// In render, so it holds before the router's first load; assigning twice is
	// harmless.
	bindClient(client);
	const { settle, listen } = props;
	useEffect(
		() => (settle ? settleReads(client, settle) : undefined),
		[client, settle],
	);
	useEffect(() => (listen ? listenQueries(listen) : undefined), [listen]);
	useEffect(() => watchUnheld(client.getQueryCache()), [client]);
	useEffect(() => watchActs(client.getMutationCache()), [client]);
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

// The query hashes the frames above hold and the surface they stand on,
// identity only: a nested frame holds the reads of its selection that are not
// in it. A frame that holds nothing and starts no surface passes its parent's
// holds on, so the value changes only when a frame holds.
const HoldsContext = createContext<Holds>(NO_HOLDS);

export function FrameHolds(props: { holds: Holds; children?: ReactNode }) {
	return <HoldsContext value={props.holds}>{props.children}</HoldsContext>;
}

// A frame's one subscription: the same observer a leaf makes (placeholder on),
// with `derive` run in `combine`, so the frame renders when its derived state
// changes (form, count, busy) and never on a value change. Pass a `derive` that
// is stable (a module function): its identity is the combine's. The frame holds
// the reads of its selection that no enclosing frame holds (the dev registry
// counts them) and returns `holds`, those hashes with the enclosing ones, for
// its body to publish through `FrameHolds`; `holding` says it holds any. `retry`
// refetches the reads it holds. `surface` says the frame starts one (a Pane, a
// Sheet): its holds stand on a new identity, stable for its life, and two
// frames on one surface may not hold the same read.
export function useFrameRead<S>(
	selection: Selection<unknown> | undefined,
	derive: (held: Held) => S,
	surface?: boolean,
): {
	state: S;
	retry: () => Promise<unknown>;
	holding: boolean;
	holds: Holds;
} {
	const client = useQueryClient();
	const enclosing = use(HoldsContext);
	const enclosingKeys = enclosing.keys;
	const plan = useMemo(
		() =>
			planFrame(
				selection,
				derive,
				(r) => ({
					fetchMore:
						client.getQueryCache().find({ queryKey: r.options.queryKey })?.state
							.fetchMeta?.fetchMore?.direction === "forward",
				}),
				enclosingKeys,
			),
		[selection, derive, client, enclosingKeys],
	);
	const [own] = useState(() => ({}));
	const holds = useMemo<Holds>(
		() =>
			plan.held.length === 0 && !surface
				? enclosing
				: {
						keys: new Set([
							...enclosing.keys,
							...plan.held.map((r) => hashKey(r.options.queryKey)),
						]),
						surface: surface ? own : enclosing.surface,
					},
		[plan, enclosing, surface, own],
	);
	useEffect(() => holdReads(holds.surface, plan.held), [plan, holds.surface]);
	const state = useQueries({
		queries: plan.reads.map((r) => ({ ...r.options, placeholderData })),
		combine: plan.combine,
	});
	// The refetch itself, so a Retry draws its own pending until it settles.
	const retry = () =>
		Promise.all(
			plan.held.map((r) =>
				client.refetchQueries({ queryKey: r.options.queryKey, exact: true }),
			),
		);
	return { state, retry, holding: plan.held.length > 0, holds };
}

export interface More {
	// Another page remains.
	next: boolean;
	fetching: boolean;
	failed: boolean;
	fetch: () => Promise<unknown>;
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
		fetch: () => query.fetchNextPage(),
	};
}

export interface Draft<T> {
	painted: boolean;
	value: T;
	// A plain edit is kept over a selection until its read's key changes. A
	// `save` that returns a promise holds `next` (a constant's too) instead, and
	// the latest save's outcome decides: resolved, the hold waits for the
	// refetch its invalidation started on this value's reads, then the value
	// follows its datum unless edited since; rejected, it falls back to the
	// datum and `failed` hears the error with a way to save the same value again.
	// It returns that save's promise (never rejecting: the rejection is `failed`'s
	// to draw), so an act that saves again holds the run.
	change: (next: T, save?: () => unknown) => Promise<void> | undefined;
}

// A field's value: its selection until the viewer edits it, the edit after. An
// edit belongs to the read it was made over, so a selection over another read
// drops it (`draftFor`). A constant is the app's own state: it passes through,
// so a value the app changes shows, and a plain edit has nothing to keep.
export function useDraft<T>(
	value: Datum<T>,
	failed?: (error: unknown, again: () => unknown) => void,
): Draft<T> {
	const client = useQueryClient();
	const [drawn] = useSelections([value] as const);
	const key = readKey(value);
	const [kept, setKept] = useState<Kept<T> | null>(null);
	const [held, setHeld] = useState<Kept<T> | null>(null);
	const latest = useRef(0);
	const liveKept = draftFor(kept, key);
	const liveHeld = draftFor(held, key);
	if (kept && !liveKept) setKept(null);
	if (held && !liveHeld) setHeld(null);
	const live = liveHeld ?? liveKept;
	const change = (next: T, save?: () => unknown): Promise<void> | undefined => {
		const seq = ++latest.current;
		const saving = save && heldAct(save);
		if (!isThenable(saving)) {
			setHeld(null);
			if (key !== undefined) setKept({ key, value: next });
			return undefined;
		}
		setKept(null);
		setHeld({ key, value: next });
		holdSave(saving, readsOf(value), client.getQueryCache(), {
			latest: () => seq === latest.current,
			release: () => setHeld(null),
			rollback: (error) => {
				setHeld(null);
				if (!failed) return;
				drew(error);
				failed(error, () => change(next, save));
			},
		});
		return Promise.resolve(saving).then(
			() => undefined,
			() => undefined,
		);
	};
	return {
		painted: !live && drawn.painted,
		value: live ? live.value : (drawn.value as T),
		change,
	};
}

export interface Run<K> {
	pending: K | undefined;
	// Pending while the client is offline: the mutation waits for the connection.
	paused: boolean;
	// The newest run's rejection, until the next run.
	failure: { key: K; error: unknown } | undefined;
	run: (key: K, onAct: () => unknown) => void;
}

// A host's hold on its acts' runs (`./acts.ts`): `key` names which act runs,
// for a host with several. The newest run wins.
export function useRun<K = true>(): Run<K> {
	const [state, setState] = useState<RunState<K>>({});
	const latest = useRef(0);
	const pending = state.pending !== undefined;
	const store = useMemo(() => pausedStore(pending), [pending]);
	const paused = useSyncExternalStore(
		store.subscribe,
		store.snapshot,
		store.snapshot,
	);
	return {
		pending: state.pending,
		paused,
		failure: state.failure,
		run: (key, onAct) => {
			const seq = ++latest.current;
			startRun(key, onAct, () => seq === latest.current, setState);
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

// Org-level authority everywhere, layered with a `PackedRules` field off any
// query the caller already has (`useAbility(orgId, query.data.rules)`).
// Deny-all while the org rules are loading or errored (`composeAbility` treats
// "no org rules and no record rules" as deny-all); a record layer passed in
// that window still answers its own checks, since it is real data the caller
// already has.
export function useAbility(
	organizationId: string | undefined,
	recordRules?: PackedRulesLike,
): MongoAbility {
	const rules = useRead(
		useMemo(() => orgRules(organizationId), [organizationId]),
	);
	return composeAbility(rules, recordRules);
}
