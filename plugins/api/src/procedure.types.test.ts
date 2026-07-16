import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { Middleware, ProcedureBuilder } from "./procedure";
import { createProcedure } from "./procedure";
import type { Procedure } from "./types";

// Base context used by all the type-level tests below. We don't need any
// particular shape here — just a stable Record<string, unknown> for the
// resolved-context derivation to flow.
type BaseCtx = {
	db: { query: (sql: string) => Promise<unknown> };
	env: Record<string, unknown>;
	request: Request;
	reqHeaders: Headers;
	resHeaders: Headers;
};

// `createProcedure<BaseCtx>()` is how the worker constructs a typed
// `procedure()` factory. We reproduce that here so the type-level tests
// exercise the exact consumer-facing shape.
const procedure = createProcedure<BaseCtx>();

describe("procedure types", () => {
	it("ProcedureBuilder is parameterized by ctx and base-input", () => {
		expectTypeOf(procedure()).toEqualTypeOf<
			ProcedureBuilder<BaseCtx, undefined>
		>();
	});

	it(".input(schema) narrows handler input to z.output<schema>", () => {
		const proc = procedure()
			.input(z.object({ x: z.number() }))
			.handler(({ input, context }) => {
				expectTypeOf(input).toEqualTypeOf<{ x: number }>();
				expectTypeOf(context).toEqualTypeOf<BaseCtx>();
				return input.x + 1;
			});

		// Final procedure carries TInput / TOutput brands.
		expectTypeOf(proc).toEqualTypeOf<Procedure<{ x: number }, number>>();
	});

	it(".output(schema) constrains the handler return type", () => {
		const proc = procedure()
			.output(z.object({ id: z.string() }))
			.input(z.object({ x: z.number() }))
			.handler(({ input }) => ({ id: String(input.x) }));

		expectTypeOf(proc).toEqualTypeOf<
			Procedure<{ x: number }, { id: string }>
		>();

		// Wrong return shape must be rejected by the handler parameter type.
		// The handler argument must produce Promisable<{ id: string }> — an
		// object returning a number for `id` is not assignable.
		const bound = procedure()
			.output(z.object({ id: z.string() }))
			.input(z.object({ x: z.number() })).handler;
		expectTypeOf(bound)
			.parameter(0)
			.returns.not.toEqualTypeOf<{ id: number }>();
	});

	it(".output then .input composes in any order", () => {
		const a = procedure()
			.input(z.object({ x: z.number() }))
			.output(z.object({ id: z.string() }))
			.handler(({ input }) => ({ id: String(input.x) }));

		const b = procedure()
			.output(z.object({ id: z.string() }))
			.input(z.object({ x: z.number() }))
			.handler(({ input }) => ({ id: String(input.x) }));

		expectTypeOf(a).toEqualTypeOf<Procedure<{ x: number }, { id: string }>>();
		expectTypeOf(b).toEqualTypeOf<Procedure<{ x: number }, { id: string }>>();
	});

	it(".use(mw) threads mw's extra context into the handler", () => {
		const withTenant: Middleware<BaseCtx, { tenantId: string }> = async () => ({
			tenantId: "abc",
		});

		procedure()
			.use(withTenant)
			.handler(({ context, input }) => {
				expectTypeOf(context).toEqualTypeOf<BaseCtx & { tenantId: string }>();
				expectTypeOf(input).toEqualTypeOf<undefined>();
				return context.tenantId;
			});
	});

	it(".use is chainable and accumulates extras via intersection", () => {
		const addA: Middleware<BaseCtx, { a: number }> = async () => ({ a: 1 });
		const addB: Middleware<
			BaseCtx & { a: number },
			{ b: string }
		> = async () => ({ b: "x" });

		procedure()
			.use(addA)
			.use(addB)
			.handler(({ context }) => {
				expectTypeOf(context).toEqualTypeOf<
					BaseCtx & { a: number } & { b: string }
				>();
				return context.a + context.b.length;
			});
	});

	it("public `auth: true` ProcedureBuilder exposes session/user in context", () => {
		procedure({ auth: true }).handler(({ context }) => {
			expectTypeOf(context).toExtend<{
				user: { id: string };
				session: { id: string };
			}>();
			return context.user.id;
		});
	});

	it("`org: true` adds organizationId to both context and base input", () => {
		procedure({ auth: true, org: true })
			.input(z.object({ name: z.string() }))
			.handler(({ input, context }) => {
				// Base input is merged into the user schema.
				expectTypeOf(input).toExtend<{
					name: string;
					organizationId: string;
				}>();
				expectTypeOf(context).toExtend<{ organizationId: string }>();
				return input.name;
			});
	});

	it("`paginated: true` adds cursor/limit to input", () => {
		procedure({ paginated: true })
			.input(z.object({ q: z.string() }))
			.handler(({ input }) => {
				expectTypeOf(input).toExtend<{
					q: string;
					cursor?: string;
					limit?: number;
				}>();
				return input.q;
			});
	});

	// Regression guard for the type-surface refactor: after `.input()`, the
	// handler's `input` must be the z.output of the schema — not `any`,
	// `unknown`, or the raw schema type. Without `OrpcHandlerFn<TInput>` being
	// generic, these assertions previously relied on `as unknown as` casts
	// that hid drift. Keeping this test cheap ensures we notice if
	// `ProcedureWithInput`'s public handler signature regresses.
	it(".input() propagates z.output type into the handler", () => {
		procedure()
			.input(z.object({ id: z.string(), count: z.number().optional() }))
			.handler(({ input }) => {
				expectTypeOf(input).toEqualTypeOf<{
					id: string;
					count?: number;
				}>();
				return input.id;
			});
	});
});

