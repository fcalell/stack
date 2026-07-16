import { ORPCError, os } from "@orpc/server";
import { z } from "zod";
import { clampLimit } from "./lib/cursor.ts";
import type { Procedure } from "./types";
import { STACK_READS_HEADER, STACK_WRITES_HEADER } from "./wire.ts";

// Re-exported for `@fcalell/plugin-api/procedure` consumers (generated code,
// plugins/auth's worker) — see `./wire.ts` for why these live there and not
// here: client bundles need them without pulling in this file's
// `@orpc/server` + zod + builder machinery.
export {
	ORG_RULES_PATH,
	STACK_READS_HEADER,
	STACK_WRITES_HEADER,
} from "./wire.ts";

type Promisable<T> = T | Promise<T>;
type DefaultStatements = Record<string, readonly string[]>;

interface HandlerOptions<TContext, TInput> {
	input: TInput;
	context: TContext;
}

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

// `can: [action, resource]` (action first) -- the org-level gate, sugar over
// `rbac` (`rbac` is `[resource, actions[]]`, action last). A tuple of exactly
// two strings: no third (conditions) element is structurally expressible, so
// the org layer stays unconditional by construction (docs/prd/
// WS6.2 non-goal -- statements have no conditions,
// conditions belong to the record-scoped ability layer instead).
type Can<TStatements extends DefaultStatements> = {
	[R in keyof TStatements & string]: readonly [TStatements[R][number], R];
}[keyof TStatements & string];

interface BaseOptions<TEntity extends string = string> {
	rateLimit?: RateLimitKind | readonly RateLimitKind[];
	paginated?: boolean;
	// Entities this procedure reads/writes, for automatic cache invalidation
	// (WS3.1). Ships as `x-stack-reads` /
	// `x-stack-writes` response headers — see `createEntityHeadersMiddleware`.
	reads?: readonly TEntity[];
	writes?: readonly TEntity[];
}

interface PublicOptions<TEntity extends string = string>
	extends BaseOptions<TEntity> {
	auth?: false;
	org?: never;
	rbac?: never;
	can?: never;
}

interface AuthOnlyOptions<TEntity extends string = string>
	extends BaseOptions<TEntity> {
	auth: true;
	org?: false;
	rbac?: never;
	can?: never;
}

interface OrgScopedOptions<
	TStatements extends DefaultStatements,
	TEntity extends string = string,
> extends BaseOptions<TEntity> {
	auth: true;
	org: true;
	rbac?: Rbac<TStatements>;
	// Preferred spelling over `rbac` -- config gates, handler `assertCan`,
	// and client `ability.can()` all read as actions-on-subjects. Both may be
	// set; both middlewares run.
	can?: Can<TStatements>;
}

export type ProcedureConfig<
	TStatements extends DefaultStatements = DefaultStatements,
	TEntity extends string = string,
> =
	| PublicOptions<TEntity>
	| AuthOnlyOptions<TEntity>
	| OrgScopedOptions<TStatements, TEntity>;

// ---------- Rate limit types ----------

export interface RateLimitBinding {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type RateLimitKind = "ip" | "email";

// ---------- Type derivation ----------

type InferAuthContext<TContext> = TContext extends {
	auth: {
		$Infer: {
			Session: {
				user: infer U extends Record<string, unknown>;
				session: infer S extends Record<string, unknown>;
			};
		};
	};
}
	? { user: U; session: S }
	: {
			user: { id: string; [key: string]: unknown };
			session: { id: string; [key: string]: unknown };
		};

type ResolvedContext<O, TBase extends Record<string, unknown>> = TBase &
	(O extends { auth: true } ? InferAuthContext<TBase> : unknown) &
	(O extends { org: true } ? { organizationId: string } : unknown);

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

interface ProcedureWithInputOutput<TContext, TInput, TOutput> {
	handler(
		fn: (opts: HandlerOptions<TContext, TInput>) => Promisable<TOutput>,
	): Procedure<TInput, TOutput>;

