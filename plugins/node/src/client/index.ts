import type { z } from "zod";
import type { ChannelDef, ClientFrame, MessageSchemas } from "../ws/index.ts";
import { serverFrameSchema } from "../ws/index.ts";

export type WsStatus = "connecting" | "open" | "closed";

export interface SubscriptionHandlers<S extends MessageSchemas> {
	onMessage: {
		[K in keyof S]?: (payload: z.output<S[K]>) => void;
	};
	onStatus?(status: WsStatus): void;
}

export interface Subscription<C extends MessageSchemas> {
	send<K extends keyof C & string>(type: K, payload: z.input<C[K]>): void;
	unsubscribe(): void;
}

export interface WsClient {
	subscribe<S extends MessageSchemas, C extends MessageSchemas>(
		def: ChannelDef<S, C>,
		handlers: SubscriptionHandlers<S>,
	): Subscription<C>;
	close(): void;
}

interface LiveSubscription {
	def: ChannelDef;
	handlers: SubscriptionHandlers<MessageSchemas>;
}

const BACKOFF_BASE_MS = 250;
const BACKOFF_CAP_MS = 5000;

// One shared socket per client, auto-reconnecting with capped exponential
// backoff. On every (re)open the client re-sends `sub` for each live
// subscription, so a server that snapshots on subscribe gives reconnect
// consistency for free. Uses the global WebSocket (browser; Node >= 22 has
// it natively, so the same client runs in tests).
function defaultUrl(): string {
	// Via globalThis so the module type-checks and loads outside the DOM;
	// only the no-url default actually requires a browser.
	const loc = (globalThis as { location?: { protocol: string; host: string } })
		.location;
	if (!loc) {
		throw new Error("ws client: no url given and no browser location");
	}
	return `${loc.protocol === "https:" ? "wss" : "ws"}://${loc.host}/ws`;
}

export function createWsClient(options: { url?: string } = {}): WsClient {
	const url = options.url ?? defaultUrl();

	const subscriptions = new Set<LiveSubscription>();
	let socket: WebSocket | null = null;
	let closed = false;
	let attempt = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	function notify(status: WsStatus): void {
		for (const sub of subscriptions) {
			sub.handlers.onStatus?.(status);
		}
	}

	function sendFrame(frame: ClientFrame): void {
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			throw new Error("ws client: socket is not open");
		}
		socket.send(JSON.stringify(frame));
	}

	function dispatch(raw: unknown): void {
		if (typeof raw !== "string") return;
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			console.error("ws client: dropped non-JSON frame");
			return;
		}
		const frame = serverFrameSchema.safeParse(parsed);
		if (!frame.success) {
			console.error("ws client: dropped malformed frame");
			return;
		}
		for (const sub of subscriptions) {
			if (sub.def.name !== frame.data.ch) continue;
			const schema = sub.def.server[frame.data.type];
			const handler = sub.handlers.onMessage[frame.data.type];
			if (!schema || !handler) return;
			const payload = schema.safeParse(frame.data.payload);
			if (!payload.success) {
				console.error(
					`ws client: dropped invalid "${frame.data.type}" payload on ${frame.data.ch}`,
				);
				return;
			}
			handler(payload.data);
			return;
		}
	}

	function connect(): void {
		if (closed) return;
		notify("connecting");
		const ws = new WebSocket(url);
		socket = ws;
		ws.addEventListener("open", () => {
			attempt = 0;
			for (const sub of subscriptions) {
				ws.send(JSON.stringify({ t: "sub", ch: sub.def.name }));
			}
			notify("open");
		});
		ws.addEventListener("message", (event) => dispatch(event.data));
		ws.addEventListener("close", () => {
			if (socket !== ws) return;
			socket = null;
			notify("closed");
			scheduleReconnect();
		});
	}

	function scheduleReconnect(): void {
		if (closed || reconnectTimer) return;
		const delay = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_CAP_MS);
		attempt += 1;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, delay);
	}

	connect();

	return {
		subscribe(def, handlers) {
			const live: LiveSubscription = {
				def: def as ChannelDef,
				handlers: handlers as SubscriptionHandlers<MessageSchemas>,
			};
			subscriptions.add(live);
			if (socket && socket.readyState === WebSocket.OPEN) {
				sendFrame({ t: "sub", ch: def.name });
				handlers.onStatus?.("open");
			} else {
				handlers.onStatus?.(closed ? "closed" : "connecting");
			}
			return {
				send(type, payload) {
					const schema = def.client[type];
					if (!schema) {
						throw new Error(
							`ws client: unknown client message type "${String(type)}" on ${def.name}`,
						);
					}
					sendFrame({
						t: "msg",
						ch: def.name,
						type,
						payload: schema.parse(payload),
					});
				},
				unsubscribe() {
					subscriptions.delete(live);
					if (socket && socket.readyState === WebSocket.OPEN) {
						sendFrame({ t: "unsub", ch: def.name });
					}
				},
			};
		},
		close() {
			closed = true;
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			socket?.close();
			socket = null;
		},
	};
}
