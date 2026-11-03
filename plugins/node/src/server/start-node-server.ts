import { registerHooks } from "node:module";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
	createNodeServer,
	type NodeServer,
	type NodeServerOptions,
	type NodeWorker,
} from "./create-node-server.ts";
import type { ServiceSpec } from "./service.ts";

export interface NodeServerBootOptions
	extends Omit<NodeServerOptions, "worker" | "services" | "staticRoot"> {
	// Module URLs, not static imports: consumer route files import
	// "virtual:stack-procedure", a specifier plain node cannot resolve (tsx
	// and esbuild resolve it via tsconfig paths; node does not). Static
	// imports in the entry would resolve at link time, before any hook can
	// register, so the boot loads these dynamically after registerHooks.
	workerModule?: URL | null;
	procedureModule?: URL | null;
	servicesModule?: URL | null;
	// The production bundle's form of the three above: a bundler has already
	// followed the imports (and aliased "virtual:stack-procedure"), so the
	// entry hands over the modules themselves.
	modules?: { worker: NodeWorker | null; services: ServiceSpec[] };
	services?: NodeServerOptions["services"];
	// The web client's directory relative to the working directory
	// (`stack node` runs from the app's root) ...
	staticRoot?: string | null;
	// ... or its place as a URL, which the bundle finds beside itself, so it
	// runs from any working directory.
	staticDir?: URL | null;
	// Tasks run, in order, before the services start and the port opens (the
	// bundle's: db applies its migrations).
	boot?: Array<() => void | Promise<void>>;
}

/** Where the server listens: the configured port and host, which the `PORT` and `HOST` env vars override when the process runs in production (a container or a process manager sets them, no rebuild). `stack dev` (`STACK_DEV`) ignores both: the dev server's proxy aims at the configured port. A `PORT` that is not a port number stops the boot. */
export function listenOf(
	configured: { port: number; host?: string },
	env: Record<string, string | undefined> = process.env,
): { port: number; host?: string } {
	if (env.STACK_DEV) return configured;
	let { port, host } = configured;
	const given = env.PORT?.trim();
	if (given) {
		port = Number(given);
		if (!Number.isInteger(port) || port < 0 || port > 65535) {
			throw new Error(`PORT is not a port number: ${JSON.stringify(given)}`);
		}
	}
	const bind = env.HOST?.trim();
	if (bind) host = bind;
	return { port, host };
}

export async function startNodeServer(
	options: NodeServerBootOptions,
): Promise<NodeServer> {
	const {
		workerModule,
		procedureModule,
		servicesModule,
		modules,
		staticDir,
		staticRoot,
		boot,
		...rest
	} = options;
	try {
		for (const task of boot ?? []) await task();
		if (procedureModule && !modules) {
			const href = procedureModule.href;
			registerHooks({
				resolve(specifier, context, nextResolve) {
					if (specifier === "virtual:stack-procedure") {
						return nextResolve(href, context);
					}
					return nextResolve(specifier, context);
				},
			});
		}
		const worker =
			modules?.worker ??
			(workerModule
				? ((await import(workerModule.href)) as { default: NodeWorker }).default
				: null);
		const consumerServices =
			modules?.services ??
			(servicesModule
				? ((await import(servicesModule.href)) as { services: ServiceSpec[] })
						.services
				: []);
		const server = createNodeServer({
			...rest,
			...listenOf(rest),
			staticRoot: staticDir
				? relative(process.cwd(), fileURLToPath(staticDir)) || "."
				: (staticRoot ?? null),
			worker,
			services: [...(options.services ?? []), consumerServices],
		});
		await server.start();
		return server;
	} catch (error) {
		(rest.log ?? console).error(`stack node: failed to boot: ${String(error)}`);
		process.exit(1);
	}
}
