import type { AuthPolicy } from "@fcalell/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import type { ProcedureBuilder, ProcedureFactory } from "#procedure";

interface AuthRouterConfig {
	policy: AuthPolicy;
	emailOTP: boolean;
}

function forwardCookies(betterAuthHeaders: Headers, resHeaders: Headers): void {
	const setCookies = betterAuthHeaders.getSetCookie();
	for (const cookie of setCookies) {
		resHeaders.append("Set-Cookie", cookie);
	}
}

function omitKeys(
	obj: Record<string, unknown>,
	keys: Set<string>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (!keys.has(key)) result[key] = value;
	}
	return result;
}

const SENSITIVE_USER_FIELDS = new Set(["password", "twoFactorSecret"]);
const SENSITIVE_SESSION_FIELDS = new Set(["token"]);

const sanitizeUser = (user: Record<string, unknown>) =>
	omitKeys(user, SENSITIVE_USER_FIELDS);
const sanitizeSession = (session: Record<string, unknown>) =>
	omitKeys(session, SENSITIVE_SESSION_FIELDS);

interface AuthContext {
	reqHeaders: Headers;
	resHeaders: Headers;
	auth: {
		api: {
			getSession: (opts: { headers: Headers }) => Promise<unknown>;
			signOut: (opts: {
				headers: Headers;
				returnHeaders: true;
			}) => Promise<{ headers: Headers }>;
			updateUser: (opts: {
				headers: Headers;
				body: Record<string, unknown>;
			}) => Promise<unknown>;
			sendVerificationOTP?: (opts: {
				body: Record<string, unknown>;
			}) => Promise<unknown>;
			signInEmailOTP?: (opts: {
				body: Record<string, unknown>;
				returnHeaders: true;
			}) => Promise<{ headers: Headers; response: unknown }>;
			setActiveOrganization?: (opts: {
				headers: Headers;
				body: Record<string, unknown>;
				returnHeaders: true;
			}) => Promise<{ headers: Headers }>;
		};
	};
	user: Record<string, unknown>;
	session: Record<string, unknown>;
	[key: string]: unknown;
}

// biome-ignore lint/suspicious/noExplicitAny: auth router is framework-internal and doesn't care about per-call type refinement
type AuthProcedureFactory = ProcedureFactory<any, any>;

export function createAuthRouter(
	procedure: AuthProcedureFactory,
	config: AuthRouterConfig,
) {
	const { policy } = config;
	const authProcedure = procedure({ auth: true });

	const router: Record<string, unknown> = {
		getSession: authProcedure.handler(
			async ({ context }: { context: AuthContext }) => ({
				user: sanitizeUser(context.user),
				session: sanitizeSession(context.session),
			}),
		),

		signOut: authProcedure.handler(
			async ({ context }: { context: AuthContext }) => {
				try {
					const { headers: authHeaders } = await context.auth.api.signOut({
						headers: context.reqHeaders,
						returnHeaders: true,
					});
					forwardCookies(authHeaders, context.resHeaders);
				} catch (error) {
					console.error("Failed to revoke session server-side", {
						error: error instanceof Error ? error.message : "unknown",
					});
				}
				return { success: true };
			},
		),

		updateUser: authProcedure
			.input(buildUpdateUserSchema(policy))
			.handler(
				async ({
					input,
					context,
				}: {
					input: Record<string, unknown>;
					context: AuthContext;
				}) => {
					await context.auth.api.updateUser({
						headers: context.reqHeaders,
						body: input,
					});
					return { ...sanitizeUser(context.user), ...input };
				},
			),
	};

	if (config.emailOTP) {
		Object.assign(router, createEmailOtpRoutes(procedure));
	}

	if (hasOrganization(policy)) {
		Object.assign(router, createOrgRoutes(authProcedure));
	}

	return router;
}

