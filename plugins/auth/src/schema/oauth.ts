// The tables of the OAuth provider for MCP: `oauthClient`, `oauthResource`,
// `oauthClientResource`, `oauthRefreshToken`, `oauthAccessToken`,
// `oauthConsent` and `oauthClientAssertion` from `@better-auth/oauth-provider`,
// and the signing keys' `jwks` from better-auth's `jwt` plugin, as Drizzle
// SQLite tables. The canonical shape `auth generate` (better-auth's CLI)
// emits for a sqlite drizzle adapter with `jwt()`, `mcp()` and `cimd()` on
// better-auth 1.7.7, ported as `./passkey.ts` is. A foreign key carries
// `onDelete` exactly where better-auth's own field definition names one (the
// resource link's two cascades, a session's `set null`), as `./organization.ts`
// does: the generator's cascade default is not ported, so a user with grants
// is undeletable, as one with memberships is. The generator's `user` and
// `session` relation inverses are left out, since `./index.ts` must not
// reference a table the consumer only migrates when `mcp` is on. Regenerate
// and diff after a Better Auth bump.
//
// Two departures from the generator's output. It types every JSON and string
// list field `text(..., { mode: "json" })`, but better-auth's adapter already
// writes those as JSON text for sqlite, so drizzle's json mode would encode
// the text a second time and a drizzle read would answer a string, not the
// value. They are plain `text` here, which stores what better-auth stores; a
// list is read with `scopesOf` below.
//
// One addition the generator does not emit: a unique index on the consent's
// client, user and reference, so a grant is one row per client, member and
// organization however the authorization races.
//
// Shipped from a separate `@fcalell/plugin-auth/schema/oauth` subpath so a
// consumer only re-exports (and only migrates) these tables when
// `auth({ mcp: true })` is enabled; see plugins/auth/README.md.

// The drizzle types the emitted declarations spell, named here so they are
// spelled through plugin-db, the one package drizzle resolves from. Unnamed,
// tsc writes `import("drizzle-orm/...")`, which a consumer cannot resolve
// from this package, and every table and row read through it is `any`.
// biome-ignore lint/correctness/noUnusedImports: read by the declaration emit
import type {
	Many,
	One,
	Relations,
	SQLiteTableWithColumns,
} from "@fcalell/plugin-db/orm";
import {
	index,
	integer,
	relations,
	sqliteTable,
	text,
	uniqueIndex,
} from "@fcalell/plugin-db/orm";
import { session, user } from "./index.ts";

// The scopes a consent, access token or refresh token row stores, as the list
// better-auth wrote.
export function scopesOf(stored: string): string[] {
	const scopes: unknown = JSON.parse(stored);
	if (
		!Array.isArray(scopes) ||
		!scopes.every((scope) => typeof scope === "string")
	) {
		throw new Error("Stored scopes are not a list of strings");
	}
	return scopes;
}

export const jwks = sqliteTable("jwks", {
	id: text("id").primaryKey(),
	publicKey: text("public_key").notNull(),
	privateKey: text("private_key").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
	alg: text("alg"),
	crv: text("crv"),
});

