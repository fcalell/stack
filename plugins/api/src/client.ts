import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { getRegisteredApiClient, registerApiClient } from "./ability-client";
import { captureEntityHeaders } from "./query-invalidation";
import type { RouterClient } from "./types";

export type { RouterClient } from "./types";

export interface ClientConfig {
	url?: string;
	fetch?: typeof globalThis.fetch;
	credentials?: RequestCredentials;
	headers?: Record<string, string> | (() => Record<string, string>);
}

// Derives the procedure pathKey ("todos/list") from a request URL by
// stripping the configured base's pathname. `base` is either relative
// ("/rpc") or absolute ("https://host/rpc"); both cases resolve through
// `URL` against a dummy origin so the pathname strip is identical either way.
function pathKeyFromRequestUrl(requestUrl: string, base: string): string {
	const basePath = new URL(base, "http://stack.invalid").pathname;
	const path = new URL(requestUrl, "http://stack.invalid").pathname;
	const trimmedBase = basePath.replace(/^\/|\/$/g, "");
	const trimmedPath = path.replace(/^\/|\/$/g, "");
	return trimmedPath.startsWith(trimmedBase)
		? trimmedPath.slice(trimmedBase.length).replace(/^\/+/, "")
		: trimmedPath;
}

// oRPC's RPCLink resolves every request URL via `new URL(baseUrl)` with no
// `base` argument, so a relative default like "/rpc" throws "Invalid URL" on
// the first real call. Resolve against `location.origin` when present (any
// browser); native/SSR/test callers keep passing an absolute `url` (as the
// README's Expo example already does), so this is a no-op for them.
function resolveClientUrl(url: string): string {
	if (/^[a-z][a-z\d+\-.]*:\/\//i.test(url)) return url;
	if (typeof location === "undefined") return url;
	return new URL(url, location.origin).toString();
}

export function createClient<TRouter>(
	config?: ClientConfig,
): RouterClient<TRouter> {
	const url = resolveClientUrl(config?.url ?? "/rpc");
	const baseFetch = config?.fetch ?? globalThis.fetch;

	const link = new RPCLink({
		url,
		headers: config?.headers,
		fetch: async (request, init) => {
			const response = await baseFetch(request, {
				...init,
				credentials: config?.credentials ?? "include",
			});
			// WS3.3 (docs/prd/backend-hardening.md): capture the entity headers
			// for cache invalidation. Never let a capture failure break the
			// response passed back to the RPC link.
			try {
				captureEntityHeaders(
					pathKeyFromRequestUrl(request.url, url),
					response.headers,
				);
			} catch {
				// Capture is best-effort; the response must pass through untouched.
			}
			return response;
		},
	});

	const client = createORPCClient<RouterClient<TRouter>>(link);

	// WS6.3 (docs/prd/backend-hardening.md): the first client any consumer
	// creates becomes `useAbility()`'s default target, zero config. A later
	// `createClient` call never overwrites it; an explicit `registerApiClient`
	// always does (see ./ability-client.ts).
	if (getRegisteredApiClient() === undefined) {
		registerApiClient(client);
	}

	return client;
}
