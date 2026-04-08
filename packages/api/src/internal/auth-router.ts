import type { AuthPolicy } from "@fcalell/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

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

function getResHeaders(context: Record<string, unknown>): Headers {
	const resHeaders = context.resHeaders as Headers | undefined;
	if (!resHeaders) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Response headers not available",
		});
	}
	return resHeaders;
}

function getReqHeaders(context: Record<string, unknown>): Headers {
	const reqHeaders =
		(context._headers as Headers | undefined) ??
		(context.reqHeaders as Headers | undefined);
	if (!reqHeaders) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Request headers not available",
		});
	}
	return reqHeaders;
}

interface AuthContext {
	auth: {
		api: {
			getSession: (opts: { headers: Headers }) => Promise<unknown>;
			signOut: (opts: {
				headers: Headers;
				returnHeaders: true;
			}) => Promise<{ headers: Headers }>;
			updateUser: (opts: {
				headers: Headers;
				// biome-ignore lint/suspicious/noExplicitAny: Better Auth body type
				body: any;
			}) => Promise<unknown>;
			sendVerificationOTP?: (opts: {
				// biome-ignore lint/suspicious/noExplicitAny: Better Auth body type
				body: any;
			}) => Promise<unknown>;
			signInEmailOTP?: (opts: {
				// biome-ignore lint/suspicious/noExplicitAny: Better Auth body type
				body: any;
				returnHeaders: true;
			}) => Promise<{ headers: Headers; response: unknown }>;
			setActiveOrganization?: (opts: {
				headers: Headers;
				// biome-ignore lint/suspicious/noExplicitAny: Better Auth body type
				body: any;
				returnHeaders: true;
			}) => Promise<{ headers: Headers }>;
		};
	};
	user: Record<string, unknown>;
	session: Record<string, unknown>;
	[key: string]: unknown;
}

// biome-ignore lint/suspicious/noExplicitAny: Procedure builder from createProcedure, internal usage
type ProcedureBuilder = any;

export function createAuthRouter(
	baseProcedure: ProcedureBuilder,
	authProcedure: ProcedureBuilder,
	config: AuthRouterConfig,
) {
	const { policy } = config;
	// biome-ignore lint/suspicious/noExplicitAny: dynamic router construction
	const router: Record<string, any> = {};

	// Always available when auth is configured
	router.getSession = authProcedure.handler(
		async ({ context }: { context: AuthContext }) => {
			const { user, session } = context;
			return {
				user: sanitizeUser(user),
				session: sanitizeSession(session),
			};
		},
	);

	router.signOut = authProcedure.handler(
		async ({ context }: { context: AuthContext }) => {
			const reqHeaders = getReqHeaders(context);
			const resHeaders = getResHeaders(context);

			try {
				const { headers: authHeaders } = await context.auth.api.signOut({
					headers: reqHeaders,
					returnHeaders: true,
				});
				forwardCookies(authHeaders, resHeaders);
			} catch (error) {
				console.error("Failed to revoke session server-side", {
					error: error instanceof Error ? error.message : "unknown",
				});
			}

			return { success: true };
		},
	);

	router.updateUser = authProcedure
		.input(buildUpdateUserSchema(policy))
		.handler(
			async ({
				input,
				context,
			}: {
				input: Record<string, unknown>;
				context: AuthContext;
			}) => {
				const reqHeaders = getReqHeaders(context);

				await context.auth.api.updateUser({
					headers: reqHeaders,
					body: input,
				});

				return {
					...sanitizeUser(context.user),
					...input,
				};
			},
		);

	// Email OTP procedures
	if (config.emailOTP) {
		router.sendOtp = baseProcedure
			.rateLimit("ip")
			.rateLimit("email")
			.input(
				z.object({
					email: z.string().email("Please enter a valid email address"),
				}),
			)
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

		router.verifyOtp = baseProcedure
			.rateLimit("ip")
			.rateLimit("email")
			.input(
				z.object({
					email: z.string().email("Please enter a valid email address"),
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
					const resHeaders = getResHeaders(context);

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

						forwardCookies(result.headers, resHeaders);

						const response = result.response as
							| { user?: { id: string; email: string } }
							| undefined;
						if (!response?.user) {
							throw new ORPCError("UNAUTHORIZED", {
								message: "Invalid or expired verification code",
							});
						}

						return {
							user: {
								id: response.user.id,
								email: response.user.email,
							},
						};
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
	}

	// Organization procedures
	if (hasOrganization(policy)) {
		router.setActiveOrganization = authProcedure
			.input(z.object({ organizationId: z.string().min(1) }))
			.handler(
				async ({
					input,
					context,
				}: {
					input: { organizationId: string };
					context: AuthContext;
				}) => {
					const reqHeaders = getReqHeaders(context);
					const resHeaders = getResHeaders(context);

					const result = await context.auth.api.setActiveOrganization?.({
						headers: reqHeaders,
						body: { organizationId: input.organizationId },
						returnHeaders: true,
					});
					if (!result) {
						throw new ORPCError("INTERNAL_SERVER_ERROR", {
							message: "Organization plugin not configured",
						});
					}

					forwardCookies(result.headers, resHeaders);

					return {
						success: true,
						activeOrganizationId: input.organizationId,
					};
				},
			);
	}

	return router;
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

const SENSITIVE_USER_FIELDS = new Set(["password", "twoFactorSecret"]);

function sanitizeUser(user: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(user)) {
		if (!SENSITIVE_USER_FIELDS.has(key)) {
			result[key] = value;
		}
	}
	return result;
}

function sanitizeSession(
	session: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(session)) {
		if (key !== "token") {
			result[key] = value;
		}
	}
	return result;
}
