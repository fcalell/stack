import type { RuntimePlugin } from "@fcalell/cli/runtime";
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

export interface WorkerExport<
	TRouter extends Record<string, unknown> = Record<string, unknown>,
> {
	fetch: (
		request: Request,
		env: unknown,
		ctx: unknown,
	) => Response | Promise<Response>;
	_router: TRouter;
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

	handler<TRoutes extends Record<string, unknown>>(
		consumerRoutes: TRoutes,
	): WorkerExport<TRoutes>;
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
	cors?: string[];
	prefix?: `/${string}`;
}

type ResolvedApiOptions = Required<Pick<ApiWorkerOptions, "prefix">> &
	Pick<ApiWorkerOptions, "cors">;

// ---------- createWorker ----------

export function createWorker(
	options?: ApiWorkerOptions,
): AppBuilder<BaseContext> {
	const apiOptions: ResolvedApiOptions = {
		prefix: "/rpc",
		...options,
	};
	return createAppBuilder<BaseContext>([], apiOptions);
}

function createAppBuilder<TContext extends Record<string, unknown>>(
	entries: UseEntry[],
	apiOptions: ResolvedApiOptions,
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

		handler<TRoutes extends Record<string, unknown>>(
			consumerRoutes: TRoutes,
		): WorkerExport<TRoutes> {
			const { prefix: rpcPrefix, cors: corsOrigin } = apiOptions;

			const pluginEntries = entries.filter(isPluginEntry);

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

			const app = new Hono<{
				Variables: { __stackCtx: Record<string, unknown> };
			}>();

			// CORS must run first so preflights and error responses always carry
			// CORS headers; mounting it after logger/secureHeaders leaks non-CORS
			// responses to the browser when an earlier layer short-circuits.
			//
			// An explicitly empty origin list is a misconfiguration (usually
			// `app.origins: []` override): silently skipping CORS would make
			// browsers fail preflights with no diagnostic. `undefined` is
			// allowed for non-browser workers that don't need CORS at all.
			if (corsOrigin !== undefined) {
				if (corsOrigin.length === 0) {
					throw new Error(
						"createWorker: cors was provided but is empty. Check app.domain / app.origins.",
					);
				}
				app.use(
					"*",
					cors({
						origin: corsOrigin,
						credentials: true,
					}),
				);
			}
			app.use("*", logger());
			app.use("*", secureHeaders());

			app.use("*", async (c, next) => {
				const env = c.env;
				const request = c.req.raw;

				for (const entry of pluginEntries) {
					entry.plugin.validateEnv?.(env);
				}

				let ctx: Record<string, unknown> = { env, request };

				for (const entry of entries) {
					if (isPluginEntry(entry)) {
						const provided = await entry.plugin.context(env, ctx);
						ctx = { ...ctx, ...provided };
					} else {
						const extra = await entry.fn(ctx);
						ctx = { ...ctx, ...extra };
					}
				}

				for (const entry of pluginEntries) {
					const fetchFn = entry.plugin.fetch;
					if (typeof fetchFn !== "function") continue;
					const claimed = await fetchFn(request, env, ctx);
					if (claimed) return claimed;
				}

				c.set("__stackCtx", ctx);
				await next();
			});

			app.get("/", (c) => c.json({ ok: true }));

			app.post(`${rpcPrefix}/*`, async (c) => {
				const ctx = c.get("__stackCtx");
				const { matched, response } = await rpcHandler.handle(c.req.raw, {
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

			const honoFetch = app.fetch.bind(app);
			return {
				fetch: (request, env, ctx) => honoFetch(request, env, ctx as undefined),
				_router: fullRouter as unknown as TRoutes,
			};
		},
	} as AppBuilder<TContext>;
}
