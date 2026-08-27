import type { RuntimePlugin } from "@fcalell/cli/runtime";
import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import {
	RequestHeadersPlugin,
	ResponseHeadersPlugin,
} from "@orpc/server/plugins";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
	createProcedure,
	extractIp,
	type RateLimitBinding,
} from "../procedure.ts";

export type { InferRouter } from "../types";

// Env binding name for the blanket per-IP volume limiter — a dedicated
// wrangler `rate_limiter` binding (contributed by plugin-api itself; see
// `../index.ts`'s `cloudflare.slots.bindings` contribution), never shared
// with the auth surface's `RATE_LIMITER_IP`/`RATE_LIMITER_EMAIL` bindings or
// a procedure's own `rateLimit: "ip"` middleware. A shared binding would
// double-draw the same budget (halving the effective limit for procedures
// that also declare `rateLimit: "ip"`) and let /rpc volume starve
// /api/auth's independent budget.
export const RATE_LIMITER_RPC = "RATE_LIMITER_RPC";

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

interface MiddlewareEntry {
	middleware: MiddlewareHandler;
	// Where the entry mounts relative to context injection. Registered via
	// `.useAfterContext()`, it runs once `__stackCtx` exists, so a raw Hono
	// route reaches `db`/`auth` instead of rebuilding its own clients.
	afterContext?: boolean;
}

type UseEntry = PluginEntry | FnEntry | MiddlewareEntry;

function isPluginEntry(entry: UseEntry): entry is PluginEntry {
	return "plugin" in entry;
}

function isMiddlewareEntry(entry: UseEntry): entry is MiddlewareEntry {
	return "middleware" in entry;
}

// Stable-topologically sorts the `PluginEntry`s among `entries` by each
// plugin's `dependsOn`, leaving fn/middleware entries in their original
// positions and reinserting the reordered plugins into the positions plugin
// entries already occupied. Independent plugins (no dependsOn edge between
// them) keep their original relative `.use()` order — this is what lets the
// generated worker sort `pluginRuntimes` alphabetically for deterministic
// codegen while still running dependencies first at request time.
function sortPluginEntries(entries: UseEntry[]): UseEntry[] {
	const pluginPositions: number[] = [];
	const pluginEntries: PluginEntry[] = [];
	entries.forEach((entry, i) => {
		if (isPluginEntry(entry)) {
			pluginPositions.push(i);
			pluginEntries.push(entry);
		}
	});

	if (pluginEntries.length <= 1) return entries;

	const byName = new Map(pluginEntries.map((e) => [e.plugin.name, e]));
	const visited = new Set<string>();
	const inStack = new Set<string>();
	const sorted: PluginEntry[] = [];

	function visit(entry: PluginEntry, stack: string[]): void {
		const name = entry.plugin.name;
		if (visited.has(name)) return;
		if (inStack.has(name)) {
			const cycleStart = stack.indexOf(name);
			const cycle = [...stack.slice(cycleStart), name];
			throw new Error(`Runtime plugin dependency cycle: ${cycle.join(" -> ")}`);
		}
		inStack.add(name);
		for (const dep of entry.plugin.dependsOn ?? []) {
			const depEntry = byName.get(dep);
			// A dependsOn naming a plugin that isn't registered is ignored —
			// presence is validated at config level by `requires`.
			if (depEntry) visit(depEntry, [...stack, name]);
		}
		inStack.delete(name);
		visited.add(name);
		sorted.push(entry);
	}

	for (const entry of pluginEntries) {
		visit(entry, []);
	}

	const result = [...entries];
	pluginPositions.forEach((pos, i) => {
		result[pos] = sorted[i] as PluginEntry;
	});
	return result;
}

// Hono middleware is `(c, next) => Promise<Response | void>` (arity 2). A
// context-injecting fn is `(ctx) => extra` (arity 1). Dispatch on `.length`
// at runtime; consumers writing native Hono middleware just `export default`
// it without wrapping.
function isHonoMiddleware(fn: (...args: unknown[]) => unknown): boolean {
	return fn.length >= 2;
}

export interface AppBuilder<TContext extends Record<string, unknown>> {
	use<TName extends string, TProvides extends Record<string, unknown>>(
		plugin: RuntimePlugin<TName, TContext, TProvides>,
	): AppBuilder<TContext & TProvides>;

	use(middleware: MiddlewareHandler): AppBuilder<TContext>;

	use<TExtra extends Record<string, unknown>>(
		fn: (ctx: TContext) => TExtra | Promise<TExtra>,
	): AppBuilder<TContext & TExtra>;

	useAfterContext(middleware: MiddlewareHandler): AppBuilder<TContext>;

	handler<TRoutes extends Record<string, unknown>>(
		consumerRoutes?: TRoutes,
	): WorkerExport<TRoutes>;
}

// ---------- Base context ----------

export type BaseContext = {
	env: unknown;
	request: Request;
	reqHeaders: Headers;
	resHeaders: Headers;
	// Hono's and wrangler's `ExecutionContext` types disagree on optional
	// members; `waitUntil` is the only part of the contract procedures need.
	executionCtx: { waitUntil(promise: Promise<unknown>): void };
	[key: string]: unknown;
};

