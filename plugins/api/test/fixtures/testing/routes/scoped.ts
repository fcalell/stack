import { procedure } from "virtual:stack-procedure";
import { z } from "zod";
import type { ScopeLike } from "../../../../src/procedure.ts";

// A scope as plugin-auth's descriptors present it: the input gains `orgId`.
export const org: ScopeLike<"org"> = { name: "org" };

// The one `orgId` the fixture's stub tenancy resolves.
export const SCOPE_ROW_ID = "org-1";

export const strictInput = z.object({ name: z.string() }).strict();

export const scoped = {
	// Answers with the scope id the handler holds.
	strict: procedure({ auth: true, scope: org })
		.input(strictInput)
		.query(async ({ input }) => ({ orgId: input.orgId, name: input.name })),
	// Answers with every key the handler holds.
	plain: procedure({ auth: true, scope: org })
		.input(z.object({ name: z.string() }))
		.query(async ({ input }) => ({ keys: Object.keys(input).sort() })),
	// Refuses a `low` above `high`.
	refined: procedure({ auth: true, scope: org })
		.input(
			z
				.object({ low: z.number(), high: z.number() })
				.refine((value) => value.low <= value.high),
		)
		.query(async ({ input }) => ({ low: input.low, high: input.high })),
	// The strict input declared after `.output()`.
	strictAfterOutput: procedure({ auth: true, scope: org })
		.output(z.object({ name: z.string() }))
		.input(strictInput)
		.query(async ({ input }) => ({ name: input.name })),
	// A strict paginated input; answers with the limit the handler holds.
	page: procedure({ paginated: true })
		.input(z.object({ filter: z.string().optional() }).strict())
		.query(async ({ input }) => ({ limit: input.limit })),
};
