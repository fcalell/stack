import { integer, sqliteTable, text } from "@fcalell/plugin-db/orm";

export * from "@fcalell/plugin-auth/schema";

export const notes = sqliteTable("notes", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
