import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";
import type { AuthPolicy } from "#kit/config";

export interface AuthEnvConfig {
	secret: string;
	appURL?: string;
	trustedOrigins?: string[];
}

export interface OTPCallbackData<TEnv = unknown> {
	email: string;
	otp: string;
	type: string;
	env: TEnv;
}

export interface InvitationCallbackData<TEnv = unknown> {
	email: string;
	organization: { name: string; slug: string };
	inviter: { email: string; name?: string };
	invitationId: string;
	role: string;
	env: TEnv;
}

interface CreateAuthOptions {
	// biome-ignore lint/suspicious/noExplicitAny: Accepts any Drizzle client instance (D1 or SQLite)
	db: any;
	policy: AuthPolicy;
	env: AuthEnvConfig;
	// biome-ignore lint/suspicious/noExplicitAny: Cloudflare Worker env bindings passed to callbacks
	bindings: any;
	baseURL: string;
	corsOrigins?: string[];
	// biome-ignore lint/suspicious/noExplicitAny: callback env generic resolved at defineApp level
	sendOTP?: (data: OTPCallbackData<any>) => Promise<void>;
	// biome-ignore lint/suspicious/noExplicitAny: callback env generic resolved at defineApp level
	sendInvitation?: (data: InvitationCallbackData<any>) => Promise<void>;
}

// biome-ignore lint/suspicious/noExplicitAny: AuthInstance is derived from betterAuth() return type
const cache = new WeakMap<object, any>();

export function createAuth(options: CreateAuthOptions) {
	const existing = cache.get(options.db);
	if (existing) return existing;

	const { db, policy, env: authEnv } = options;

	const appURL =
		authEnv.appURL ?? options.corsOrigins?.[0] ?? options.baseURL;
	const trustedOrigins = authEnv.trustedOrigins ?? [appURL];
	const secureCookies = options.baseURL.startsWith("https://");

	const plugins = buildPlugins(
		policy,
		options.bindings,
		options.sendOTP,
		options.sendInvitation,
	);

	const instance = betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
			usePlural: true,
		}),
		baseURL: options.baseURL,
		secret: authEnv.secret,
		trustedOrigins,
		session: {
			...(policy.session?.additionalFields && {
				additionalFields: policy.session.additionalFields,
			}),
			expiresIn: policy.session?.expiresIn ?? 60 * 60 * 24 * 7,
			updateAge: policy.session?.updateAge ?? 60 * 60 * 24,
		},
		...(policy.user?.additionalFields && {
			user: { additionalFields: policy.user.additionalFields },
		}),
		advanced: {
			...(policy.cookies?.prefix && {
				cookiePrefix: policy.cookies.prefix,
			}),
			useSecureCookies: secureCookies,
			...(policy.cookies?.domain && {
				crossSubDomainCookies: {
					enabled: true,
					domain: policy.cookies.domain,
				},
			}),
		},
		plugins,
	});

	cache.set(db, instance);
	return instance;
}

export type AuthInstance = ReturnType<typeof createAuth>;

function buildPlugins(
	policy: AuthPolicy,
	// biome-ignore lint/suspicious/noExplicitAny: Cloudflare Worker env bindings
	bindings: any,
	// biome-ignore lint/suspicious/noExplicitAny: callback env generic resolved at defineApp level
	sendOTP?: (data: OTPCallbackData<any>) => Promise<void>,
	// biome-ignore lint/suspicious/noExplicitAny: callback env generic resolved at defineApp level
	sendInvitation?: (data: InvitationCallbackData<any>) => Promise<void>,
	// biome-ignore lint/suspicious/noExplicitAny: Better Auth plugin array type
): any[] {
	const plugins = [];

	if (sendOTP) {
		plugins.push(
			emailOTP({
				otpLength: 6,
				expiresIn: 300,
				sendVerificationOnSignUp: false,
				async sendVerificationOTP({ email, otp, type }) {
					await sendOTP({ email, otp, type, env: bindings });
				},
			}),
		);
	}

	if (policy.organization) {
		const orgConfig =
			typeof policy.organization === "object" ? policy.organization : {};

		plugins.push(
			organization({
				...(orgConfig.ac && { ac: orgConfig.ac }),
				...(orgConfig.roles && { roles: orgConfig.roles }),
				invitationExpiresIn: 60 * 60 * 48,
				...(sendInvitation && {
					// biome-ignore lint/suspicious/noExplicitAny: Better Auth invitation data type
					async sendInvitationEmail(data: any) {
						await sendInvitation({
							email: data.email,
							organization: {
								name: data.organization.name,
								slug: data.organization.slug,
							},
							inviter: {
								email: data.inviter.user.email,
								name: data.inviter.user.name ?? undefined,
							},
							invitationId: data.id,
							role: data.role,
							env: bindings,
						});
					},
				}),
				...(orgConfig.additionalFields && {
					schema: {
						organization: {
							additionalFields: orgConfig.additionalFields,
						},
					},
				}),
			}),
		);
	}

	return plugins;
}
