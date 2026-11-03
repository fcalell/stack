// The device credentials' table (`apikey`), as a Drizzle SQLite table. The
// shape `@better-auth/api-key` declares for its `apikey` model, ported the way
// the other plugin tables are, with one addition: `referenceId` references
// `user`, so deleting a user deletes the credentials they made (the plugin
// leaves the column unconstrained because it can also name an organization,
// which `auth({ devices })` never configures). The key itself is stored
// hashed; the plaintext exists once, in the answer of the call that made it.
//
// Shipped from a separate `@fcalell/plugin-auth/schema/devices` subpath so a
// consumer only re-exports (and only migrates) this table when
// `auth({ devices: true })` is on, as `./passkey.ts` is for passkeys. Diff it
// against the plugin's model after a Better Auth bump.

// The drizzle types the emitted declarations spell, named here so they are
// spelled through plugin-db, the one package drizzle resolves from. Unnamed,
// tsc writes `import("drizzle-orm/...")`, which a consumer cannot resolve
// from this package, and every table and row read through it is `any`.
// biome-ignore lint/correctness/noUnusedImports: read by the declaration emit
import type {
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
} from "@fcalell/plugin-db/orm";
import { user } from "./index.ts";

export const apikey = sqliteTable(
	"apikey",
	{
		id: text("id").primaryKey(),
		configId: text("config_id").default("default").notNull(),
		name: text("name"),
		// The first characters of the key, kept so a list can tell keys apart.
		start: text("start"),
		referenceId: text("reference_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		prefix: text("prefix"),
		// The key's SHA-256, never the key.
		key: text("key").notNull(),
		refillInterval: integer("refill_interval"),
		refillAmount: integer("refill_amount"),
		lastRefillAt: integer("last_refill_at", { mode: "timestamp_ms" }),
		enabled: integer("enabled", { mode: "boolean" }).default(true),
		rateLimitEnabled: integer("rate_limit_enabled", {
			mode: "boolean",
		}).default(true),
		rateLimitTimeWindow: integer("rate_limit_time_window"),
		rateLimitMax: integer("rate_limit_max"),
		requestCount: integer("request_count").default(0),
		remaining: integer("remaining"),
		lastRequest: integer("last_request", { mode: "timestamp_ms" }),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
		permissions: text("permissions"),
		metadata: text("metadata"),
	},
	(table) => [
		index("apikey_configId_idx").on(table.configId),
		index("apikey_referenceId_idx").on(table.referenceId),
		index("apikey_key_idx").on(table.key),
	],
);

export const apikeyRelations = relations(apikey, ({ one }) => ({
	user: one(user, {
		fields: [apikey.referenceId],
		references: [user.id],
	}),
}));
