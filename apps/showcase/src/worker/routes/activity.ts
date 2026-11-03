import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

export const activity = {
	// Tasks closed per week, 1 to 24: twenty-four named buckets in order.
	weeks: procedure({ reads: ["activity"] })
		.output(z.array(z.object({ week: z.string(), count: z.number() })))
		.query(() => []),

	// The same buckets by hour of the day, to show a short run of names.
	hours: procedure({ reads: ["activity"] })
		.output(z.array(z.object({ hour: z.string(), count: z.number() })))
		.query(() => []),
};
