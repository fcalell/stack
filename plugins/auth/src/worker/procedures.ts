import type { oauthProvider } from "@better-auth/oauth-provider";
import type { ProcedureFactory } from "@fcalell/plugin-api/procedure";
import { z } from "@fcalell/plugin-api/schema";
import { ORPCError } from "@orpc/server";
import { isAPIError } from "better-auth/api";
import type { betterAuth } from "better-auth/minimal";
import type { role as buildAcRole } from "better-auth/plugins/access";
import type { emailOTP } from "better-auth/plugins/email-otp";
import type { magicLink } from "better-auth/plugins/magic-link";
import type { DefaultOrganizationPlugin } from "better-auth/plugins/organization";
import { unsafeCallbackField } from "./callback-url.ts";
import { emailKey } from "./email-key.ts";
import type {
	AcceptedInvitation,
	ActiveOrganization,
	Invitation,
	OAuthClientPublic,
	RejectedInvitation,
} from "./outputs.ts";
import type { Tenancy } from "./tenancy.ts";

// The oRPC face of better-auth: one procedure per endpoint a web app calls,
// so the app never imports better-auth's client. Each runs the endpoint on
// the server API with the request's headers, copies the cookies it sets onto
// the response and answers the endpoint's body.

// Structural match with plugin-api's `RateLimitBinding` (see `index.ts`).
interface RateLimitBinding {
	limit(opts: { key: string }): Promise<{ success: boolean }>;
}

// The server API of an instance with every plugin a procedure here calls
// into. `roles` is `Record<string, ...>` so a role is a `string`, as the
// consumer's own roles are: the default instance types it as owner, admin or
// member.
type FullApi = ReturnType<
	typeof betterAuth<{
		plugins: [
			ReturnType<typeof emailOTP>,
			ReturnType<typeof magicLink>,
			ReturnType<typeof oauthProvider>,
			DefaultOrganizationPlugin<{
				roles: Record<string, ReturnType<typeof buildAcRole>>;
			}>,
		];
	}>
>["api"];

// What the procedures read off the request context. `tenancy` exists only
// with organizations on, and only the organization procedures use it.
export type AuthProcedureFactory = ProcedureFactory<
	{
		tenancy: Tenancy;
		reqHeaders: Headers;
		resHeaders: Headers;
		auth: { api: FullApi };
		_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
		_devMode?: boolean;
		_trustedOrigins?: readonly string[];
	},
	Record<string, readonly string[]>
>;

interface CallContext {
	reqHeaders: Headers;
	resHeaders: Headers;
}

interface CallOptions {
	headers: Headers;
	returnHeaders: true;
}

const ORPC_CODES: Record<number, ORPCError<string, unknown>["code"]> = {
	400: "BAD_REQUEST",
	401: "UNAUTHORIZED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	429: "TOO_MANY_REQUESTS",
};

// A better-auth refusal keeps its status, message and `code`; its other body
// fields (a form's `fieldErrors`) ride along as the error's data.
function refusal(error: unknown): unknown {
	if (!isAPIError(error)) return error;
	const { message, cause, ...data } = error.body ?? {};
	return new ORPCError(
		ORPC_CODES[error.statusCode] ?? "INTERNAL_SERVER_ERROR",
		{
			message: message ?? error.message,
			data,
		},
	);
}

// Runs one endpoint as the caller: its `set-cookie` headers go to the
// response, its body comes back, its `APIError` becomes an `ORPCError`.
async function callAuth<R>(
	context: CallContext,
	endpoint: (
		options: CallOptions,
	) => Promise<{ headers: Headers; response: R }>,
): Promise<R> {
	try {
		const { headers, response } = await endpoint({
			headers: context.reqHeaders,
			returnHeaders: true,
		});
		for (const cookie of headers.getSetCookie()) {
			context.resHeaders.append("set-cookie", cookie);
		}
		return response;
	} catch (error) {
		throw refusal(error);
	}
}

// The per-email limit the `fetch` handler applies to the two emailing
// endpoints, on the same bucket and key; production only, and skipped when no
// binding is bound.
async function limitEmail(
	context: {
		_rateLimiter?: { email?: RateLimitBinding };
		_devMode?: boolean;
	},
	email: string,
): Promise<void> {
	const limiter = context._rateLimiter?.email;
	if (!limiter || context._devMode) return;
	const { success } = await limiter.limit({ key: emailKey(email) });
	if (!success) {
		throw new ORPCError("TOO_MANY_REQUESTS", {
			message: "Rate limit exceeded. Please try again later.",
		});
	}
}

