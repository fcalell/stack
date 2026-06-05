import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
	QueryClient,
	type QueryClientConfig,
	QueryClientProvider,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
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

export function createQueryClient(config?: QueryClientConfig): QueryClient {
	return new QueryClient(config ?? NATIVE_DEFAULTS);
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
