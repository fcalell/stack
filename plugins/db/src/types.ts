import { z } from "zod";

// Schema uses `.superRefine` to enforce the discriminated constraint at
// runtime while keeping a loose input type (both `databaseId` and `path` are
// optional). This preserves the historical `DbOptions` shape so consumers and
// tests can type `db({ dialect: "d1" })` and still trigger the runtime check.
export const dbOptionsSchema = z
	.object({
		dialect: z.enum(["d1", "sqlite"]),
		databaseId: z.string().optional(),
		path: z.string().optional(),
		migrations: z.string().default("./src/migrations"),
		binding: z.string().default("DB_MAIN"),
	})
	.superRefine((opts, ctx) => {
		if (opts.dialect === "d1" && !opts.databaseId) {
			ctx.addIssue({
				code: "custom",
				path: ["databaseId"],
				message: "D1 dialect requires databaseId",
			});
		}
		if (opts.dialect === "sqlite" && !opts.path) {
			ctx.addIssue({
				code: "custom",
				path: ["path"],
				message: "SQLite dialect requires path",
			});
		}
	});

export type DbOptions = z.input<typeof dbOptionsSchema>;
