import type { Client } from "@orpc/client";

// `TScope` is the input key the procedure's scope adds (`organizationId`), or
// `never`: the client type makes that key optional, for the route's scope
// boundary to fill (`./scope.ts`).
export interface Procedure<
	TInput = unknown,
	TOutput = unknown,
	TScope extends string = string,
> {
	readonly __brand: "Procedure";
	readonly __input: TInput;
	readonly __output: TOutput;
	readonly __scope: TScope;
}
export type Router = {
	[key: string]: Procedure<unknown, unknown> | Router;
};

// oRPC's own client type: its query utils read the input off `ClientRest`, so
// an input that accepts `undefined` (a schema's `.optional()`) may be left out
// of `.queryOptions()` as well as the call. A plain function with an optional
// parameter loses that.
type ClientCall<TInput, TOutput> = Client<
	Record<never, never>,
	TInput,
	TOutput,
	Error
>;

export type RouterClient<T> = {
	[K in keyof T]: T[K] extends Procedure<infer TIn, infer TOut>
		? ClientCall<TIn, TOut>
		: T[K] extends Record<string, unknown>
			? RouterClient<T[K]>
			: never;
};

// A scoped procedure's input without its scope key, which the boundary above the
// call supplies; the key stays accepted for a call that names another scope
// (explicit wins). An input every key of which is then optional may be left out.
type ScopeOptional<TIn, TScope extends string> = [TScope] extends [never]
	? TIn
	: TIn extends object
		? Omit<TIn, TScope> & Partial<Pick<TIn, TScope & keyof TIn>> extends infer R
			? Record<never, never> extends R
				? R | undefined
				: R
			: never
		: TIn;

// What the query utils wrap: `RouterClient` with every scoped input's scope key
// optional.
export type ScopedRouterClient<T> = {
	[K in keyof T]: T[K] extends Procedure<infer TIn, infer TOut, infer TScope>
		? ClientCall<ScopeOptional<TIn, TScope>, TOut>
		: T[K] extends Record<string, unknown>
			? ScopedRouterClient<T[K]>
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

/** A procedure of the query utils, `orpc.requests.submit`: what a `Form` submits and reads its schema from. */
export interface ProcedureCall {
	call: (...args: never[]) => Promise<unknown>;
	mutationKey: (...args: never[]) => readonly unknown[];
	mutationOptions: (...args: never[]) => unknown;
}

/** What the procedure takes. */
export type InputOf<P extends ProcedureCall> = P extends {
	call: (...args: infer A) => unknown;
}
	? NonNullable<A[0]>
	: never;

/** What the procedure answers. */
export type OutputOf<P extends ProcedureCall> = P extends {
	call: (...args: never[]) => Promise<infer O>;
}
	? O
	: never;