	query(
		fn: (opts: HandlerOptions<TContext, TInput>) => Promisable<TOutput>,
	): Procedure<TInput, TOutput>;

	mutation(
		fn: (opts: HandlerOptions<TContext, TInput>) => Promisable<TOutput>,
	): Procedure<TInput, TOutput>;
}

interface ProcedureWithInput<TContext, TInput> {
	output<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithInputOutput<TContext, TInput, z.input<TSchema>>;

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

interface ProcedureWithOutput<TContext, TBaseInput, TOutput> {
	input<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithInputOutput<
		TContext,
		MergedInput<TBaseInput, z.output<TSchema>>,
		TOutput
	>;

	handler(
		fn: (opts: HandlerOptions<TContext, TBaseInput>) => Promisable<TOutput>,
	): Procedure<TBaseInput, TOutput>;

	query(
		fn: (opts: HandlerOptions<TContext, TBaseInput>) => Promisable<TOutput>,
	): Procedure<TBaseInput, TOutput>;

	mutation(
		fn: (opts: HandlerOptions<TContext, TBaseInput>) => Promisable<TOutput>,
	): Procedure<TBaseInput, TOutput>;
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

	output<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithOutput<TContext, TBaseInput, z.input<TSchema>>;

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
	TEntity extends string = string,
> = <O extends ProcedureConfig<TStatements, TEntity> = PublicOptions<TEntity>>(
	config?: O,
) => ProcedureBuilder<ResolvedContext<O, TBase>, InputAdditions<O>>;

// ---------- Middleware factories ----------

function createAuthMiddleware() {
	return async ({
		context,
		next,
	}: {
		context: {
			reqHeaders: Headers;
			auth: {
				api: {
					getSession: (opts: {
						headers: Headers;
					}) => Promise<{ user: unknown; session: unknown } | null>;
				};
			};
		};
		next: (opts: { context: unknown }) => Promise<unknown>;
	}) => {
		try {
			const sessionData = await context.auth.api.getSession({
				headers: context.reqHeaders,
			});

			if (!sessionData?.session || !sessionData?.user) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "Authentication required",
				});
			}

			return next({
				context: {
					user: sessionData.user,
					session: sessionData.session,
				},
			});
		} catch (error) {
			if (error instanceof ORPCError) throw error;
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication failed",
			});
		}
	};
}

function createOrgConsistencyMiddleware() {
	// `input` is typed as `unknown` here so the middleware fits the generic
	// `OrpcMiddlewareFn<TCtx>` shape (where input is `unknown`). We check the
	// `organizationId` field at runtime — the surrounding builder already
	// injects `ORG_SHAPE` into the input schema when `org: true`, so the field
	// is always present in practice; the null-branch is defensive only.
	return async (
		{
			context,
			next,
		}: {
			context: { session: { activeOrganizationId?: string | null } };
			next: (opts: { context: unknown }) => Promise<unknown>;
		},
		input: unknown,
	) => {
		const { activeOrganizationId } = context.session;
		if (!activeOrganizationId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "No active organization found in session",
			});
		}

		const inputOrgId =
			input && typeof input === "object" && "organizationId" in input
				? (input as { organizationId: unknown }).organizationId
				: undefined;
		if (inputOrgId !== activeOrganizationId) {
			throw new ORPCError("FORBIDDEN", {
				message: "Organization ID mismatch",
			});
		}

		return next({ context: { organizationId: activeOrganizationId } });
	};
}

