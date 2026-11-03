import { procedure } from "virtual:stack-procedure";
import { selector, z } from "@fcalell/plugin-api/schema";
import { status } from "../schemas.ts";

const request = z.object({
	id: z.string(),
	method: z.enum(["GET", "POST", "PUT", "DELETE"]),
	path: z.string(),
	// The request's outcome as a mark, and how long it took (ms).
	state: status,
	took: z.number(),
	// The ISO moment it was served.
	at: z.string(),
});

// What narrows the list: the query a selection of it names, too.
const query = z.object({ q: z.string().optional() });

export const requests = {
	// Windowed: the page at an offset and every request the query matches, in
	// the order of a column the procedure names.
	list: procedure({
		reads: ["requests"],
		paginated: "window",
		sort: ["at", "path", "took"],
	})
		.input(query)
		.output(
			z.object({
				data: z.array(request),
				total: z.number(),
				offset: z.number(),
			}),
		)
		.query(() => ({ data: [], total: 0, offset: 0 })),

	// The requests a table chose: their ids, or the query less the ids unticked.
	remove: procedure({ writes: ["requests"] })
		.input(z.object({ requests: selector(query) }))
		.mutation(() => undefined),
};
