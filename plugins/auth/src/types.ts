import { z } from "zod";

// The path better-auth mounts under inside the worker. Shared so the runtime
// and the codegen contribution to `api.slots.routePrefixes` can never drift.
export const AUTH_PREFIX = "/api/auth";

// The discovery documents an MCP client reads before it opens an
// authorization: the authorization server's and the protected resource's.
// Served by better-auth at the issuer-inserted and resource-inserted
// aliases below these prefixes, so each prefix is a worker route.
export const OAUTH_DISCOVERY_PREFIXES = [
	"/.well-known/oauth-authorization-server",
	"/.well-known/oauth-protected-resource",
] as const;

// The protected resource an access token is bound to, under the app URL,
// and the pages the authorization sends the member to. Pinned, not options:
// the screens that serve them are the app's, built to these addresses.
export const MCP_RESOURCE_PATH = "/mcp";
export const MCP_LOGIN_PAGE = "/sign-in";
export const MCP_ORGANIZATION_PAGE = "/connect/organization";
export const MCP_CONSENT_PAGE = "/connect/consent";

// The scopes an agent's grant holds: `mcp` is the whole tool list,
// `offline_access` the refresh token.
export const MCP_SCOPE = "mcp";
export const MCP_SCOPES = [MCP_SCOPE, "offline_access"] as const;

const rateLimiterIpSchema = z
	.object({
		binding: z.string().default("RATE_LIMITER_IP"),
		limit: z
			.number()
			.positive({ error: "auth: rateLimiter.limit must be a positive number" })
			.default(100),
		period: z
			.number()
			.positive({ error: "auth: rateLimiter.period must be a positive number" })
			.default(60),
	})
	.default({ binding: "RATE_LIMITER_IP", limit: 100, period: 60 });

// Cloudflare rate-limiter bindings only accept `period` 10 or 60 (seconds) —
// https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/.
// Default: 3 sends per 60s, an OTP-send abuse gate that still allows one quick
// resend.
const rateLimiterEmailSchema = z
	.object({
		binding: z.string().default("RATE_LIMITER_EMAIL"),
		limit: z
			.number()
			.positive({ error: "auth: rateLimiter.limit must be a positive number" })
			.default(3),
		period: z
			.number()
			.positive({ error: "auth: rateLimiter.period must be a positive number" })
			.default(60),
	})
	.default({ binding: "RATE_LIMITER_EMAIL", limit: 3, period: 60 });

// Per-grant limit on agent calls, one bucket per grant, the same Cloudflare
// rate-limiter shape. Bound only while `mcp` is on.
const rateLimiterAgentSchema = z
	.object({
		binding: z.string().default("RATE_LIMITER_AGENT"),
		limit: z
			.number()
			.positive({ error: "auth: rateLimiter.limit must be a positive number" })
			.default(120),
		period: z
			.number()
			.positive({ error: "auth: rateLimiter.period must be a positive number" })
			.default(60),
	})
	.default({ binding: "RATE_LIMITER_AGENT", limit: 120, period: 60 });

const organizationObjectSchema = z.object({
	ac: z.unknown().optional(),
	roles: z.record(z.string(), z.unknown()).optional(),
});

const socialProviderConfigSchema = z.object({
	clientIdVar: z.string().optional(),
	clientSecretVar: z.string().optional(),
});

const appleProviderConfigSchema = socialProviderConfigSchema.extend({
	// Native (Expo) Apple Sign-In issues the ID token to the app bundle id;
	// Better Auth needs it to validate native tokens. Optional — the
	// browser-redirect OAuth flow doesn't require it.
	appBundleIdentifier: z.string().optional(),
});

const passkeyObjectSchema = z.object({
	// The WebAuthn relying-party id: the domain credentials are bound to.
	// Defaults to `app.domain`, a registrable suffix of every derived origin.
	rpID: z.string().optional(),
	// The name the authenticator shows the user. Defaults to `app.name`.
	rpName: z.string().optional(),
	// Origins a ceremony may come from. Defaults to the worker's resolved
	// production CORS list.
	origin: z.union([z.string(), z.array(z.string())]).optional(),
	// Passed through to the registration options; better-auth's defaults are
	// `residentKey: "preferred"` and `userVerification: "preferred"`.
	authenticatorSelection: z
		.object({
			authenticatorAttachment: z
				.enum(["platform", "cross-platform"])
				.optional(),
			requireResidentKey: z.boolean().optional(),
			residentKey: z.enum(["discouraged", "preferred", "required"]).optional(),
			userVerification: z
				.enum(["discouraged", "preferred", "required"])
				.optional(),
		})
		.optional(),
});

