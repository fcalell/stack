import { cimd } from "@better-auth/cimd";
import { defineRequestState } from "@better-auth/core/context";
import {
	createDpopReplayStore,
	createInsufficientScopeError,
	enforceDpopBinding,
	isDpopBindingError,
	parseAccessTokenAuthorization,
	verifyJwsAccessToken,
} from "@better-auth/core/oauth2";
import { mcp } from "@better-auth/mcp";
import {
	createResourceServerChallenge,
	getOAuthProviderState,
} from "@better-auth/oauth-provider";
import { and, eq, type InferSelectModel, sql } from "@fcalell/plugin-db/orm";
import type { BetterAuthPlugin } from "better-auth";
import {
	APIError,
	createAuthMiddleware,
	getSessionFromCtx,
	isAPIError,
} from "better-auth/api";
import { jwt } from "better-auth/plugins/jwt";
import { user as userTable } from "../schema/index.ts";
import { oauthConsent } from "../schema/oauth.ts";
import { member as memberTable } from "../schema/organization.ts";
import {
	type MemberRow,
	type Membership,
	organization as organizationScope,
} from "../scope.ts";
import {
	AUTH_PREFIX,
	MCP_CONSENT_PAGE,
	MCP_LOGIN_PAGE,
	MCP_ORGANIZATION_PAGE,
	MCP_RESOURCE_PATH,
	MCP_SCOPE,
	MCP_SCOPES,
} from "../types.ts";
import { fetchClientMetadataResource } from "./cimd-transport.ts";
import { createTenancy, listOrganizations, type Tenancy } from "./tenancy.ts";

