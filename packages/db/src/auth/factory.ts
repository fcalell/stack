import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";
import type { DatabaseConfig } from "#kit/config";

interface EmailOTPRuntime {
	sendOTP: (data: {
		email: string;
		otp: string;
		type: string;
	}) => Promise<void>;
	otpLength?: number;
	expiresIn?: number;
	sendVerificationOnSignUp?: boolean;
}

interface OrganizationRuntime {
	sendInvitation: (data: {
		email: string;
		organization: { name: string; slug: string };
		inviter: { email: string; name?: string };
		invitationId: string;
		role: string;
	}) => Promise<void>;
	invitationExpiresIn?: number;
	// biome-ignore lint/suspicious/noExplicitAny: Better Auth plugin types from "better-auth/plugins/access"
	ac?: any;
	// biome-ignore lint/suspicious/noExplicitAny: Better Auth Role type from "better-auth/plugins/access"
	roles?: Record<string, any>;
}

export interface AuthRuntime {
	secret: string;
	baseURL: string;
	appURL: string;
	cookiePrefix?: string;
	cookieDomain?: string;
	trustedOrigins?: string[];
	session?: {
		expiresIn?: number;
		updateAge?: number;
	};
	emailOTP?: EmailOTPRuntime;
	organization?: OrganizationRuntime;
}

// biome-ignore lint/suspicious/noExplicitAny: AuthInstance is derived from betterAuth() return type
const cache = new WeakMap<object, any>();

// biome-ignore lint/suspicious/noExplicitAny: Accepts any Drizzle client instance (D1 or SQLite)
export function createAuth(
	db: any,
	config: DatabaseConfig,
	runtime: AuthRuntime,
) {
	const existing = cache.get(db);
	if (existing) return existing;

	const authConfig = config.auth;
	if (!authConfig) {
		throw new Error("No auth config found in database config");
	}

	const plugins = buildPlugins(authConfig, runtime);
	const secureCookies = runtime.baseURL.startsWith("https://");

	const auth = betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
			usePlural: true,
		}),
		baseURL: runtime.baseURL,
		secret: runtime.secret,
		trustedOrigins: runtime.trustedOrigins ?? [runtime.appURL],
		session: {
			...(authConfig.session?.additionalFields && {
				additionalFields: authConfig.session.additionalFields,
			}),
			expiresIn: runtime.session?.expiresIn ?? 60 * 60 * 24 * 7,
			updateAge: runtime.session?.updateAge ?? 60 * 60 * 24,
		},
		...(authConfig.user?.additionalFields && {
			user: { additionalFields: authConfig.user.additionalFields },
		}),
		advanced: {
			...(runtime.cookiePrefix && { cookiePrefix: runtime.cookiePrefix }),
			useSecureCookies: secureCookies,
			...(runtime.cookieDomain && {
				crossSubDomainCookies: {
					enabled: true,
					domain: runtime.cookieDomain,
				},
			}),
		},
		plugins,
	});

	cache.set(db, auth);
	return auth;
}

export type AuthInstance = ReturnType<typeof createAuth>;

// biome-ignore lint/suspicious/noExplicitAny: Better Auth plugin array type
function buildPlugins(authConfig: NonNullable<DatabaseConfig["auth"]>, runtime: AuthRuntime): any[] {
	const plugins = [];

	if (authConfig.emailOTP && runtime.emailOTP) {
		const opts = runtime.emailOTP;
		plugins.push(
			emailOTP({
				otpLength: opts.otpLength ?? 6,
				expiresIn: opts.expiresIn ?? 300,
				sendVerificationOnSignUp: opts.sendVerificationOnSignUp ?? false,
				async sendVerificationOTP({ email, otp, type }) {
					await opts.sendOTP({ email, otp, type });
				},
			}),
		);
	}

	if (authConfig.organization && runtime.organization) {
		const opts = runtime.organization;
		const orgAdditionalFields =
			authConfig.organization !== true &&
			authConfig.organization.additionalFields;

		plugins.push(
			organization({
				...(opts.ac && { ac: opts.ac }),
				...(opts.roles && { roles: opts.roles }),
				invitationExpiresIn: opts.invitationExpiresIn ?? 60 * 60 * 48,
				// biome-ignore lint/suspicious/noExplicitAny: Better Auth invitation callback type
				async sendInvitationEmail(data: any) {
					await opts.sendInvitation({
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
					});
				},
				...(orgAdditionalFields && {
					schema: {
						organization: { additionalFields: orgAdditionalFields },
					},
				}),
			}),
		);
	}

	return plugins;
}
