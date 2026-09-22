export interface Procedure<TInput = unknown, TOutput = unknown> {
	readonly __brand: "Procedure";
	readonly __input: TInput;
	readonly __output: TOutput;
}

export type Router = {
	[key: string]: Procedure<unknown, unknown> | Router;
};

type ProcedureCall<TInput, TOutput> = [TInput] extends [undefined]
	? () => Promise<TOutput>
	: (input: TInput) => Promise<TOutput>;

export type RouterClient<T> = {
	[K in keyof T]: T[K] extends Procedure<infer TIn, infer TOut>
		? ProcedureCall<TIn, TOut>
		: T[K] extends Record<string, unknown>
			? RouterClient<T[K]>
			: never;
};

export type InferRouter<T> = T extends { _router: infer R } ? R : never;

// Value checks the worker asserts once per isolate on the first request.
// Presence is always checked; hints tighten it. `devLocalhost` refuses to
// serve when STACK_DEV is set but the value's hostname is not local: the
// canary for a deploy that accidentally shipped dev settings.
export interface EnvValidation {
	minLength?: number;
	url?: boolean;
	devLocalhost?: boolean;
}

// One env var the worker reads, declared by the plugin that reads it. A
// `devDefault` must satisfy its own `validate` hints or a fresh project
// refuses to serve.
export interface EnvSpec {
	name: string;
	devDefault: string;
	validate?: EnvValidation;
}
