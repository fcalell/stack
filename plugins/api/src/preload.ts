import type { QueryClient } from "@tanstack/react-query";
import { hashKey, skipToken } from "@tanstack/react-query";
import { readsOf, type Selection } from "./read.ts";

// Warms the cache for a route before its components mount. The router never
// sees the query client (the provider builds it inside React), so
// `QueryProvider` binds the one it holds as it renders and `preload` reaches
// the cache through that: one cache per app, the last provider rendered wins.
let bound: QueryClient | undefined;

export function bindClient(client: QueryClient): void {
	bound = client;
}

export function boundClient(): QueryClient | undefined {
	return bound;
}

// Starts each distinct read of the selections and never waits for it: a route's
// `loader` returns at once, so navigation is never held. TanStack's own
// `staleTime` makes a fresh read a no-op, and a failed prefetch is swallowed
// (the leaf that mounts later retries and draws the failure). A stream never
// settles with no observer to abort it, and an idle read has no function to
// run, so neither is started.
export function preload(...selections: readonly Selection<unknown>[]): void {
	const client = bound;
	if (!client) return;
	const seen = new Set<string>();
	for (const r of selections.flatMap(readsOf)) {
		const key = hashKey(r.options.queryKey);
		if (seen.has(key)) continue;
		seen.add(key);
		if (
			r.kind === "stream" ||
			r.options.queryFn === skipToken ||
			r.options.enabled === false
		) {
			continue;
		}
		// biome-ignore lint/suspicious/noExplicitAny: a read's options are one type for every output (variance)
		const options = r.options as any;
		void (r.kind === "pages"
			? client.prefetchInfiniteQuery(options)
			: client.prefetchQuery(options));
	}
}
