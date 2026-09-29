import { expo } from "@better-auth/expo";
import { type PasskeyOptions, passkey } from "@better-auth/passkey";
import { createMongoAbility } from "@casl/ability";
import type { RuntimePlugin } from "@fcalell/cli/runtime";
import {
	ORG_RULES_PATH,
	SCOPE_ROUTES_PATH,
} from "@fcalell/plugin-api/procedure";
import { getTableName } from "@fcalell/plugin-db/orm";
import { ORPCError } from "@orpc/server";
import type { BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import {
	role as buildAcRole,
	createAccessControl as createBetterAuthAccessControl,
} from "better-auth/plugins/access";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins/organization";
import { z } from "zod";
import { compileStatements, packAbility } from "../ability/index.ts";
import { defaultOrgRoles } from "../access.ts";
import type { InferSession, SessionUser } from "../infer.ts";
import { account, session, user, verification } from "../schema/index.ts";
import {
	invitation,
	member,
	organization as organizationTable,
} from "../schema/organization.ts";
import { passkey as passkeyTable } from "../schema/passkey.ts";
import {
	type MemberRow,
	organization as organizationScope,
	type Scope,
} from "../scope.ts";
import type {
	AuthCallbackPayloads,
	AuthRuntimeOptions,
	AuthUser,
	OtpType,
	ResolvedSocialProvider,
	SocialProviderName,
} from "../types.ts";
import { AUTH_PREFIX } from "../types.ts";
import { emailKey } from "./email-key.ts";
import { createTenancy, resolveGrants, type Tenancy } from "./tenancy.ts";

export type { OtpType } from "../types.ts";
// The request context carries a `Tenancy`, so a declaration emit of the
// consumer's generated `.stack/procedure.ts` names it through this subpath.
export type { Tenancy } from "./tenancy.ts";

// Structural match with plugin-api's `RateLimitBinding` (procedure.ts) — not
// imported directly since plugin-api doesn't expose it on a public subpath;
// both sides only rely on this shape.
export interface RateLimitBinding {
	limit(opts: { key: string }): Promise<{ success: boolean }>;
}

// Consumer-implemented hooks. `AuthCallbackPayloads` (`../types`) is the
// single source for the payload shapes; see that type's doc comment. Pass the
// worker's own `Env` (`AuthCallbacks<Env>`) to type the `env` every payload
// carries.
//
// Method syntax throughout, deliberately: it keeps the payload parameter
// bivariant, so a consumer who narrows the env (`AuthCallbacks<Env>`) still
// satisfies the `AuthCallbacks` the runtime input declares. The framework is
// the only caller and always passes the real env.
export interface AuthCallbacks<TEnv = unknown> {
	// Required while `emailOtp` is on: the runtime refuses to build without it.
	sendOTP?(
		payload: AuthCallbackPayloads<TEnv>["sendOTP"],
	): void | Promise<void>;
	sendInvitation?(
		payload: AuthCallbackPayloads<TEnv>["sendInvitation"],
	): void | Promise<void>;
	// Runs before better-auth deletes the row, and only when
	// `user.deleteUser` is on. Throw to refuse the deletion (an `APIError`
	// surfaces its own status; anything else is a 500). Revocation, storage
	// cleanup, and PII scrubbing all belong here.
	beforeDelete?(
		payload: AuthCallbackPayloads<TEnv>["beforeDelete"],
	): void | Promise<void>;
	// The passwordless-safe deletion path. When implemented, POST
	// /delete-user emails `url` (a confirmation link) instead of deleting,
	// and the deletion happens on the link's callback with no session
	// freshness requirement. Without it, a passwordless consumer is pushed
	// to `session.freshAge: 0`, which lets any stolen session cookie of any
	// age delete the account in one request.
	sendDeleteVerification?(
		payload: AuthCallbackPayloads<TEnv>["sendDeleteVerification"],
	): void | Promise<void>;
	// Replaces the OTP better-auth would generate. Return `undefined` to fall
	// back to the default for that request, which is how a fixed review-account
	// code coexists with real codes. Synchronous: better-auth reads the return
	// value directly. Runs for every `OtpType` (sign-in, verification,
	// forget-password, change-email), so key an override on `type` as well as
	// the email; method syntax keeps payloads bivariant, so a handler that
	// narrows `type` compiles but still receives all four at runtime.
	generateOTP?(
		payload: AuthCallbackPayloads<TEnv>["generateOTP"],
	): string | undefined;
	// The consumer's own better-auth plugins, registered after the
	// framework's: a sign-in flow the framework does not ship (endpoints,
	// tables, hooks) is written here. A table a plugin declares lives in the
	// consumer's schema under the model's name.
	plugins?: BetterAuthPlugin[];
}

export interface AuthRuntimeInput extends AuthRuntimeOptions {
	callbacks?: AuthCallbacks;
	sameSite?: "strict" | "lax" | "none";
	trustedOrigins?: string[];
	// Dev-server origins, applied only when the worker runs with STACK_DEV.
	devTrustedOrigins?: string[];
	cookies?: { prefix?: string; domain?: string };
	session?: {
		expiresIn?: number;
		updateAge?: number;
		freshAge?: number;
	};
	user?: {
		deleteUser?: boolean;
	};
	// Codegen reduces the consumer's `{ ac, roles }` to plain records: the
	// statements of `ac` and each role's grants.
	organization?:
		| boolean
		| {
				statements?: Record<string, readonly string[]>;
				roles?: Record<string, Record<string, readonly string[]>>;
		  };
	// On by default; `false` drops the email-OTP plugin (OAuth-only consumers).
	emailOtp?: boolean;
	// Resolved provider → env-var references (var names, never secrets — the
	// runtime reads credentials from `env` at request time).
	socialProviders?: Partial<Record<SocialProviderName, ResolvedSocialProvider>>;
	// Set by codegen when the consumer enables `expo`. Adds Better Auth's
	// server-side expo() plugin (native client deep-link / cookie / origin
	// handling); contributes no database tables.
	expo?: boolean;
	// Set by codegen when the consumer enables `passkey`, every default
	// already derived.
	passkey?: {
		rpID: string;
		rpName: string;
		origin: string | string[];
		// The dev origins, swapped in with `rpID: "localhost"` under STACK_DEV.
		devOrigin?: string[];
		authenticatorSelection?: PasskeyOptions["authenticatorSelection"];
	};
	// Wrangler rate-limiter binding names, baked by the `runtimeOptions`
	// derivation from the plugin's `rateLimiter` schema defaults. Limit/period
	// aren't included here — they're enforced by the binding config itself,
	// not read at request time.
	rateLimiter?: { ip: { binding: string }; email: { binding: string } };
	// The slugs an organization may not take, baked by codegen with
	// organizations on: plugin-api's reserved words and the app's top-level
	// routes, since an organization is served at `/<slug>`.
	reservedSlugs?: readonly string[];
	// The consumer's `src/shared/scopes.ts` module namespace, when it exists:
	// every scope descriptor it exports gets a `bySlug` lookup.
	scopes?: Record<string, unknown>;
}

// Structural surface of the better-auth instance our code, and consumers'
// `procedure({ auth: true })` handlers via `InferAuthContext`
// (`plugins/api/src/procedure.ts`), actually touch: `handler` (the fetch
// entrypoint below) and the session lookup the auth middleware calls.
// better-auth's own `Auth<Options>` requires the literal `BetterAuthOptions`
// object passed to `betterAuth(...)`; `buildAuth` below constructs that
// object from runtime conditionals, so there's no single literal `Options`
// to parameterize `Auth<Options>` with here.
export type AuthApi = {
	getSession: (opts: { headers: Headers }) => Promise<{
		user: Record<string, unknown>;
		session: Record<string, unknown>;
	} | null>;
};

// The tenancy capability exists only with organizations on, so a `scope`
// procedure type-checks only against a config that can resolve it.
type TenancyContext<TOptions> = TOptions extends { organization: infer O }
	? O extends undefined | false
		? object
		: { tenancy: Tenancy }
	: object;

// `$Infer.Session` is derived from `AuthRuntimeInput` via the SAME
// `SessionUser`/`InferSession` types `@fcalell/plugin-auth/infer` exposes
// for the client (organization → `activeOrganizationId`), one derivation,
// two consumers, instead of re-deriving the branching twice.
// `TOptions` is inferred from the literal object `.stack/procedure.ts` /
// `.stack/worker.ts` pass to `authRuntime(...)` at the call site (codegen
// always emits an inline object literal), so e.g. `organization: true`
// stays a literal, not a widened `boolean`.
export interface AuthInstance<
	TOptions extends AuthRuntimeInput = AuthRuntimeInput,
> {
	handler: (request: Request) => Promise<Response>;
	api: AuthApi;
	$Infer: {
		Session: {
			user: SessionUser;
			session: InferSession<{ auth: TOptions }>;
		};
	};
}

// Per-env cache: Workers hand the same `env` object reference across
// requests within a worker instance, so a WeakMap keyed on it lets us
// initialize better-auth exactly once per isolate. Typed off `buildAuth`'s
// own inferred return (whatever better-auth infers from the literal built
// below) — internal plumbing never needs the honest `AuthInstance<TOptions>`
// contract above; only the value handed into `context()` does (see the cast
// there).
const cache = new WeakMap<object, ReturnType<typeof buildAuth>>();

// Same predicate plugin-api puts on `ctx._devMode`, read straight off env:
// `buildAuth` runs per env, before any request context exists.
function isDevMode(env: Record<string, unknown>): boolean {
	return env.STACK_DEV === "1";
}

// With email OTP on, better-auth would issue codes nobody receives.
// The code and field error an organization slug the app's routes hold is
// refused with. A form reads `fieldErrors` off the answer, as it reads an
// API procedure's refusal, and shows it under the field that made the slug.
const ORGANIZATION_SLUG_RESERVED = "ORGANIZATION_SLUG_RESERVED";

function refuseReservedSlug(
	reserved: ReadonlySet<string>,
	slug: unknown,
): void {
	if (typeof slug !== "string" || !reserved.has(slug)) return;
	const message = `The address /${slug} is reserved. Choose another.`;
	throw new APIError("BAD_REQUEST", {
		code: ORGANIZATION_SLUG_RESERVED,
		message,
		fieldErrors: { slug: message },
	});
}

// better-auth's `/organization/check-slug` answers only whether an
// organization holds the slug, so a reserved one would read as free until
// the create refused it: this refuses it there first, with the same answer.
function reservedSlugCheck(reserved: ReadonlySet<string>): BetterAuthPlugin {
	return {
		id: "reserved-slugs",
		hooks: {
			before: [
				{
					matcher: (ctx) => ctx.path === "/organization/check-slug",
					handler: createAuthMiddleware(async (ctx) =>
						refuseReservedSlug(reserved, ctx.body?.slug),
					),
				},
			],
		},
	};
}

class MissingSendOtpError extends Error {
	constructor() {
		super(
			"plugin-auth: `emailOtp` is on but the callbacks file defines no `sendOTP`. " +
				"Implement `sendOTP` in src/worker/plugins/auth.ts, or set `emailOtp: false`.",
		);
		this.name = "MissingSendOtpError";
	}
}

function buildAuth(
	env: Record<string, unknown>,
	db: unknown,
	options: AuthRuntimeInput,
) {
	const plugins: BetterAuthPlugin[] = [];

	if (options.emailOtp !== false) {
		const sendOTP = options.callbacks?.sendOTP;
		if (!sendOTP) throw new MissingSendOtpError();
		plugins.push(
			emailOTP({
				sendVerificationOTP: async ({ email, otp, type }) => {
					await sendOTP({ email, code: otp, type, env });
				},
				// The key must be absent when the consumer has no callback:
				// better-auth spreads these options over its defaults, so an
				// explicit `generateOTP: undefined` overwrites the default
				// generator and crashes every OTP send.
				...(options.callbacks?.generateOTP
					? {
							generateOTP: ({
								email,
								type,
							}: {
								email: string;
								type: OtpType;
							}) => options.callbacks?.generateOTP?.({ email, type, env }),
						}
					: {}),
				// Pinned, not options: the attempt cap is the actual brute-force
				// gate (the verify path is only IP-limited), so it must never
				// drift on a dependency bump.
				otpLength: 6,
				expiresIn: 300,
				allowedAttempts: 3,
			}),
		);
	}

	if (options.organization) {
		const orgConfig =
			typeof options.organization === "object" ? options.organization : {};
		// better-auth's org plugin reads `.authorize()`/`.statements` off each
		// `roles` entry directly (permission.mjs's `hasPermissionFn`), not the
		// bare `{resource: actions[]}` records codegen bakes, so every role is
		// rebuilt through better-auth's own access control. Its `ac` is read
		// only under dynamic access control, which stays off.
		const ac = orgConfig.statements
			? createBetterAuthAccessControl(orgConfig.statements)
			: undefined;
		const grantsByRole: Record<
			string,
			Record<string, readonly string[]>
		> = orgConfig.roles ?? defaultOrgRoles;
		const reserved = new Set(options.reservedSlugs ?? []);
		plugins.push(
			reservedSlugCheck(reserved),
			organization({
				// better-auth checks a slug is free, never that the app's own
				// routes leave it free: both writes that set one refuse it here.
				organizationHooks: {
					beforeCreateOrganization: async ({ organization }) =>
						refuseReservedSlug(reserved, organization.slug),
					beforeUpdateOrganization: async ({ organization }) =>
						refuseReservedSlug(reserved, organization.slug),
				},
				// biome-ignore lint/suspicious/noExplicitAny: AccessControl type is internal to better-auth.
				ac: ac as any,
				roles: Object.fromEntries(
					Object.entries(grantsByRole).map(([name, grants]) => [
						name,
						buildAcRole(grants),
					]),
					// biome-ignore lint/suspicious/noExplicitAny: roles shape is user-provided.
				) as any,
				async sendInvitationEmail(data) {
					await options.callbacks?.sendInvitation?.({
						invitationId: data.id,
						email: data.email,
						role: data.role,
						organization: {
							id: data.organization.id,
							name: data.organization.name,
							slug: data.organization.slug,
						},
						inviter: {
							id: data.inviter.user.id,
							name: data.inviter.user.name,
							email: data.inviter.user.email,
						},
						env,
					});
				},
			}),
		);
	}

	// Native client support: Better Auth's server-side expo() plugin is
	// required for the @better-auth/expo client (deep-link redirect, cookie
	// handling, native origin trust). Contributes no database tables.
	if (options.expo) {
		plugins.push(expo());
	}

	if (options.passkey) {
		// A localhost ceremony matches neither the production rpID nor its
		// origins, so dev swaps in both.
		const { devOrigin, ...production } = options.passkey;
		plugins.push(
			passkey(
				devOrigin && isDevMode(env)
					? { ...production, rpID: "localhost", origin: devOrigin }
					: production,
			),
		);
	}

	plugins.push(...(options.callbacks?.plugins ?? []));

	// Read each configured provider's credentials from env (never baked into
	// the worker — only the var names are). Apple optionally carries the app
	// bundle id for native ID-token validation.
	const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};
	const google = options.socialProviders?.google;
	if (google) {
		socialProviders.google = {
			clientId: env[google.clientIdVar] as string,
			clientSecret: env[google.clientSecretVar] as string,
		};
	}
	const apple = options.socialProviders?.apple;
	if (apple) {
		socialProviders.apple = {
			clientId: env[apple.clientIdVar] as string,
			clientSecret: env[apple.clientSecretVar] as string,
			appBundleIdentifier: apple.appBundleIdentifier,
		};
	}
	const socialProvidersOption =
		Object.keys(socialProviders).length > 0 ? socialProviders : undefined;

	// Dev-server origins are trusted only under STACK_DEV, and only then do
	// web cookies need sameSite=none: in dev the frontend origin and the
	// worker are cross-origin, so a lax cookie is dropped. In production the
	// baked value stands (none for native consumers, the browser default
	// otherwise).
	const devOrigins = isDevMode(env) ? (options.devTrustedOrigins ?? []) : [];
	const trustedOrigins = [...(options.trustedOrigins ?? []), ...devOrigins];
	const sameSite = devOrigins.length > 0 ? "none" : options.sameSite;

	return betterAuth({
		baseURL: env[options.appUrlVar] as string,
		secret: env[options.secretVar] as string,
		trustedOrigins,
		socialProviders: socialProvidersOption,
		// biome-ignore lint/suspicious/noExplicitAny: drizzleAdapter DB type is opaque.
		database: drizzleAdapter(db as any, {
			provider: "sqlite",
			// Map Better Auth's models to the framework-owned tables explicitly, so
			// resolution never depends on the consumer's schema export names.
			// organization/member/invitation only when the plugin is actually
			// registered — the consumer only migrates those tables (via
			// `@fcalell/plugin-auth/schema/organization`) when `organization` is
			// enabled, so the adapter must never reference them otherwise. Same
			// for `passkey`. The consumer's own schema (the drizzle client's)
			// comes first, so a model a `callbacks.plugins` entry declares
			// resolves to the consumer's table of that name.
			schema: {
				...(db as { _?: { fullSchema?: Record<string, unknown> } })._
					?.fullSchema,
				user,
				session,
				account,
				verification,
				...(options.organization
					? { organization: organizationTable, member, invitation }
					: {}),
				...(options.passkey ? { passkey: passkeyTable } : {}),
			},
		}),
		advanced: {
			cookiePrefix: options.cookies?.prefix,
			crossSubDomainCookies: options.cookies?.domain
				? { enabled: true, domain: options.cookies.domain }
				: undefined,
			defaultCookieAttributes: sameSite
				? {
						sameSite,
						secure: sameSite === "none",
					}
				: undefined,
			// Cloudflare sets the canonical client IP here; without it
			// session.ipAddress is wrong behind the CF edge.
			ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
		},
		session: {
			expiresIn: options.session?.expiresIn,
			updateAge: options.session?.updateAge,
			freshAge: options.session?.freshAge,
			// Signed session cache: skips a D1 read on getSession for most
			// authenticated requests (Workers/D1 best practice), ~5 min freshness.
			// Off for native: the cache sets a second `session_data` cookie
			// alongside `session_token`, and React Native reliably round-trips
			// only one cookie — the device ends up sending session_data without
			// session_token, so every authed request resolves to no session.
			cookieCache: options.expo
				? { enabled: false }
				: { enabled: true, maxAge: 300 },
		},
		user: options.user
			? {
					deleteUser: options.user.deleteUser
						? {
								enabled: true,
								beforeDelete: async (user, request) => {
									await options.callbacks?.beforeDelete?.({
										user: user as AuthUser,
										request,
										env,
									});
								},
								// Conditional spread, same reason as generateOTP: an
								// undefined-valued key would make better-auth treat the
								// email-verification path as configured.
								...(options.callbacks?.sendDeleteVerification
									? {
											sendDeleteAccountVerification: async (data: {
												user: unknown;
												url: string;
												token: string;
											}) => {
												await options.callbacks?.sendDeleteVerification?.({
													user: data.user as AuthUser,
													url: data.url,
													token: data.token,
													env,
												});
											},
										}
									: {}),
							}
						: undefined,
				}
			: undefined,
		plugins,
	});
}

