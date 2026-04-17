import type {
	RuntimePlugin,
	RuntimePluginEventHandlers,
} from "@fcalell/cli/runtime";
import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import {
	RequestHeadersPlugin,
	ResponseHeadersPlugin,
} from "@orpc/server/plugins";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { createProcedure } from "../procedure";

export type { InferRouter } from "../types";

// ---------- Worker export ----------

export interface WorkerExport {
	fetch: (
		request: Request,
		env: unknown,
		ctx: unknown,
	) => Response | Promise<Response>;
	scheduled?: (
		controller: unknown,
		env: unknown,
		ctx: unknown,
	) => Promise<void>;
	queue?: (batch: unknown, env: unknown, ctx: unknown) => Promise<void>;
	_router: unknown;
}

// ---------- Builder types ----------

interface PluginEntry {
	// biome-ignore lint/suspicious/noExplicitAny: plugins have varying types
	plugin: RuntimePlugin<string, any, any>;
}

interface FnEntry {
	fn: (
		ctx: Record<string, unknown>,
	) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

type UseEntry = PluginEntry | FnEntry;

function isPluginEntry(entry: UseEntry): entry is PluginEntry {
	return "plugin" in entry;
}

export interface AppBuilder<TContext extends Record<string, unknown>> {
	use<TName extends string, TProvides extends Record<string, unknown>>(
		plugin: RuntimePlugin<TName, TContext, TProvides>,
	): AppBuilder<TContext & TProvides>;

	use<TExtra extends Record<string, unknown>>(
		fn: (ctx: TContext) => TExtra | Promise<TExtra>,
	): AppBuilder<TContext & TExtra>;

	handler(consumerRoutes: Record<string, unknown>): WorkerExport;
}

// ---------- Base context ----------

type BaseContext = {
	env: unknown;
	request: Request;
	reqHeaders: Headers;
	resHeaders: Headers;
	[key: string]: unknown;
};

// ---------- ApiOptions (plain) ----------

export interface ApiWorkerOptions {
	cors?: string | string[];
	prefix?: `/${string}`;
}

// ---------- createWorker ----------

export function createWorker(
	options?: ApiWorkerOptions,
): AppBuilder<BaseContext> {
	const apiOptions = { prefix: "/rpc" as `/${string}`, ...options };
	return createAppBuilder<BaseContext>([], apiOptions);
}

function createAppBuilder<TContext extends Record<string, unknown>>(
	entries: UseEntry[],
	apiOptions: ApiWorkerOptions,
): AppBuilder<TContext> {
	return {
		use(
			pluginOrFn:
				| RuntimePlugin<string>
				| ((
						ctx: TContext,
				  ) => Record<string, unknown> | Promise<Record<string, unknown>>),
		) {
			if (typeof pluginOrFn === "function") {
				const newEntries: UseEntry[] = [
					...entries,
					{
						fn: pluginOrFn as (
							ctx: Record<string, unknown>,
						) => Record<string, unknown> | Promise<Record<string, unknown>>,
					},
				];
				// biome-ignore lint/suspicious/noExplicitAny: context type grows dynamically
				return createAppBuilder<any>(newEntries, apiOptions);
			}

			const plugin = pluginOrFn as RuntimePlugin<string>;

			const existingKeys = new Set<string>();
			for (const entry of entries) {
				if (isPluginEntry(entry)) {
					existingKeys.add(entry.plugin.name);
				}
			}
			if (existingKeys.has(plugin.name)) {
				throw new Error(
					`Context key collision: plugin "${plugin.name}" already registered`,
				);
			}

			const newEntries: UseEntry[] = [...entries, { plugin }];
			// biome-ignore lint/suspicious/noExplicitAny: context type grows dynamically
			return createAppBuilder<any>(newEntries, apiOptions);
		},

		handler(consumerRoutes: Record<string, unknown>): WorkerExport {
			const rpcPrefix: `/${string}` = apiOptions.prefix ?? "/rpc";
			const corsOrigin = apiOptions.cors;

			const pluginEntries = entries.filter(isPluginEntry);
			const allEntries = entries;

			const procedure = createProcedure<TContext>();

			let pluginRoutes: Record<string, unknown> = {};
			for (const entry of pluginEntries) {
				const routes = entry.plugin.routes?.(procedure);
				if (routes) {
					pluginRoutes = { ...pluginRoutes, ...routes };
				}
			}

			const fullRouter = { ...pluginRoutes, ...consumerRoutes };

			// biome-ignore lint/suspicious/noExplicitAny: oRPC RPCHandler expects internal router type
			const rpcHandler = new RPCHandler(fullRouter as any, {
				plugins: [new RequestHeadersPlugin(), new ResponseHeadersPlugin()],
			});

			const app = new Hono();

			app.use("*", logger());
			app.use("*", secureHeaders());

			if (corsOrigin) {
				app.use(
					"*",
					cors({
						origin: corsOrigin,
						credentials: true,
					}),
				);
			}

			app.get("/", (c) => c.json({ ok: true }));

			app.post(`${rpcPrefix}/*`, async (c) => {
				const env = c.env;
				const request = c.req.raw;

				for (const entry of pluginEntries) {
					entry.plugin.validateEnv?.(env);
				}

				let ctx: Record<string, unknown> = {
					env,
					request,
				};

				for (const entry of allEntries) {
					if (isPluginEntry(entry)) {
						const provided = await entry.plugin.context(env, ctx);
						ctx = { ...ctx, ...provided };
					} else {
						const extra = await entry.fn(ctx);
						ctx = { ...ctx, ...extra };
					}
				}

				const { matched, response } = await rpcHandler.handle(request, {
					prefix: rpcPrefix,
					context: ctx,
				});

				if (matched) {
					return c.newResponse(response.body, response);
				}

				return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);
			});

			app.onError((err, c) => {
				if (err instanceof ORPCError) {
					return c.json(
						{ code: err.code, message: err.message },
						{ status: err.status as ContentfulStatusCode },
					);
				}

				console.error("API Error:", err);
				return c.json(
					{
						code: "INTERNAL_SERVER_ERROR",
						message: "Internal Server Error",
					},
					500,
				);
			});

			const eventHandlers: RuntimePluginEventHandlers = {};
			for (const entry of pluginEntries) {
				if (typeof entry.plugin.handlers === "function") {
					const handlers = entry.plugin.handlers();
					if (handlers.scheduled) eventHandlers.scheduled = handlers.scheduled;
					if (handlers.queue) eventHandlers.queue = handlers.queue;
					if (handlers.email) eventHandlers.email = handlers.email;
				}
			}

			const honoFetch = app.fetch.bind(app);
			const workerExport: WorkerExport = {
				fetch: (request, env, ctx) => honoFetch(request, env, ctx as undefined),
				_router: fullRouter,
			};

			if (eventHandlers.scheduled) {
				workerExport.scheduled = eventHandlers.scheduled;
			}
			if (eventHandlers.queue) {
				workerExport.queue = eventHandlers.queue;
			}

			return workerExport;
		},
	} as AppBuilder<TContext>;
}