// WS3.1: `reads`/`writes` narrow against the
// third `createProcedure` generic, the same way `rbac` narrows against
// `TStatements` — a typo'd entity name is a type error, not a runtime miss.
describe("procedure() reads/writes (WS3.1 entity vocabulary)", () => {
	const entityProcedure = createProcedure<
		BaseCtx,
		Record<string, readonly string[]>,
		"todos" | "users"
	>();

	it("accepts entity names from the declared vocabulary on public, auth-only, and org-scoped configs", () => {
		entityProcedure({ reads: ["todos"] }).handler(() => {});
		entityProcedure({ auth: true, writes: ["users"] }).handler(() => {});
		entityProcedure({
			auth: true,
			org: true,
			reads: ["todos"],
			writes: ["users"],
		}).handler(() => {});
	});

	it("rejects an entity name outside the declared vocabulary", () => {
		// @ts-expect-error: "projects" is not in "todos" | "users"
		entityProcedure({ reads: ["projects"] });
	});

	it("defaults the entity type param to `string` when unspecified", () => {
		procedure({ reads: ["anything"] }).handler(() => {});
	});
});

// WS6.2: `can: [action, resource]` -- action
// first, the reverse of `rbac`'s `[resource, actions[]]` -- narrows against
// the same `TStatements` generic `rbac` does. A tuple of exactly two
// strings: no third (conditions) slot exists, so the org layer stays
// unconditional by construction.
describe("procedure() can (WS6.2 org-level gate)", () => {
	type Statements = {
		organization: readonly ["update", "delete"];
		member: readonly ["create"];
	};
	const canProcedure = createProcedure<BaseCtx, Statements>();

	it("accepts [action, resource] for a granted action", () => {
		canProcedure({
			auth: true,
			org: true,
			can: ["update", "organization"],
		}).handler(() => {});
		canProcedure({
			auth: true,
			org: true,
			can: ["create", "member"],
		}).handler(() => {});
	});

	it("rejects an action not declared for the resource", () => {
		canProcedure({
			auth: true,
			org: true,
			// @ts-expect-error: "delete" is not a declared "member" action
			can: ["delete", "member"],
		});
	});

	it("rejects an unknown resource", () => {
		canProcedure({
			auth: true,
			org: true,
			// @ts-expect-error: "project" is not a declared resource
			can: ["update", "project"],
		});
	});

	it("rejects the reversed [resource, action] order", () => {
		canProcedure({
			auth: true,
			org: true,
			// @ts-expect-error: can is [action, resource], not [resource, action]
			can: ["organization", "update"],
		});
	});

	it("rejects a 3-element tuple -- no conditions argument", () => {
		canProcedure({
			auth: true,
			org: true,
			// @ts-expect-error: can is a 2-tuple; conditions aren't expressible
			can: ["update", "organization", { id: "x" }],
		});
	});

	it("both `can` and `rbac` may be set on the same procedure", () => {
		canProcedure({
			auth: true,
			org: true,
			can: ["update", "organization"],
			rbac: ["member", ["create"]],
		}).handler(() => {});
	});
});

// Type-hole closure: with no statements contributed (`Record<never, never>`,
// `.stack/procedure.ts`'s fallback -- see `node/procedure-codegen.test.ts`),
// both `rbac` and `can` resolve to `never` and become un-settable, instead of
// accepting an arbitrary string that would TypeError at request time.
describe("procedure() can/rbac are un-settable with no contributed statements", () => {
	const noStatementsProcedure = createProcedure<
		BaseCtx,
		Record<never, never>
	>();

	it("rejects any `can` value", () => {
		noStatementsProcedure({
			auth: true,
			org: true,
			// @ts-expect-error: no statements contributed -> Can<...> is never
			can: ["update", "organization"],
		});
	});

	it("rejects any `rbac` value", () => {
		noStatementsProcedure({
			auth: true,
			org: true,
			// @ts-expect-error: no statements contributed -> Rbac<...> is never
			rbac: ["organization", ["update"]],
		});
	});
});
