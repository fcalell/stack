import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

export const sprints = {
	// The tasks of the sprints, each in the sprint it was filed under.
	tasks: procedure({ reads: ["sprints"] })
		.output(
			z.array(
				z.object({
					id: z.string(),
					title: z.string(),
					area: z.string(),
					sprint: z.string(),
					owner: z.string(),
				}),
			),
		)
		.query(() => []),

	// The bands over the tasks: a sprint each, with the name it shows.
	bands: procedure({ reads: ["sprints"] })
		.output(z.array(z.object({ key: z.string(), label: z.string() })))
		.query(() => []),

	// Who a task can be assigned to: the options of each row's pick.
	owners: procedure({ reads: ["sprints"] })
		.output(z.array(z.object({ value: z.string(), label: z.string() })))
		.query(() => []),

	assign: procedure({ writes: ["sprints"] })
		.input(z.object({ id: z.string(), owner: z.string() }))
		.mutation(() => undefined),
};
