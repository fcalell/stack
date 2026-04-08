import type { Context, Middleware } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { getHeaders } from "#internal/headers";

export interface RateLimitBinding {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface RateLimitContext extends Context {
	_rateLimiter?: {
		ip?: RateLimitBinding;
		email?: RateLimitBinding;
	};
	_devMode?: boolean;
}

async function enforce(limiter: RateLimitBinding, key: string): Promise<void> {
	const result = await limiter.limit({ key });
	if (!result.success) {
		throw new ORPCError("TOO_MANY_REQUESTS", {
			message: "Rate limit exceeded. Please try again later.",
		});
	}
}

function getClientIp(headers: Headers | undefined): string {
	if (!headers) return "unknown";
	return headers.get("CF-Connecting-IP") || "unknown";
}

export function createIpRateLimitMiddleware<
	TContext extends RateLimitContext,
>(): Middleware<
	TContext,
	Record<never, never>,
	unknown,
	unknown,
	Record<never, never>,
	Record<never, never>
> {
	return async ({ context, next }) => {
		const limiter = context._rateLimiter?.ip;
		const isDev = context._devMode ?? false;

		if (limiter && !isDev) {
			await enforce(limiter, getClientIp(getHeaders(context)));
		} else if (!limiter && !isDev) {
			console.error("IP rate limiter not configured in production");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Server configuration error",
			});
		}

		return next({ context: {} });
	};
}

export function createEmailRateLimitMiddleware<
	TContext extends RateLimitContext,
>(): Middleware<
	TContext,
	Record<never, never>,
	{ email: string },
	unknown,
	Record<never, never>,
	Record<never, never>
> {
	return async ({ context, next }, input: { email: string }) => {
		const limiter = context._rateLimiter?.email;
		const isDev = context._devMode ?? false;

		if (limiter && !isDev) {
			await enforce(limiter, input.email.toLowerCase());
		} else if (!limiter && !isDev) {
			console.error("Email rate limiter not configured in production");
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Server configuration error",
			});
		}

		return next({ context: {} });
	};
}
