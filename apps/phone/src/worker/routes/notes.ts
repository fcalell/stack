import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";
import { desc } from "@fcalell/plugin-db/orm";
import { notes as table } from "../../schema/index.ts";

export const notes = {
	list: procedure({ reads: ["notes"] }).query(({ context }) =>
		context.db.select().from(table).orderBy(desc(table.createdAt)),
	),

	create: procedure({ writes: ["notes"] })
		.input(z.object({ title: z.string().trim().min(1) }))
		.mutation(async ({ input, context }) => {
			const [note] = await context.db
				.insert(table)
				.values({
					id: crypto.randomUUID(),
					title: input.title,
					createdAt: new Date(),
				})
				.returning();
			return note;
		}),
};
