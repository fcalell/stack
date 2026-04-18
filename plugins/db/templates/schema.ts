import { integer, sqliteTable, text } from "@fcalell/plugin-db/orm";

export const examples = sqliteTable("examples", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