// Structural match with plugin-api's `RateLimitBinding` (procedure.ts).
export interface RateLimitBinding {
	limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export function tooManyRequests(): Response {
	return new Response(JSON.stringify({ code: "TOO_MANY_REQUESTS" }), {
		status: 429,
		headers: { "content-type": "application/json" },
	});
}

// The organization an agent's authorization may act in is one the tenancy
// resolves for the member, and a refusal names this code.
const ORGANIZATION_NOT_RESOLVED = "ORGANIZATION_NOT_RESOLVED";

function organizationNotResolved(): APIError {
	return new APIError("FORBIDDEN", {
		code: ORGANIZATION_NOT_RESOLVED,
		message:
			"Choose an organization you are a member of; the one named is not available.",
	});
}

// The grant lifetimes: an authorization code of 10 minutes, a 1-hour access
// token, a rotating 30-day refresh token reusable for 30 seconds after its
// rotation. Pinned, not options, so a dependency bump never moves them.
const CODE_EXPIRES_IN = 600;
const ACCESS_TOKEN_EXPIRES_IN = 3600;
const REFRESH_TOKEN_EXPIRES_IN = 2592000;
const REFRESH_TOKEN_REUSE_INTERVAL = 30;

// The routes an authorization server serves that the app does not use: the
// session-minted JWT, and the consumer's own listing and revocation of grants
// that `consent` rows are reached through, never through a session.
const DISABLED_PATHS = [
	"/token",
	"/oauth2/get-consent",
	"/oauth2/get-consents",
	"/oauth2/update-consent",
	"/oauth2/delete-consent",
];

export const MCP_DISABLED_PATHS = DISABLED_PATHS;

// The resource an access token is bound to and the issuer that signs it, from
// the app URL. One derivation for the provider and the verifier.
export function mcpResource(appUrl: string): string {
	return `${appUrl.replace(/\/+$/, "")}${MCP_RESOURCE_PATH}`;
}

function mcpIssuer(appUrl: string): string {
	return `${appUrl.replace(/\/+$/, "")}${AUTH_PREFIX}`;
}

// ── Grants ──────────────────────────────────────────────────────────

// The adapter surface the grant deletions use: Better Auth's own, by model
// and field name.
export interface GrantAdapter {
	deleteMany(args: {
		model: string;
		where: { field: string; value: unknown; operator?: string }[];
	}): Promise<number>;
	findOne<T>(args: {
		model: string;
		where: { field: string; value: unknown }[];
	}): Promise<T | null>;
}

interface GrantFilter {
	clientId?: string;
	userId?: string;
	referenceId: string;
}

// Deletes one grant's rows, or every grant a filter names: the access-token
// rows first, since `refreshId` has no cascade, then the refresh tokens, then
// the consent. One `deleteMany` each (a batch is not portable: the sqlite
// client has none).
async function deleteGrants(
	adapter: GrantAdapter,
	filter: GrantFilter,
	before?: Date,
): Promise<number> {
	const where = [
		{ field: "referenceId", value: filter.referenceId },
		...(filter.clientId === undefined
			? []
			: [{ field: "clientId", value: filter.clientId }]),
		...(filter.userId === undefined
			? []
			: [{ field: "userId", value: filter.userId }]),
	];
	const tokens = before
		? [...where, { field: "createdAt", value: before, operator: "lt" }]
		: where;
	await adapter.deleteMany({ model: "oauthAccessToken", where: tokens });
	await adapter.deleteMany({ model: "oauthRefreshToken", where: tokens });
	if (before) return 0;
	return adapter.deleteMany({ model: "oauthConsent", where });
}

// ── The verified call ───────────────────────────────────────────────

type UserRow = InferSelectModel<typeof userTable>;

export interface VerifiedAgent {
	// The member's user row, marked as an agent's.
	user: UserRow & { agent: true };
	// The grant as a session: `id` is the consent id, never a token.
	session: {
		id: string;
		userId: string;
		activeOrganizationId: string;
		createdAt: Date;
		updatedAt: Date;
		expiresAt: Date;
		ipAddress: string | null;
		userAgent: string | null;
	};
	member: MemberRow;
	grant: {
		id: string;
		clientId: string;
		organizationId: string;
		scopes: string[];
	};
	// Resolves the grant's organization for the member and no other.
	tenancy: Tenancy;
}

export interface OAuth {
	// Turns a request's bearer access token into its member in the grant's
	// organization, or answers the `401`, `403` or `429` response a client
	// reads: the `WWW-Authenticate` challenge that starts or restarts the
	// authorization flow.
	verify(request: Request): Promise<VerifiedAgent | Response>;
	// Ends a grant by its consent id: its access tokens, refresh tokens and
	// consent. Answers whether one existed.
	revokeGrant(id: string): Promise<boolean>;
}

// The drizzle surface the grant read uses.
interface GrantClient {
	select(fields: Record<string, unknown>): {
		from(table: unknown): {
			innerJoin(
				table: unknown,
				on: unknown,
			): {
				innerJoin(
					table: unknown,
					on: unknown,
				): { where(condition: unknown): { get(): unknown } };
			};
		};
	};
}

// The auth context members the capability reads.
interface AuthContextLike {
	adapter: GrantAdapter;
	internalAdapter: Parameters<typeof createDpopReplayStore>[0];
}

export interface OAuthDeps {
	auth: {
		api: { getJwks(): Promise<unknown> };
		$context: Promise<unknown>;
	};
	db: unknown;
	roles: Record<string, unknown>;
	membership: Membership | null;
	appUrl: string;
	// The per-grant limiter; absent under dev mode.
	limiter?: RateLimitBinding;
}

// A signing key set is cached per auth instance, so a token verifies without
// a read of the keys on every call.
const jwksCacheKeys = new WeakMap<object, object>();

const JOSE_CODE = /^ERR_J/;

// A token the verifier cannot read or trust: a jose error, or the TypeError a
// value that is no JWT raises.
function isTokenError(error: unknown): boolean {
	if (error instanceof TypeError) return true;
	const code = (error as { code?: unknown } | null)?.code;
	return (
		error instanceof Error && typeof code === "string" && JOSE_CODE.test(code)
	);
}

function unauthorized(message: string): APIError {
	return new APIError("UNAUTHORIZED", { message });
}

export function createOAuth(deps: OAuthDeps): OAuth {
	const resource = mcpResource(deps.appUrl);
	const issuer = mcpIssuer(deps.appUrl);
	const client = deps.db as GrantClient;
	let cacheKey = jwksCacheKeys.get(deps.auth);
	if (!cacheKey) {
		cacheKey = {};
		jwksCacheKeys.set(deps.auth, cacheKey);
	}

	async function context(): Promise<AuthContextLike> {
		return (await deps.auth.$context) as AuthContextLike;
	}

	function challenge(error: unknown): Response {
		let failure = error;
		if (isDpopBindingError(error)) {
			failure = new APIError("UNAUTHORIZED", {
				message: error.message,
				error: error.code,
				error_description: error.message,
			});
		} else if (!isAPIError(error) && isTokenError(error)) {
			failure = unauthorized("invalid access token");
		}
		const answer = createResourceServerChallenge(failure, resource, {
			challengeScopes: [...MCP_SCOPES],
		});
		if (!answer) throw error;
		const headers = new Headers(answer.headers);
		headers.set("content-type", "application/json");
		return new Response(
			JSON.stringify({
				error:
					answer.statusCode === 403 ? "insufficient_scope" : "unauthorized",
			}),
			{ status: answer.statusCode, headers },
		);
	}

	async function verify(request: Request): Promise<VerifiedAgent | Response> {
		try {
			const authorization = parseAccessTokenAuthorization(
				request.headers.get("authorization"),
			);
			if (!authorization?.token) throw unauthorized("missing bearer token");
			if (authorization.scheme === "Unknown") {
				throw unauthorized("authorization scheme must be Bearer or DPoP");
			}
			const payload = await verifyJwsAccessToken(authorization.token, {
				jwksFetch: () =>
					deps.auth.api.getJwks() as Promise<{ keys: never[] } | undefined>,
				jwksCacheKey: cacheKey,
				verifyOptions: { issuer, audience: resource, typ: "at+jwt" },
			});
			const granted =
				typeof payload.scope === "string" ? payload.scope.split(" ") : [];
			if (!granted.includes(MCP_SCOPE)) {
				throw createInsufficientScopeError([MCP_SCOPE]);
			}
			const { internalAdapter } = await context();
			await enforceDpopBinding({
				payload,
				authorization,
				proofJwt: request.headers.get("dpop"),
				method: request.method,
				url: request.url,
				replayStore: createDpopReplayStore(internalAdapter),
			});

			const userId = payload.sub;
			const clientId = payload.azp;
			const organizationId = payload.organization_id;
			if (
				typeof userId !== "string" ||
				typeof clientId !== "string" ||
				typeof organizationId !== "string" ||
				typeof payload.iat !== "number" ||
				typeof payload.exp !== "number"
			) {
				throw unauthorized("access token claims are incomplete");
			}

			// The consent of the token's client, member and organization must
			// stand, and the member's membership of it count.
			const row = (await client
				.select({
					consent: oauthConsent,
					user: userTable,
					member: memberTable,
				})
				.from(oauthConsent)
				.innerJoin(userTable, eq(oauthConsent.userId, userTable.id))
				.innerJoin(
					memberTable,
					and(
						eq(memberTable.userId, userTable.id),
						eq(memberTable.organizationId, oauthConsent.referenceId),
					),
				)
				.where(
					and(
						eq(oauthConsent.userId, userId),
						eq(oauthConsent.clientId, clientId),
						eq(oauthConsent.referenceId, organizationId),
						deps.membership ? sql`(${deps.membership.where})` : undefined,
					),
				)
				.get()) as
				| {
						consent: InferSelectModel<typeof oauthConsent>;
						user: UserRow;
						member: MemberRow;
				  }
				| undefined;
			if (!row?.consent.createdAt) throw unauthorized("grant not found");
			// A token issued before the consent that now stands belongs to a
			// grant that was revoked, whatever grant has since replaced it.
			if (payload.iat < Math.floor(row.consent.createdAt.getTime() / 1000)) {
				throw unauthorized("grant not found");
			}
			if (deps.limiter) {
				const { success } = await deps.limiter.limit({ key: row.consent.id });
				if (!success) return tooManyRequests();
			}
			const issuedAt = new Date(payload.iat * 1000);
			return {
				user: { ...row.user, agent: true },
				session: {
					id: row.consent.id,
					userId: row.user.id,
					activeOrganizationId: organizationId,
					createdAt: issuedAt,
					updatedAt: issuedAt,
					expiresAt: new Date(payload.exp * 1000),
					ipAddress: request.headers.get("cf-connecting-ip"),
					userAgent: request.headers.get("user-agent"),
				},
				member: row.member,
				grant: {
					id: row.consent.id,
					clientId,
					organizationId,
					scopes: granted,
				},
				tenancy: createTenancy(
					deps.db,
					deps.roles,
					deps.membership,
					organizationId,
				),
			};
		} catch (error) {
			return challenge(error);
		}
	}

	async function revokeGrant(id: string): Promise<boolean> {
		const { adapter } = await context();
		const consent = await adapter.findOne<{
			clientId: string;
			userId: string;
			referenceId: string;
		}>({ model: "oauthConsent", where: [{ field: "id", value: id }] });
		if (!consent?.referenceId) return false;
		await deleteGrants(adapter, consent);
		return true;
	}

	return { verify, revokeGrant };
}

// ── The provider ────────────────────────────────────────────────────

export interface McpPluginsDeps {
	appUrl: string;
	db: unknown;
	roles: Record<string, unknown>;
	membership: Membership | null;
	// The auth context, once the instance exists: the organization hooks run
	// without one.
	context: () => Promise<{ adapter: GrantAdapter }>;
}

// Set by the `set-active` call that carries the authorization's signed query:
// the member chose in this request, so the authorization it resumes goes on
// to consent instead of asking again.
const chosenInRequest = defineRequestState(() => false);

function promptWithConsent(existing: unknown): string {
	const kept =
		typeof existing === "string"
			? existing
					.split(" ")
					.filter((token) => token && token !== "none" && token !== "consent")
			: [];
	return [...kept, "consent"].join(" ");
}

// The plugins `auth({ mcp: true })` adds, in order (`jwt`, `mcp`, `cimd`, then
// the guards the framework puts around them), and the organization hooks that
// delete a member's grants with their membership.
export function mcpPlugins(deps: McpPluginsDeps): {
	plugins: BetterAuthPlugin[];
	organizationHooks: {
		afterRemoveMember: (data: {
			member: { organizationId: string; userId: string };
		}) => Promise<void>;
		afterDeleteOrganization: (data: {
			organization: { id: string };
		}) => Promise<void>;
	};
} {
	const tenancy = createTenancy(deps.db, deps.roles, deps.membership);
	const resource = mcpResource(deps.appUrl);

	// The organization a grant is for: the one a one-organization member has,
	// else the session's active one, whichever the tenancy resolves.
	async function consentReference(
		userId: string,
		activeOrganizationId: unknown,
	): Promise<string> {
		const organizations = await listOrganizations(
			deps.db,
			deps.membership,
			userId,
		);
		const only = organizations.length === 1 ? organizations[0] : undefined;
		if (only) return only;
		if (
			typeof activeOrganizationId === "string" &&
			(await tenancy.resolve(organizationScope, activeOrganizationId, userId))
		) {
			return activeOrganizationId;
		}
		throw organizationNotResolved();
	}

	const provider = mcp({
		loginPage: MCP_LOGIN_PAGE,
		consentPage: MCP_CONSENT_PAGE,
		resource,
		scopes: [...MCP_SCOPES],
		advertisedMetadata: { scopes_supported: [...MCP_SCOPES] },
		grantTypes: ["authorization_code", "refresh_token"],
		codeExpiresIn: CODE_EXPIRES_IN,
		accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
		refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
		refreshTokenReuseInterval: REFRESH_TOKEN_REUSE_INTERVAL,
		allowDynamicClientRegistration: false,
		allowUnauthenticatedClientRegistration: false,
		// Clients come from metadata documents, never from a session.
		clientPrivileges: () => false,
		resourcePrivileges: () => false,
		customAccessTokenClaims: ({ referenceId }) => ({
			organization_id: referenceId,
		}),
		postLogin: {
			page: MCP_ORGANIZATION_PAGE,
			// A member of exactly one organization has nothing to choose; with
			// none, the choice page shows its empty state and denies; with
			// several, the member chooses once per authorization.
			shouldRedirect: async ({ user }) => {
				if (await chosenInRequest.get()) return false;
				const organizations = await listOrganizations(
					deps.db,
					deps.membership,
					user.id,
				);
				return organizations.length !== 1;
			},
			consentReferenceId: ({ user, session }) =>
				consentReference(user.id, session.activeOrganizationId),
		},
	});

	// CIMD clients share one `client_id` across every member and organization,
	// so a standing consent must not skip the page: every external
	// authorization asks. The provider's own resumes carry
	// `authorizeSettings` and pass untouched, else consent loops.
	const guards: BetterAuthPlugin = {
		id: "mcp-guards",
		hooks: {
			before: [
				{
					matcher: (ctx) => ctx.path === "/oauth2/authorize",
					handler: createAuthMiddleware(async (ctx) => {
						if ((ctx as { authorizeSettings?: unknown }).authorizeSettings) {
							return;
						}
						const post = (ctx.request?.method ?? ctx.method) === "POST";
						const source = (post ? ctx.body : ctx.query) as
							| Record<string, unknown>
							| undefined;
						const prompt = promptWithConsent(source?.prompt);
						return {
							context: post
								? { body: { ...source, prompt } }
								: { query: { ...source, prompt } },
						};
					}),
				},
				{
					matcher: (ctx) =>
						ctx.path === "/organization/set-active" &&
						typeof ctx.body?.oauth_query === "string",
					handler: createAuthMiddleware(async (ctx) => {
						const session = await getSessionFromCtx(ctx);
						// No session: the endpoint refuses it as it always does.
						if (!session) return;
						const body = ctx.body as {
							organizationId?: string | null;
							organizationSlug?: string;
						};
						const found =
							typeof body.organizationId === "string"
								? await tenancy.resolve(
										organizationScope,
										body.organizationId,
										session.user.id,
									)
								: body.organizationId === undefined &&
										typeof body.organizationSlug === "string"
									? await tenancy.bySlug(
											organizationScope,
											body.organizationSlug,
											undefined,
											session.user.id,
										)
									: null;
						if (!found) throw organizationNotResolved();
						await chosenInRequest.set(true);
					}),
				},
			],
			after: [
				{
					// A new consent replaces a revoked one under the same client,
					// member and organization, so the tokens issued before it
					// belong to the grant it replaced. `createdAt` is the grant's
					// start; the provider moves `updatedAt` on a standing consent.
					matcher: (ctx) =>
						ctx.path === "/oauth2/consent" && ctx.body?.accept === true,
					handler: createAuthMiddleware(async (ctx) => {
						if (isAPIError(ctx.context.returned)) return;
						const session = await getSessionFromCtx(ctx);
						const query = (await getOAuthProviderState())?.query;
						const clientId = new URLSearchParams(query).get("client_id");
						if (!session || !clientId) return;
						const referenceId = await consentReference(
							session.user.id,
							session.session.activeOrganizationId,
						);
						const adapter = ctx.context.adapter as unknown as GrantAdapter;
						const consent = await adapter.findOne<{ createdAt: Date }>({
							model: "oauthConsent",
							where: [
								{ field: "clientId", value: clientId },
								{ field: "userId", value: session.user.id },
								{ field: "referenceId", value: referenceId },
							],
						});
						if (!consent) return;
						await deleteGrants(
							adapter,
							{ clientId, userId: session.user.id, referenceId },
							new Date(consent.createdAt),
						);
					}),
				},
				{
					// Leaving runs no organization hook.
					matcher: (ctx) => ctx.path === "/organization/leave",
					handler: createAuthMiddleware(async (ctx) => {
						const left = ctx.context.returned as
							| { organizationId?: string; userId?: string }
							| undefined;
						if (isAPIError(left) || !left?.organizationId || !left.userId) {
							return;
						}
						await deleteGrants(ctx.context.adapter as unknown as GrantAdapter, {
							userId: left.userId,
							referenceId: left.organizationId,
						});
					}),
				},
			],
		},
	};

	return {
		plugins: [
			jwt({ disableSettingJwtHeader: true }),
			provider,
			cimd({
				fetchClientMetadataResource,
				metadataProfile: "mcp-2026-07-28",
			}),
			guards,
		],
		organizationHooks: {
			afterRemoveMember: async ({ member }) => {
				await deleteGrants((await deps.context()).adapter, {
					userId: member.userId,
					referenceId: member.organizationId,
				});
			},
			afterDeleteOrganization: async ({ organization }) => {
				await deleteGrants((await deps.context()).adapter, {
					referenceId: organization.id,
				});
			},
		},
	};
}