// ---------- ApiOptions (plain) ----------

export interface ApiWorkerOptions {
	cors?: string[];
	// Localhost dev-server origins. Honoured only when the worker runs with
	// STACK_DEV set, so a production deploy never accepts them.
	devCors?: string[];
	prefix?: `/${string}`;
}

type ResolvedApiOptions = Required<Pick<ApiWorkerOptions, "prefix">> &
	Pick<ApiWorkerOptions, "cors" | "devCors">;

// The single dev predicate every gate reads: set by `stack dev`, never by a
// deploy. Also what `ctx._devMode` carries to procedures.
function isDevMode(env: unknown): boolean {
	return (env as Record<string, unknown> | null | undefined)?.STACK_DEV === "1";
}

// ---------- createWorker ----------

export default function createWorker(
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
				| MiddlewareHandler
				| ((
						ctx: TContext,
				  ) => Record<string, unknown> | Promise<Record<string, unknown>>),
		) {
			if (typeof pluginOrFn === "function") {
				const fn = pluginOrFn as (...args: unknown[]) => unknown;
				const newEntries: UseEntry[] = isHonoMiddleware(fn)
					? [...entries, { middleware: fn as MiddlewareHandler }]
					: [
							...entries,
							{
								fn: fn as (
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

		useAfterContext(middleware: MiddlewareHandler) {
			return createAppBuilder<TContext>(
				[...entries, { middleware, afterContext: true }],
				apiOptions,
			);
		},

		handler<TRoutes extends Record<string, unknown>>(
			consumerRoutes?: TRoutes,
		): WorkerExport<TRoutes> {
			const {
				prefix: rpcPrefix,
				cors: corsOrigin,
				devCors: devCorsOrigin,
			} = apiOptions;

			// Resolved per request, not at construction: the dev origins apply
			// only under STACK_DEV, and the same list backs `isForbiddenOrigin`.
			const effectiveOrigins = (env: unknown): string[] =>
				devCorsOrigin?.length && isDevMode(env)
					? [...(corsOrigin ?? []), ...devCorsOrigin]
					: (corsOrigin ?? []);

			// Sort once at construction time so both the context-building loop
			// and the fetch/routes loops below see plugins in dependency order,
			// regardless of `.use()` registration order.
			const sortedEntries = sortPluginEntries(entries);
			const pluginEntries = sortedEntries.filter(isPluginEntry);

			const procedure = createProcedure<TContext>();

			let pluginRoutes: Record<string, unknown> = {};
			// Tracks which plugin runtime registered each top-level route key, so
			// a collision with a consumer routes key names the owner instead of
			// silently letting `{ ...pluginRoutes, ...consumerRoutes }` clobber
			// the plugin's route (e.g. a consumer routes barrel that happens to
			// export `auth`, shadowing plugin-auth's `auth.orgRules`).
			const routeOwners = new Map<string, string>();
			for (const entry of pluginEntries) {
				const routes = entry.plugin.routes?.(procedure);
				if (routes) {
					for (const key of Object.keys(routes)) {
						routeOwners.set(key, entry.plugin.name);
					}
					pluginRoutes = { ...pluginRoutes, ...routes };
				}
			}

			if (consumerRoutes) {
				for (const key of Object.keys(consumerRoutes)) {
					const owner = routeOwners.get(key);
					if (owner) {
						throw new Error(
							`createWorker: consumer routes key "${key}" collides with a route ` +
								`namespace already registered by the "${owner}" plugin runtime. ` +
								"Rename the consumer routes export.",
						);
					}
				}
			}

			// `.handler()` (no arg) and `.handler({})` are equivalent: the worker
			// is a runnable shell that 404s every RPC call. Validating this at
			// construction time is intentional — it lets a worker boot before
			// any consumer routes have been authored.
			const fullRouter = { ...pluginRoutes, ...(consumerRoutes ?? {}) };

			// biome-ignore lint/suspicious/noExplicitAny: oRPC RPCHandler expects internal router type
			const rpcHandler = new RPCHandler(fullRouter as any, {
				plugins: [new RequestHeadersPlugin(), new ResponseHeadersPlugin()],
			});

			const app = new Hono<{
				Variables: {
					__stackCtx: Record<string, unknown>;
					__stackOrigins: string[];
				};
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
						// A function, not the array: the allow-list depends on
						// env (dev origins), which Hono only hands over per
						// request. Wildcard keeps the array form's meaning —
						// `["*"]` answers every origin with `*`.
						origin: (requestOrigin, c) => {
							const allowed = effectiveOrigins(c.env);
							if (allowed.includes("*")) return "*";
							return allowed.includes(requestOrigin) ? requestOrigin : null;
						},
						credentials: true,
					}),
				);
			}
			app.use("*", logger());
			app.use("*", secureHeaders());

			// Framework liveness route registered BEFORE the
			// validateEnv/context middleware so it doesn't require bindings.
			// Hono runs handlers in registration order: GET / responds and
			// returns; the universal middleware below never runs for it.
			app.get("/", (c) => c.json({ ok: true }));

			// Mount consumer Hono middleware into the Hono chain in
			// contribution order. They run AFTER the framework wrappers above
			// (cors / logger / secureHeaders / liveness) and BEFORE context
			// injection, matching the ordering plugins expect.
			for (const entry of sortedEntries) {
				if (isMiddlewareEntry(entry) && !entry.afterContext) {
					app.use("*", entry.middleware);
				}
			}

			app.use("*", async (c, next) => {
				const env = c.env;
				const request = c.req.raw;

				for (const entry of pluginEntries) {
					entry.plugin.validateEnv?.(env);
				}

				// `c.executionCtx` throws when the runtime supplied none (Node
				// tests, `.handler({})` invoked without a Workers ctx). A no-op
				// waitUntil is behaviorally correct outside Workers: the promise
				// still runs, waitUntil only extends the worker's lifetime.
				let executionCtx: { waitUntil(promise: Promise<unknown>): void };
				try {
					executionCtx = c.executionCtx;
				} catch {
					executionCtx = { waitUntil: () => {} };
				}

				let ctx: Record<string, unknown> = {
					env,
					request,
					executionCtx,
					_devMode: isDevMode(env),
				};

				for (const entry of sortedEntries) {
					if (isPluginEntry(entry)) {
						const provided = await entry.plugin.context(env, ctx);
						ctx = { ...ctx, ...provided };
					} else if (!isMiddlewareEntry(entry)) {
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

				c.set("__stackOrigins", effectiveOrigins(env));
				c.set("__stackCtx", ctx);
				await next();
			});

			// Post-context middleware. Mounted here — after injection, before
			// any route — so it can read `__stackCtx` (see `stackContext`);
			// everything above it runs with no context at all. A path a plugin
			// runtime claims in its own `fetch` (auth's `/api/auth`) returns
			// inside the middleware above and never reaches this.
			for (const entry of sortedEntries) {
				if (isMiddlewareEntry(entry) && entry.afterContext) {
					app.use("*", entry.middleware);
				}
			}

			app.post(`${rpcPrefix}/*`, async (c) => {
				// oRPC parses a request with a *missing* Content-Type as JSON, and
				// SameSite=None (native support) means a browser can send one
				// cross-site without a CORS preflight. Reject anything that isn't
				// explicitly application/json before it reaches the RPC handler.
				// Lowercased first: RFC 9110 treats the media type token
				// case-insensitively ("Application/JSON" is valid JSON).
				const contentType = c.req.header("content-type")?.toLowerCase();
				if (!contentType?.startsWith("application/json")) {
					return c.json({ code: "UNSUPPORTED_MEDIA_TYPE" }, 415);
				}

				const ctx = c.get("__stackCtx");

				// Blanket per-IP volume limiter across the whole /rpc tree, on its
				// own dedicated `RATE_LIMITER_RPC` binding (see the constant above)
				// — never the per-procedure `ctx._rateLimiter` bindings, so this
				// guard's budget never competes with `rateLimit: "ip"` procedures or
				// the auth surface. Production-only; skips silently when no
				// RATE_LIMITER_RPC binding is present (worker-only projects that
				// haven't run `wrangler types` / deployed the binding yet).
				const rpcLimiter = (
					c.env as Record<string, unknown> | null | undefined
				)?.[RATE_LIMITER_RPC] as RateLimitBinding | undefined;
				if (rpcLimiter && !(ctx as { _devMode?: boolean })._devMode) {
					const ip = extractIp(c.req.raw.headers);
					const result = await rpcLimiter.limit({ key: ip });
					if (!result.success) {
						return c.json({ code: "TOO_MANY_REQUESTS" }, 429);
					}
				}

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

// ---------- Consumer helpers ----------

// The injected plugin context (`db`, `auth`, `env`, …), for post-context
// middleware and raw Hono routes. Annotate the call with the generated
// `WorkerContext` to get the same typed context a procedure handler sees.
export function stackContext<
	TContext extends Record<string, unknown> = BaseContext,
>(c: Context): TContext {
	const ctx = c.get("__stackCtx") as TContext | undefined;
	if (!ctx) {
		throw new Error(
			"stackContext: no context on this request. Register the middleware with .useAfterContext() (src/worker/middleware.context.ts), not .use().",
		);
	}
	return ctx;
}

// CSRF guard for state-changing raw routes, which bypass the RPC tree's
// JSON-content-type check (a multipart R2 upload, say). True when the request
// carries a browser Origin that is not on the effective allow-list — which
// includes the dev origins only under STACK_DEV, and is empty (so no browser
// origin passes) on a worker configured without CORS at all. A request with NO
// Origin passes: a browser cannot drive one cross-site, and the native client
// sends none.
export function isForbiddenOrigin(c: Context): boolean {
	const origin = c.req.header("origin");
	if (!origin) return false;
	const allowed = c.get("__stackOrigins") as string[] | undefined;
	if (!allowed) {
		throw new Error(
			"isForbiddenOrigin: no origin list on this request. Register the middleware with .useAfterContext() (src/worker/middleware.context.ts), not .use().",
		);
	}
	return !allowed.includes(origin);
}
