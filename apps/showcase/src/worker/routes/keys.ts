import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

const scope = z.enum(["read", "write", "admin"]);

// A fact of the request a key's form would send, a row a line.
const fact = z.object({ label: z.string(), value: z.string() });

export const keys = {
	// What the form would send for the draft it holds: the preview beside the
	// form reads it again on every change.
	preview: procedure({ reads: ["keys"] })
		.input(
			z.object({
				name: z.string().optional(),
				scope: scope.optional(),
				// How long the token typed so far is, never the token: a secret
				// stays out of a read's address.
				tokenLength: z.number().optional(),
			}),
		)
		.output(z.array(fact))
		.query(() => []),

	// A name, what it may do and the secret it carries.
	create: procedure({ writes: ["keys"] })
		.input(
			z.object({
				name: z.string().min(1),
				scope,
				token: z.string().min(1),
				note: z.string().optional(),
			}),
		)
		.mutation(() => ({ id: "key-1" })),
};