export const authOptionsSchema = z
	.object({
		cookies: z
			.object({
				prefix: z.string().optional(),
				domain: z.string().optional(),
			})
			.optional(),
		session: z
			.object({
				// `positive` emits a "too_small" issue whose path is
				// ["session", "expiresIn"] — the path substring satisfies the
				// `.toThrow("expiresIn")` assertion.
				expiresIn: z
					.number()
					.positive({
						error: "auth: session.expiresIn must be a positive number",
					})
					.optional(),
				updateAge: z.number().optional(),
				// How recently the session must have been created for better-auth to
				// treat it as fresh; account deletion without email confirmation needs
				// a fresh session. 0 disables the check entirely, so any stolen
				// session cookie of any age can delete the account. Passwordless
				// consumers should implement the `sendDeleteVerification` callback
				// (email confirmation, no freshness requirement) instead of 0.
				freshAge: z
					.number()
					.nonnegative({
						error: "auth: session.freshAge must be zero or a positive number",
					})
					.optional(),
			})
			.optional(),
		// The plugin owns the identity tables, so they carry no consumer columns:
		// data a consumer keeps per user or per organization lives in its own
		// table, keyed by that id.
		user: z
			.object({
				// Account deletion (App Store 5.1.1(v) requires it for a native app).
				// Off unless asked for: the endpoint destroys rows. The consumer's
				// `beforeDelete` callback vetoes or cleans up. With the
				// `sendDeleteVerification` callback implemented, deletion goes
				// through an emailed confirmation link; without it, a session older
				// than `session.freshAge` is refused.
				deleteUser: z.boolean().optional(),
			})
			.optional(),
		organization: z.union([z.boolean(), organizationObjectSchema]).optional(),
		// Email one-time-password sign-in. On by default; OAuth-only consumers set
		// `false` to drop the email-OTP plugin and its required callback file.
		emailOtp: z.boolean().default(true),
		// Magic-link sign-in. Off by default; on, the consumer's `sendMagicLink`
		// callback is required. The token lives 5 minutes, is stored hashed and
		// is spent on its first verification; an unknown address signs up.
		magicLink: z.boolean().default(false),
		// OAuth social providers. `true` enables a provider with conventional env
		// var names (e.g. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET); an object
		// overrides the var names. The runtime reads credentials from env at request
		// time — only the var names are baked into the generated worker.
		socialProviders: z
			.object({
				google: z.union([z.boolean(), socialProviderConfigSchema]).optional(),
				apple: z.union([z.boolean(), appleProviderConfigSchema]).optional(),
			})
			.optional(),
		// Native (Expo) consumer flag. When set, the worker enables Better Auth's
		// server-side `expo()` plugin — required for a native client's deep-link /
		// cookie / origin handling — and adds the deep-link scheme expo registers
		// (`api.slots.nativeScheme`) to `trustedOrigins`. The CSRF origin check runs
		// even for native ID-token sign-in, so the scheme must be trusted.
		expo: z.boolean().optional(),
		// Passkey (WebAuthn) sign-in through `@better-auth/passkey`. Off by
		// default; `{}` enables it with every field derived. The consumer migrates
		// the `passkey` table by re-exporting `@fcalell/plugin-auth/schema/passkey`.
		passkey: z.union([z.literal(false), passkeyObjectSchema]).default(false),
		// An OAuth authorization server for MCP clients (`@better-auth/mcp`): an
		// agent connects by signing in, never by a pasted secret. Needs
		// `organization`; the consumer migrates the OAuth and JWT tables by
		// re-exporting `@fcalell/plugin-auth/schema/oauth`.
		mcp: z.boolean().default(false),
		secretVar: z.string().default("AUTH_SECRET"),
		appUrlVar: z.string().default("APP_URL"),
		rateLimiter: z
			.object({
				ip: rateLimiterIpSchema,
				email: rateLimiterEmailSchema,
				agent: rateLimiterAgentSchema,
			})
			.default({
				ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
				email: { binding: "RATE_LIMITER_EMAIL", limit: 3, period: 60 },
				agent: { binding: "RATE_LIMITER_AGENT", limit: 120, period: 60 },
			}),
	})
	.refine((options) => !options.mcp || options.organization, {
		error:
			"auth: `mcp` needs `organization`: an agent's grant is to one organization.",
		path: ["mcp"],
	});

// Input type: user-supplied options (defaults remain optional at input).
export type AuthOptions = z.input<typeof authOptionsSchema>;

