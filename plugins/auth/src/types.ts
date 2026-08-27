import { z } from "zod";

// The path better-auth mounts under inside the worker. Shared so the runtime
// and the codegen contribution to `api.slots.routePrefixes` can never drift.
export const AUTH_PREFIX = "/api/auth";

export const fieldConfigSchema = z.object({
	type: z.enum(["string", "number", "boolean"]),
	required: z.boolean().optional(),
	defaultValue: z.unknown().optional(),
	input: z.boolean().optional(),
});

export type FieldConfig = z.infer<typeof fieldConfigSchema>;

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

const organizationObjectSchema = z.object({
	ac: z.unknown().optional(),
	roles: z.record(z.string(), z.unknown()).optional(),
	additionalFields: z.record(z.string(), fieldConfigSchema).optional(),
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

export const authOptionsSchema = z.object({
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
			additionalFields: z.record(z.string(), fieldConfigSchema).optional(),
		})
		.optional(),
	user: z
		.object({
			additionalFields: z.record(z.string(), fieldConfigSchema).optional(),
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
	// cookie / origin handling — and adds the app's deep-link scheme to
	// `trustedOrigins` (`${app.name}://` and `${app.name}://*` by default, or an
	// explicit `scheme` override). The CSRF origin check runs even for native
	// ID-token sign-in, so the scheme must be trusted.
	expo: z
		.union([z.boolean(), z.object({ scheme: z.string().optional() })])
		.optional(),
	secretVar: z.string().default("AUTH_SECRET"),
	appUrlVar: z.string().default("APP_URL"),
	rateLimiter: z
		.object({
			ip: rateLimiterIpSchema,
			email: rateLimiterEmailSchema,
		})
		.default({
			ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
			email: { binding: "RATE_LIMITER_EMAIL", limit: 3, period: 60 },
		}),
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
// `BaseUser` (@better-auth/core's `userSchema`); the index signature carries
// whatever `user.additionalFields` adds, which the consumer reads with a cast
// to its own row type.
export interface AuthUser {
	id: string;
	email: string;
	emailVerified: boolean;
	name: string;
	image?: string | null;
	createdAt: Date;
	updatedAt: Date;
	[key: string]: unknown;
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
// types from here, so the two can never drift apart. `sendOTP` is required
// (email-OTP is on by default); the rest are optional, each gated on the
// option that turns its feature on. Every payload carries `env`, so a
// callback reaches per-request bindings (an email send binding, a queue)
// instead of module scope.
export interface AuthCallbackPayloads<TEnv = unknown> {
	sendOTP: { email: string; code: string; env: TEnv };
	sendInvitation: { email: string; orgName: string; env: TEnv };
	beforeDelete: { user: AuthUser; request?: Request; env: TEnv };
	sendDeleteVerification: {
		user: AuthUser;
		url: string;
		token: string;
		env: TEnv;
	};
	generateOTP: { email: string; type: OtpType; env: TEnv };
}