// The calls here run on the server API without the request, which skips
// better-auth's origin check; a redirect the member's link carries is checked
// here against the origins the instance trusts (a path on the app always
// passes). With none known, only paths pass.
const REDIRECT_FIELDS = [
	"callbackURL",
	"newUserCallbackURL",
	"errorCallbackURL",
] as const;

function assertRedirects(
	context: { _trustedOrigins?: readonly string[] },
	input: Partial<Record<(typeof REDIRECT_FIELDS)[number], string | undefined>>,
): void {
	const field = unsafeCallbackField(
		input,
		REDIRECT_FIELDS,
		context._trustedOrigins ?? [],
	);
	if (field) {
		throw new ORPCError("BAD_REQUEST", {
			message: `\`${field}\` must be a path on this app or a URL on a trusted origin.`,
			data: { code: "INVALID_CALLBACK_URL", field },
		});
	}
}

const EMAIL = z.email();

// With `mcp`, an authorization sends the member to the app's sign-in,
// organization and consent pages carrying a signed query. Better Auth's
// OAuth provider client plugin copies it (`buildSignedOAuthQuery` of the
// page's search) into the body of every non-GET call as `oauth_query`; the
// provider's hooks verify it and, once a call signs the member in, answer
// `{ redirect: true, url }` for the app to follow. `oauthQuery` is that
// string, passed to the endpoint as `oauth_query`.
const OAUTH_QUERY = z.string().min(1).optional();

// The answer of a call made inside an authorization.
export interface OAuthRedirect {
	redirect: true;
	url: string;
}

// The body with the signed query where the client plugin puts it.
function withOAuthQuery<T extends object>(
	body: T,
	oauthQuery: string | undefined,
) {
	return { ...body, oauth_query: oauthQuery };
}
// Metadata is the app's own JSON; the endpoint stores it as given.
const METADATA = z.record(z.string(), z.unknown());

// ---------- always on ----------

export function sessionProcedures(factory: AuthProcedureFactory) {
	return {
		session: factory({ reads: ["session"] })
			.input(
				z.object({ disableCookieCache: z.boolean().optional() }).optional(),
			)
			.query(({ input, context }) =>
				callAuth(context, (options) =>
					context.auth.api.getSession({
						...options,
						query: { disableCookieCache: input?.disableCookieCache },
					}),
				),
			),
		signOut: factory({ writes: ["session"] }).mutation(({ context }) =>
			callAuth(context, (options) => context.auth.api.signOut(options)),
		),
		user: {
			update: factory({ auth: true, writes: ["session", "member"] })
				.input(
					z.object({
						name: z.string().min(1).optional(),
						image: z.string().nullable().optional(),
					}),
				)
				.mutation(({ input, context }) =>
					callAuth(context, (options) =>
						context.auth.api.updateUser({ ...options, body: input }),
					),
				),
		},
	};
}

// ---------- emailOtp ----------

// The code's digits, which the plugin pins to the same length.
export const OTP_LENGTH = 6;

export function emailOtpProcedures(factory: AuthProcedureFactory) {
	return {
		sendOtp: factory()
			.input(z.object({ email: EMAIL }))
			.mutation(async ({ input, context }) => {
				await limitEmail(context, input.email);
				return callAuth(context, (options) =>
					context.auth.api.sendVerificationOTP({
						...options,
						body: { email: input.email, type: "sign-in" },
					}),
				);
			}),
		verifyOtp: factory({ writes: ["session"] })
			.input(
				z.object({
					email: EMAIL,
					otp: z.string().length(OTP_LENGTH),
					name: z.string().optional(),
					image: z.string().optional(),
				}),
			)
			.mutation(({ input, context }) =>
				callAuth(context, (options) =>
					context.auth.api.signInEmailOTP({ ...options, body: input }),
				),
			),
	};
}

// With `mcp`: `verifyOtp` takes the page's signed query and may answer the
// redirect that resumes the authorization.
export function emailOtpOauthProcedures(factory: AuthProcedureFactory) {
	return {
		...emailOtpProcedures(factory),
		verifyOtp: factory({ writes: ["session"] })
			.input(
				z.object({
					email: EMAIL,
					otp: z.string().length(OTP_LENGTH),
					name: z.string().optional(),
					image: z.string().optional(),
					oauthQuery: OAUTH_QUERY,
				}),
			)
			.mutation(({ input: { oauthQuery, ...input }, context }) =>
				callAuth<
					Awaited<ReturnType<FullApi["signInEmailOTP"]>> | OAuthRedirect
				>(context, (options) =>
					context.auth.api.signInEmailOTP({
						...options,
						body: withOAuthQuery(input, oauthQuery),
					}),
				),
			),
	};
}

