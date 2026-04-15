import { os } from "@orpc/server";
import { z } from "zod";
import { createAuthMiddleware, type InferAuthContext } from "#internal/auth";
import {
	createRateLimitMiddleware,
	type RateLimitKind,
} from "#internal/rate-limiter";
import {
	createOrgConsistencyMiddleware,
	createRbacMiddleware,
} from "#internal/rbac";
import { clampLimit } from "#lib/cursor";
import type { Procedure } from "#types";

type Promisable<T> = T | Promise<T>;
type DefaultStatements = Record<string, readonly string[]>;

interface HandlerOptions<TContext, TInput> {
	input: TInput;
	context: TContext;
}

// User middleware returns the extra context to merge in.
// Return type is inferable, so consumers never need to specify a generic.
export type Middleware<
	TContext extends Record<string, unknown>,
	TExtra extends Record<string, unknown>,
> = (opts: { context: TContext; input: unknown }) => Promisable<TExtra>;

// ---------- Option types ----------

type Rbac<TStatements extends DefaultStatements> = {
	[R in keyof TStatements & string]: readonly [
		R,
		ReadonlyArray<TStatements[R][number]>,
	];
}[keyof TStatements & string];

interface BaseOptions {
	rateLimit?: RateLimitKind | readonly RateLimitKind[];
	paginated?: boolean;
}

interface PublicOptions extends BaseOptions {
	auth?: false;
	org?: never;
	rbac?: never;
}

interface AuthOnlyOptions extends BaseOptions {
	auth: true;
	org?: false;
	rbac?: never;
}

interface OrgScopedOptions<TStatements extends DefaultStatements>
	extends BaseOptions {
	auth: true;
	org: true;
	rbac?: Rbac<TStatements>;
}

export type ProcedureConfig<
	TStatements extends DefaultStatements = DefaultStatements,
> = PublicOptions | AuthOnlyOptions | OrgScopedOptions<TStatements>;

// ---------- Type derivation ----------

type ResolvedContext<O, TBase extends Record<string, unknown>> = TBase &
	(O extends { auth: true } ? InferAuthContext<TBase> : unknown) &
	(O extends { org: true } ? { organizationId: string } : unknown);

// Input fields injected by options. `undefined` when the procedure has no
// option-driven input additions — this lets clients call `.query()` with no
// args when the user didn't specify their own `.input()` either.
type InputAdditions<O> = O extends { org: true; paginated: true }
	? { organizationId: string; cursor?: string; limit?: number }
	: O extends { org: true }
		? { organizationId: string }
		: O extends { paginated: true }
			? { cursor?: string; limit?: number }
			: undefined;

type MergedInput<TBaseInput, TSchemaOut> = TBaseInput extends undefined
	? TSchemaOut
	: TSchemaOut & TBaseInput;

// ---------- Builder interfaces ----------

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

export interface ProcedureBuilder<
	TContext extends Record<string, unknown>,
	TBaseInput,
> {
	use<TExtra extends Record<string, unknown>>(
		middleware: Middleware<TContext, TExtra>,
	): ProcedureBuilder<TContext & TExtra, TBaseInput>;

	input<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithInput<TContext, MergedInput<TBaseInput, z.output<TSchema>>>;

	handler<TOutput>(
		fn: (opts: HandlerOptions<TContext, TBaseInput>) => Promisable<TOutput>,
	): Procedure<TBaseInput, TOutput>;

	query<TOutput>(
		fn: (opts: HandlerOptions<TContext, TBaseInput>) => Promisable<TOutput>,
	): Procedure<TBaseInput, TOutput>;

	mutation<TOutput>(
		fn: (opts: HandlerOptions<TContext, TBaseInput>) => Promisable<TOutput>,
	): Procedure<TBaseInput, TOutput>;
}

export type ProcedureFactory<
	TBase extends Record<string, unknown>,
	TStatements extends DefaultStatements,
> = <O extends ProcedureConfig<TStatements> = PublicOptions>(
	config?: O,
) => ProcedureBuilder<ResolvedContext<O, TBase>, InputAdditions<O>>;

// ---------- Runtime implementation ----------

const PAGINATION_SHAPE = {
	cursor: z.string().optional(),
	limit: z.number().min(1).max(100).default(20),
};

const ORG_SHAPE = {
	organizationId: z.string().min(1),
};

function toOrpcMiddleware<
	TIn extends Record<string, unknown>,
	TExtra extends Record<string, unknown>,