function createRbacMiddleware(resource: string, actions: string[]) {
	return async ({
		context,
		next,
	}: {
		context: {
			reqHeaders: Headers;
			auth: {
				api: {
					hasPermission: (opts: {
						headers: Headers;
						body: { permissions: Record<string, string[]> };
					}) => Promise<{ success: boolean } | null>;
				};
			};
		};
		next: (opts: { context: unknown }) => Promise<unknown>;
	}) => {
		const result = await context.auth.api.hasPermission({
			headers: context.reqHeaders,
			body: { permissions: { [resource]: actions } },
		});

		if (!result?.success) {
			throw new ORPCError("FORBIDDEN", {
				message: "Insufficient permissions",
			});
		}

		return next({ context: {} });
	};
}

type KeyExtractor = (
	context: { reqHeaders: Headers },
	input: unknown,
) => string;

// `X-Forwarded-For` may be a comma-separated list (client, proxy1, proxy2…).
// The originating client is the first entry; trim per RFC 7239.
export function extractIp(headers: Headers): string {
	const cfIp = headers.get("CF-Connecting-IP");
	if (cfIp) return cfIp;
	const fwd = headers.get("X-Forwarded-For");
	if (fwd) {
		const first = fwd.split(",")[0]?.trim();
		if (first) return first;
	}
	return "unknown";
}

function extractEmail(input: unknown): string {
	if (
		input === null ||
		typeof input !== "object" ||
		!("email" in input) ||
		typeof (input as { email: unknown }).email !== "string" ||
		(input as { email: string }).email.length === 0
	) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				'rateLimit: "email" requires the procedure input to include a non-empty `email: string` field',
		});
	}
	return (input as { email: string }).email.toLowerCase();
}

const KEY_EXTRACTORS: Record<RateLimitKind, KeyExtractor> = {
	ip: (context) => extractIp(context.reqHeaders),
	email: (_, input) => extractEmail(input),
};

function createRateLimitMiddleware(kind: RateLimitKind) {
	return async (
		{
			context,
			next,
		}: {
			context: {
				reqHeaders: Headers;
				_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
				_devMode?: boolean;
			};
			next: (opts: { context: unknown }) => Promise<unknown>;
		},
		input: unknown,
	) => {
		const limiter = context._rateLimiter?.[kind];
		const isDev = context._devMode ?? false;

		if (isDev) return next({ context: {} });

		if (!limiter) {
			console.error(
				`[api] Procedure requires rate limiting ("${kind}") but no ${kind} rate limiter is bound to the worker context. ` +
					`Ensure plugin-auth is configured with a rateLimiter binding, or inject { _rateLimiter: { ${kind}: binding } } via .use() when constructing the worker.`,
			);
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Server configuration error",
			});
		}

		const key = KEY_EXTRACTORS[kind](context, input);
		const result = await limiter.limit({ key });
		if (!result.success) {
			throw new ORPCError("TOO_MANY_REQUESTS", {
				message: "Rate limit exceeded. Please try again later.",
			});
		}

		return next({ context: {} });
	};
}

// oRPC's RPCHandler flattens any non-ORPCError throw into an opaque
// INTERNAL_SERVER_ERROR before it reaches Hono's onError, so a real bug (a
// D1 error, a typo) leaves zero server-side trace. ORPCError throws are
// intentional control flow (auth/rate-limit/validation failures) and must
// stay silent.
function createErrorLoggingMiddleware(): OrpcMiddlewareFn {
	return async ({ next }, _input) => {
		try {
			return await next({ context: {} });
		} catch (error) {
			if (!(error instanceof ORPCError)) {
				console.error("[api] Unexpected procedure error:", error);
			}
			throw error;
		}
	};
}

// `reads`/`writes` entity names reach `Headers.set` (below) comma-joined,
// and comma is also the client-side split delimiter (`splitHeaderValue`,
// `@fcalell/plugin-api/query-invalidation`). Validate at `procedure()`
// construction time — module init, loud — rather than let an illegal
// character reach `Headers.set` at request time, which would throw AFTER a
// mutation's handler already committed.
const ENTITY_NAME_RE = /^[A-Za-z0-9_.-]+$/;

