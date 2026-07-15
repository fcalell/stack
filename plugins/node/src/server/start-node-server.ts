import { registerHooks } from "node:module";
import {
	createNodeServer,
	type NodeServer,
	type NodeServerOptions,
	type NodeWorker,
} from "./create-node-server.ts";
import type { ServiceSpec } from "./service.ts";

export interface NodeServerBootOptions
	extends Omit<NodeServerOptions, "worker" | "services"> {
	// Module URLs, not static imports: consumer route files import
	// "virtual:stack-procedure", a specifier plain node cannot resolve (tsx
	// and esbuild resolve it via tsconfig paths; node does not). Static
	// imports in the entry would resolve at link time, before any hook can
	// register, so the boot loads these dynamically after registerHooks.
	workerModule: URL | null;
	procedureModule: URL | null;
	servicesModule: URL | null;
	services?: NodeServerOptions["services"];
}

export async function startNodeServer(
	options: NodeServerBootOptions,
): Promise<NodeServer> {
	const { workerModule, procedureModule, servicesModule, ...rest } = options;
	try {
		if (procedureModule) {
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
		const worker = workerModule
			? ((await import(workerModule.href)) as { default: NodeWorker }).default
			: null;
		const consumerServices = servicesModule
			? ((await import(servicesModule.href)) as { services: ServiceSpec[] })
					.services
			: [];
		const server = createNodeServer({
			...rest,
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
