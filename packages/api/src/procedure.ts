import { os } from "@orpc/server";
import { z } from "zod";
import { createAuthMiddleware, type InferAuthContext } from "#internal/auth";
import {
	createEmailRateLimitMiddleware,
	createIpRateLimitMiddleware,
} from "#internal/rate-limiter";
import {
	createOrgConsistencyMiddleware,
	createRbacMiddleware,
} from "#internal/rbac";
import { clampLimit } from "#lib/cursor";
import type { Procedure } from "#types";

type Promisable<T> = T | Promise<T>;

interface HandlerOptions<TContext, TInput> {
	input: TInput;
	context: TContext;
}

type DefaultStatements = Record<string, readonly string[]>;

interface PaginationInput {
	cursor?: string;
	limit?: number;
}

// After calling .input(), only .handler()/.query()/.mutation() are available
interface ProcedureWithInput<TContext, TInput> {
	handler<TOutput>(
		fn: (opts: HandlerOptions<TContext, TInput>) => Promisable<TOutput>,
	): Procedure<TInput, TOutput>;

	query<TOutput>(
		fn: (opts: HandlerOptions<TContext, TInput>) => Promisable<TOutput>,
	): Procedure<TInput, TOutput>;

	mutation<TOutput>(
		fn: (opts: HandlerOptions<TContext, TInput>) => Promisable<TOutput>,
	): Procedure<TInput, TOutput>;
}

// The chainable procedure builder
interface ProcedureBuilder<
	TContext extends Record<string, unknown>,
	TStatements extends DefaultStatements,
> {
	auth(): ProcedureBuilder<TContext & InferAuthContext<TContext>, TStatements>;

	orgScoped(): ProcedureBuilder<
		TContext & { organizationId: string },
		TStatements
	>;

	rbac<R extends string & keyof TStatements>(
		resource: R,
		actions: TStatements[R][number][],
	): ProcedureBuilder<TContext, TStatements>;

	rateLimit(type: "ip" | "email"): ProcedureBuilder<TContext, TStatements>;

	paginated(): PaginatedProcedureBuilder<TContext, TStatements>;

	use<TExtra extends Record<string, unknown>>(
		middleware: Middleware<TContext, TExtra>,
	): ProcedureBuilder<TContext & TExtra, TStatements>;

	input<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithInput<TContext, z.output<TSchema>>;

	handler<TOutput>(
		fn: (opts: { context: TContext }) => Promisable<TOutput>,
	): Procedure<undefined, TOutput>;

	query<TOutput>(
		fn: (opts: { context: TContext }) => Promisable<TOutput>,
	): Procedure<undefined, TOutput>;

	mutation<TOutput>(
		fn: (opts: { context: TContext }) => Promisable<TOutput>,
	): Procedure<undefined, TOutput>;
}

// After calling .paginated(), input auto-includes cursor/limit
interface PaginatedProcedureBuilder<
	TContext extends Record<string, unknown>,
	_TStatements extends DefaultStatements,
> {
	input<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithInput<TContext, z.output<TSchema> & PaginationInput>;

	handler<TOutput>(
		fn: (opts: {
			context: TContext;
			input: PaginationInput;
		}) => Promisable<TOutput>,
	): Procedure<PaginationInput, TOutput>;

	query<TOutput>(
		fn: (opts: {
			context: TContext;
			input: PaginationInput;
		}) => Promisable<TOutput>,
	): Procedure<PaginationInput, TOutput>;

	mutation<TOutput>(
		fn: (opts: {
			context: TContext;
			input: PaginationInput;
		}) => Promisable<TOutput>,
	): Procedure<PaginationInput, TOutput>;
}

export type Middleware<
	TContextIn extends Record<string, unknown>,
	TContextOut extends Record<string, unknown>,
> = (opts: {
	context: TContextIn;
	input: unknown;
	next: (ctx: TContextOut) => Promise<unknown>;
}) => Promise<unknown>;

// Internal: wraps our Middleware format to oRPC middleware
function toOrpcMiddleware(
	mw: Middleware<Record<string, unknown>, Record<string, unknown>>,
) {
	// biome-ignore lint/suspicious/noExplicitAny: oRPC middleware has complex internal types
	return ({ context, next }: any, input: any) =>
		mw({
			context,
			input,
			// biome-ignore lint/suspicious/noExplicitAny: oRPC context merging
			next: (ctx: any) => next({ context: ctx }),
		});
}

