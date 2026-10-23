import { generate } from "../commands/generate.ts";
import type { CommandContext } from "./create-plugin.ts";
import type { Graph } from "./graph.ts";
import { createLogContext, createPromptContext } from "./prompt.ts";

export interface CommandContextInput {
	options: unknown;
	cwd: string;
	graph: Graph;
	configPath: string;
}

// What `stack <plugin> <command>` hands a handler. `generate` is the call
// `stack generate` makes, so a command's regeneration and the CLI's never
// differ.
export function createCommandContext(
	input: CommandContextInput,
): CommandContext<unknown> {
	const { options, cwd, graph, configPath } = input;
	return {
		options,
		cwd,
		resolve: (slot) => graph.resolve(slot),
		generate: () => generate(configPath, cwd),
		log: createLogContext(),
		prompt: createPromptContext(),
	};
}
