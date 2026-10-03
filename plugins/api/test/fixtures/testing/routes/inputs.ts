import { procedure } from "virtual:stack-procedure";
import { z } from "zod";
import { assertType, type Equal, type Flat } from "../../../types.ts";

export const greetingInput = z.object({
	name: z.string(),
	greeting: z.string().default("hello"),
	count: z.string().transform((value) => Number(value)),
});

export const wordOutput = z.object({
	length: z.string().transform((value) => value.length),
});

export const inputs = {
	// Answers with what the handler received after parsing.
	greet: procedure()
		.input(greetingInput)
		.query(async ({ input }) => {
			assertType<Equal<Flat<typeof input>, z.output<typeof greetingInput>>>(
				true,
			);
			return { greeting: input.greeting, count: input.count };
		}),
	// Answers with the limit the handler holds and its runtime type.
	page: procedure({ paginated: true })
		.input(z.object({ filter: z.string().optional() }))
		.query(async ({ input }) => {
			assertType<Equal<typeof input.limit, number>>(true);
			return { limit: input.limit, type: typeof input.limit };
		}),
	// Returns the output schema's input; the caller receives its output.
	word: procedure()
		.input(z.object({ word: z.string() }))
		.output(wordOutput)
		.query(async ({ input }) => {
			const value = { length: input.word };
			assertType<Equal<typeof value, z.input<typeof wordOutput>>>(true);
			return value;
		}),
};
