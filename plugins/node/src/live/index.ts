import { type Read, read } from "@fcalell/plugin-api/read";
import type { QueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import type { WsClient } from "../client/index.ts";
import type { ChannelDef, MessageSchemas } from "../ws/index.ts";

// A channel as a read: its frames fold into one value, written to the query
// cache as they arrive, so a frame holds it like any other read (`states.md`
// §8). The queryFn stays in flight for the subscription's life: that is what
// ties the subscription to the observers, ending it when the last one leaves.

// How long the socket may stay down before the read is paused: long enough
// that a load's connecting and a blink of the network say nothing.
export const PAUSE_AFTER = 2000;

// One handler per message type; a type without one is ignored. The first
// value a handler returns is the read's first data (the snapshot). A handler
// that throws fails the read: an error with data is stale. `client` lets a
// frame write another read's key.
export type Fold<S extends MessageSchemas, T> = {
	[K in keyof S]?: (
		value: T | undefined,
		payload: z.output<S[K]>,
		ctx: { client: QueryClient },
	) => T | undefined;
};

export function channelRead<
	S extends MessageSchemas,
	C extends MessageSchemas,
	T,
>(ws: WsClient, def: ChannelDef<S, C>, fold: Fold<S, T>): Read<T> {
	const queryKey = ["ws", def.name];
	return read<T>(
		{
			queryKey,
			queryFn: ({ client, signal }) =>
				new Promise<T>((settle, fail) => {
					// The query is found, not held: `setState` is TanStack's own way
					// to move a fetch (its `streamedQuery` resets one the same way).
					const query = () =>
						client.getQueryCache().find({ queryKey, exact: true });
					let timer: ReturnType<typeof setTimeout> | undefined;
					const onMessage: Record<string, (payload: never) => void> = {};
					for (const [type, handler] of Object.entries(
						fold as Record<string, NonNullable<Fold<S, T>[string]>>,
					)) {
						onMessage[type] = (payload) => {
							try {
								const next = handler(
									client.getQueryData<T>(queryKey),
									payload,
									{ client },
								);
								// A write undefined is a no-op. It writes data while the fetch
								// stays open, so the first one makes the read ready.
								client.setQueryData(queryKey, next);
							} catch (error) {
								end();
								fail(error);
							}
						};
					}

					// A retry on a socket in its backoff tries it now.
					ws.reconnect();
					const sub = ws.subscribe(def, {
						onMessage: onMessage as never,
						onStatus(status) {
							if (status === "open") {
								clearTimeout(timer);
								timer = undefined;
								if (query()?.state.fetchStatus === "paused") {
									query()?.setState({ fetchStatus: "fetching" });
								}
								return;
							}
							timer ??= setTimeout(
								() => query()?.setState({ fetchStatus: "paused" }),
								PAUSE_AFTER,
							);
						},
					});
					function end(): void {
						clearTimeout(timer);
						signal.removeEventListener("abort", onAbort);
						sub.unsubscribe();
					}
					function onAbort(): void {
						end();
						// TanStack has cancelled the fetch and ignores what settles it.
						settle(client.getQueryData<T>(queryKey) as T);
					}
					signal.addEventListener("abort", onAbort);
				}),
			staleTime: Number.POSITIVE_INFINITY,
			retry: false,
		},
		{ kind: "stream" },
	);
}
