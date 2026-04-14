import type { AuthPolicy } from "@fcalell/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";

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

interface CreateAuthOptions<
	TBindings extends Record<string, unknown> = Record<string, unknown>,
> {
	// biome-ignore lint/suspicious/noExplicitAny: Better Auth drizzleAdapter expects { [key: string]: any }
	db: any;
	policy: AuthPolicy;
	env: AuthEnvConfig;
	bindings: TBindings;
	baseURL: string;
	corsOrigins?: string[];
	sendOTP?: (data: OTPCallbackData<TBindings>) => Promise<void>;
	sendInvitation?: (data: InvitationCallbackData<TBindings>) => Promise<void>;
}

// biome-ignore lint/suspicious/noExplicitAny: betterAuth return type varies per config; cache stores heterogeneous instances
const cache = new WeakMap<object, any>();

export function createAuth<TBindings extends Record<string, unknown>>(
	options: CreateAuthOptions<TBindings>,
) {
	const existing = cache.get(options.db);
	if (existing) return existing;

	const { db, policy, env: authEnv } = options;

	const appURL = authEnv.appURL ?? options.corsOrigins?.[0] ?? options.baseURL;
	const trustedOrigins = authEnv.trustedOrigins ?? [appURL];
	const secureCookies = appURL.startsWith("https://");

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

function buildPlugins<TBindings extends Record<string, unknown>>(
	policy: AuthPolicy,
	bindings: TBindings,
	sendOTP?: (data: OTPCallbackData<TBindings>) => Promise<void>,
	sendInvitation?: (data: InvitationCallbackData<TBindings>) => Promise<void>,
) {
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
					async sendInvitationEmail(data: {
						email: string;
						id: string;
						role: string;
						organization: { name: string; slug: string };
						inviter: { user: { email: string; name?: string } };
					}) {
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