function assertValidEntityNames(
	kind: "reads" | "writes",
	entities: readonly string[],
): void {
	for (const name of entities) {
		if (!ENTITY_NAME_RE.test(name)) {
			throw new Error(
				`procedure(): invalid entity name "${name}" in \`${kind}\` -- entity names become ` +
					"comma-joined Headers values (x-stack-reads/x-stack-writes) and may only contain " +
					'letters, digits, "_", ".", and "-". Rename the entity.',
			);
		}
	}
}

// WS3.1 wire contract: stamps `x-stack-reads` / `x-stack-writes` on the
// response only when the handler succeeds — a thrown error (ORPCError or
// otherwise) propagates out of `next()` before either header is set, so a
// failed request never claims to have touched its declared entities. Only
// installed when the procedure declares at least one entity (see
// `createProcedure` below); empty/absent `reads`/`writes` never reach here.
function createEntityHeadersMiddleware(
	reads: readonly string[],
	writes: readonly string[],
): OrpcMiddlewareFn<{ resHeaders: Headers }> {
	return async ({ context, next }, _input) => {
		const result = await next({ context: {} });
		if (reads.length > 0) {
			context.resHeaders.set(STACK_READS_HEADER, reads.join(","));
		}
		if (writes.length > 0) {
			context.resHeaders.set(STACK_WRITES_HEADER, writes.join(","));
		}
		return result;
	};
}

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

// ---------- Internal oRPC chain shape ----------
// We call a small subset of methods on the oRPC Builder / ProcedureBuilder*.
// Modeling the full oRPC generic chain here would force us to re-derive all
// of oRPC's internal type machinery; instead we describe just the surface we
// touch. Every oRPC builder object satisfies this shape structurally, and the
// returned `OrpcChain` values are funneled through our strictly-typed public
// `ProcedureBuilder` interface before they reach consumers.
//
// Middleware and handler types are intentionally permissive on `context`
// (`Record<string, unknown>` or a narrower required subset) so that the
// concrete middleware factories below — each of which requires specific
// context keys like `auth` / `session` / `_rateLimiter` — are assignable
// without casts. oRPC itself does the same: its runtime only peeks at
// `context` to spread it, never constrains its shape at call time.
type OrpcNext = (opts: { context: unknown }) => Promise<unknown>;

// A middleware whose required context is `TCtx`. Because function parameters
// are contravariant, an `OrpcMiddlewareFn<{ auth: X }>` is assignable to
// `OrpcMiddlewareFn<Record<string, unknown> & { auth: X }>` — exactly the
// structural relationship we want between our typed factories and the chain.
type OrpcMiddlewareFn<
	TCtx extends Record<string, unknown> = Record<string, unknown>,
> = (
	opts: { context: TCtx; next: OrpcNext },
	input: unknown,
) => Promise<unknown>;

// Handler arg is contravariant in `input`, so a handler expecting
// `{ limit?: number }` is assignable to `OrpcHandlerFn` (where input is
// `unknown`-wide). Keeping this generic over the input shape lets
// `wrapPaginatedHandler` feed its output straight into `chain.handler()`.
type OrpcHandlerFn<TInput = unknown> = (opts: {
	context: Record<string, unknown>;
	input: TInput;
}) => unknown;

interface OrpcChain {
	// `use` is parameterized so middleware factories with narrower required
	// context (e.g. `{ auth: ..., reqHeaders: Headers }`) are accepted without
	// casts. Method-parameter bivariance makes this assignment legal even
	// under `strictFunctionTypes`.
	use<TCtx extends Record<string, unknown>>(
		middleware: OrpcMiddlewareFn<TCtx>,
	): OrpcChain;
	input(schema: z.ZodType): OrpcChain;
	output(schema: z.ZodType): OrpcChain;
	// Same story for `handler`: a handler expecting a narrower input shape
	// (e.g. `{ limit?: number }` from the paginated wrapper) is structurally a
	// valid `OrpcHandlerFn`.
	handler<TInput>(fn: OrpcHandlerFn<TInput>): OrpcTerminal;
}

