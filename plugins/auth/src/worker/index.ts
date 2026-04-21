import type { RuntimePlugin } from "@fcalell/cli/runtime";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins/organization";
import { defaultOrgRoles } from "../access";
import type { AuthRuntimeOptions, FieldConfig } from "../types";

export interface AuthCallbacks {
	sendOTP: (payload: { email: string; code: string }) => void | Promise<void>;
	sendInvitation?: (payload: {
		email: string;
		orgName: string;
	}) => void | Promise<void>;
}

export interface AuthRuntimeInput extends AuthRuntimeOptions {
	callbacks?: AuthCallbacks;
	sameSite?: "strict" | "lax" | "none";
	trustedOrigins?: string[];
	cookies?: { prefix?: string; domain?: string };
	session?: {
		expiresIn?: number;
		updateAge?: number;
		additionalFields?: Record<string, FieldConfig>;
	};
	user?: { additionalFields?: Record<string, FieldConfig> };
	organization?:
		| boolean
		| {
				ac?: unknown;
				roles?: Record<string, unknown>;
				additionalFields?: Record<string, FieldConfig>;
		  };
}

// biome-ignore lint/suspicious/noExplicitAny: better-auth returns a highly-generic Auth type we only forward.
type AuthInstance = any;

const AUTH_PREFIX = "/api/auth";

// Per-env cache: Workers hand the same `env` object reference across
// requests within a worker instance, so a WeakMap keyed on it lets us
// initialize better-auth exactly once per isolate.
const cache = new WeakMap<object, AuthInstance>();

function buildAuth(
	env: Record<string, unknown>,
	db: unknown,
	options: AuthRuntimeInput,
): AuthInstance {
	// biome-ignore lint/suspicious/noExplicitAny: better-auth plugin list is heterogeneous.
	const plugins: any[] = [
		emailOTP({
			sendVerificationOTP: async ({ email, otp }) => {
				await options.callbacks?.sendOTP({ email, code: otp });
			},
		}),
	];

	if (options.organization) {
		const orgConfig =
			typeof options.organization === "object" ? options.organization : {};
		plugins.push(
			organization({
				// biome-ignore lint/suspicious/noExplicitAny: AccessControl type is internal to better-auth.
				ac: orgConfig.ac as any,
				roles: (orgConfig.roles ??
					// biome-ignore lint/suspicious/noExplicitAny: roles shape is user-provided.
					defaultOrgRoles) as any,
				schema: orgConfig.additionalFields
					? {
							organization: {
								// biome-ignore lint/suspicious/noExplicitAny: additionalFields is narrowed by the schema.
								additionalFields: orgConfig.additionalFields as any,
							},
						}
					: undefined,
				async sendInvitationEmail(data) {
					await options.callbacks?.sendInvitation?.({
						email: data.email,
						orgName: data.organization.name,
					});
				},
			}),
		);
	}

	return betterAuth({
		baseURL: env[options.appUrlVar] as string,
		secret: env[options.secretVar] as string,
		trustedOrigins: options.trustedOrigins,
		// biome-ignore lint/suspicious/noExplicitAny: drizzleAdapter DB type is opaque.
		database: drizzleAdapter(db as any, { provider: "sqlite" }),
		advanced: {
			cookiePrefix: options.cookies?.prefix,
			crossSubDomainCookies: options.cookies?.domain
				? { enabled: true, domain: options.cookies.domain }
				: undefined,
			defaultCookieAttributes: options.sameSite
				? {
						sameSite: options.sameSite,
						secure: options.sameSite === "none",
					}
				: undefined,
		},
		session: options.session
			? {
					expiresIn: options.session.expiresIn,
					updateAge: options.session.updateAge,
					// biome-ignore lint/suspicious/noExplicitAny: additionalFields is user-provided.
					additionalFields: options.session.additionalFields as any,
				}
			: undefined,
		user: options.user
			? {
					// biome-ignore lint/suspicious/noExplicitAny: additionalFields is user-provided.
					additionalFields: options.user.additionalFields as any,
				}
			: undefined,
		plugins,
	});
}

function getOrInitAuth(
	env: unknown,
	db: unknown,
	options: AuthRuntimeInput,
): AuthInstance {
	const envObj = env as object;
	let auth = cache.get(envObj);
	if (!auth) {
		auth = buildAuth(env as Record<string, unknown>, db, options);
		cache.set(envObj, auth);
	}
	return auth;
}

export default function authRuntime(
	options: AuthRuntimeInput,
): RuntimePlugin<"auth", { db: unknown }, { auth: AuthInstance }> {
	return {
		name: "auth",
		validateEnv(env: unknown) {
			const e = env as Record<string, unknown>;
			if (!e[options.secretVar]) {
				throw new Error(`Missing env var: ${options.secretVar}`);
			}
			if (!e[options.appUrlVar]) {
				throw new Error(`Missing env var: ${options.appUrlVar}`);
			}
		},
		context(env, upstream) {
			return { auth: getOrInitAuth(env, upstream.db, options) };
		},
		fetch(request, _env, upstream) {
			const url = new URL(request.url);
			if (!url.pathname.startsWith(AUTH_PREFIX)) return null;
			return upstream.auth.handler(request);
		},
	};
}
