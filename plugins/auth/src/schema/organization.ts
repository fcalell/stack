// Better Auth's organization-plugin tables (`organization` / `member` /
// `invitation`), as Drizzle SQLite tables. Canonical shape derived from
// `getAuthTables()` (`better-auth/db`, the same introspection
// `@better-auth/cli generate` uses internally) for `organization({})` on
// better-auth 1.6.x with no `teams` / `dynamicAccessControl` — neither is
// wired by `buildAuth` (plugins/auth/src/worker/index.ts), so neither's
// tables belong here.
//
// Shipped from a separate `@fcalell/plugin-auth/schema/organization` subpath
// so a consumer only re-exports (and only migrates) these tables when
// `auth({ organization: true })` is enabled — see `./index.ts` for the
// always-present identity tables and plugins/auth/README.md for the
// consumer-facing re-export instructions. None of better-auth's own field
// defs for these tables set `onDelete: "cascade"` (unlike `session.userId` /
// `account.userId` in `./index.ts`), so the FKs below carry none either.
import {
	index,
	integer,
	relations,
	sql,
	sqliteTable,
	text,
} from "@fcalell/plugin-db/orm";
import { user } from "./index";

export const organization = sqliteTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	logo: text("logo"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	// JSON-encoded consumer metadata; better-auth reads/writes it as a string.
	metadata: text("metadata"),
});

export const member = sqliteTable(
	"member",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		role: text("role").notNull().default("member"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("member_organizationId_idx").on(table.organizationId),
		index("member_userId_idx").on(table.userId),
	],
);

export const invitation = sqliteTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		email: text("email").notNull(),
		role: text("role"),
		status: text("status").notNull().default("pending"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id),
	},
	(table) => [
		index("invitation_organizationId_idx").on(table.organizationId),
		index("invitation_email_idx").on(table.email),
	],
);

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
}));

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	inviter: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}));
