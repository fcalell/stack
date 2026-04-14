export function schemaTemplate(): string {
	return `import { sqliteTable, text, integer } from "@fcalell/db/orm";

export const examples = sqliteTable("examples", {
\tid: text("id").primaryKey(),
\tname: text("name").notNull(),
\tcreatedAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
`;
}
