import type { ConnectionSession, WsHub } from "./ws-hub.ts";

export interface ServiceLogger {
	info(message: string): void;
	error(message: string): void;
}

export interface ServiceHttp {
	// The port the node server listens on (fixed from config before listen).
	port: number;
	// Route every request whose path equals `prefix` or starts with
	// `prefix + "/"` to `handler`. Longest registered prefix wins; an exact
	// duplicate prefix throws. Paths are not rewritten.
	mount(
		prefix: string,
		handler: (request: Request) => Response | Promise<Response>,
	): void;
	// The session the request's credentials hold, as `/ws` resolves it for a
	// connection: its `Authorization: Bearer` (a member's session token or a
	// device key) on any request, its `Cookie` only from one of the app's
	// pages (an Origin the app trusts, or a GET or HEAD with none), asked of
	// the app's auth. Null when there is none, the credential is refused, or
	// the app has no auth. A mounted handler calls it first and answers 401 on
	// null; a page elsewhere that sends the user's cookie is anonymous, so the
	// route checks no Origin of its own, and a GET changes no state.
	session(request: Request): Promise<ConnectionSession | null>;
}

export interface ServiceContext {
	log: ServiceLogger;
	// The typed WebSocket hub: register channels with `ws.channel(def, ...)`
	// and broadcast through the returned handle.
	ws: WsHub;
	// Raw fetch-style route mounts and the listen port, for services that host
	// their own HTTP surface (e.g. an in-process MCP server).
	http: ServiceHttp;
}

export type ServiceStop = () => void | Promise<void>;

// One lifecycle shape: start() may return a stop handle. Services are plain
// module singletons in the consumer tree (`src/server/services/<name>.ts`
// default-exports a defineService), so code that needs a service imports the
// module directly — no context plumbing.
//
// Services start in file-name order, so a `start` must not rely on another
// service having started. Work that needs the others (enqueueing a job, reading
// what another service loaded, broadcasting) goes in `ready`, which runs for
// every service, in the same order, once every `start` has finished and before
// the server listens.
export interface ServiceSpec {
	name: string;
	// biome-ignore lint/suspicious/noConfusingVoidType: void keeps side-effect-only starts (no return statement) assignable
	start(ctx: ServiceContext): void | ServiceStop | Promise<void | ServiceStop>;
	// Runs after every service's `start` resolved. May return a stop function,
	// run on shutdown with the starts' (reverse order, `ready` stops first).
	// biome-ignore lint/suspicious/noConfusingVoidType: void keeps side-effect-only hooks (no return statement) assignable
	ready?(ctx: ServiceContext): void | ServiceStop | Promise<void | ServiceStop>;
}

export function defineService(spec: ServiceSpec): ServiceSpec {
	return spec;
}