function getOrInitAuth(
	env: unknown,
	db: unknown,
	options: AuthRuntimeInput,
): ReturnType<typeof buildAuth> {
	const envObj = env as object;
	let auth = cache.get(envObj);
	if (!auth) {
		auth = buildAuth(env as Record<string, unknown>, db, options);
		cache.set(envObj, auth);
	}
	return auth;
}

// OTP send is the email-bombing amplifier — the only auth route that gets a
// per-email limit on top of the blanket per-IP one.
const OTP_SEND_SUFFIX = "/email-otp/send-verification-otp";

function tooManyRequests(): Response {
	return new Response(JSON.stringify({ code: "TOO_MANY_REQUESTS" }), {
		status: 429,
		headers: { "content-type": "application/json" },
	});
}

// Reads `email` off a cloned request body — the original must still reach
// Better Auth unconsumed. A body that fails to parse, or carries no
// non-empty string `email`, isn't an error here: the per-email check is
// simply skipped (the per-IP limit still applies).
async function readRequestEmail(request: Request): Promise<string | null> {
	try {
		const body: unknown = await request.clone().json();
		if (body && typeof body === "object" && "email" in body) {
			const email = (body as { email: unknown }).email;
			if (typeof email === "string" && email.length > 0) return email;
		}
	} catch {
		// not JSON / no body — skip the per-email check
	}
	return null;
}

