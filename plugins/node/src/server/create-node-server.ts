import { subscribe, unsubscribe } from "node:diagnostics_channel";
import type { ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { WebSocketServer } from "ws";
import {
	boundHost,
	listenerAdmits,
	listenerEnv,
	mainAdmits,
	originOf,
} from "./listeners.ts";
import type { ServiceLogger, ServiceSpec, ServiceStop } from "./service.ts";
import {
	authorizeUpgrade,
	hasAuth,
	SESSION_ENDED_CHANNEL,
} from "./ws-guard.ts";
import {
	type ConnectionSession,
	createWsHub,
	type HubSocket,
} from "./ws-hub.ts";

// The worker shape emitted by plugin-api's `.stack/worker.ts` (its
// `WorkerExport`), reduced to what this target calls. On Node, `env` is
// `process.env` and there is no execution context; the worker runtime
// degrades both gracefully.
export interface NodeWorker {
	fetch(
		request: Request,
		env: unknown,
		ctx: unknown,
	): Response | Promise<Response>;
}

// A further port the server answers on, for one origin of its own (the
// app at a proxy's named address beside its loopback port, say). Its origin
// is read from `originVar` in the server's env on every request, so it can
// change while the server runs; while it is unset or not an http(s) origin,
// the listener refuses everything.
export interface NodeListener {
	port: number;
	// The address to bind; unset binds every interface.
	host?: string;
	originVar: string;
}

export interface NodeServerOptions {
	port: number;
	// The address to bind; unset binds every interface.
	host?: string;
	// The origins the main listener is reached at (the app's CORS list): a
	// request whose Host is none of theirs, nor the bound address, is refused
	// with 421; under STACK_DEV a loopback name or an IP literal passes too.
	// Unset admits every Host.
	origins?: string[];
	// Further listeners by name. The worker sees a request on one with the
	// server's env plus `STACK_LISTENER` (the name) and `STACK_ORIGIN` (its
	// origin), and only that origin's Host is admitted there.
	listeners?: Record<string, NodeListener>;
	// A request body over this many bytes is refused with 413.
	maxBody?: number;
	// A WebSocket frame over this many bytes closes its socket.
	maxFrame?: number;
	worker: NodeWorker | null;
	// URL prefixes routed to the worker (from api.slots.routePrefixes).
	workerPaths?: string[];
	// Directory of built client assets, relative to the process cwd; null
	// when there is no web client. Missing files fall through to the SPA
	// fallback; a missing directory serves 404s (dev serves the SPA from vite
	// instead).
	staticRoot: string | null;
	// Headers the static files and the SPA fallback carry; the worker, `/ws`
	// and service mounts answer before the static layer and never do.
	clientHeaders?: Record<string, string>;
	// Entries may be a single spec or an array of specs (the generated
	// consumer barrel hands over its whole `services` array as one entry).
	services?: ReadonlyArray<ServiceSpec | readonly ServiceSpec[]>;
	env?: Record<string, string | undefined>;
	log?: ServiceLogger;
}

export interface NodeServer {
	// Resolves once services are started and the port is listening. Failures
	// log and exit the process (the generated entry calls this floating).
	start(): Promise<void>;
	stop(): Promise<void>;
}

const consoleLog: ServiceLogger = {
	info: (message) => console.log(message),
	error: (message) => console.error(message),
};

// What the main listener and each further one hand the app with every
// request, beside @hono/node-server's own bindings.
interface ListenerBinding {
	name: string | null;
	// The address its socket is bound to, once it listens.
	bound: string | null;
	originVar: string | null;
}

type Bindings = Record<string | symbol, unknown> & {
	listener: ListenerBinding;
};

export function createNodeServer(options: NodeServerOptions): NodeServer {
	const {
		port,
		host,
		origins,
		listeners = {},
		worker,
		workerPaths = [],
		staticRoot,
		clientHeaders = {},
		env = process.env,
		log = consoleLog,
	} = options;
	const services = (options.services ?? []).flat();
	const { hub, connectionHandlers } = createWsHub(log);
	const wss = new WebSocketServer({
		noServer: true,
		...(options.maxFrame !== undefined && { maxPayload: options.maxFrame }),
	});

	const app = new Hono<{
		Bindings: Bindings;
		Variables: {
			wsSession: ConnectionSession | null;
			workerEnv: unknown;
			listenerOrigin: string | null;
		};
	}>();

	// The env each further listener's requests carry, one per origin it has
	// served, so the worker's per-env state (auth's instance) is built once per
	// origin and afresh when the origin changes.
	const listenerEnvs = new Map<string, { origin: string; env: unknown }>();
	function envOn(name: string, origin: string): unknown {
		const cached = listenerEnvs.get(name);
		if (cached?.origin === origin) return cached.env;
		const fresh = listenerEnv(env, name, origin);
		listenerEnvs.set(name, { origin, env: fresh });
		return fresh;
	}

	// Every request meets its listener's Host rule first: the static files,
	// the worker's paths, the `/ws` upgrade and the service mounts alike. The
	// Host is the raw header, so a request without one is refused too.
	app.use("*", async (c, next) => {
		const listener = c.env.listener;
		const incoming = c.env.incoming as
			| { headers: Record<string, string | string[] | undefined> }
			| undefined;
		const header = incoming?.headers.host;
		const hostHeader = typeof header === "string" ? header : undefined;
		if (listener.name === null || listener.originVar === null) {
			const admitted = mainAdmits({
				host: hostHeader,
				origins,
				bound: listener.bound,
				dev: env.STACK_DEV === "1",
			});
			if (!admitted) return c.text("Misdirected Request", 421);
			c.set("workerEnv", env);
			c.set("listenerOrigin", null);
			return next();
		}
		const origin = originOf(env[listener.originVar]);
		if (origin === null || !listenerAdmits(hostHeader, origin)) {
			return c.text("Misdirected Request", 421);
		}
		c.set("workerEnv", envOn(listener.name, origin));
		c.set("listenerOrigin", origin);
		return next();
	});

	if (options.maxBody !== undefined)
		app.use("*", bodyLimit({ maxSize: options.maxBody }));

	type MountHandler = (request: Request) => Response | Promise<Response>;
	const mounts = new Map<string, MountHandler>();
	function mount(prefix: string, handler: MountHandler): void {
		if (!prefix.startsWith("/") || prefix === "/" || prefix.endsWith("/")) {
			throw new Error(`invalid mount prefix "${prefix}"`);
		}
		if (mounts.has(prefix)) {
			throw new Error(`mount prefix "${prefix}" already registered`);
		}
		mounts.set(prefix, handler);
	}
	function matchMount(path: string): MountHandler | undefined {
		let best: string | undefined;
		for (const prefix of mounts.keys()) {
			if (path !== prefix && !path.startsWith(`${prefix}/`)) continue;
			if (best === undefined || prefix.length > best.length) best = prefix;
		}
		return best === undefined ? undefined : mounts.get(best);
	}

	// The typed WS endpoint. Mounted first: neither the worker nor the SPA
	// ever owns /ws. A browser applies no CORS to a WebSocket, so the upgrade
	// is admitted here: an Origin the worker's CORS list does not trust is
	// refused with 403, and with auth in the app so is a request with no
	// session. The session rides to each channel handler as `conn.session`.
	app.get(
		"/ws",
		async (c, next) => {
			if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
				return next();
			}
			const decision = await authorizeUpgrade({
				worker,
				env: c.get("workerEnv"),
				listenerOrigin: c.get("listenerOrigin"),
				authConfigured: hasAuth(workerPaths),
				request: c.req.raw,
			});
			if (!decision.allow) {
				log.error(`ws: refused upgrade (${decision.reason})`);
				return c.text("Forbidden", 403);
			}
			c.set("wsSession", decision.session);
			return next();
		},
		upgradeWebSocket((c) => {
			const handlers = connectionHandlers(c.get("wsSession") ?? null);
			return {
				onOpen: (event, ws) => handlers.onOpen(event, ws as HubSocket),
				onMessage: (event, ws) => handlers.onMessage(event, ws as HubSocket),
				onClose: (event, ws) => handlers.onClose(event, ws as HubSocket),
				onError: (event, ws) => handlers.onError(event, ws as HubSocket),
			};
		}),
	);

	// Service raw-route mounts, after /ws and before the worker/static/SPA:
	// a longest-prefix match wins, so a service owns its subtree without a
	// consumer mounting a worker prefix (documented, not guarded).
	app.use("*", async (c, next) => {
		const handler = matchMount(c.req.path);
		if (handler) return handler(c.req.raw);
		await next();
	});

	if (worker) {
		for (const path of workerPaths) {
			app.all(path, (c) =>
				worker.fetch(c.req.raw, c.get("workerEnv"), undefined),
			);
			app.all(`${path}/*`, (c) =>
				worker.fetch(c.req.raw, c.get("workerEnv"), undefined),
			);
		}
	}

	if (staticRoot !== null) {
		app.use("*", async (c, next) => {
			await next();
			for (const [name, value] of Object.entries(clientHeaders)) {
				c.header(name, value);
			}
		});
		app.use("*", serveStatic({ root: staticRoot }));
		// SPA fallback: any remaining GET (deep links like /board/012-01) gets
		// the client shell. Worker paths never reach here — they matched above.
		app.get("*", serveStatic({ path: `${staticRoot}/index.html` }));
	}

	// A session auth ends (a sign-out, a revoke) closes its sockets: the
	// session a socket opened with is read once, at the upgrade.
	const onSessionEnded = (message: unknown) => {
		const sessionId = (message as { sessionId?: unknown } | null)?.sessionId;
		if (typeof sessionId === "string") hub.closeSession(sessionId);
	};

	const stops: Array<{ name: string; stop: ServiceStop }> = [];
	let servers: Array<ReturnType<typeof serve>> = [];
	let shuttingDown = false;

	async function startServices(): Promise<void> {
		for (const service of services) {
			const stop = await service.start({ log, ws: hub, http: { port, mount } });
			if (stop) stops.push({ name: service.name, stop });
			log.info(`service ${service.name}: started`);
		}
	}

	async function stopServices(): Promise<void> {
		// Reverse order: later services may depend on earlier ones.
		for (const entry of [...stops].reverse()) {
			try {
				await entry.stop();
			} catch (error) {
				log.error(`service ${entry.name}: stop failed: ${String(error)}`);
			}
		}
		stops.length = 0;
	}

	// close() ends only the keep-alive sockets idle at that moment; a socket
	// whose response was still finishing would otherwise hold it open until
	// the keep-alive timeout, so each response that ends during shutdown
	// closes the sockets it left idle.
	function closeIdle(): void {
		for (const server of servers) {
			if ("closeIdleConnections" in server) server.closeIdleConnections();
		}
	}

	async function stop(): Promise<void> {
		if (shuttingDown) return;
		shuttingDown = true;
		unsubscribe(SESSION_ENDED_CHANNEL, onSessionEnded);
		await stopServices();
		// Live WebSocket connections and idle keep-alive sockets would
		// otherwise hold close() open indefinitely.
		for (const socket of wss.clients) {
			socket.terminate();
		}
		await Promise.all(
			servers.map(
				(server) =>
					new Promise<void>((resolve, reject) => {
						server.close((error) => (error ? reject(error) : resolve()));
						closeIdle();
					}),
			),
		);
		servers = [];
	}

	// Binds one listener and resolves with the port it got. A bind that fails
	// (the port taken) rejects, which stops the start.
	function listen(
		name: string | null,
		listenPort: number,
		listenHost: string | undefined,
		originVar: string | null,
	): Promise<number> {
		const listener: ListenerBinding = { name, bound: null, originVar };
		return new Promise<number>((resolve, reject) => {
			const server = serve(
				{
					// The bindings object is the one the upgrade path keys its
					// socket on, so the listener rides on it rather than a copy.
					fetch: (request, bindings) => {
						const own = bindings as unknown as Bindings;
						own.listener = listener;
						return app.fetch(request, own);
					},
					port: listenPort,
					hostname: listenHost,
					// noServer: upgrades route through the Hono /ws handler.
					websocket: { server: wss },
				},
				(info) => {
					const bound = (info as AddressInfo).port;
					listener.bound = boundHost(listenHost, bound);
					resolve(bound);
				},
			);
			server.once("error", reject);
			server.on("request", (_request, response: ServerResponse) => {
				response.once("finish", () => {
					if (shuttingDown) setImmediate(closeIdle);
				});
			});
			servers.push(server);
		});
	}

	async function start(): Promise<void> {
		try {
			subscribe(SESSION_ENDED_CHANNEL, onSessionEnded);
			await startServices();
			for (const [name, extra] of Object.entries(listeners)) {
				const bound = await listen(
					name,
					extra.port,
					extra.host,
					extra.originVar,
				);
				log.info(
					`stack node: ${name} listening on http://${extra.host ?? "localhost"}:${bound}`,
				);
			}
			// The main listener binds last: its line is the dev supervisor's
			// ready signal, so it comes once every port answers. Keep the
			// wording in sync with the plugin's readyPattern.
			const bound = await listen(null, port, host, null);
			log.info(
				`stack node: listening on http://${host ?? "localhost"}:${bound}`,
			);
			process.once("SIGINT", () => void shutdown());
			process.once("SIGTERM", () => void shutdown());
		} catch (error) {
			log.error(`stack node: failed to start: ${String(error)}`);
			await stopServices();
			process.exit(1);
		}
	}

	async function shutdown(): Promise<void> {
		try {
			await stop();
			process.exit(0);
		} catch (error) {
			log.error(`stack node: shutdown failed: ${String(error)}`);
			process.exit(1);
		}
	}

	return { start, stop };
}
