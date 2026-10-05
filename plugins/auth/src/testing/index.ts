import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
	TestingContext,
	TestingPlugin,
} from "@fcalell/plugin-api/testing";
import type { SQLiteTable } from "@fcalell/plugin-db/orm";
import { and, eq } from "@fcalell/plugin-db/orm";
import { makeSignature } from "better-auth/crypto";
import { session, user } from "../schema/index.ts";
import {
	oauthClient,
	oauthClientResource,
	oauthConsent,
} from "../schema/oauth.ts";
import { member, organization } from "../schema/organization.ts";
import {
	MCP_CONSENT_PAGE,
	MCP_ORGANIZATION_PAGE,
	MCP_RESOURCE_PATH,
	MCP_SCOPES,
} from "../types.ts";

// Signs a consumer test in without an OTP and without a Better Auth instance:
// a `session` row written through the drizzle client the db testing plugin
// provides, and its token signed with the secret the way Better Auth signs
// its own session cookie (`token.signature`, HMAC-SHA256 in standard
// base64). The worker's session check finds the row by token, so the cookie
// passes it as a real sign-in's would. Node-only.

// Better Auth's own session length when `session.expiresIn` is unset.
const DEFAULT_EXPIRES_IN = 60 * 60 * 24 * 7;

// The one drizzle surface the helpers write through. The sqlite and D1
// clients both fit: one runs synchronously, one with a promise, and `await`
// reads both.
export interface TestingDb {
	insert(table: SQLiteTable): {
		values(row: Record<string, unknown>): { run(): unknown };
	};
	select(): {
		from(table: SQLiteTable): {
			where(condition: unknown): { get(): unknown };
		};
	};
}

export interface SessionCookieOptions {
	cookiePrefix: string;
	// Better Auth prefixes `__Secure-` exactly when the app URL is https.
	secure: boolean;
}

export interface MintSessionOptions extends SessionCookieOptions {
	secret: string;
	// Seconds; Better Auth's seven days when unset.
	expiresIn?: number;
}

// The session cookie's name, as Better Auth's `createCookieGetter` derives it.
export function sessionCookieName(options: SessionCookieOptions): string {
	return `${options.secure ? "__Secure-" : ""}${options.cookiePrefix}.session_token`;
}

// Writes a session for `userId` and returns its signed cookie. The token is
// 32 url-safe characters, the length of Better Auth's own; nothing else about
// it is checked.
export async function mintSession(
	db: TestingDb,
	options: MintSessionOptions,
	userId: string,
): Promise<{ name: string; value: string }> {
	const token = randomBytes(24).toString("base64url");
	const expiresIn = options.expiresIn ?? DEFAULT_EXPIRES_IN;
	await db
		.insert(session)
		.values({
			id: randomUUID(),
			token,
			userId,
			expiresAt: new Date(Date.now() + expiresIn * 1000),
		} satisfies Omit<typeof session.$inferInsert, "updatedAt">)
		.run();
	return {
		name: sessionCookieName(options),
		value: `${token}.${await makeSignature(token, options.secret)}`,
	};
}

export interface TestUser {
	id: string;
	email: string;
	name: string;
}

export interface TestOrganization {
	id: string;
	name: string;
	slug: string;
}

export interface TestMember<TRole extends string> {
	user: TestUser;
	member: { id: string; organizationId: string; userId: string; role: TRole };
	// The `name=value` header `client({ cookie })` takes.
	cookie: string;
}

export interface AuthTestingOptions<TRole extends string = string> {
	cookiePrefix: string;
	secretVar: string;
	appUrlVar: string;
	expiresIn?: number;
	// Baked exactly when organizations are on: the configured role names.
	roles?: readonly TRole[];
	// Baked when `auth({ mcp: true })` is on: the `oauth` helpers exist.
	mcp?: boolean;
}

export interface UserHelpers {
	user(input?: { email?: string; name?: string }): Promise<TestUser>;
	// Signs an existing user in; returns the cookie header.
	session(userId: string): Promise<string>;
}

