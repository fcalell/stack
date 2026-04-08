import { RPCHandler } from "@orpc/server/fetch";
import {
	RequestHeadersPlugin,
	ResponseHeadersPlugin,
} from "@orpc/server/plugins";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

export type CorsOrigin =
	| string
	| string[]
	| ((origin: string) => string | null);

export interface AppConfig<
	TBindings extends Record<string, unknown>,
	TContext extends Record<string, unknown>,
> {
	router: Record<string, unknown>;
	context: (c: { env: TBindings; req: Request }) => TContext;
	cors?: CorsOrigin;
	prefix?: `/${string}`;
}

export function createApp<
	TBindings extends Record<string, unknown>,
	TContext extends Record<string, unknown>,
>(config: AppConfig<TBindings, TContext>) {
	const app = new Hono<{ Bindings: TBindings }>();
	const rpcPrefix = config.prefix ?? ("/rpc" as `/${string}`);

	app.use("*", logger());
	app.use("*", secureHeaders());

	if (config.cors) {
		const origin = config.cors;
		app.use(
			"*",
			cors({
				origin: origin,
				credentials: true,
			}),
		);
	}

	// biome-ignore lint/suspicious/noExplicitAny: oRPC RPCHandler expects internal router type, not public Record<string, unknown>
	const handler = new RPCHandler(config.router as any, {
		plugins: [new RequestHeadersPlugin(), new ResponseHeadersPlugin()],
	});

	app.post(`${rpcPrefix}/*`, async (c) => {
		const ctx = config.context({ env: c.env, req: c.req.raw });
		// Inject request headers for internal middleware (auth, rbac, rate-limit)
		(ctx as Record<string, unknown>)._headers = c.req.raw.headers;

		const { matched, response } = await handler.handle(c.req.raw, {
			prefix: rpcPrefix,
			context: ctx,
		});

		if (matched) {
			return c.newResponse(response.body, response);
		}

		return c.json({ error: "Not found", code: "NOT_FOUND" }, 404);
	});

	app.onError((err, c) => {
		console.error("API Error:", err);
		return c.json(
			{ error: "Internal server error", code: "INTERNAL_ERROR" },
			500,
		);
	});

	return app;
}