function createEmailOtpRoutes(procedure: AuthProcedureFactory) {
	const rateLimitedProcedure = procedure({ rateLimit: ["ip", "email"] });
	const emailSchema = z.object({
		email: z.string().email("Please enter a valid email address"),
	});

	const sendOtp = rateLimitedProcedure
		.input(emailSchema)
		.handler(
			async ({
				input,
				context,
			}: {
				input: { email: string };
				context: AuthContext;
			}) => {
				try {
					await context.auth.api.sendVerificationOTP?.({
						body: { email: input.email, type: "sign-in" },
					});
				} catch (error) {
					console.error("Failed to send OTP", {
						error: error instanceof Error ? error.message : "unknown",
					});
				}
				// Always return success (timing attack prevention)
				return { success: true };
			},
		);

	const verifyOtp = rateLimitedProcedure
		.input(
			emailSchema.extend({
				token: z.string().length(6, "OTP code must be 6 digits"),
			}),
		)
		.handler(
			async ({
				input,
				context,
			}: {
				input: { email: string; token: string };
				context: AuthContext;
			}) => {
				try {
					const result = await context.auth.api.signInEmailOTP?.({
						body: { email: input.email, otp: input.token },
						returnHeaders: true,
					});
					if (!result) {
						throw new ORPCError("INTERNAL_SERVER_ERROR", {
							message: "Email OTP plugin not configured",
						});
					}

					forwardCookies(result.headers, context.resHeaders);

					const user = extractResponseUser(result.response);
					if (!user) {
						throw new ORPCError("UNAUTHORIZED", {
							message: "Invalid or expired verification code",
						});
					}
					return { user };
				} catch (error) {
					if (error instanceof ORPCError) throw error;
					console.error("OTP verification failed", {
						error: error instanceof Error ? error.message : "unknown",
					});
					throw new ORPCError("UNAUTHORIZED", {
						message: "Invalid or expired verification code",
					});
				}
			},
		);

	return { sendOtp, verifyOtp };
}

function createOrgRoutes(
	authProcedure: Pick<ProcedureBuilder<AuthContext, undefined>, "input">,
) {
	const setActiveOrganization = authProcedure
		.input(z.object({ organizationId: z.string().min(1) }))
		.handler(
			async ({
				input,
				context,
			}: {
				input: { organizationId: string };
				context: AuthContext;
			}) => {
				const result = await context.auth.api.setActiveOrganization?.({
					headers: context.reqHeaders,
					body: { organizationId: input.organizationId },
					returnHeaders: true,
				});
				if (!result) {
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "Organization plugin not configured",
					});
				}

				forwardCookies(result.headers, context.resHeaders);

				return {
					success: true,
					activeOrganizationId: input.organizationId,
				};
			},
		);

	return { setActiveOrganization };
}

function hasOrganization(policy: AuthPolicy | undefined): boolean {
	return !!policy?.organization;
}

function buildUpdateUserSchema(policy: AuthPolicy | undefined) {
	const fields: Record<string, z.ZodType> = {
		name: z.string().min(1).max(255).optional(),
	};

	const additionalFields = policy?.user?.additionalFields;
	if (additionalFields) {
		for (const [key, config] of Object.entries(additionalFields)) {
			let field: z.ZodType;
			if (config.type === "string") field = z.string();
			else if (config.type === "number") field = z.number();
			else field = z.boolean();

			if (!config.required) field = field.optional();
			fields[key] = field;
		}
	}

	return z.object(fields);
}

function extractResponseUser(
	response: unknown,
): { id: string; email: string } | undefined {
	if (typeof response !== "object" || response === null) return undefined;
	if (!("user" in response)) return undefined;
	const { user } = response;
	if (typeof user !== "object" || user === null) return undefined;
	if (!("id" in user) || !("email" in user)) return undefined;
	if (typeof user.id !== "string" || typeof user.email !== "string")
		return undefined;
	return { id: user.id, email: user.email };
}
