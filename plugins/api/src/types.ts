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
