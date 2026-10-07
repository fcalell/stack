import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";
import { status } from "../schemas.ts";

const domain = z.object({
	name: z.string(),
	state: status,
	meta: z.string(),
});

export const domains = {
	list: procedure({ reads: ["domains"] })
		.output(z.array(domain))
		.query(() => []),

	verify: procedure({ writes: ["domains"] })
		.input(z.object({ name: z.string(), code: z.string().length(6) }))
		.mutation(() => undefined),
};
