import { randomBytes, randomUUID } from "node:crypto";
import type { TestingPlugin } from "@fcalell/plugin-api/testing";
import type { SQLiteTable } from "@fcalell/plugin-db/orm";
import { makeSignature } from "better-auth/crypto";
import { session, user } from "../schema/index.ts";
import { member, organization } from "../schema/organization.ts";

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

// The organization helpers exist exactly when roles are baked, as the
// worker's tenancy exists exactly when organizations are on.
export type AuthTesting<TOptions extends AuthTestingOptions> = UserHelpers &
	(TOptions extends { roles: readonly (infer TRole extends string)[] }
		? OrganizationHelpers<TRole>
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
					} as unknown as AuthTesting<TOptions>,
				},
			};
		},
	};
}