>(mw: Middleware<TIn, TExtra>) {
	return async (
		{
			context,
			next,
		}: {
			context: TIn;
			next: (opts: { context: unknown }) => Promise<unknown>;
		},
		input: unknown,
	) => {
		const extra = await mw({ context, input });
		return next({ context: { ...context, ...extra } });
	};
}

function normalizeRateLimits(
	rateLimit: RateLimitKind | readonly RateLimitKind[] | undefined,
): readonly RateLimitKind[] {
	if (!rateLimit) return [];
	return Array.isArray(rateLimit) ? rateLimit : [rateLimit as RateLimitKind];
}

interface BuilderState {
	// biome-ignore lint/suspicious/noExplicitAny: oRPC chain has complex internal types
	chain: any;
	baseShape: z.ZodRawShape | null;
	paginated: boolean;
}

function wrapPaginatedHandler(
	fn: (opts: { input: { limit?: number } }) => unknown,
) {
	return (opts: { input: { limit?: number } }) => {
		opts.input.limit = clampLimit(opts.input.limit);
		return fn(opts);
	};
}

// biome-ignore lint/suspicious/noExplicitAny: builder type preserved via interface generic
function createBuilder(state: BuilderState): any {
	const { chain, baseShape, paginated } = state;
	const hasBaseShape = baseShape !== null;

	// biome-ignore lint/suspicious/noExplicitAny: forwarded handler fn
	function terminate(fn: any) {
		if (hasBaseShape) {
			const schema = z.object(baseShape);
			const wrapped = paginated ? wrapPaginatedHandler(fn) : fn;
			return chain.input(schema).handler(wrapped);
		}
		return chain.handler(fn);
	}

	return {
		use(
			middleware: Middleware<Record<string, unknown>, Record<string, unknown>>,
		) {
			return createBuilder({
				chain: chain.use(toOrpcMiddleware(middleware)),
				baseShape,
				paginated,
			});
		},

		input(userSchema: z.ZodType) {
			let merged: z.ZodType = userSchema;
			if (hasBaseShape) {
				if (!(userSchema instanceof z.ZodObject)) {
					throw new Error(
						"procedure() with `org` or `paginated` requires an object input schema. Use .input(z.object({...})).",
					);
				}
				merged = z.object({ ...baseShape, ...userSchema.shape });
			}

			const withInputChain = chain.input(merged);
			// biome-ignore lint/suspicious/noExplicitAny: forwarded handler fn
			const run = (fn: any) => {
				const wrapped = paginated ? wrapPaginatedHandler(fn) : fn;
				return withInputChain.handler(wrapped);
			};

			return { handler: run, query: run, mutation: run };
		},

		handler: terminate,
		query: terminate,
		mutation: terminate,
	};
}

export function createProcedure<
	TContext extends Record<string, unknown>,
	TStatements extends DefaultStatements = Record<string, string[]>,
>(): ProcedureFactory<TContext, TStatements> {
	const base = os.$context<TContext>();

	function procedure(config?: ProcedureConfig<TStatements>) {
		const opts = (config ?? {}) as ProcedureConfig<TStatements> & BaseOptions;
		// biome-ignore lint/suspicious/noExplicitAny: oRPC chain has complex internal types
		let chain: any = base;

		// 1. Rate limiting — protects all downstream work
		for (const kind of normalizeRateLimits(opts.rateLimit)) {
			chain = chain.use(createRateLimitMiddleware(kind));
		}

		// 2. Auth
		const isAuth = "auth" in opts && opts.auth === true;
		if (isAuth) {
			chain = chain.use(createAuthMiddleware());
		}

		// 3. Org scoping
		const isOrg = "org" in opts && opts.org === true;
		if (isOrg) {
			chain = chain.use(createOrgConsistencyMiddleware());
		}

		// 4. RBAC
		if ("rbac" in opts && opts.rbac) {
			const [resource, actions] = opts.rbac;
			chain = chain.use(createRbacMiddleware(resource, [...actions]));
		}

		// 5. Build base input shape from option-driven injections
		const isPaginated = opts.paginated === true;
		let baseShape: z.ZodRawShape | null = null;
		if (isOrg || isPaginated) {
			baseShape = {
				...(isOrg ? ORG_SHAPE : {}),
				...(isPaginated ? PAGINATION_SHAPE : {}),
			};
		}

		return createBuilder({ chain, baseShape, paginated: isPaginated });
	}

	return procedure as unknown as ProcedureFactory<TContext, TStatements>;
}
