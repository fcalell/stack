import { join } from "node:path";
import { createPlugin, type } from "@fcalell/cli";
import type { TsExpression } from "@fcalell/cli/ast";
import { hasRuntimeExport } from "@fcalell/cli/codegen";
import { Deploy, Dev, Generate, Remove } from "@fcalell/cli/events";
import { z } from "zod";
import { generateRouteBarrel } from "./node/barrel";
import { aggregateMiddleware, aggregateWorker } from "./node/codegen";
import type { MiddlewarePayload, WorkerPayload } from "./node/types";

export const apiOptionsSchema = z.object({
	prefix: z
		.string()
		.refine((p) => p.startsWith("/"), {
			error: "api: prefix must start with /",
		})
		.default("/rpc"),
});

export type ApiOptions = z.input<typeof apiOptionsSchema>;

export const api = createPlugin("api", {
	label: "API",

	events: {
		// The worker codegen payload — other plugins contribute runtime entries,
		// middleware imports, and overrides here. plugin-api seeds `base` and
		// optionally `handler` from its own handler (runs first, since it's
		// the owner and has no `after:`).
		Worker: type<WorkerPayload>(),
		// Ordered middleware call expressions. plugin-api auto-includes
		// `src/worker/middleware.ts` when it exists; other plugins can
		// interleave by phase + order.
		Middleware: type<MiddlewarePayload>(),
	},

	schema: apiOptionsSchema,

	dependencies: {
		"@fcalell/plugin-api": "workspace:*",
	},
	devDependencies: {
		wrangler: "^4.14.0",
	},
	gitignore: [".wrangler", ".stack"],

	register(ctx, bus, events) {
		bus.on(Generate, async (p) => {
			// Always regenerate the route barrel alongside any worker codegen.
			const barrelContent = generateRouteBarrel(ctx.cwd);
			p.files.push({
				path: "src/worker/routes/index.ts",
				content: barrelContent,
			});

			// Abort worker codegen if no plugin in the resolved config declares
			// a `./runtime` export — nothing would land in the chain and the
			// generated worker.ts would only contain an empty createWorker()
			// call with no providers.
			const hasWorkerPlugins = ctx.discoveredPlugins.some((pl) =>
				hasRuntimeExport(pl.package),
			);
			if (!hasWorkerPlugins) return;

			// Emit api.events.Middleware first so the ordered middleware calls
			// (+ imports) seed the Worker payload before plugin-owned runtime
			// contributions land.
			const middlewarePayload = await bus.emit(events.Middleware, {
				entries: [],
			});
			const aggregated = aggregateMiddleware(middlewarePayload);

			// CORS origins are derived from app config (app.origins, or fallback
			// to `https://${domain}` + `https://app.${domain}`). plugin-vite
			// contributes its dev-server localhost origin via api.events.Worker
			// when origins aren't user-overridden.
			const origins = ctx.app.origins ?? [
				`https://${ctx.app.domain}`,
				`https://app.${ctx.app.domain}`,
			];

			const workerPayload = await bus.emit(events.Worker, {
				imports: aggregated?.imports ?? [],
				base: null,
				pluginRuntimes: [],
				middlewareChain: aggregated?.calls ?? [],
				handler: null,
				cors: origins,
			});

			p.files.push({
				path: ".stack/worker.ts",
				content: aggregateWorker(workerPayload),
			});
		});

		bus.on(events.Worker, async (p) => {
			if (p.base) {
				throw new Error(
					`Plugin "api" cannot claim the worker root because another plugin already did.`,
				);
			}

			const options = ctx.options ?? {};

			const workerOptions: Array<{ key: string; value: TsExpression }> = [];
			if (options.prefix) {
				workerOptions.push({
					key: "prefix",
					value: { kind: "string", value: options.prefix },
				});
			}
			if (p.cors.length > 0) {
				workerOptions.push({
					key: "cors",
					value: {
						kind: "array",
						items: p.cors.map((o) => ({ kind: "string", value: o })),
					},
				});
			}

			p.imports.push({
				source: "@fcalell/plugin-api/runtime",
				default: "createWorker",
			});

			p.base = {
				kind: "call",
				callee: { kind: "identifier", name: "createWorker" },
				args:
					workerOptions.length > 0
						? [{ kind: "object", properties: workerOptions }]
						: [],
			};

			const hasRoutes = await ctx.fileExists("src/worker/routes");
			if (hasRoutes) {
				p.imports.push({ source: "../src/worker/routes", namespace: "routes" });
				p.handler = { identifier: "routes" };
			}

			// Auto-wire callback files for every plugin in the graph that
			// declares callbacks AND owns a runtime. Runs after all other
			// Worker handlers (plugin-api is the emitter; its own handler runs
			// first because it registered first, and we re-enter the payload
			// here to attach callbacks). Each plugin's entry is found-or-created
			// via `pluginRuntimes.find(...)`; if the owner didn't touch the
			// payload, this wiring still creates the entry so the plugin
			// participates in the chain with just its auto-seeded options.
			for (const pl of ctx.discoveredPlugins) {
				const hasCallbacks = Object.keys(pl.callbacks ?? {}).length > 0;
				if (!hasCallbacks) continue;
				if (!hasRuntimeExport(pl.package)) continue;
				const callbackPath = `src/worker/plugins/${pl.name}.ts`;
				const fileExists = await ctx.fileExists(callbackPath);
				if (!fileExists) continue;
				const entry = p.pluginRuntimes.find((r) => r.plugin === pl.name);
				if (!entry) continue;
				const callbackIdentifier = `${pl.name}Callbacks`;
				entry.callbacks = {
					import: {
						source: `../${callbackPath.replace(/\.ts$/, "")}`,
						default: callbackIdentifier,
					},
					identifier: callbackIdentifier,
				};
			}
		});

		// Consumer middleware is an implicit contribution via the conventional
		// file `src/worker/middleware.ts`. Published via api.events.Middleware
		// so third-party plugins can interleave middleware around it.
		bus.on(events.Middleware, async (p) => {
			const hasMiddleware = await ctx.fileExists("src/worker/middleware.ts");
			if (!hasMiddleware) return;
			p.entries.push({
				imports: [
					{
						source: "../src/worker/middleware",
						default: "middleware",
					},
				],
				call: { kind: "identifier", name: "middleware" },
				phase: "before-routes",
				order: 100,
			});
		});

		bus.on(Remove, (p) => {
			p.files.push("src/worker/routes/");
		});

		bus.on(Deploy.Execute, (p) => {
			p.steps.push({
				name: "Worker",
				phase: "main",
				exec: {
					command: "npx",
					args: ["wrangler", "deploy", "--config", ".stack/wrangler.toml"],
				},
			});
		});

		bus.on(Dev.Start, (p) => {
			p.processes.push({
				name: "api",
				command: "npx",
				args: [
					"wrangler",
					"dev",
					"--port",
					"8787",
					"--persist-to",
					".stack/dev",
				],
				defaultPort: 8787,
				readyPattern: /Ready on/,
				color: "yellow",
			});

			p.watchers.push({
				name: "routes",
				paths: "src/worker/routes/**",
				ignore: ["**/index.ts"],
				debounce: 300,
				async handler(_path, type) {
					if (type === "add" || type === "unlink") {
						const barrelContent = generateRouteBarrel(ctx.cwd);
						const { writeFileSync } = await import("node:fs");
						writeFileSync(
							join(ctx.cwd, "src/worker/routes/index.ts"),
							barrelContent,
						);
						ctx.log.info("Route barrel regenerated");
					}
				},
			});
		});
	},
});

export { ApiError } from "./error";
export type { Middleware } from "./procedure";
export type { InferRouter } from "./types";
