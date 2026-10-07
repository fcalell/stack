import { procedure } from "virtual:stack-procedure";
import { ApiError } from "@fcalell/plugin-api/error";
import { z } from "@fcalell/plugin-api/schema";

const email = z.object({ email: z.string() });

export const account = {
	// The sign-in or connection request the page was opened from; one that
	// expired answers not found.
	request: procedure({ reads: ["requests"] })
		.output(email)
		.query(() => {
			throw new ApiError("NOT_FOUND");
		}),

	sendCode: procedure({ writes: ["requests"] })
		.input(email)
		.mutation(() => undefined),

	verify: procedure({ writes: ["requests"] })
		.input(email.extend({ code: z.string().length(6) }))
		.mutation(() => undefined),
};

export const workspaces = {
	list: procedure({ reads: ["workspaces"] })
		.output(z.array(z.object({ name: z.string(), meta: z.string() })))
		.query(() => []),
};
