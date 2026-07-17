import type { WsHub } from "./ws-hub.ts";

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
export interface ServiceSpec {
	name: string;
	// biome-ignore lint/suspicious/noConfusingVoidType: void keeps side-effect-only starts (no return statement) assignable
	start(ctx: ServiceContext): void | ServiceStop | Promise<void | ServiceStop>;
}

export function defineService(spec: ServiceSpec): ServiceSpec {
	return spec;
}
