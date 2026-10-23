import { z } from "zod";

// The isomorphic channel contract: the consumer defines one ChannelDef in a
// shared module and imports it from both server code (hub.channel) and
// browser code (client.subscribe). Types flow from the zod schemas; there is
// no codegen.
export type MessageSchemas = Record<string, z.ZodType>;

export interface ChannelDef<
	S extends MessageSchemas = MessageSchemas,
	C extends MessageSchemas = MessageSchemas,
> {
	name: string;
	// server -> client message schemas, keyed by message type.
	server: S;
	// client -> server message schemas. Declare `{}` for one-way channels;
	// the wire protocol is bidirectional either way.
	client: C;
}

export function defineChannel<
	S extends MessageSchemas,
	C extends MessageSchemas,
>(name: string, shape: { server: S; client: C }): ChannelDef<S, C> {
	return { name, ...shape };
}

// Wire protocol: JSON text frames.
//   client -> server: sub / unsub / msg
//   server -> client: msg
export const clientFrameSchema = z.union([
	z.object({ t: z.literal("sub"), ch: z.string() }),
	z.object({ t: z.literal("unsub"), ch: z.string() }),
	z.object({
		t: z.literal("msg"),
		ch: z.string(),
		type: z.string(),
		payload: z.unknown(),
	}),
]);
export type ClientFrame = z.infer<typeof clientFrameSchema>;

export const serverFrameSchema = z.object({
	t: z.literal("msg"),
	ch: z.string(),
	type: z.string(),
	payload: z.unknown(),
});
export type ServerFrame = z.infer<typeof serverFrameSchema>;

// What a channel's opening reply may be in a screens fixture: the payload of its
// "snapshot" message when it has one, or `{ type, payload }` naming any of its
// server messages (a channel that opens with `status`). Keyed by the map's
// keys, the channels' names.
type Opening<S extends MessageSchemas> = {
	[T in keyof S & string]: { type: T; payload: z.input<S[T]> };
}[keyof S & string];

export type Snapshots<D extends Record<string, ChannelDef>> = {
	[K in keyof D]:
		| ("snapshot" extends keyof D[K]["server"]
				? z.input<D[K]["server"]["snapshot"]>
				: never)
		| Opening<D[K]["server"]>;
};
