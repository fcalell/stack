// The passkey plugin's table (`passkey`), as a Drizzle SQLite table. The
// canonical shape emitted by `auth generate` (better-auth's CLI, the `auth`
// package) for a sqlite drizzle adapter with `@better-auth/passkey`'s
// `passkey()` on better-auth 1.7.x, ported verbatim. The generator's
// `userRelations.passkeys` inverse is left out: `user` lives in `./index.ts`,
// which must not reference a table the consumer only migrates when passkeys
// are on.
//
// Shipped from a separate `@fcalell/plugin-auth/schema/passkey` subpath so a
// consumer only re-exports (and only migrates) this table when
// `auth({ passkey })` is enabled, exactly as `./organization.ts` is; see
// plugins/auth/README.md. Regenerate and diff after a Better Auth bump.
import {
	index,
	integer,
	relations,
	sqliteTable,
	text,
} from "@fcalell/plugin-db/orm";
import { user } from "./index.ts";

export const passkey = sqliteTable(
	"passkey",
	{
		id: text("id").primaryKey(),
		name: text("name"),
		publicKey: text("public_key").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		credentialID: text("credential_id").notNull(),
		counter: integer("counter").notNull(),
		deviceType: text("device_type").notNull(),
		backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
		transports: text("transports"),
		createdAt: integer("created_at", { mode: "timestamp_ms" }),
		aaguid: text("aaguid"),
	},
	(table) => [
		index("passkey_userId_idx").on(table.userId),
		index("passkey_credentialID_idx").on(table.credentialID),
	],
);

export const passkeyRelations = relations(passkey, ({ one }) => ({
	user: one(user, {
		fields: [passkey.userId],
		references: [user.id],
	}),
}));