export interface OrganizationHelpers<TRole extends string> {
	organization(input?: {
		name?: string;
		slug?: string;
	}): Promise<TestOrganization>;
	// A member of `role` in the organization, signed in. Creates the user
	// unless one `user()` returned is given.
	member(input: {
		organizationId: string;
		role: TRole;
		user?: TestUser;
	}): Promise<TestMember<TRole>>;
}

// A client the authorization server knows without a metadata lookup: a
// managed public client with a loopback redirect, which is the CIMD path's
// stand-in, since no lookup may leave the process.
export interface OAuthTestClient {
	clientId: string;
	redirectUri: string;
}

export interface OAuthHelpers<TRole extends string> {
	// Writes a client of both scopes, linked to the `/mcp` resource.
	register(): Promise<OAuthTestClient>;
	// Runs the authorization for `member`, signed in by their cookie: the
	// authorize call, the organization choice when the provider asks, consent,
	// and the PKCE code exchange, all through the worker's `fetch`. Answers
	// the tokens and the grant's id (its consent row's).
	connect(input: {
		member: TestMember<TRole>;
		organizationId: string;
		client: OAuthTestClient;
	}): Promise<{ accessToken: string; refreshToken: string; grantId: string }>;
	// Exchanges a refresh token for the rotated pair.
	refresh(
		refreshToken: string,
		client: OAuthTestClient,
	): Promise<{ accessToken: string; refreshToken: string }>;
}

// The organization helpers exist exactly when roles are baked, as the
// worker's tenancy exists exactly when organizations are on, and the OAuth
// helpers exactly when `mcp` is.
export type AuthTesting<TOptions extends AuthTestingOptions> = UserHelpers &
	(TOptions extends { roles: readonly (infer TRole extends string)[] }
		? OrganizationHelpers<TRole> &
				(TOptions extends { mcp: true }
					? { oauth: OAuthHelpers<TRole> }
					: object)
		: object);

function readVar(env: Record<string, unknown>, name: string): string {
	const value = env[name];
	if (typeof value !== "string" || value === "") {
		throw new Error(
			`authTesting: env var ${name} is missing; the test entry signs sessions with it.`,
		);
	}
	return value;
}

// The type promises `db`; a consumer without the db testing plugin (a sqlite
// one: `dbTesting` exists on d1 only) boots without it.
function requireDb(db: TestingDb | undefined): TestingDb {
	if (!db) {
		throw new Error(
			'authTesting: no "db" testing plugin provides a database to write through; plugin-db\'s `dbTesting` exists on the d1 dialect only.',
		);
	}
	return db;
}

const LOOPBACK_REDIRECT = "http://127.0.0.1:33418/callback";

// The cookies a request carries and a response sets, for the one browser a
// `connect` stands in for.
class Cookies {
	private readonly jar = new Map<string, string>();

	constructor(header: string) {
		this.take(header.split("; "));
	}

	private take(pairs: string[]): void {
		for (const pair of pairs) {
			const eq = pair.indexOf("=");
			if (eq > 0) this.jar.set(pair.slice(0, eq), pair.slice(eq + 1));
		}
	}

	store(response: Response): void {
		this.take(
			response.headers
				.getSetCookie()
				.map((cookie) => cookie.slice(0, cookie.indexOf(";"))),
		);
	}

	header(): string {
		return [...this.jar].map(([name, value]) => `${name}=${value}`).join("; ");
	}
}

