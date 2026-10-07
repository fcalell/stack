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
	useQuery,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export type { PackedRulesLike } from "@fcalell/plugin-api/ability-client";
export {
	ORG_RULES_QUERY_KEY,
	orgRulesQueryKey,
} from "@fcalell/plugin-api/ability-client";
export type { RouterClient } from "@fcalell/plugin-api/types";
export {
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

// Wrap a typed oRPC client with TanStack Query helpers (`.queryOptions`,
// `.mutationOptions`, `.infiniteOptions`). The native analog of `createClient`
// from `@fcalell/plugin-api/client` — same router-typed surface, query-shaped.
// The client sends a query these utils make as GET: it learns the operation
// context's symbol here, from the copy of `@orpc/tanstack-query` the utils are.
export function createApiQueryUtils<TRouter>(client: RouterClient<TRouter>) {
	registerOperationContext(OPERATION_CONTEXT_SYMBOL);
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
