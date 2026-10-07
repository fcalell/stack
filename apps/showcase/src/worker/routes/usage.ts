import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

// A day's figure, its parts by project when the chart stacks.
const day = z.object({
	day: z.string(),
	value: z.number(),
	parts: z.record(z.string(), z.number()).optional(),
	at: z.string().optional(),
});

const meter = z.object({
	label: z.string(),
	value: z.number(),
	max: z.number(),
	meta: z.string(),
});

// What moving to another plan changes, a fact a row.
const planFact = z.object({
	label: z.string(),
	values: z.tuple([z.string(), z.string()]),
});

export const usage = {
	meters: procedure({ reads: ["usage"] })
		.output(z.array(meter))
		.query(() => []),

	requests: procedure({ reads: ["usage"] })
		.output(z.array(day))
		.query(() => []),

	minutes: procedure({ reads: ["usage"] })
		.output(z.array(day))
		.query(() => []),

	cron: procedure({ reads: ["usage"] })
		.output(z.array(day))
		.query(() => []),

	plan: procedure({ reads: ["usage"] })
		.output(z.array(planFact))
		.query(() => []),

	upgrade: procedure({ writes: ["usage"] }).mutation(() => undefined),
};
