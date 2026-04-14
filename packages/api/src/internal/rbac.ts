import type { Context, Middleware } from "@orpc/server";
import { ORPCError } from "@orpc/server";

interface OrgScopedContext extends Context {
	session: { activeOrganizationId?: string | null; [key: string]: unknown };
}

interface RbacContext extends Context {
	reqHeaders: Headers;
	auth: {
		api: {
			hasPermission: (opts: {
				headers: Headers;
				body: { permissions: Record<string, string[]> };
			}) => Promise<{ success: boolean } | null>;
		};
	};
	session: { [key: string]: unknown };
}

export function createOrgConsistencyMiddleware<
	TContext extends OrgScopedContext,
>(): Middleware<
	TContext,
	{ organizationId: string },
	{ organizationId: string },
	unknown,
	Record<never, never>,
	Record<never, never>
> {
	return async ({ context, next }, input: { organizationId: string }) => {
		const { activeOrganizationId } = context.session;
		if (!activeOrganizationId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "No active organization found in session",
			});
		}

		if (input.organizationId !== activeOrganizationId) {
			throw new ORPCError("FORBIDDEN", {
				message: "Organization ID mismatch",
			});
		}

		return next({ context: { organizationId: activeOrganizationId } });
	};
}

export function createRbacMiddleware<TContext extends RbacContext>(
	resource: string,
	actions: string[],
): Middleware<
	TContext,
	Record<never, never>,
	unknown,
	unknown,
	Record<never, never>,
	Record<never, never>
> {
	return async ({ context, next }) => {
		const result = await context.auth.api.hasPermission({
			headers: context.reqHeaders,
			body: { permissions: { [resource]: actions } },
		});

		if (!result?.success) {
			throw new ORPCError("FORBIDDEN", {
				message: "Insufficient permissions",
			});
		}

		return next({ context: {} });
	};
}