// ---------- magicLink ----------

export function magicLinkProcedures(factory: AuthProcedureFactory) {
	return {
		magicLink: factory()
			.input(
				z.object({
					email: EMAIL,
					name: z.string().optional(),
					callbackURL: z.string().optional(),
					newUserCallbackURL: z.string().optional(),
					errorCallbackURL: z.string().optional(),
					metadata: METADATA.optional(),
				}),
			)
			.mutation(async ({ input, context }) => {
				assertRedirects(context, input);
				await limitEmail(context, input.email);
				return callAuth(context, (options) =>
					context.auth.api.signInMagicLink({ ...options, body: input }),
				);
			}),
	};
}

// With `mcp`, as `emailOtpOauthProcedures`.
export function magicLinkOauthProcedures(factory: AuthProcedureFactory) {
	return {
		magicLink: factory()
			.input(
				z.object({
					email: EMAIL,
					name: z.string().optional(),
					callbackURL: z.string().optional(),
					newUserCallbackURL: z.string().optional(),
					errorCallbackURL: z.string().optional(),
					metadata: METADATA.optional(),
					oauthQuery: OAUTH_QUERY,
				}),
			)
			.mutation(async ({ input: { oauthQuery, ...input }, context }) => {
				assertRedirects(context, input);
				await limitEmail(context, input.email);
				return callAuth<
					Awaited<ReturnType<FullApi["signInMagicLink"]>> | OAuthRedirect
				>(context, (options) =>
					context.auth.api.signInMagicLink({
						...options,
						body: withOAuthQuery(input, oauthQuery),
					}),
				);
			}),
	};
}

// ---------- organization ----------

