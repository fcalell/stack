import { ORPCError, os } from "@orpc/server";
import { z } from "zod";
import { DEFAULT_LIMIT, LIMIT_CEILING, MAX_LIMIT } from "./lib/cursor.ts";
import type { Procedure } from "./types.ts";
import {
	ENTITY_NAME_RE,
	STACK_READS_HEADER,
	STACK_WRITES_HEADER,
} from "./wire.ts";

// Re-exported for `@fcalell/plugin-api/procedure` consumers (generated code,
// plugins/auth's worker) — see `./wire.ts` for why these live there and not
// here: client bundles need them without pulling in this file's
// `@orpc/server` + zod + builder machinery.
export {
	ORG_RULES_PATH,
	SCOPE_ROUTES_PATH,
	STACK_READS_HEADER,
	STACK_WRITES_HEADER,
} from "./wire.ts";

/**
 * A scope's name in plain words: camelCase and snake_case split at their
 * words and lower-cased (`dataFlow` and `data_flow` read "data flow"), for the
 * messages that name the scope to a person.
 */
export function scopeWords(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.split(/[\s_-]+/)
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

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
// the org layer stays unconditional by construction (statements have no conditions;
// conditions belong to the record-scoped ability layer instead).
type Can<TStatements extends DefaultStatements> = {
	[R in keyof TStatements & string]: readonly [TStatements[R][number], R];
}[keyof TStatements & string];

interface BaseOptions<TEntity extends string = string> {
	rateLimit?: RateLimitKind | readonly RateLimitKind[];
	// `true`: a keyset page (`cursor`, `limit`; answers `{ data, nextCursor }`).
	// `"window"`: a page at an offset (`offset`, `limit`; answers
	// `{ data, total, offset }`), which a collection scrolls through by its total.
	paginated?: boolean | "window";
	// The most rows one call may ask for (`limit`); 100 unless named.
	maxLimit?: number;
	// The columns the caller may sort the page by: the input gains
	// `sort?: { column, direction }`, typed to these. A Table over the read
	// sends its header sort through it.
	sort?: readonly [string, ...string[]];
	// Entities this procedure reads/writes, for automatic cache invalidation
	//. Ships as `x-stack-reads` /
	// `x-stack-writes` response headers — see `createEntityHeadersMiddleware`.
	reads?: readonly TEntity[];
	writes?: readonly TEntity[];
}

// A tenancy level, as the procedure factory sees it: plugin-auth's scope
// descriptors (`defineScope`, the root `organization`) satisfy it. The input
// key is `${name}Id`; the phantom `__context` is what resolving the chain
// adds to the request context. plugin-api never imports plugin-auth, so the
// descriptor and its resolver (`TenancyContext`) are both structural.
export interface ScopeLike<TName extends string = string, TContext = unknown> {
	readonly name: TName;
	readonly __context?: TContext;
}

interface PublicOptions<TEntity extends string = string>
	extends BaseOptions<TEntity> {
	auth?: false;
	scope?: never;
	rbac?: never;
	can?: never;
}

interface AuthOnlyOptions<TEntity extends string = string>
	extends BaseOptions<TEntity> {
	auth: true;
	scope?: never;
	rbac?: never;
	can?: never;
}

interface ScopedOptions<
	TStatements extends DefaultStatements,
	TEntity extends string = string,
> extends BaseOptions<TEntity> {
	auth: true;
	// The scope the procedure acts inside. Its id arrives in the input, the
	// chain up to the organization resolves per request, and a missing row or
	// a non-member caller answers NOT_FOUND.
	scope: ScopeLike;
	rbac?: Rbac<TStatements>;
	// Preferred spelling over `rbac` -- config gates, handler `assertCan`,
	// and client `ability.can()` all read as actions-on-subjects. Both may be
	// set; both middlewares run. Checked against the caller's role in the
	// scope's organization.
	can?: Can<TStatements>;
}

export type ProcedureConfig<
	TStatements extends DefaultStatements = DefaultStatements,
	TEntity extends string = string,
> =
	| PublicOptions<TEntity>
	| AuthOnlyOptions<TEntity>
	| ScopedOptions<TStatements, TEntity>;

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
	(O extends { scope: ScopeLike<string, infer C> } ? C : unknown);

// The two types one schema gives a procedure: what the caller sends and what
// the handler holds once oRPC has parsed it. An output schema swaps them: the
// handler returns what the schema accepts and the caller receives what it
// produces.
// `scope` is the input key the config adds for the procedure's scope
// (`organizationId`), `never` for a procedure with none; it rides to
// `Procedure`'s third parameter, where the client type reads it.
interface Sides<TClient, THandler, TScope extends string = never> {
	client: TClient;
	handler: THandler;
	scope: TScope;
}

type AnySides = Sides<unknown, unknown, string>;

type ScopeKey<O> = O extends { scope: ScopeLike<infer N> } ? `${N}Id` : never;

type ScopeInput<O> = { [K in ScopeKey<O>]: string };

type SortSide<O> = O extends { sort: readonly (infer C extends string)[] }
	? { sort?: { column: C; direction: "asc" | "desc" } }
	: unknown;

// `pageShape` defaults `limit` (and a window's `offset`), so only the caller
// may omit them.
type PageInput<O> = O extends { paginated: "window" }
	? Sides<
			{ offset?: number; limit?: number } & SortSide<O>,
			{ offset: number; limit: number } & SortSide<O>
		>
	: O extends { paginated: true }
		? Sides<
				{ cursor?: string; limit?: number } & SortSide<O>,
				{ cursor?: string; limit: number } & SortSide<O>
			>
		: Sides<unknown, unknown>;

type IsPaginated = { paginated: true } | { paginated: "window" };

// Both sides are `undefined` when the config adds nothing, so a procedure
// with no input is called with no argument (`ProcedureCall`).
type InputAdditions<O> = O extends { scope: ScopeLike } | IsPaginated
	? Sides<
			ScopeInput<O> & PageInput<O>["client"],
			ScopeInput<O> & PageInput<O>["handler"],
			ScopeKey<O>
		>
	: Sides<undefined, undefined>;

// zod types `z.object({})` as `Record<string, never>`, whose index signature
// would refuse every key the config adds, so an empty schema adds nothing.
type IsEmptyObject<T> = [T] extends [Record<string, never>]
	? [Record<string, never>] extends [T]
		? true
		: false
	: false;

type MergeSide<TBaseSide, TSchemaSide> = TBaseSide extends undefined
	? TSchemaSide
	: IsEmptyObject<TSchemaSide> extends true
		? TBaseSide
		: TSchemaSide & TBaseSide;

type MergedInput<
	TBaseInput extends AnySides,
	TSchema extends z.ZodType,
> = Sides<
	MergeSide<TBaseInput["client"], z.input<TSchema>>,
	MergeSide<TBaseInput["handler"], z.output<TSchema>>,
	TBaseInput["scope"]
>;

type OutputSides<TSchema extends z.ZodType> = Sides<
	z.output<TSchema>,
	z.input<TSchema>
>;

// ---------- Builder interfaces ----------

interface ProcedureWithInputOutput<
	TContext,
	TInput extends AnySides,
	TOutput extends AnySides,
> {
	handler(
		fn: (
			opts: HandlerOptions<TContext, TInput["handler"]>,
		) => Promisable<TOutput["handler"]>,
	): Procedure<TInput["client"], TOutput["client"], TInput["scope"]>;

	query(
		fn: (
			opts: HandlerOptions<TContext, TInput["handler"]>,
		) => Promisable<TOutput["handler"]>,
	): Procedure<TInput["client"], TOutput["client"], TInput["scope"]>;

	mutation(
		fn: (
			opts: HandlerOptions<TContext, TInput["handler"]>,
		) => Promisable<TOutput["handler"]>,
	): Procedure<TInput["client"], TOutput["client"], TInput["scope"]>;
}

interface ProcedureWithInput<TContext, TInput extends AnySides> {
	output<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithInputOutput<TContext, TInput, OutputSides<TSchema>>;

	handler<TOutput>(
		fn: (
			opts: HandlerOptions<TContext, TInput["handler"]>,
		) => Promisable<TOutput>,
	): Procedure<TInput["client"], TOutput, TInput["scope"]>;

	query<TOutput>(
		fn: (
			opts: HandlerOptions<TContext, TInput["handler"]>,
		) => Promisable<TOutput>,
	): Procedure<TInput["client"], TOutput, TInput["scope"]>;

	mutation<TOutput>(
		fn: (
			opts: HandlerOptions<TContext, TInput["handler"]>,
		) => Promisable<TOutput>,
	): Procedure<TInput["client"], TOutput, TInput["scope"]>;
}

interface ProcedureWithOutput<
	TContext,
	TBaseInput extends AnySides,
	TOutput extends AnySides,
> {
	input<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithInputOutput<
		TContext,
		MergedInput<TBaseInput, TSchema>,
		TOutput
	>;

	handler(
		fn: (
			opts: HandlerOptions<TContext, TBaseInput["handler"]>,
		) => Promisable<TOutput["handler"]>,
	): Procedure<TBaseInput["client"], TOutput["client"], TBaseInput["scope"]>;

	query(
		fn: (
			opts: HandlerOptions<TContext, TBaseInput["handler"]>,
		) => Promisable<TOutput["handler"]>,
	): Procedure<TBaseInput["client"], TOutput["client"], TBaseInput["scope"]>;

	mutation(
		fn: (
			opts: HandlerOptions<TContext, TBaseInput["handler"]>,
		) => Promisable<TOutput["handler"]>,
	): Procedure<TBaseInput["client"], TOutput["client"], TBaseInput["scope"]>;
}

export interface ProcedureBuilder<
	TContext extends Record<string, unknown>,
	TBaseInput extends AnySides,
> {
	use<TExtra extends Record<string, unknown>>(
		middleware: Middleware<TContext, TExtra>,
	): ProcedureBuilder<TContext & TExtra, TBaseInput>;

	input<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithInput<TContext, MergedInput<TBaseInput, TSchema>>;

	output<TSchema extends z.ZodType>(
		schema: TSchema,
	): ProcedureWithOutput<TContext, TBaseInput, OutputSides<TSchema>>;

	handler<TOutput>(
		fn: (
			opts: HandlerOptions<TContext, TBaseInput["handler"]>,
		) => Promisable<TOutput>,
	): Procedure<TBaseInput["client"], TOutput, TBaseInput["scope"]>;

	query<TOutput>(
		fn: (
			opts: HandlerOptions<TContext, TBaseInput["handler"]>,
		) => Promisable<TOutput>,
	): Procedure<TBaseInput["client"], TOutput, TBaseInput["scope"]>;

	mutation<TOutput>(
		fn: (
			opts: HandlerOptions<TContext, TBaseInput["handler"]>,
		) => Promisable<TOutput>,
	): Procedure<TBaseInput["client"], TOutput, TBaseInput["scope"]>;
}

export type ProcedureFactory<
	TBase extends Record<string, unknown>,
	TStatements extends DefaultStatements,
	TEntity extends string = string,
> = <
	const O extends ProcedureConfig<
		TStatements,
		TEntity
	> = PublicOptions<TEntity>,
>(
	config?: O,
) => ProcedureBuilder<ResolvedContext<O, TBase>, InputAdditions<O>>;

// ---------- Middleware factories ----------

// The refusal an auth layer's session lookup throws for a credential it
// rejects, read structurally (api never imports the auth library): an error
// that carries an HTTP status of 401 or 403 (a revoked, disabled or expired
// key, or a bearer the lookup does not accept) is UNAUTHORIZED, and 429 (a key
// over its rate limit) is TOO_MANY_REQUESTS. Any other error is not a
// credential's fault and is left to surface as a 500.
function credentialRefusal(error: unknown): ORPCError<string, unknown> | null {
	if (typeof error !== "object" || error === null) return null;
	const { statusCode, body } = error as {
		statusCode?: unknown;
		body?: { message?: unknown } | null;
	};
	const message =
		typeof body?.message === "string"
			? body.message
			: "Authentication required";
	if (statusCode === 401 || statusCode === 403) {
		return new ORPCError("UNAUTHORIZED", { message });
	}
	if (statusCode === 429) {
		return new ORPCError("TOO_MANY_REQUESTS", { message });
	}
	return null;
}

function createAuthMiddleware() {
	return async ({
		context,
		next,
	}: {
		context: {
			reqHeaders: Headers;
			// Set only by the MCP endpoint, which has verified its bearer token:
			// the caller it names stands in for the cookie session.
			_caller?: { user: unknown; session: unknown };
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
		if (context._caller) {
			return next({
				context: {
					user: context._caller.user,
					session: context._caller.session,
				},
			});
		}
		// A session-store outage (D1 down, binding misconfigured) must surface
		// as a 500: folding it into UNAUTHORIZED reads to the client as "your
		// session is invalid" and triggers a sign-out storm across every client
		// retrying at once. Only an absent or incomplete session, and a refusal
		// of the credential itself (below), are auth failures.
		let sessionData: { user: unknown; session: unknown } | null;
		try {
			sessionData = await context.auth.api.getSession({
				headers: context.reqHeaders,
			});
		} catch (error) {
			// A credential the auth layer refuses (a revoked, expired or
			// rate-limited device key) answers as the refusal it is, with its
			// status, not as a failure of the store.
			throw credentialRefusal(error) ?? error;
		}

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
	};
}

// The request context's tenancy capability, put there by plugin-auth's
// runtime when organizations are on. Structural, so api never imports auth.
type TenancyContext = {
	tenancy: {
		resolve(
			scope: ScopeLike,
			id: string,
			userId: string,
		): Promise<Record<string, unknown> | null>;
		can(role: string, permissions: Record<string, readonly string[]>): boolean;
	};
};

function scopeInputKey(scope: ScopeLike): string {
	return `${scope.name}Id`;
}

// Resolves the scope the input names and every level above it, and adds
// their rows (and the caller's `member`) to the context. An absent row and a
// caller who is no member answer the same NOT_FOUND, so a guessed id never
// confirms that a row exists.
function createScopeMiddleware(scope: ScopeLike) {
	const key = scopeInputKey(scope);
	return async (
		{
			context,
			next,
		}: {
			context: { user: { id: string } } & TenancyContext;
			next: (opts: { context: unknown }) => Promise<unknown>;
		},
		input: unknown,
	) => {
		const id = (input as Record<string, unknown>)[key];
		const resolved =
			typeof id === "string"
				? await context.tenancy.resolve(scope, id, context.user.id)
				: null;
		if (!resolved) {
			throw new ORPCError("NOT_FOUND", {
				message: `No such ${scopeWords(scope.name)}`,
			});
		}
		return next({ context: resolved });
	};
}

// The caller's role in the scope's organization, checked locally against
// the roles the auth config declares.
function createPermissionMiddleware(resource: string, actions: string[]) {
	return async ({
		context,
		next,
	}: {
		context: { member: { role: string } } & TenancyContext;
		next: (opts: { context: unknown }) => Promise<unknown>;
	}) => {
		if (!context.tenancy.can(context.member.role, { [resource]: actions })) {
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

// Wire contract: stamps `x-stack-reads` / `x-stack-writes` on the
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

// The input a paginated procedure adds: the page (a cursor, or an offset) and
// its size, and the sort when columns are declared. A `maxLimit` below the
// default limit lowers the default with it.
function pageShape(opts: BaseOptions): z.ZodRawShape {
	const max = opts.maxLimit ?? MAX_LIMIT;
	if (!Number.isInteger(max) || max < 1 || max > LIMIT_CEILING) {
		throw new Error(
			`procedure(): \`maxLimit\` is a whole number from 1 to ${LIMIT_CEILING}, got ${max}`,
		);
	}
	const sort = opts.sort;
	if (sort && opts.paginated !== true && opts.paginated !== "window") {
		throw new Error("procedure(): `sort` needs `paginated`");
	}
	return {
		...(opts.paginated === "window"
			? { offset: z.number().int().min(0).default(0) }
			: { cursor: z.string().optional() }),
		limit: z
			.number()
			.int()
			.min(1)
			.max(max)
			.default(Math.min(DEFAULT_LIMIT, max)),
		...(sort
			? {
					sort: z
						.object({
							column: z.enum(sort),
							direction: z.enum(["asc", "desc"]),
						})
						.optional(),
				}
			: {}),
	};
}

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

type OrpcHandlerFn = (opts: {
	context: Record<string, unknown>;
	input: unknown;
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
	handler(fn: OrpcHandlerFn): OrpcTerminal;
}

// The oRPC `DecoratedProcedure` value our handler calls produce. Consumers
// only read it as our opaque `Procedure<TInput, TOutput>` brand.
interface OrpcTerminal {
	readonly "~orpc": unknown;
	meta(meta: Record<string, unknown>): OrpcTerminal;
	route(route: { method: "GET" }): OrpcTerminal;
}

// What a procedure's terminal call says it is, as the oRPC meta the MCP
// endpoint reads: a query is read-only, a mutation and a bare handler are not.
type ProcedureKind = "query" | "mutation";

// A query is also the one kind that answers a GET: oRPC's RPCHandler refuses
// GET on a procedure whose route method is not GET (`StrictGetMethodPlugin`,
// on by default), so a mutation or a bare handler never runs from a link.
function stamp(
	terminal: OrpcTerminal,
	kind: ProcedureKind,
	scope: string | null,
): OrpcTerminal {
	const stamped = terminal.meta({ kind, ...(scope ? { scope } : {}) });
	return kind === "query" ? stamped.route({ method: "GET" }) : stamped;
}

interface BuilderState {
	chain: OrpcChain;
	baseShape: z.ZodRawShape | null;
	// The input key the procedure's `scope` adds (`organizationId`), stamped on
	// its meta as `scope`; the client's types read it from `Procedure`'s third parameter.
	scope: string | null;
}

// The input a `scope` or `paginated` procedure validates: the consumer's
// object extended with the keys the config adds. `safeExtend` clones the
// object with its unknown-key policy (strict, strip, catchall) and its
// refinements, where a fresh `z.object` over the two shapes would keep
// neither. A consumer key the config also adds is refused: the scope
// middleware reads `<scope>Id` off the raw input before validation, so the
// consumer's schema could only weaken or contradict the config's.
function mergeInput(
	baseShape: z.ZodRawShape | null,
	schema: z.ZodType,
): z.ZodType {
	if (baseShape === null) return schema;
	if (!(schema instanceof z.ZodObject)) {
		throw new Error(
			"procedure() with `scope` or `paginated` requires an object input schema. Use .input(z.object({...})).",
		);
	}
	for (const key of Object.keys(baseShape)) {
		if (key in schema.shape) {
			throw new Error(
				`procedure(): the input schema declares \`${key}\`, a key the procedure's \`scope\` or \`paginated\` config adds. Drop \`${key}\` from the input schema.`,
			);
		}
	}
	return schema.safeExtend(baseShape);
}

function createBuilder<
	TContext extends Record<string, unknown>,
	TBaseInput extends AnySides,
>(state: BuilderState): ProcedureBuilder<TContext, TBaseInput> {
	const { chain, baseShape, scope } = state;
	const hasBaseShape = baseShape !== null;

	function terminate(fn: OrpcHandlerFn): OrpcTerminal {
		if (hasBaseShape) {
			const schema = z.object(baseShape);
			return chain.input(schema).handler(fn);
		}
		return chain.handler(fn);
	}

	// The three terminal calls of a chain ending at `end`.
	function terminals(end: (fn: OrpcHandlerFn) => OrpcTerminal) {
		return {
			handler: (fn: OrpcHandlerFn) =>
				scope ? end(fn).meta({ scope }) : end(fn),
			query: (fn: OrpcHandlerFn) => stamp(end(fn), "query", scope),
			mutation: (fn: OrpcHandlerFn) => stamp(end(fn), "mutation", scope),
		};
	}

	const builder = {
		use(
			middleware: Middleware<Record<string, unknown>, Record<string, unknown>>,
		) {
			return createBuilder<TContext, TBaseInput>({
				chain: chain.use(toOrpcMiddleware(middleware)),
				baseShape,
				scope,
			});
		},

		input(userSchema: z.ZodType) {
			const withInputChain = chain.input(mergeInput(baseShape, userSchema));
			const run = (fn: OrpcHandlerFn) => withInputChain.handler(fn);

			const withInput = {
				output(outputSchema: z.ZodType) {
					const withOutputChain = withInputChain.output(outputSchema);
					const runWithOutput = (fn: OrpcHandlerFn) =>
						withOutputChain.handler(fn);
					return terminals(runWithOutput);
				},
				...terminals(run),
			};
			// Boundary: our literal shares method names/arities with
			// `ProcedureWithInput`, but its internal generics don't propagate
			// into the object-literal type. One cast bridges the two.
			return withInput as unknown as ProcedureWithInput<
				TContext,
				MergedInput<TBaseInput, z.ZodType>
			>;
		},

		output(outputSchema: z.ZodType) {
			const withOutputChain = chain.output(outputSchema);
			const runOutput = (fn: OrpcHandlerFn) => {
				if (hasBaseShape) {
					const schema = z.object(baseShape);
					return withOutputChain.input(schema).handler(fn);
				}
				return withOutputChain.handler(fn);
			};
			const withOutput = {
				input(inputSchema: z.ZodType) {
					const innerChain = withOutputChain.input(
						mergeInput(baseShape, inputSchema),
					);
					const run = (fn: OrpcHandlerFn) => innerChain.handler(fn);
					return terminals(run);
				},
				...terminals(runOutput),
			};
			// Same boundary as in `input()` above.
			return withOutput as unknown as ProcedureWithOutput<
				TContext,
				TBaseInput,
				AnySides
			>;
		},

		...terminals(terminate),
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

		// Right after error logging, so the header-setting middleware
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

		const scope = "scope" in opts ? opts.scope : undefined;
		if (scope) {
			chain = chain.use(createScopeMiddleware(scope));
		}

		if ("rbac" in opts && opts.rbac) {
			const [resource, actions] = opts.rbac;
			chain = chain.use(createPermissionMiddleware(resource, [...actions]));
		}

		// `can` is sugar over the same check, action-first. If both `rbac` and
		// `can` are set, both run (independent checks).
		if ("can" in opts && opts.can) {
			const [action, resource] = opts.can;
			chain = chain.use(createPermissionMiddleware(resource, [action]));
		}

		const isPaginated = opts.paginated === true || opts.paginated === "window";
		let baseShape: z.ZodRawShape | null = null;
		if (scope || isPaginated) {
			baseShape = {
				...(scope ? { [scopeInputKey(scope)]: z.string().min(1) } : {}),
				...(isPaginated ? pageShape(opts) : {}),
			};
		}

		return createBuilder({
			chain,
			baseShape,
			scope: scope ? scopeInputKey(scope) : null,
		});
	}

	return procedure as unknown as ProcedureFactory<
		TContext,
		TStatements,
		TEntity
	>;
}

// ---------- Background jobs ----------

// A queue batch as a handler sees it. Structural, so this package takes no
// dependency on Cloudflare's types: a `MessageBatch` satisfies it.
export interface JobMessage<Body = unknown> {
	readonly id: string;
	readonly body: Body;
	readonly attempts: number;
	readonly timestamp: Date;
	ack(): void;
	retry(options?: { delaySeconds?: number }): void;
}

export interface JobBatch<Body = unknown> {
	readonly queue: string;
	readonly messages: readonly JobMessage<Body>[];
	ackAll(): void;
	retryAll(options?: { delaySeconds?: number }): void;
}

// The cron event a scheduled handler sees (`ScheduledController`'s members).
export interface JobScheduledEvent {
	readonly cron: string;
	readonly scheduledTime: number;
}

// The two convention files' factories, typed against the app's job context
// (`.stack/procedure.ts` calls this with its `JobContext`). Each returns its
// handler as given: the generated worker mounts it.
export function createJobs<TContext>(): {
	defineQueue<Body = unknown>(
		run: (batch: JobBatch<Body>, context: TContext) => Promise<void>,
	): (batch: JobBatch<Body>, context: TContext) => Promise<void>;
	defineScheduled(
		run: (event: JobScheduledEvent, context: TContext) => Promise<void>,
	): (event: JobScheduledEvent, context: TContext) => Promise<void>;
} {
	return {
		defineQueue: (run) => run,
		defineScheduled: (run) => run,
	};
}