function oauthHelpers(
	ctx: TestingContext,
	db: TestingDb,
	appUrl: string,
): OAuthHelpers<string> {
	const origin = new URL(appUrl).origin;
	const resource = `${appUrl.replace(/\/+$/, "")}${MCP_RESOURCE_PATH}`;

	async function exchangeTokens(
		params: Record<string, string>,
	): Promise<{ access_token: string; refresh_token: string }> {
		const response = await ctx.fetch(
			new URL("/api/auth/oauth2/token", origin),
			{
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams(params).toString(),
			},
		);
		const body = await response.text();
		if (!response.ok) {
			throw new Error(
				`authTesting: the token exchange answered ${response.status}: ${body}`,
			);
		}
		return JSON.parse(body);
	}

	return {
		async register() {
			// The first request builds the auth instance, which seeds the resource
			// the client links to.
			await ctx.fetch(new URL("/.well-known/oauth-protected-resource", origin));
			const clientId = `test-client-${randomUUID()}`;
			const now = new Date();
			await db
				.insert(oauthClient)
				.values({
					id: randomUUID(),
					clientId,
					clientDiscoveryId: null,
					name: "Test client",
					redirectUris: [LOOPBACK_REDIRECT],
					scopes: [...MCP_SCOPES],
					grantTypes: ["authorization_code", "refresh_token"],
					responseTypes: ["code"],
					tokenEndpointAuthMethod: "none",
					applicationType: "native",
					requirePKCE: true,
					disabled: false,
					createdAt: now,
					updatedAt: now,
				} satisfies Partial<typeof oauthClient.$inferInsert>)
				.run();
			await db
				.insert(oauthClientResource)
				.values({
					id: randomUUID(),
					clientId,
					resourceId: resource,
					createdAt: now,
				} satisfies typeof oauthClientResource.$inferInsert)
				.run();
			return { clientId, redirectUri: LOOPBACK_REDIRECT };
		},

		async connect({ member: signedIn, organizationId, client }) {
			const cookies = new Cookies(signedIn.cookie);
			const send = async (path: string, init: RequestInit = {}) => {
				const headers = new Headers(init.headers);
				headers.set("origin", origin);
				headers.set("cookie", cookies.header());
				if (init.body && !headers.has("content-type")) {
					headers.set("content-type", "application/json");
				}
				const response = await ctx.fetch(new URL(path, origin), {
					...init,
					headers,
					redirect: "manual",
				});
				cookies.store(response);
				return response;
			};
			const nextPage = async (response: Response): Promise<URL> => {
				const text = await response.text();
				if (!response.ok) {
					throw new Error(
						`authTesting: the authorization answered ${response.status}: ${text}`,
					);
				}
				return new URL((JSON.parse(text) as { url: string }).url, origin);
			};

			const verifier = randomBytes(32).toString("base64url");
			const authorize = await send(
				`/api/auth/oauth2/authorize?${new URLSearchParams({
					response_type: "code",
					client_id: client.clientId,
					redirect_uri: client.redirectUri,
					scope: MCP_SCOPES.join(" "),
					state: randomBytes(8).toString("hex"),
					code_challenge: createHash("sha256")
						.update(verifier)
						.digest("base64url"),
					code_challenge_method: "S256",
					resource,
				})}`,
			);
			if (authorize.status !== 302) {
				throw new Error(
					`authTesting: the authorization answered ${authorize.status}: ${await authorize.text()}`,
				);
			}
			let page = new URL(authorize.headers.get("location") ?? "", origin);
			if (page.pathname === MCP_ORGANIZATION_PAGE) {
				page = await nextPage(
					await send("/api/auth/organization/set-active", {
						method: "POST",
						body: JSON.stringify({
							organizationId,
							oauth_query: page.search.slice(1),
						}),
					}),
				);
			}
			if (page.pathname !== MCP_CONSENT_PAGE) {
				throw new Error(
					`authTesting: the authorization did not reach consent for the member: it went to ${page.href}`,
				);
			}
			const callback = await nextPage(
				await send("/api/auth/oauth2/consent", {
					method: "POST",
					body: JSON.stringify({
						accept: true,
						oauth_query: page.search.slice(1),
					}),
				}),
			);
			const code = callback.searchParams.get("code");
			if (!code) {
				throw new Error(`authTesting: no code was issued: ${callback.href}`);
			}
			const tokens = await exchangeTokens({
				grant_type: "authorization_code",
				code,
				redirect_uri: client.redirectUri,
				client_id: client.clientId,
				code_verifier: verifier,
				resource,
			});
			const claims = JSON.parse(
				Buffer.from(
					tokens.access_token.split(".")[1] ?? "",
					"base64url",
				).toString(),
			) as { organization_id?: string };
			if (claims.organization_id !== organizationId) {
				throw new Error(
					`authTesting: the grant is to ${claims.organization_id}, not ${organizationId}: the member belongs to one organization and it is not the one asked for.`,
				);
			}
			const consent = (await db
				.select()
				.from(oauthConsent)
				.where(
					and(
						eq(oauthConsent.clientId, client.clientId),
						eq(oauthConsent.userId, signedIn.user.id),
						eq(oauthConsent.referenceId, organizationId),
					),
				)
				.get()) as { id: string } | undefined;
			if (!consent)
				throw new Error("authTesting: the grant left no consent row.");
			return {
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				grantId: consent.id,
			};
		},

		async refresh(refreshToken, client) {
			const tokens = await exchangeTokens({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: client.clientId,
				resource,
			});
			return {
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
			};
		},
	};
}