// Better Auth takes any non-empty slug and refuses a taken one; the one this
// derives from a name is its lowercase words (accents folded away) joined by
// hyphens.
function slugOf(name: string): string {
	return name
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

const ORGANIZATION_FIELDS = {
	name: z.string().min(1),
	slug: z.string().min(1),
	logo: z.string().nullable().optional(),
	metadata: METADATA.optional(),
};

export function organizationProcedures(factory: AuthProcedureFactory) {
	const organizationId = z.string().min(1);
	return {
		organization: {
			list: factory({ auth: true, reads: ["organization", "member"] }).query(
				({ context }) =>
					callAuth(context, (options) =>
						context.auth.api.listOrganizations(options),
					),
			),
			create: factory({
				auth: true,
				writes: ["organization", "member", "session"],
			})
				.input(
					z.object({
						name: ORGANIZATION_FIELDS.name,
						slug: ORGANIZATION_FIELDS.slug.optional(),
						logo: ORGANIZATION_FIELDS.logo,
						metadata: ORGANIZATION_FIELDS.metadata,
						keepCurrentActiveOrganization: z.boolean().optional(),
					}),
				)
				.mutation(({ input, context }) =>
					callAuth(context, (options) =>
						context.auth.api.createOrganization({
							...options,
							body: { ...input, slug: input.slug ?? slugOf(input.name) },
						}),
					),
				),
			update: factory({ auth: true, writes: ["organization"] })
				.input(
					z.object({
						name: ORGANIZATION_FIELDS.name.optional(),
						slug: ORGANIZATION_FIELDS.slug.optional(),
						logo: ORGANIZATION_FIELDS.logo,
						metadata: ORGANIZATION_FIELDS.metadata,
						organizationId: organizationId.optional(),
					}),
				)
				.mutation(({ input: { organizationId, ...data }, context }) =>
					callAuth(context, (options) =>
						context.auth.api.updateOrganization({
							...options,
							body: { data, organizationId },
						}),
					),
				),
			delete: factory({
				auth: true,
				writes: ["organization", "member", "session"],
			})
				.input(z.object({ organizationId }))
				.mutation(({ input, context }) =>
					callAuth(context, (options) =>
						context.auth.api.deleteOrganization({ ...options, body: input }),
					),
				),
			setActive: factory({ auth: true, writes: ["session"] })
				.input(
					z.object({
						organizationId: organizationId.nullable().optional(),
						organizationSlug: z.string().min(1).optional(),
					}),
				)
				.mutation(({ input, context }) =>
					callAuth<ActiveOrganization | null>(context, (options) =>
						context.auth.api.setActiveOrganization({ ...options, body: input }),
					),
				),
			activeMember: factory({ auth: true, reads: ["member", "session"] }).query(
				({ context }) =>
					callAuth(context, (options) =>
						context.auth.api.getActiveMember(options),
					),
			),
			members: {
				updateRole: factory({ auth: true, writes: ["member"] })
					.input(
						z.object({
							memberId: z.string().min(1),
							role: z.string().min(1),
							organizationId: organizationId.optional(),
						}),
					)
					.mutation(({ input, context }) =>
						callAuth(context, (options) =>
							context.auth.api.updateMemberRole({ ...options, body: input }),
						),
					),
				remove: factory({ auth: true, writes: ["member"] })
					.input(
						z.object({
							memberIdOrEmail: z.string().min(1),
							organizationId: organizationId.optional(),
						}),
					)
					.mutation(({ input, context }) =>
						callAuth(context, (options) =>
							context.auth.api.removeMember({ ...options, body: input }),
						),
					),
			},
			invitations: {
				create: factory({ auth: true, writes: ["invitation"] })
					.input(
						z.object({
							email: EMAIL,
							role: z.string().min(1),
							organizationId: organizationId.optional(),
							resend: z.boolean().optional(),
						}),
					)
					.mutation(({ input, context }) =>
						callAuth<Invitation>(context, (options) =>
							context.auth.api.createInvitation({ ...options, body: input }),
						),
					),
				cancel: factory({ auth: true, writes: ["invitation"] })
					.input(z.object({ invitationId: z.string().min(1) }))
					.mutation(({ input, context }) =>
						callAuth<Invitation | null>(context, (options) =>
							context.auth.api.cancelInvitation({ ...options, body: input }),
						),
					),
				accept: factory({
					auth: true,
					writes: ["invitation", "member", "organization", "session"],
				})
					.input(z.object({ invitationId: z.string().min(1) }))
					.mutation(({ input, context }) =>
						callAuth<AcceptedInvitation>(context, (options) =>
							context.auth.api.acceptInvitation({ ...options, body: input }),
						),
					),
				reject: factory({ auth: true, writes: ["invitation"] })
					.input(z.object({ invitationId: z.string().min(1) }))
					.mutation(({ input, context }) =>
						callAuth<RejectedInvitation>(context, (options) =>
							context.auth.api.rejectInvitation({ ...options, body: input }),
						),
					),
			},
		},
	};
}

// With `mcp`, `setActive` replaces the organization one: inside an
// authorization it takes the page's signed query and may answer the redirect
// that resumes it.
export function setActiveOauthProcedure(factory: AuthProcedureFactory) {
	return factory({ auth: true, writes: ["session"] })
		.input(
			z.object({
				organizationId: z.string().min(1).nullable().optional(),
				organizationSlug: z.string().min(1).optional(),
				oauthQuery: OAUTH_QUERY,
			}),
		)
		.mutation(({ input: { oauthQuery, ...input }, context }) =>
			callAuth<ActiveOrganization | null | OAuthRedirect>(context, (options) =>
				context.auth.api.setActiveOrganization({
					...options,
					body: withOAuthQuery(input, oauthQuery),
				}),
			),
		);
}

// ---------- mcp ----------

export function oauthProcedures(factory: AuthProcedureFactory) {
	return {
		oauth: {
			client: factory({ auth: true })
				.input(z.object({ clientId: z.string().min(1) }))
				.query(({ input, context }) =>
					callAuth<OAuthClientPublic>(context, (options) =>
						context.auth.api.getOAuthClientPublic({
							...options,
							query: { client_id: input.clientId },
						}),
					),
				),
			consent: factory({ auth: true, writes: ["oauthConsent"] })
				.input(
					z.object({
						accept: z.boolean(),
						scope: z.string().optional(),
						oauthQuery: OAUTH_QUERY,
					}),
				)
				.mutation(({ input: { oauthQuery, ...input }, context }) =>
					callAuth(context, (options) =>
						context.auth.api.oauth2Consent({
							...options,
							body: withOAuthQuery(input, oauthQuery),
						}),
					),
				),
		},
	};
}
