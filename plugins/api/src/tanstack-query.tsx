import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
	MutationCache,
	QueryClient,
	type QueryClientConfig,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
	composeAbility,
	fetchOrgRules,
	ORG_RULES_QUERY_KEY,
	type PackedRulesLike,
} from "./ability-client";
import { handleMutationSuccess } from "./query-invalidation";
import type { RouterClient } from "./types";

export {
	QueryClient,
	QueryClientProvider,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
export type { PackedRulesLike } from "./ability-client";
export { ORG_RULES_QUERY_KEY } from "./ability-client";
export type { RouterClient } from "./types";

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

// WS3.3 (docs/prd/backend-hardening.md): auto-invalidate on every mutation
// success unless the caller supplied its own `mutationCache` (they own
// invalidation then) or the mutation opted out via
// `meta: { skipAutoInvalidation: true }` (the pattern
// `plugin-solid-ui`'s `useMutation` stamps for mutations with custom cache
// updaters).
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

// Wrap a typed oRPC client with TanStack Query helpers (`.queryOptions`,
// `.mutationOptions`, `.infiniteOptions`). The native analog of `createClient`
// from `@fcalell/plugin-api/client` — same router-typed surface, query-shaped.
export function createApiQueryUtils<TRouter>(client: RouterClient<TRouter>) {
	return createTanstackQueryUtils(client);
}

export interface QueryProviderProps {
	client?: QueryClient;
	children: ReactNode;
}

// The provider `plugin-native-ui` wraps the app root with (contributed to
// `plugin-expo.slots.providers`). Lazily builds a stable default client when
// none is supplied so a bare consumer gets sane behaviour with zero config.
export function QueryProvider(props: QueryProviderProps) {
	const [client] = useState(() => props.client ?? createQueryClient());
	return (
		<QueryClientProvider client={client}>{props.children}</QueryClientProvider>
	);
}

// WS6.3 (docs/prd/backend-hardening.md): org-level authority everywhere,
// layered with a `PackedRules` field off any query the caller already has
// (`useAbility(query.data.rules)`). Deny-all while the org rules query is
// loading or errored -- `query.data` is `undefined` then, and
// `composeAbility` treats "no org rules and no record rules" as deny-all;
// a record layer passed in that window still answers its own checks, since
// it's real data the caller already has, not something still loading.
//
// The org rules query is per-session (`staleTime: Infinity`): an active-org
// switch or a role change requires invalidating `ORG_RULES_QUERY_KEY`
// explicitly, unless the change was itself a mutation that declared
// `writes` on an org subject (auto-invalidated for free, see
// `./ability-client.ts`'s `ORG_RULES_QUERY_KEY` comment).
//
// The composed `MongoAbility` is a class instance and must never be read out
// of the query cache directly (it isn't -- `useQuery` here only ever caches
// the plain packed-rules array; composition happens on every call, memoized
// by array identity in `composeAbility`).
export function useAbility(recordRules?: PackedRulesLike) {
	const query = useQuery({
		queryKey: ORG_RULES_QUERY_KEY,
		queryFn: fetchOrgRules,
		staleTime: Infinity,
	});
	return composeAbility(query.data, recordRules);
}
