import { procedure } from "virtual:stack-procedure";
import { ApiError } from "@fcalell/plugin-api/error";
import { z } from "@fcalell/plugin-api/schema";

export const settings = {
	// The workspace's general settings as the server holds them.
	general: procedure({ reads: ["settings"] })
		.output(
			z.object({
				name: z.string(),
				slug: z.string(),
				about: z.string(),
				region: z.string(),
			}),
		)
		.query(() => {
			throw new ApiError("NOT_FOUND");
		}),

	save: procedure({ writes: ["settings"] })
		.input(
			z.object({
				name: z.string(),
				about: z.string(),
				region: z.string(),
				failed: z.boolean(),
				weekly: z.boolean(),
				digest: z.string(),
				threshold: z.number(),
				image: z.string(),
			}),
		)
		.mutation(() => undefined),
};

export const devices = {
	list: procedure({ reads: ["devices"] })
		.output(z.array(z.string()))
		.query(() => []),

	unpair: procedure({ writes: ["devices"] })
		.input(z.object({ name: z.string() }))
		.mutation(() => undefined),
};