export const oauthClient = sqliteTable(
	"oauth_client",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id").notNull().unique(),
		clientSecret: text("client_secret"),
		clientDiscoveryId: text("client_discovery_id"),
		disabled: integer("disabled", { mode: "boolean" }).default(false),
		skipConsent: integer("skip_consent", { mode: "boolean" }),
		enableEndSession: integer("enable_end_session", { mode: "boolean" }),
		subjectType: text("subject_type"),
		scopes: text("scopes"),
		clientCredentialsScopes: text("client_credentials_scopes").default("[]"),
		userId: text("user_id").references(() => user.id),
		createdAt: integer("created_at", { mode: "timestamp_ms" }),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
		name: text("name"),
		uri: text("uri"),
		icon: text("icon"),
		contacts: text("contacts"),
		tos: text("tos"),
		policy: text("policy"),
		softwareId: text("software_id"),
		softwareVersion: text("software_version"),
		softwareStatement: text("software_statement"),
		redirectUris: text("redirect_uris").notNull(),
		postLogoutRedirectUris: text("post_logout_redirect_uris"),
		backchannelLogoutUri: text("backchannel_logout_uri"),
		backchannelLogoutSessionRequired: integer(
			"backchannel_logout_session_required",
			{ mode: "boolean" },
		),
		tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
		applicationType: text("application_type"),
		jwks: text("jwks"),
		jwksUri: text("jwks_uri"),
		grantTypes: text("grant_types"),
		responseTypes: text("response_types"),
		requirePKCE: integer("require_pkce", { mode: "boolean" }),
		dpopBoundAccessTokens: integer("dpop_bound_access_tokens", {
			mode: "boolean",
		}).default(false),
		referenceId: text("reference_id"),
		metadata: text("metadata"),
	},
	(table) => [index("oauthClient_userId_idx").on(table.userId)],
);

export const oauthResource = sqliteTable("oauth_resource", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull().unique(),
	name: text("name").notNull(),
	accessTokenTtl: integer("access_token_ttl"),
	refreshTokenTtl: integer("refresh_token_ttl"),
	signingAlgorithm: text("signing_algorithm"),
	signingKeyId: text("signing_key_id"),
	allowedScopes: text("allowed_scopes"),
	customClaims: text("custom_claims"),
	dpopBoundAccessTokensRequired: integer("dpop_bound_access_tokens_required", {
		mode: "boolean",
	}).default(false),
	disabled: integer("disabled", { mode: "boolean" }).default(false),
	createdAt: integer("created_at", { mode: "timestamp_ms" }),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
	policyVersion: integer("policy_version").default(1),
	metadata: text("metadata"),
});

export const oauthClientResource = sqliteTable(
	"oauth_client_resource",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: "cascade" }),
		resourceId: text("resource_id")
			.notNull()
			.references(() => oauthResource.identifier, { onDelete: "cascade" }),
		metadata: text("metadata"),
		createdAt: integer("created_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		uniqueIndex("oauthClientResource_clientId_resourceId_uidx").on(
			table.clientId,
			table.resourceId,
		),
		index("oauthClientResource_clientId_idx").on(table.clientId),
		index("oauthClientResource_resourceId_idx").on(table.resourceId),
	],
);

