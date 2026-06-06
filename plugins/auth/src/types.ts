import { z } from "zod";

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

const rateLimiterEmailSchema = z
	.object({
		binding: z.string().default("RATE_LIMITER_EMAIL"),
		limit: z
			.number()
			.positive({ error: "auth: rateLimiter.limit must be a positive number" })
			.default(5),
		period: z
			.number()
			.positive({ error: "auth: rateLimiter.period must be a positive number" })
			.default(300),
	})
	.default({ binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 });

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
			additionalFields: z.record(z.string(), fieldConfigSchema).optional(),
		})
		.optional(),
	user: z
		.object({
			additionalFields: z.record(z.string(), fieldConfigSchema).optional(),
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
	secretVar: z.string().default("AUTH_SECRET"),
	appUrlVar: z.string().default("APP_URL"),
	rateLimiter: z
		.object({
			ip: rateLimiterIpSchema,
			email: rateLimiterEmailSchema,
		})
		.default({
			ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
			email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
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
