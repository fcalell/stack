import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

export const crates = {
	// The tracks of the crates, each in the crate it was filed under.
	tracks: procedure({ reads: ["crates"] })
		.output(
			z.array(
				z.object({
					id: z.string(),
					title: z.string(),
					artist: z.string(),
					crate: z.string(),
					owner: z.string(),
				}),
			),
		)
		.query(() => []),

	// The bands over the tracks: a crate each, with the name it shows.
	bands: procedure({ reads: ["crates"] })
		.output(z.array(z.object({ key: z.string(), label: z.string() })))
		.query(() => []),

	// Who a track can be handed to: the options of each row's pick.
	owners: procedure({ reads: ["crates"] })
		.output(z.array(z.object({ value: z.string(), label: z.string() })))
		.query(() => []),

	hand: procedure({ writes: ["crates"] })
		.input(z.object({ id: z.string(), owner: z.string() }))
		.mutation(() => undefined),
};
