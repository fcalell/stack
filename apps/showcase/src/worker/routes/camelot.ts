import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

export const camelot = {
	// Tracks per Camelot key, 1A to 12B: twenty-four named buckets in wheel order.
	keys: procedure({ reads: ["camelot"] })
		.output(z.array(z.object({ key: z.string(), count: z.number() })))
		.query(() => []),

	// The same buckets by hour of the day, to show a short run of names.
	hours: procedure({ reads: ["camelot"] })
		.output(z.array(z.object({ hour: z.string(), count: z.number() })))
		.query(() => []),
};