const paginationSchema = z.object({
	cursor: z.string().optional(),
	limit: z.number().min(1).max(100).default(20),
});

function createPaginatedBuilder<
	TContext extends Record<string, unknown>,
	TStatements extends DefaultStatements,
>(
	// biome-ignore lint/suspicious/noExplicitAny: oRPC builder chain has complex internal types
	chain: any,
): PaginatedProcedureBuilder<TContext, TStatements> {
	// biome-ignore lint/suspicious/noExplicitAny: wrap to clamp limit
	function wrapHandler(withInput: any, fn: any) {
		return withInput.handler(
			// biome-ignore lint/suspicious/noExplicitAny: wrap to clamp limit
			(opts: any) => {
				opts.input.limit = clampLimit(opts.input.limit);
				return fn(opts);
			},
		);
	}

	return {
		// biome-ignore lint/suspicious/noExplicitAny: schema type preserved via interface generic
		input(schema: any) {
			const merged = schema.merge
				? schema.merge(paginationSchema)
				: paginationSchema;
			const withInput = chain.input(merged);
			return {
				// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
				handler: (fn: any) => wrapHandler(withInput, fn),
				// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
				query: (fn: any) => wrapHandler(withInput, fn),
				// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
				mutation: (fn: any) => wrapHandler(withInput, fn),
			};
		},

		// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
		handler(fn: any) {
			return wrapHandler(chain.input(paginationSchema), fn);
		},

		// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
		query(fn: any) {
			return wrapHandler(chain.input(paginationSchema), fn);
		},

		// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
		mutation(fn: any) {
			return wrapHandler(chain.input(paginationSchema), fn);
		},
	};
}

function createBuilder<
	TContext extends Record<string, unknown>,
	TStatements extends DefaultStatements,
>(
	// biome-ignore lint/suspicious/noExplicitAny: oRPC builder chain has complex internal types
	chain: any,
): ProcedureBuilder<TContext, TStatements> {
	return {
		auth() {
			return createBuilder<TContext & InferAuthContext<TContext>, TStatements>(
				chain.use(createAuthMiddleware()),
			);
		},

		orgScoped() {
			return createBuilder<TContext & { organizationId: string }, TStatements>(
				chain.use(createOrgConsistencyMiddleware()),
			);
		},

		rbac(resource: string, actions: string[]) {
			return createBuilder<TContext, TStatements>(
				chain.use(createRbacMiddleware(resource, actions)),
			);
		},

		rateLimit(type: "ip" | "email") {
			const mw =
				type === "ip"
					? createIpRateLimitMiddleware()
					: createEmailRateLimitMiddleware();
			return createBuilder<TContext, TStatements>(chain.use(mw));
		},

		paginated() {
			return createPaginatedBuilder<TContext, TStatements>(chain);
		},

		use<TExtra extends Record<string, unknown>>(
			middleware: Middleware<TContext, TExtra>,
		) {
			return createBuilder<TContext & TExtra, TStatements>(
				chain.use(
					toOrpcMiddleware(
						middleware as Middleware<
							Record<string, unknown>,
							Record<string, unknown>
						>,
					),
				),
			);
		},

		// biome-ignore lint/suspicious/noExplicitAny: schema type preserved via interface generic
		input(schema: any) {
			const withInput = chain.input(schema);
			return {
				// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
				handler: (fn: any) => withInput.handler(fn),
				// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
				query: (fn: any) => withInput.handler(fn),
				// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
				mutation: (fn: any) => withInput.handler(fn),
			};
		},

		// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
		handler(fn: any) {
			return chain.handler(fn);
		},

		// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
		query(fn: any) {
			return chain.handler(fn);
		},

		// biome-ignore lint/suspicious/noExplicitAny: handler type preserved via interface generic
		mutation(fn: any) {
			return chain.handler(fn);
		},
	};
}

export function createProcedure<
	TContext extends Record<string, unknown>,
	TStatements extends DefaultStatements = Record<string, string[]>,
>(): ProcedureBuilder<TContext, TStatements> {
	const base = os.$context<TContext>();
	return createBuilder<TContext, TStatements>(base);
}
