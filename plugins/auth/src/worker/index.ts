import { expo } from "@better-auth/expo";
import { createMongoAbility } from "@casl/ability";
import type { RuntimePlugin } from "@fcalell/cli/runtime";
import { ORG_RULES_PATH } from "@fcalell/plugin-api/procedure";
import type { BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { isAPIError } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { role as buildAcRole } from "better-auth/plugins/access";
import { emailOTP } from "better-auth/plugins/email-otp";
import { organization } from "better-auth/plugins/organization";
import { compileStatements, packAbility } from "../ability";
import { defaultOrgRoles } from "../access";
import type { InferSession, InferUser } from "../infer";
import { account, session, user, verification } from "../schema";
import {
	invitation,
	member,
	organization as organizationTable,
} from "../schema/organization";
import type {
	AuthCallbackPayloads,
	AuthRuntimeOptions,
	AuthUser,
	FieldConfig,
	OtpType,
	ResolvedSocialProvider,
	SocialProviderName,
} from "../types";
import { AUTH_PREFIX } from "../types";
import { emailKey } from "./email-key";

// Structural match with plugin-api's `RateLimitBinding` (procedure.ts) — not
// imported directly since plugin-api doesn't expose it on a public subpath;
// both sides only rely on this shape.
interface RateLimitBinding {
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
	sendOTP(payload: AuthCallbackPayloads<TEnv>["sendOTP"]): void | Promise<void>;
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
		additionalFields?: Record<string, FieldConfig>;
	};
	user?: {
		additionalFields?: Record<string, FieldConfig>;
		deleteUser?: boolean;
	};
	organization?:
		| boolean
		| {
				ac?: unknown;
				roles?: Record<string, unknown>;
				additionalFields?: Record<string, FieldConfig>;
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
	// Wrangler rate-limiter binding names, baked by the `runtimeOptions`
	// derivation from the plugin's `rateLimiter` schema defaults. Limit/period
	// aren't included here — they're enforced by the binding config itself,
	// not read at request time.
	rateLimiter?: { ip: { binding: string }; email: { binding: string } };
}

// Structural surface of the better-auth instance our code — and consumers'
// `procedure({ auth: true })` handlers via `InferAuthContext`
// (`plugins/api/src/procedure.ts`) — actually touch: `handler` (the fetch
// entrypoint below) plus the two `api` methods `createProcedure`'s
// auth/rbac middleware call. better-auth's own `Auth<Options>` requires the
// literal `BetterAuthOptions` object passed to `betterAuth(...)`; `buildAuth`
// below constructs that object from runtime conditionals (plugins pushed
// based on `options.organization` / `.expo` / `.emailOtp`), so there's no
// single literal `Options` to parameterize `Auth<Options>` with here. A
// hand-declared, honest structural type beats `any` even though it's not
// better-auth's own generic.
//
// `hasPermission` only exists at runtime once `buildAuth` registers the
// organization plugin (`options.organization` truthy, see below). Declaring
// it unconditionally let `procedure({ org: true, rbac: [...] })` type-check
// against a non-organization auth config and TypeError at request time.
// Gated on `TOptions["organization"]` (same `extends { organization: infer O }`
// pattern `../infer.ts`'s `OrgSessionFields` uses) so the type matches what
// `buildAuth` actually wires up.
export type AuthApi<TOptions extends AuthRuntimeInput = AuthRuntimeInput> = {
	getSession: (opts: { headers: Headers }) => Promise<{
		user: Record<string, unknown>;
		session: Record<string, unknown>;
	} | null>;
} & (TOptions extends { organization: infer O }
	? O extends undefined | false
		? object
		: {
				hasPermission: (opts: {
					headers: Headers;
					body: { permissions: Record<string, string[]> };
				}) => Promise<{ success: boolean } | null>;
				// Used by the `auth.orgRules` procedure (WS6.2, `routes()` below) to
				// compile the caller's org ability. better-auth's real endpoint
				// throws (not returns null) when there's no active organization or
				// no member row — callers must catch, not null-check.
				getActiveMember: (opts: { headers: Headers }) => Promise<{
					id: string;
					organizationId: string;
					userId: string;
					role: string;
				}>;
			}
	: object);

// `$Infer.Session` is derived from `AuthRuntimeInput` via the SAME
// `InferUser`/`InferSession` machinery `@fcalell/plugin-auth/infer` exposes
// for the client (additionalFields, organization → `activeOrganizationId`) —
// one derivation, two consumers, instead of re-deriving the branching twice.
// `TOptions` is inferred from the literal object `.stack/procedure.ts` /
// `.stack/worker.ts` pass to `authRuntime(...)` at the call site (codegen
// always emits an inline object literal), so e.g. `organization: true`
// stays a literal, not a widened `boolean`.
export interface AuthInstance<
	TOptions extends AuthRuntimeInput = AuthRuntimeInput,
> {
	handler: (request: Request) => Promise<Response>;
	api: AuthApi<TOptions>;
	$Infer: {
		Session: {
			user: InferUser<{ auth: TOptions }>;
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

function buildAuth(
	env: Record<string, unknown>,
	db: unknown,
	options: AuthRuntimeInput,
) {
	const plugins: BetterAuthPlugin[] = [];

	if (options.emailOtp !== false) {
		plugins.push(
			emailOTP({
				sendVerificationOTP: async ({ email, otp }) => {
					await options.callbacks?.sendOTP({ email, code: otp, env });
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
		plugins.push(
			organization({
				// biome-ignore lint/suspicious/noExplicitAny: AccessControl type is internal to better-auth.
				ac: orgConfig.ac as any,
				// better-auth's org plugin reads `.authorize()`/`.statements` off
				// each `roles` entry directly (permission.mjs's `hasPermissionFn`),
				// not the bare `{resource: actions[]}` record our own
				// `createAccessControl().newRole()` (`../access.ts`, the documented
				// consumer surface) and `defaultOrgRoles` return. Wrap every role
				// through better-auth's real `role()` before handing it over, or
				// `hasPermission` throws `TypeError: ...authorize is not a function`
				// for every check.
				roles: Object.fromEntries(
					Object.entries(
						(orgConfig.roles ?? defaultOrgRoles) as Record<
							string,
							Record<string, readonly string[]>
						>,
					).map(([name, grants]) => [name, buildAcRole(grants)]),
					// biome-ignore lint/suspicious/noExplicitAny: roles shape is user-provided.
				) as any,
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
			// enabled, so the adapter must never reference them otherwise.
			schema: {
				user,
				session,
				account,
				verification,
				...(options.organization
					? { organization: organizationTable, member, invitation }
					: {}),
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
			// biome-ignore lint/suspicious/noExplicitAny: additionalFields is user-provided.
			additionalFields: options.session?.additionalFields as any,
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
					// biome-ignore lint/suspicious/noExplicitAny: additionalFields is user-provided.
					additionalFields: options.user.additionalFields as any,
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

// ---------- auth.orgRules (WS6.2) ----------
//
// `routes(procedure)` receives plugin-api's procedure factory as `unknown`
// (`RuntimePlugin` is framework-agnostic, see `packages/cli/src/runtime.ts`).
// Narrowing to just the `procedure({ auth: true }).query(handler)` surface
// this file touches avoids importing plugin-api's full generic
// procedure-builder machinery — the same "describe just the surface we
// touch" approach `plugins/api/src/procedure.ts`'s own `OrpcChain` note
// documents.
interface OrgRulesContext {
	reqHeaders: Headers;
	auth: {
		api: {
			getActiveMember: (opts: { headers: Headers }) => Promise<{
				role: string;
			}>;
		};
	};
}

type OrgRulesProcedureFactory = (config: {
	auth: true;
	reads?: readonly string[];
}) => {
	query<TOutput>(
		fn: (opts: { context: OrgRulesContext }) => Promise<TOutput>,
	): unknown;
};

// A role's grants, either the bare `{resource: actions[]}` record our own
// `createAccessControl().newRole()` (`../access.ts`) and `defaultOrgRoles`
// return, or `.statements` on a real better-auth `Role` (a consumer who
// imported `better-auth/plugins/access` directly instead of our wrapper).
function grantsOf(role: unknown): Record<string, readonly string[]> | null {
	if (!role || typeof role !== "object") return null;
	if ("statements" in role) {
		const statements = (role as { statements: unknown }).statements;
		if (statements && typeof statements === "object") {
			return statements as Record<string, readonly string[]>;
		}
	}
	return role as Record<string, readonly string[]>;
}

// better-auth's member role is a comma-separated multi-role string
// (`hasPermissionFn`/`leaveOrganization` in better-auth's organization
// plugin both `.split(",")` it) — union the grants of every role that
// matches. An unknown role name contributes nothing; if none match, the
// merged record is empty and `compileStatements` -> `packAbility` naturally
// yields `{ rules: [] }`.
function resolveGrants(
	roleField: string,
	roles: Record<string, unknown>,
): Record<string, readonly string[]> {
	const merged = new Map<string, Set<string>>();
	for (const name of roleField.split(",")) {
		const grants = grantsOf(roles[name]);
		if (!grants) continue;
		for (const [resource, actions] of Object.entries(grants)) {
			const set = merged.get(resource) ?? new Set<string>();
			for (const action of actions) set.add(action);
			merged.set(resource, set);
		}
	}
	return Object.fromEntries(
		[...merged].map(([resource, actions]) => [resource, [...actions]]),
	);
}

export default function authRuntime<TOptions extends AuthRuntimeInput>(
	options: TOptions,
): RuntimePlugin<
	"auth",
	object,
	{
		auth: AuthInstance<TOptions>;
		_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
	}
> {
	return {
		name: "auth",
		// context() reads upstream.db (the drizzle client dbRuntime provides) —
		// declare the edge so createWorker runs db's context first regardless of
		// `.use()` registration order.
		// Env presence/value checks live in the generated worker's `envChecks`
		// assertion (WS6.3), fed by this plugin's `cloudflare.slots.secrets`
		// contribution — not in a per-request validateEnv here.
		dependsOn: ["db"],
		// Framework-owned org-rules procedure (WS6.2): ships the caller's
		// compiled org
		// ability so the `useAbility` client hook can drive UI affordances from
		// the same rules `hasPermission` checks server-side. Only registered
		// when organizations are enabled — no `organization` plugin means no
		// member/role to compile rules from.
		routes(procedure: unknown) {
			if (!options.organization) return {};

			// `reads: ["member"]` — the caller's compiled ability is derived
			// from their member role, so a role-changing mutation that declares
			// `writes: ["member"]` (e.g. `updateMemberRole`) auto-invalidates
			// this query end-to-end via the generic entity-header cache-
			// invalidation contract (WS3), with zero bespoke wiring. "member" is
			// a legal `Entity` because auth contributes it to
			// `api.slots.entities` (see `../index.ts`).
			const orgRulesProcedure = (procedure as OrgRulesProcedureFactory)({
				auth: true,
				reads: ["member"],
			}).query(async ({ context }) => {
				let member: { role: string };
				try {
					member = await context.auth.api.getActiveMember({
						headers: context.reqHeaders,
					});
				} catch (error) {
					// better-auth's endpoint throws `APIError.from("BAD_REQUEST",
					// ORGANIZATION_ERROR_CODES.NO_ACTIVE_ORGANIZATION |
					// MEMBER_NOT_FOUND)` for exactly the two "no ability to
					// compile" cases -- deny-all on the client, not a request
					// error. Any other error (a D1 outage, an unexpected bug)
					// rethrows: a real failure must surface as a query error
					// client-side, matching `fetchOrgRules`'s contract
					// (`@fcalell/plugin-api/ability-client`), never a silent
					// deny-all.
					if (
						isAPIError(error) &&
						(error.body?.code === "NO_ACTIVE_ORGANIZATION" ||
							error.body?.code === "MEMBER_NOT_FOUND")
					) {
						return { rules: [] };
					}
					throw error;
				}

				const rolesConfig =
					typeof options.organization === "object"
						? options.organization.roles
						: undefined;
				const grants = resolveGrants(
					member.role,
					(rolesConfig ?? defaultOrgRoles) as Record<string, unknown>,
				);
				const ability = createMongoAbility(compileStatements(grants));
				return { rules: packAbility(ability) };
			});

			const [routerKey, procedureKey] = ORG_RULES_PATH;
			return { [routerKey]: { [procedureKey]: orgRulesProcedure } };
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
				// literal built inside `buildAuth` — it structurally satisfies
				// `AuthApi` (handler + api.getSession/hasPermission) at runtime;
				// this cast is the one place we assert the honest, hand-declared
				// `AuthInstance<TOptions>` contract stands in for better-auth's own
				// (differently-parameterized) inferred type.
				auth: getOrInitAuth(
					env,
					u.db,
					options,
				) as unknown as AuthInstance<TOptions>,
				...(rateLimiter.ip || rateLimiter.email
					? { _rateLimiter: rateLimiter }
					: {}),
			};
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
