import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";
import { status } from "../schemas.ts";

const release = z.object({
	id: z.string(),
	name: z.string(),
	stage: z.enum(["review", "staging", "production"]),
	state: status,
	// The ISO moment it was cut.
	age: z.string(),
});

export const releases = {
	list: procedure({ reads: ["releases"] })
		.input(
			z.object({
				stage: z.enum(["review", "staging", "production"]).optional(),
			}),
		)
		.output(z.array(release))
		.query(() => []),

	// How many promotions the plan still allows this month.
	quota: procedure({ reads: ["releases"] })
		.output(z.object({ left: z.number() }))
		.query(() => ({ left: 0 })),

	// The stages a release moves through, each with how many stand in it.
	stages: procedure({ reads: ["releases"] })
		.output(
			z.array(
				z.object({
					value: z.enum(["review", "staging", "production"]),
					label: z.string(),
					count: z.number(),
				}),
			),
		)
		.query(() => []),

	// Three counts of the week, each its own read so one failing leaves the rest.
	shipped: procedure({ reads: ["releases"] })
		.output(z.object({ count: z.number() }))
		.query(() => ({ count: 0 })),

	rolledBack: procedure({ reads: ["releases"] })
		.output(z.object({ count: z.number() }))
		.query(() => ({ count: 0 })),

	promote: procedure({ writes: ["releases"] }).mutation(() => undefined),
};