async function checkRateLimit(
	request: Request,
	url: URL,
	rateLimiter: { ip?: RateLimitBinding; email?: RateLimitBinding } | undefined,
): Promise<Response | null> {
	if (!rateLimiter) return null;

	if (rateLimiter.ip) {
		// Cloudflare-set and unspoofable — deliberately not X-Forwarded-For.
		const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
		const result = await rateLimiter.ip.limit({ key: ip });
		if (!result.success) return tooManyRequests();
	}

	if (rateLimiter.email && url.pathname.endsWith(OTP_SEND_SUFFIX)) {
		const email = await readRequestEmail(request);
		if (email) {
			const result = await rateLimiter.email.limit({ key: emailKey(email) });
			if (!result.success) return tooManyRequests();
		}
	}

	return null;
}

// ---------- auth.orgRules and auth.scope.<name>.bySlug ----------
//
// `routes(procedure)` receives plugin-api's procedure factory as `unknown`
// (`RuntimePlugin` is framework-agnostic, see `packages/cli/src/runtime.ts`).
// Narrowing to just the surface this file touches avoids importing
// plugin-api's full generic procedure-builder machinery.
type AuthRouteFactory = (config: {
	auth: true;
	scope?: typeof organizationScope;
	reads?: readonly string[];
}) => {
	query<TOutput>(
		fn: (opts: { context: { member: MemberRow } }) => Promise<TOutput>,
	): unknown;
	input(schema: z.ZodType): {
		query<TOutput>(
			fn: (opts: {
				input: { slug: string; parentId?: string };
				context: { user: { id: string }; tenancy: Tenancy };
			}) => Promise<TOutput>,
		): unknown;
	};
};

