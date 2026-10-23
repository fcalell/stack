import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

const turn = z.object({
	id: z.string(),
	author: z.enum(["you", "other", "system"]),
	body: z.string(),
	// The ISO moment it was said.
	at: z.string(),
	// A system line that opens a deploy, by its id.
	deploy: z.string().optional(),
});

export const assistant = {
	history: procedure({ reads: ["turns"] })
		.output(z.array(turn))
		.query(() => []),
};

export const tasks = {
	list: procedure({ reads: ["tasks"] })
		.output(
			z.array(
				z.object({ id: z.string(), title: z.string(), meta: z.string() }),
			),
		)
		.query(() => []),
};
