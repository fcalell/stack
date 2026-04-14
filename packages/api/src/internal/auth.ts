import type { Context, Middleware } from "@orpc/server";
import { ORPCError } from "@orpc/server";

interface AuthRequirement extends Context {
	reqHeaders: Headers;
	auth: {
		api: {
			getSession: (opts: {
				headers: Headers;
			}) => Promise<{ user: unknown; session: unknown } | null>;
		};
	};
}

export type InferAuthContext<TContext> = TContext extends {
	auth: {
		$Infer: {
			Session: {
				user: infer U extends Record<string, unknown>;
				session: infer S extends Record<string, unknown>;
			};
		};
	};
}
	? { user: U; session: S }
	: {
			user: { id: string; [key: string]: unknown };
			session: { id: string; [key: string]: unknown };
		};

export function createAuthMiddleware<
	TContext extends AuthRequirement,
>(): Middleware<
	TContext,
	InferAuthContext<TContext>,
	unknown,
	unknown,
	Record<never, never>,
	Record<never, never>
> {
	return async ({ context, next }) => {
		try {
			const sessionData = await context.auth.api.getSession({
				headers: context.reqHeaders,
			});

			if (!sessionData?.session || !sessionData?.user) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "Authentication required",
				});
			}

			return next({
				context: {
					user: sessionData.user,
					session: sessionData.session,
				} as InferAuthContext<TContext>,
			});
		} catch (error) {
			if (error instanceof ORPCError) throw error;
			console.error("Authentication error", {
				error: error instanceof Error ? error.message : "unknown",
			});
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication failed",
			});
		}
	};
}