// The oRPC `DecoratedProcedure` value our handler calls produce. Consumers
// only read it as our opaque `Procedure<TInput, TOutput>` brand.
interface OrpcTerminal {
	readonly "~orpc": unknown;
}

interface BuilderState {
	chain: OrpcChain;
	baseShape: z.ZodRawShape | null;
	paginated: boolean;
}

type PaginatedHandlerArg = { input: { limit?: number } };

function wrapPaginatedHandler<
	THandler extends (opts: PaginatedHandlerArg) => unknown,
>(fn: THandler): (opts: PaginatedHandlerArg) => ReturnType<THandler> {
	return (opts) => {
		opts.input.limit = clampLimit(opts.input.limit);
		return fn(opts) as ReturnType<THandler>;
	};
}

// Centralized pagination wrap: when `paginated` is on, clamp `input.limit`
// before the handler runs. When off, return `fn` unchanged (allocation-free).
// The `OrpcHandlerFn` interface is `TInput`-variant, so the wrapped output
// flows into `chain.handler()` without extra casts at call sites.
function maybeWrapPaginated(
	fn: OrpcHandlerFn,
	paginated: boolean,
): OrpcHandlerFn {
	if (!paginated) return fn;
	// `wrapPaginatedHandler` reads `opts.input.limit`, so it needs the narrower
	// `PaginatedHandlerArg` shape; the surrounding `paginated` flag is the
	// invariant that makes this safe. One focused cast replaces ten scattered
	// ones at the previous call sites.
	return wrapPaginatedHandler(
		fn as (opts: PaginatedHandlerArg) => unknown,
	) as OrpcHandlerFn;
}

