import { procedure } from "virtual:stack-procedure";
import { ApiError } from "@fcalell/plugin-api/error";
import { z } from "@fcalell/plugin-api/schema";

const role = z.enum(["owner", "admin", "member", "viewer"]);

const member = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	role,
	team: z.string(),
	deploys: z.boolean(),
	// The ISO moment of the last activity.
	active: z.string(),
});

export const members = {
	list: procedure({ reads: ["members"] })
		.output(z.array(member))
		.query(() => []),

	// A member's edit: the fields that change, the member as it stands after.
	update: procedure({ writes: ["members"] })
		.input(
			z.object({
				id: z.string(),
				role: role.optional(),
				team: z.string().optional(),
				deploys: z.boolean().optional(),
			}),
		)
		.output(member)
		.mutation(() => {
			throw new ApiError("NOT_FOUND");
		}),

	// Ownership moves whole: the new owner takes it and the old one stays an
	// admin, so the answer is every member as it stands after.
	transfer: procedure({ writes: ["members"] })
		.input(z.object({ id: z.string() }))
		.output(z.array(member))
		.mutation(() => []),

	invite: procedure({ writes: ["members"] })
		.input(
			z.object({
				email: z.string(),
				role: role.exclude(["owner"]),
				permissions: z.array(z.string()),
			}),
		)
		.mutation(() => undefined),

	revokeInvitation: procedure({ writes: ["members"] }).mutation(
		() => undefined,
	),
};