// Post-validation view: every schema default is materialised.
export type ResolvedAuthOptions = z.output<typeof authOptionsSchema>;

export type SocialProviderName = "google" | "apple";

export interface ResolvedSocialProvider {
	clientIdVar: string;
	clientSecretVar: string;
	appBundleIdentifier?: string;
}

const CONVENTIONAL_PROVIDER_VARS: Record<
	SocialProviderName,
	{ clientIdVar: string; clientSecretVar: string }
> = {
	google: {
		clientIdVar: "GOOGLE_CLIENT_ID",
		clientSecretVar: "GOOGLE_CLIENT_SECRET",
	},
	apple: {
		clientIdVar: "APPLE_CLIENT_ID",
		clientSecretVar: "APPLE_CLIENT_SECRET",
	},
};

// Superset of both provider config shapes — Google never sets
// `appBundleIdentifier`, so accepting it as optional lets a single typed helper
// handle both without a cast.
type ProviderConfigOverrides = {
	clientIdVar?: string;
	clientSecretVar?: string;
	appBundleIdentifier?: string;
};

function resolveProvider(
	cfg: boolean | ProviderConfigOverrides | undefined,
	conventional: { clientIdVar: string; clientSecretVar: string },
): ResolvedSocialProvider | undefined {
	if (!cfg) return undefined;
	const overrides = cfg === true ? undefined : cfg;
	const resolved: ResolvedSocialProvider = {
		clientIdVar: overrides?.clientIdVar ?? conventional.clientIdVar,
		clientSecretVar: overrides?.clientSecretVar ?? conventional.clientSecretVar,
	};
	if (overrides?.appBundleIdentifier) {
		resolved.appBundleIdentifier = overrides.appBundleIdentifier;
	}
	return resolved;
}

// Normalize the consumer's `socialProviders` option into resolved env-var
// references. `true` enables a provider with conventional var names; an object
// overrides them. Disabled / absent providers are omitted, so the result keys
// are exactly the enabled providers — both the secrets contribution and the
// baked runtime config iterate this.
export function resolveSocialProviders(
	input: ResolvedAuthOptions["socialProviders"],
): Partial<Record<SocialProviderName, ResolvedSocialProvider>> {
	const out: Partial<Record<SocialProviderName, ResolvedSocialProvider>> = {};
	if (!input) return out;
	const google = resolveProvider(
		input.google,
		CONVENTIONAL_PROVIDER_VARS.google,
	);
	if (google) out.google = google;
	const apple = resolveProvider(input.apple, CONVENTIONAL_PROVIDER_VARS.apple);
	if (apple) out.apple = apple;
	return out;
}

export interface AuthRuntimeOptions {
	secretVar: string;
	appUrlVar: string;
}

// better-auth's own `user` row as the deletion hook receives it. Mirrors
// `BaseUser` (@better-auth/core's `userSchema`).
export interface AuthUser {
	id: string;
	email: string;
	emailVerified: boolean;
	name: string;
	image?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// Why better-auth asks for an OTP. Only "sign-in" reaches a consumer that
// runs email-OTP alone, but the override sees all four.
export type OtpType =
	| "sign-in"
	| "email-verification"
	| "forget-password"
	| "change-email";

// Single source for the consumer callback file's shape. Both the plugin
// declaration (`callbacks:` in `./index.ts`, node-side) and the worker
// runtime's `AuthCallbacks` type (`./worker/index.ts`) derive their payload
// types from here, so the two can never drift apart. Every callback is
// optional in the type, each gated on the option that turns its feature on;
// `sendOTP` is required at runtime while `emailOtp` (on by default) is, and
// `sendMagicLink` while `magicLink` is. Every payload carries `env`, so a
// callback reaches per-request bindings (an email send binding, a queue)
// instead of module scope.
export interface AuthCallbackPayloads<TEnv = unknown> {
	sendOTP: { email: string; code: string; type: OtpType; env: TEnv };
	// `url` is the link to send; `token` is the plain token it carries.
	sendMagicLink: { email: string; url: string; token: string; env: TEnv };
	// `invitationId` is what the accept link carries: the invitee signs in and
	// accepts the invitation by id.
	sendInvitation: {
		invitationId: string;
		email: string;
		role: string;
		organization: { id: string; name: string; slug: string };
		inviter: { id: string; name: string; email: string };
		env: TEnv;
	};
	beforeDelete: { user: AuthUser; request?: Request; env: TEnv };
	sendDeleteVerification: {
		user: AuthUser;
		url: string;
		token: string;
		env: TEnv;
	};
	generateOTP: { email: string; type: OtpType; env: TEnv };
}
