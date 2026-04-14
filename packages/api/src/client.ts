import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "#types";

export interface ClientConfig {
	url?: string;
	fetch?: typeof globalThis.fetch;
	credentials?: RequestCredentials;
	headers?: Record<string, string> | (() => Record<string, string>);
}

export function createClient<TRouter>(
	config?: ClientConfig,
): RouterClient<TRouter> {
	const link = new RPCLink({
		url: config?.url ?? "/rpc",
		headers: config?.headers,
		fetch: (input, init) =>
			(config?.fetch ?? globalThis.fetch)(input, {
				...init,
				credentials: config?.credentials ?? "include",
			}),
	});

	return createORPCClient<RouterClient<TRouter>>(link);
}
