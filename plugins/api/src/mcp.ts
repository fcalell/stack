import type { Procedure } from "./types.ts";

// Every dotted path in a router that names a procedure (`pages.list`), and
// none that names a namespace.
export type ProcedurePath<TRoutes, TPrefix extends string = ""> = {
	[K in keyof TRoutes & string]: TRoutes[K] extends Procedure<
		infer _TInput,
		infer _TOutput
	>
		? `${TPrefix}${K}`
		: TRoutes[K] extends Record<string, unknown>
			? ProcedurePath<TRoutes[K], `${TPrefix}${K}.`>
			: never;
}[keyof TRoutes & string];

export interface McpDefinition {
	// What the agent reads once connected: the product and how to use its tools.
	// The worker appends the line naming the grant's organization.
	instructions: string;
	// Router path to the description the agent reads, in the order it lists.
	tools: Partial<Record<string, string>>;
}

// `src/worker/mcp.ts` default-exports this, typed against the routes barrel:
// `defineMcp<typeof routes>({ instructions, tools })`. It checks nothing at
// runtime; the worker refuses an unservable tool when it is built.
export function defineMcp<TRoutes>(definition: {
	instructions: string;
	tools: { [K in ProcedurePath<TRoutes>]?: string };
}): McpDefinition {
	return definition;
}
