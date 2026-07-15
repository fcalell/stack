import type { z } from "zod";
import type { ChannelDef, MessageSchemas, ServerFrame } from "../ws/index";
import { clientFrameSchema } from "../ws/index";
import type { ServiceLogger } from "./service";

// The slice of a live socket the hub needs. Structurally satisfied by
// @hono/node-server's WSContext; the object's identity keys subscriptions.
export interface HubSocket {
	send(data: string): void;
	readyState: number;
}

const OPEN = 1;

export interface ChannelConnection<S extends MessageSchemas> {
	send<K extends keyof S & string>(type: K, payload: z.input<S[K]>): void;
}

export interface ChannelHandlers<
	S extends MessageSchemas,
	C extends MessageSchemas,
> {
	// Runs per subscribing connection — the snapshot-on-subscribe hook.
	onSubscribe?(conn: ChannelConnection<S>): void | Promise<void>;
	onMessage?: {
		[K in keyof C]?: (
			payload: z.output<C[K]>,
			conn: ChannelConnection<S>,
		) => void | Promise<void>;
	};
}

export interface ChannelHandle<S extends MessageSchemas> {
	broadcast<K extends keyof S & string>(type: K, payload: z.input<S[K]>): void;
}

export interface WsHub {
	channel<S extends MessageSchemas, C extends MessageSchemas>(
		def: ChannelDef<S, C>,
		handlers?: ChannelHandlers<S, C>,
	): ChannelHandle<S>;
}

// The per-connection event handlers create-node-server hands to
// upgradeWebSocket. Own minimal shape so this module never imports hono.
export interface HubConnectionHandlers {
	onMessage(event: { data: unknown }, ws: HubSocket): void;
	onClose(event: unknown, ws: HubSocket): void;
	onError(event: unknown, ws: HubSocket): void;
}

interface RegisteredChannel {
	def: ChannelDef;
	handlers: ChannelHandlers<MessageSchemas, MessageSchemas>;
	sockets: Set<HubSocket>;
}

export interface WsHubInternal {
	hub: WsHub;
	connectionHandlers(): HubConnectionHandlers;
}

export function createWsHub(log: ServiceLogger): WsHubInternal {
	const channels = new Map<string, RegisteredChannel>();

	function frameFor(ch: string, type: string, payload: unknown): string {
		const frame: ServerFrame = { t: "msg", ch, type, payload };
		return JSON.stringify(frame);
	}

	function connectionFor(
		registered: RegisteredChannel,
		socket: HubSocket,
	): ChannelConnection<MessageSchemas> {
		return {
			send(type, payload) {
				const schema = registered.def.server[type];
				if (!schema) {
					throw new Error(
						`ws channel ${registered.def.name}: unknown server message type "${String(type)}"`,
					);
				}
				socket.send(frameFor(registered.def.name, type, schema.parse(payload)));
			},
		};
	}

	const hub: WsHub = {
		channel(def, handlers = {}) {
			if (channels.has(def.name)) {
				throw new Error(`ws channel ${def.name}: already registered`);
			}
			const registered: RegisteredChannel = {
				def: def as ChannelDef,
				handlers: handlers as ChannelHandlers<MessageSchemas, MessageSchemas>,
				sockets: new Set(),
			};
			channels.set(def.name, registered);
			return {
				broadcast(type, payload) {
					const schema = def.server[type];
					if (!schema) {
						throw new Error(
							`ws channel ${def.name}: unknown server message type "${String(type)}"`,
						);
					}
					const frame = frameFor(def.name, type, schema.parse(payload));
					for (const socket of registered.sockets) {
						if (socket.readyState === OPEN) socket.send(frame);
					}
				},
			};
		},
	};

	function dropSocket(socket: HubSocket): void {
		for (const registered of channels.values()) {
			registered.sockets.delete(socket);
		}
	}

	async function handleFrame(raw: unknown, socket: HubSocket): Promise<void> {
		if (typeof raw !== "string") return;
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			log.error("ws: dropped non-JSON frame");
			return;
		}
		const frame = clientFrameSchema.safeParse(parsed);
		if (!frame.success) {
			log.error("ws: dropped malformed frame");
			return;
		}
		const registered = channels.get(frame.data.ch);
		if (!registered) {
			log.error(`ws: dropped frame for unknown channel "${frame.data.ch}"`);
			return;
		}
		if (frame.data.t === "sub") {
			registered.sockets.add(socket);
			await registered.handlers.onSubscribe?.(
				connectionFor(registered, socket),
			);
			return;
		}
		if (frame.data.t === "unsub") {
			registered.sockets.delete(socket);
			return;
		}
		const handler = registered.handlers.onMessage?.[frame.data.type];
		const schema = registered.def.client[frame.data.type];
		if (!handler || !schema) {
			log.error(
				`ws channel ${frame.data.ch}: dropped unknown client message type "${frame.data.type}"`,
			);
			return;
		}
		const payload = schema.safeParse(frame.data.payload);
		if (!payload.success) {
			log.error(
				`ws channel ${frame.data.ch}: dropped invalid "${frame.data.type}" payload`,
			);
			return;
		}
		await handler(payload.data, connectionFor(registered, socket));
	}

	return {
		hub,
		connectionHandlers: () => ({
			onMessage(event, ws) {
				void handleFrame(event.data, ws).catch((error) => {
					log.error(`ws: handler failed: ${String(error)}`);
				});
			},
			onClose(_event, ws) {
				dropSocket(ws);
			},
			onError(_event, ws) {
				dropSocket(ws);
			},
		}),
	};
}