function createBuilder<TContext extends Record<string, unknown>, TBaseInput>(
	state: BuilderState,
): ProcedureBuilder<TContext, TBaseInput> {
	const { chain, baseShape, paginated } = state;
	const hasBaseShape = baseShape !== null;

	function terminate(fn: OrpcHandlerFn): OrpcTerminal {
		if (hasBaseShape) {
			const schema = z.object(baseShape);
			return chain.input(schema).handler(maybeWrapPaginated(fn, paginated));
		}
		return chain.handler(fn);
	}

	const builder = {
		use(
			middleware: Middleware<Record<string, unknown>, Record<string, unknown>>,
		) {
			return createBuilder<TContext, TBaseInput>({
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
			const run = (fn: OrpcHandlerFn) =>
				withInputChain.handler(maybeWrapPaginated(fn, paginated));

			const withInput = {
				output(outputSchema: z.ZodType) {
					const withOutputChain = withInputChain.output(outputSchema);
					const runWithOutput = (fn: OrpcHandlerFn) =>
						withOutputChain.handler(maybeWrapPaginated(fn, paginated));
					return {
						handler: runWithOutput,
						query: runWithOutput,
						mutation: runWithOutput,
					};
				},
				handler: run,
				query: run,
				mutation: run,
			};
			// Boundary: our literal shares method names/arities with
			// `ProcedureWithInput`, but its internal generics don't propagate
			// into the object-literal type. One cast bridges the two.
			return withInput as unknown as ProcedureWithInput<
				TContext,
				MergedInput<TBaseInput, unknown>
			>;
		},

		output(outputSchema: z.ZodType) {
			const withOutputChain = chain.output(outputSchema);
			const runOutput = (fn: OrpcHandlerFn) => {
				const wrapped = maybeWrapPaginated(fn, paginated);
				if (hasBaseShape) {
					const schema = z.object(baseShape);
					return withOutputChain.input(schema).handler(wrapped);
				}
				return withOutputChain.handler(wrapped);
			};
			const withOutput = {
				input(inputSchema: z.ZodType) {
					let merged: z.ZodType = inputSchema;
					if (hasBaseShape) {
						if (!(inputSchema instanceof z.ZodObject)) {
							throw new Error(
								"procedure() with `org` or `paginated` requires an object input schema. Use .input(z.object({...})).",
							);
						}
						merged = z.object({ ...baseShape, ...inputSchema.shape });
					}
					const innerChain = withOutputChain.input(merged);
					const run = (fn: OrpcHandlerFn) =>
						innerChain.handler(maybeWrapPaginated(fn, paginated));
					return { handler: run, query: run, mutation: run };
				},
				handler: runOutput,
				query: runOutput,
				mutation: runOutput,
			};
			// Same boundary as in `input()` above.
			return withOutput as unknown as ProcedureWithOutput<
				TContext,
				TBaseInput,
				unknown
			>;
		},

		handler: terminate,
		query: terminate,
		mutation: terminate,
	};

	// Final boundary: this literal satisfies every method required by
	// `ProcedureBuilder<TContext, TBaseInput>`, but the generic linkage (ctx
	// extensions from `use`, input additions from `org`/`paginated`) is only
	// tracked at `procedure()`'s return type — not through this literal.
	return builder as unknown as ProcedureBuilder<TContext, TBaseInput>;
}

export function createProcedure<
	TContext extends Record<string, unknown>,
	TStatements extends DefaultStatements = Record<string, string[]>,
	TEntity extends string = string,
>(): ProcedureFactory<TContext, TStatements, TEntity> {
	// oRPC's root `Builder` has 6 generics we don't surface; treat it as an
	// `OrpcChain` from here on so the chain's structural type is stable.
	const base = os.$context<TContext>() as unknown as OrpcChain;

	function procedure(config?: ProcedureConfig<TStatements, TEntity>) {
		const opts = (config ?? {}) as ProcedureConfig<TStatements, TEntity> &
			BaseOptions<TEntity>;
		let chain: OrpcChain = base;

		// Root middleware, ahead of rate-limit/auth/org/rbac: logs unexpected
		// (non-ORPCError) throws before oRPC flattens them into an opaque 500.
		chain = chain.use(createErrorLoggingMiddleware());

		// WS3.1: right after error logging, so the header-setting middleware
		// still sees (and rethrows past) any error the inner chain produces.
		const reads = opts.reads ?? [];
		const writes = opts.writes ?? [];
		assertValidEntityNames("reads", reads);
		assertValidEntityNames("writes", writes);
		if (reads.length > 0 || writes.length > 0) {
			chain = chain.use(createEntityHeadersMiddleware(reads, writes));
		}

		// Each middleware factory declares its own required `context` shape
		// (e.g. `{ reqHeaders, auth }` for auth, `{ session }` for org). The
		// generic `OrpcChain.use<TCtx>` infers TCtx from that shape, so no
		// cast is needed — the structural match carries through.
		for (const kind of normalizeRateLimits(opts.rateLimit)) {
			chain = chain.use(createRateLimitMiddleware(kind));
		}

		const isAuth = "auth" in opts && opts.auth === true;
		if (isAuth) {
			chain = chain.use(createAuthMiddleware());
		}

		const isOrg = "org" in opts && opts.org === true;
		if (isOrg) {
			chain = chain.use(createOrgConsistencyMiddleware());
		}

		if ("rbac" in opts && opts.rbac) {
			const [resource, actions] = opts.rbac;
			chain = chain.use(createRbacMiddleware(resource, [...actions]));
		}

		// `can` is pure sugar over the same rbac middleware, action-first. If
		// both `rbac` and `can` are set, both run (independent checks).
		if ("can" in opts && opts.can) {
			const [action, resource] = opts.can;
			chain = chain.use(createRbacMiddleware(resource, [action]));
		}

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

	return procedure as unknown as ProcedureFactory<
		TContext,
		TStatements,
		TEntity
	>;
}
