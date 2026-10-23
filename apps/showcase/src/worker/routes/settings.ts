import { procedure } from "virtual:stack-procedure";
import { ApiError } from "@fcalell/plugin-api/error";
import { z } from "@fcalell/plugin-api/schema";

const region = z.enum(["fra", "iad", "sin"]);

export const settings = {
	// The workspace's general settings as the server holds them.
	general: procedure({ reads: ["settings"] })
		.output(
			z.object({
				name: z.string(),
				slug: z.string(),
				about: z.string(),
				region,
			}),
		)
		.query(() => {
			throw new ApiError("NOT_FOUND");
		}),

	// One setting at a time: the settings page commits by field, so each key is
	// optional and a call carries the one that changed.
	save: procedure({ writes: ["settings"] })
		.input(
			z.object({
				name: z.string().optional(),
				slug: z.string().optional(),
				about: z.string().optional(),
				region: region.optional(),
				failed: z.boolean().optional(),
				weekly: z.boolean().optional(),
				digest: z.enum(["day", "week", "month"]).optional(),
				threshold: z.number().min(1).max(20).optional(),
				image: z
					.enum([
						"node-24",
						"node-22",
						"node-20",
						"bun-1",
						"deno-2",
						"python-3",
						"go-1",
					])
					.optional(),
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
