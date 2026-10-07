import { procedure } from "virtual:stack-procedure";
import { ApiError } from "@fcalell/plugin-api/error";
import { z } from "@fcalell/plugin-api/schema";
import { status } from "../schemas.ts";

const deploy = z.object({
	id: z.string(),
	// Who started it: a person, or the trigger's name for an automated deploy.
	author: z.string(),
	message: z.string(),
	branch: z.string(),
	commit: z.string(),
	// The ISO moment it started.
	age: z.string(),
	state: status,
	environment: z.enum(["production", "preview"]),
});

// A deploy's steps, each opened beside the deploy that runs it.
const step = z.object({
	id: z.string(),
	name: z.string(),
	state: status,
	took: z.string(),
	log: z.string(),
});

// What a deploy changed in one file; `mark` says why the file is listed.
const changedFile = z.object({
	path: z.string(),
	before: z.string(),
	after: z.string(),
	mark: z.enum(["added", "dependencies", "generated"]).optional(),
});

const byId = z.object({ id: z.string() });

export const deploys = {
	list: procedure({ reads: ["deploys"] })
		.output(z.array(deploy))
		.query(() => []),

	get: procedure({ reads: ["deploys"] })
		.input(byId)
		.output(
			deploy.extend({
				description: z
					.object({ before: z.string(), after: z.string() })
					.optional(),
				notes: z.string(),
				steps: z.array(step),
			}),
		)
		.query(() => {
			throw new ApiError("NOT_FOUND");
		}),

	files: procedure({ reads: ["deploys"] })
		.input(byId)
		.output(z.array(changedFile))
		.query(() => []),

	log: procedure({ reads: ["deploys"] })
		.input(byId)
		.output(z.string())
		.query(() => ""),

	remove: procedure({ writes: ["deploys"] })
		.input(byId)
		.mutation(() => undefined),

	removePreviews: procedure({ writes: ["deploys"] }).mutation(() => undefined),
};