export default function authTesting<const TOptions extends AuthTestingOptions>(
	options: TOptions,
): TestingPlugin<"auth", { db: TestingDb }, { auth: AuthTesting<TOptions> }> {
	return {
		name: "auth",
		dependsOn: ["db"],
		async setup(ctx, upstream) {
			// Read after `boot({ env })` overlays, so an override is honoured.
			const secret = readVar(ctx.env, options.secretVar);
			const appUrl = readVar(ctx.env, options.appUrlVar);
			const db = requireDb(upstream.db);
			const mint = {
				secret,
				cookiePrefix: options.cookiePrefix,
				secure: appUrl.startsWith("https://"),
				expiresIn: options.expiresIn,
			};

			async function createUser(input?: {
				email?: string;
				name?: string;
			}): Promise<TestUser> {
				const id = randomUUID();
				const row = {
					id,
					email: input?.email ?? `${id}@example.test`,
					name: input?.name ?? "Member",
				};
				await db
					.insert(user)
					.values(row satisfies typeof user.$inferInsert)
					.run();
				return row;
			}

			async function signIn(userId: string): Promise<string> {
				const { name, value } = await mintSession(db, mint, userId);
				return `${name}=${value}`;
			}

			const helpers: UserHelpers = { user: createUser, session: signIn };
			const roles: readonly string[] | undefined = options.roles;
			// TypeScript cannot narrow `AuthTesting<TOptions>` on the runtime
			// presence of `roles`; both branches provide exactly what it resolves to.
			if (!roles) {
				return { provides: { auth: helpers as AuthTesting<TOptions> } };
			}

			const organizationHelpers: OrganizationHelpers<string> = {
				async organization(input) {
					const id = randomUUID();
					const row = {
						id,
						name: input?.name ?? "Organization",
						slug: input?.slug ?? `org-${id}`,
					};
					await db
						.insert(organization)
						.values(row satisfies typeof organization.$inferInsert)
						.run();
					return row;
				},
				async member(input) {
					// The type already refuses an unknown role; a cast or an
					// untyped caller reaches this.
					if (!roles.includes(input.role)) {
						throw new Error(
							`authTesting: role "${input.role}" is not one of the configured roles: ${roles.join(", ")}.`,
						);
					}
					const memberUser = input.user ?? (await createUser());
					const row = {
						id: randomUUID(),
						organizationId: input.organizationId,
						userId: memberUser.id,
						role: input.role,
					};
					await db
						.insert(member)
						.values(row satisfies typeof member.$inferInsert)
						.run();
					return {
						user: memberUser,
						member: row,
						cookie: await signIn(memberUser.id),
					};
				},
			};
			return {
				provides: {
					auth: {
						...helpers,
						...organizationHelpers,
						...(options.mcp ? { oauth: oauthHelpers(ctx, db, appUrl) } : {}),
					} as unknown as AuthTesting<TOptions>,
				},
			};
		},
	};
}