// A slug names the organization on its own; below it, a slug is unique only
// within its parent, whose id comes along.
const ORGANIZATION_LOOKUP = z.object({ slug: z.string().min(1) });
const SCOPE_LOOKUP = z.object({
	slug: z.string().min(1),
	parentId: z.string().min(1),
});

// The entities a scope's lookup reads: each table of its chain by its SQL
// name, which is its entity when the schema exports the table under that
// name, and the membership the organization level resolves.
function scopeReads(scope: Scope): string[] {
	const reads = ["member"];
	for (let level: Scope | undefined = scope; level; level = level.parent?.[0]) {
		reads.push(getTableName(level.table));
	}
	return reads.sort();
}

// The scope descriptors a consumer's `src/shared/scopes.ts` exports, read off
// the module namespace codegen hands over.
function consumerScopes(module: Record<string, unknown> | undefined): Scope[] {
	const scopes = Object.values(module ?? {}).filter(
		(value): value is Scope =>
			typeof value === "object" &&
			value !== null &&
			"name" in value &&
			"table" in value &&
			"parent" in value,
	);
	const names = new Set<string>();
	for (const scope of scopes) {
		if (names.has(scope.name)) {
			throw new Error(
				`plugin-auth: two scopes are named "${scope.name}"; scope names are unique.`,
			);
		}
		names.add(scope.name);
	}
	return scopes;
}