export const oauthRefreshToken = sqliteTable(
	"oauth_refresh_token",
	{
		id: text("id").primaryKey(),
		token: text("token").notNull().unique(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId),
		sessionId: text("session_id").references(() => session.id, {
			onDelete: "set null",
		}),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		referenceId: text("reference_id"),
		authorizationCodeId: text("authorization_code_id"),
		resources: text("resources"),
		requestedUserInfoClaims: text("requested_user_info_claims"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" }),
		revoked: integer("revoked", { mode: "timestamp_ms" }),
		rotatedAt: integer("rotated_at", { mode: "timestamp_ms" }),
		rotationReplayResponse: text("rotation_replay_response"),
		rotationReplayExpiresAt: integer("rotation_replay_expires_at", {
			mode: "timestamp_ms",
		}),
		authTime: integer("auth_time", { mode: "timestamp_ms" }),
		confirmation: text("confirmation"),
		scopes: text("scopes").notNull(),
	},
	(table) => [
		index("oauthRefreshToken_clientId_idx").on(table.clientId),
		index("oauthRefreshToken_sessionId_idx").on(table.sessionId),
		index("oauthRefreshToken_userId_idx").on(table.userId),
		index("oauthRefreshToken_authorizationCodeId_idx").on(
			table.authorizationCodeId,
		),
	],
);

export const oauthAccessToken = sqliteTable(
	"oauth_access_token",
	{
		id: text("id").primaryKey(),
		token: text("token").unique(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId),
		sessionId: text("session_id").references(() => session.id, {
			onDelete: "set null",
		}),
		userId: text("user_id").references(() => user.id),
		referenceId: text("reference_id"),
		authorizationCodeId: text("authorization_code_id"),
		resources: text("resources"),
		requestedUserInfoClaims: text("requested_user_info_claims"),
		refreshId: text("refresh_id").references(() => oauthRefreshToken.id),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" }),
		revoked: integer("revoked", { mode: "timestamp_ms" }),
		confirmation: text("confirmation"),
		scopes: text("scopes").notNull(),
	},
	(table) => [
		index("oauthAccessToken_clientId_idx").on(table.clientId),
		index("oauthAccessToken_sessionId_idx").on(table.sessionId),
		index("oauthAccessToken_userId_idx").on(table.userId),
		index("oauthAccessToken_authorizationCodeId_idx").on(
			table.authorizationCodeId,
		),
		index("oauthAccessToken_refreshId_idx").on(table.refreshId),
	],
);

export const oauthConsent = sqliteTable(
	"oauth_consent",
	{
		id: text("id").primaryKey(),
		clientId: text("client_id")
			.notNull()
			.references(() => oauthClient.clientId),
		userId: text("user_id").references(() => user.id),
		referenceId: text("reference_id"),
		resources: text("resources"),
		requestedUserInfoClaims: text("requested_user_info_claims"),
		scopes: text("scopes").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" }),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		index("oauthConsent_clientId_idx").on(table.clientId),
		index("oauthConsent_userId_idx").on(table.userId),
		uniqueIndex("oauthConsent_clientId_userId_referenceId_uidx").on(
			table.clientId,
			table.userId,
			table.referenceId,
		),
	],
);

export const oauthClientAssertion = sqliteTable("oauth_client_assertion", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const oauthClientRelations = relations(oauthClient, ({ one, many }) => ({
	user: one(user, {
		fields: [oauthClient.userId],
		references: [user.id],
	}),
	oauthClientResources: many(oauthClientResource),
	oauthRefreshTokens: many(oauthRefreshToken),
	oauthAccessTokens: many(oauthAccessToken),
	oauthConsents: many(oauthConsent),
}));

export const oauthResourceRelations = relations(oauthResource, ({ many }) => ({
	oauthClientResources: many(oauthClientResource),
}));

export const oauthClientResourceRelations = relations(
	oauthClientResource,
	({ one }) => ({
		oauthClient: one(oauthClient, {
			fields: [oauthClientResource.clientId],
			references: [oauthClient.clientId],
		}),
		oauthResource: one(oauthResource, {
			fields: [oauthClientResource.resourceId],
			references: [oauthResource.identifier],
		}),
	}),
);

export const oauthRefreshTokenRelations = relations(
	oauthRefreshToken,
	({ one, many }) => ({
		oauthClient: one(oauthClient, {
			fields: [oauthRefreshToken.clientId],
			references: [oauthClient.clientId],
		}),
		session: one(session, {
			fields: [oauthRefreshToken.sessionId],
			references: [session.id],
		}),
		user: one(user, {
			fields: [oauthRefreshToken.userId],
			references: [user.id],
		}),
		oauthAccessTokens: many(oauthAccessToken),
	}),
);

export const oauthAccessTokenRelations = relations(
	oauthAccessToken,
	({ one }) => ({
		oauthClient: one(oauthClient, {
			fields: [oauthAccessToken.clientId],
			references: [oauthClient.clientId],
		}),
		session: one(session, {
			fields: [oauthAccessToken.sessionId],
			references: [session.id],
		}),
		user: one(user, {
			fields: [oauthAccessToken.userId],
			references: [user.id],
		}),
		oauthRefreshToken: one(oauthRefreshToken, {
			fields: [oauthAccessToken.refreshId],
			references: [oauthRefreshToken.id],
		}),
	}),
);

export const oauthConsentRelations = relations(oauthConsent, ({ one }) => ({
	oauthClient: one(oauthClient, {
		fields: [oauthConsent.clientId],
		references: [oauthClient.clientId],
	}),
	user: one(user, {
		fields: [oauthConsent.userId],
		references: [user.id],
	}),
}));
