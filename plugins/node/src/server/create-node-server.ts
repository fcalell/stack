import { serve, upgradeWebSocket } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { WebSocketServer } from "ws";
import type { ServiceLogger, ServiceSpec, ServiceStop } from "./service.ts";
import { createWsHub, type HubSocket } from "./ws-hub.ts";

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

export interface NodeServerOptions {
	port: number;
	worker: NodeWorker | null;
	// URL prefixes routed to the worker (from api.slots.routePrefixes).
	workerPaths?: string[];
	// Directory of built client assets, relative to the process cwd. Missing
	// files fall through to the SPA fallback; a missing directory serves 404s
	// (dev serves the SPA from vite instead).
	staticRoot?: string;
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

export function createNodeServer(options: NodeServerOptions): NodeServer {
	const {
		port,
		worker,
		workerPaths = [],
		staticRoot = "dist/client",
		env = process.env,
		log = consoleLog,
	} = options;
	const services = (options.services ?? []).flat();
	const { hub, connectionHandlers } = createWsHub(log);
	const wss = new WebSocketServer({ noServer: true });

	const app = new Hono();

	// The typed WS endpoint. Mounted first: neither the worker nor the SPA
	// ever owns /ws.
	app.get(
		"/ws",
		upgradeWebSocket(() => {
			const handlers = connectionHandlers();
			return {
				onMessage: (event, ws) => handlers.onMessage(event, ws as HubSocket),
				onClose: (event, ws) => handlers.onClose(event, ws as HubSocket),
				onError: (event, ws) => handlers.onError(event, ws as HubSocket),
			};
		}),
	);

	if (worker) {
		const dispatch = (request: Request) =>
			worker.fetch(request, env, undefined);
		for (const path of workerPaths) {
			app.all(path, (c) => dispatch(c.req.raw));
			app.all(`${path}/*`, (c) => dispatch(c.req.raw));
		}
	}

	app.use("*", serveStatic({ root: staticRoot }));
	// SPA fallback: any remaining GET (deep links like /board/012-01) gets the
	// client shell. Worker paths never reach here — they matched above.
	app.get("*", serveStatic({ path: `${staticRoot}/index.html` }));

	const stops: Array<{ name: string; stop: ServiceStop }> = [];
	let server: ReturnType<typeof serve> | null = null;
	let shuttingDown = false;

	async function startServices(): Promise<void> {
		for (const service of services) {
			const stop = await service.start({ log, ws: hub });
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

	async function stop(): Promise<void> {
		if (shuttingDown) return;
		shuttingDown = true;
		await stopServices();
		// Live WebSocket connections and idle keep-alive sockets would
		// otherwise hold close() open indefinitely.
		for (const socket of wss.clients) {
			socket.terminate();
		}
		await new Promise<void>((resolve, reject) => {
			if (!server) return resolve();
			server.close((error) => (error ? reject(error) : resolve()));
			if ("closeIdleConnections" in server) {
				server.closeIdleConnections();
			}
		});
		server = null;
	}

	async function start(): Promise<void> {
		try {
			await startServices();
			await new Promise<void>((resolve) => {
				server = serve(
					{
						fetch: app.fetch,
						port,
						// noServer: upgrades route through the Hono /ws handler.
						websocket: { server: wss },
					},
					(info) => {
						// This line is the dev supervisor's ready signal — keep the
						// wording in sync with the plugin's readyPattern.
						log.info(`stack node: listening on http://localhost:${info.port}`);
						resolve();
					},
				);
			});
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
