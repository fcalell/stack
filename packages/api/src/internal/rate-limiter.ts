import type { Context, Middleware } from "@orpc/server";
import { ORPCError } from "@orpc/server";

export interface RateLimitBinding {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type RateLimitKind = "ip" | "email";

interface RateLimitContext extends Context {
	reqHeaders: Headers;
	_rateLimiter?: {
		ip?: RateLimitBinding;
		email?: RateLimitBinding;
	};
	_devMode?: boolean;
}

type KeyExtractor = (context: RateLimitContext, input: unknown) => string;

const KEY_EXTRACTORS: Record<RateLimitKind, KeyExtractor> = {
	ip: (context) => context.reqHeaders.get("CF-Connecting-IP") || "unknown",
	email: (_, input) => (input as { email: string }).email.toLowerCase(),
};

type InputOf<K extends RateLimitKind> = K extends "email"
	? { email: string }
	: unknown;

export function createRateLimitMiddleware<
	K extends RateLimitKind,
	TContext extends RateLimitContext,
>(
	kind: K,
): Middleware<
	TContext,
	Record<never, never>,
	InputOf<K>,
	unknown,
	Record<never, never>,
	Record<never, never>
> {
	return async ({ context, next }, input) => {
		const limiter = context._rateLimiter?.[kind];
		const isDev = context._devMode ?? false;

		if (isDev) return next({ context: {} });

		if (!limiter) {
			console.error(`${kind} rate limiter not configured in production`);
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Server configuration error",
			});
		}

		const key = KEY_EXTRACTORS[kind](context, input);
		const result = await limiter.limit({ key });
		if (!result.success) {
			throw new ORPCError("TOO_MANY_REQUESTS", {
				message: "Rate limit exceeded. Please try again later.",
			});
		}

		return next({ context: {} });
	};
}