export default function authRuntime<TOptions extends AuthRuntimeInput>(
	options: TOptions,
): RuntimePlugin<
	"auth",
	object,
	{
		auth: AuthInstance<TOptions>;
		_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
	} & TenancyContext<TOptions>
> {
	const roles = (
		typeof options.organization === "object" && options.organization.roles
			? options.organization.roles
			: defaultOrgRoles
	) as Record<string, unknown>;
	const scopes = consumerScopes(options.scopes);

	return {
		name: "auth",
		// context() reads upstream.db (the drizzle client dbRuntime provides) —
		// declare the edge so createWorker runs db's context first regardless of
		// `.use()` registration order.
		// Env presence/value checks live in the generated worker's `envChecks`
		// assertion (WS6.3), fed by this plugin's `api.slots.env`
		// contribution — not in a per-request validateEnv here.
		dependsOn: ["db"],
		// Framework-owned procedures, registered only with organizations on:
		// the caller's compiled ability in the organization the input names,
		// so `useAbility` drives UI affordances from the same grants `can`
		// checks server-side; and per scope with a slug, the lookup
		// `ScopeBoundary` resolves a URL slug with.
		routes(procedure: unknown) {
			if (!options.organization) return {};
			const factory = procedure as AuthRouteFactory;

			// `reads: ["member"]`: a role-changing mutation that declares
			// `writes: ["member"]` invalidates this query through the
			// entity-header contract. "member" is a legal `Entity` because auth
			// contributes it to `api.slots.entities` (see `../index.ts`).
			const orgRules = factory({
				auth: true,
				scope: organizationScope,
				reads: ["member"],
			}).query(async ({ context }) => {
				const grants = resolveGrants(context.member.role, roles);
				const ability = createMongoAbility(compileStatements(grants));
				return { rules: packAbility(ability) };
			});

			// A lookup reads its chain's tables and the caller's membership, so a
			// mutation that declares `writes` on any of them (a renamed project, a
			// changed role) invalidates the scope it resolved.
			const lookups = Object.fromEntries(
				[organizationScope, ...scopes]
					.filter((scope) => scope.slug !== null)
					.map((scope) => [
						scope.name,
						{
							bySlug: factory({ auth: true, reads: scopeReads(scope) })
								.input(scope.parent ? SCOPE_LOOKUP : ORGANIZATION_LOOKUP)
								.query(async ({ input, context }) => {
									const found = await context.tenancy.bySlug(
										scope,
										input.slug,
										input.parentId,
										context.user.id,
									);
									if (!found) {
										throw new ORPCError("NOT_FOUND", {
											message: `No such ${scope.name}`,
										});
									}
									return found;
								}),
						},
					]),
			);

			// Both paths share their router key, `auth`.
			return {
				[ORG_RULES_PATH[0]]: {
					[ORG_RULES_PATH[1]]: orgRules,
					[SCOPE_ROUTES_PATH[1]]: lookups,
				},
			};
		},
		context(env, upstream) {
			const u = upstream as { db: unknown };
			const e = env as Record<string, unknown>;

			const rateLimiter: { ip?: RateLimitBinding; email?: RateLimitBinding } =
				{};
			const ipBinding = options.rateLimiter?.ip.binding;
			if (ipBinding && e[ipBinding]) {
				rateLimiter.ip = e[ipBinding] as RateLimitBinding;
			}
			const emailBinding = options.rateLimiter?.email.binding;
			if (emailBinding && e[emailBinding]) {
				rateLimiter.email = e[emailBinding] as RateLimitBinding;
			}

			return {
				// `getOrInitAuth` returns whatever better-auth infers from the
				// literal built inside `buildAuth`; it structurally satisfies
				// `AuthApi` at runtime. This cast is the one place the
				// hand-declared `AuthInstance<TOptions>` contract stands in for
				// better-auth's own (differently-parameterized) inferred type.
				auth: getOrInitAuth(
					env,
					u.db,
					options,
				) as unknown as AuthInstance<TOptions>,
				...(options.organization
					? { tenancy: createTenancy(u.db, roles) }
					: {}),
				...(rateLimiter.ip || rateLimiter.email
					? { _rateLimiter: rateLimiter }
					: {}),
			} as {
				auth: AuthInstance<TOptions>;
				_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
			} & TenancyContext<TOptions>;
		},
		async fetch(request, _env, upstream) {
			const url = new URL(request.url);
			if (!url.pathname.startsWith(AUTH_PREFIX)) return null;
			const u = upstream as {
				auth: AuthInstance<TOptions>;
				_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
				_devMode?: boolean;
			};
			if (!u._devMode) {
				const denied = await checkRateLimit(request, url, u._rateLimiter);
				if (denied) return denied;
			}
			return u.auth.handler(request);
		},
	};
}
