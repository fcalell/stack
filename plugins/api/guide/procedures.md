# Procedures

A procedure is one typed endpoint. Route files live flat in `src/worker/routes/` (a
subdirectory is ignored); each named export is an object of procedures, and the generated
barrel merges every file's exports into the router.

```ts
// src/worker/routes/projects.ts
import { ApiError } from "@fcalell/plugin-api/error";
import { z } from "@fcalell/plugin-api/schema";
import { organization } from "@fcalell/plugin-auth/scope";
import { procedure } from "virtual:stack-procedure";

export const projects = {
  list: procedure({ auth: true, scope: organization, paginated: true, reads: ["projects"] })
    .input(z.object({ status: z.enum(["active", "archived"]).optional() }))
    .query(async ({ input, context }) => {
      // context.db, context.user, context.session, context.organization, context.member
      // input.organizationId (the scope), input.cursor and input.limit (paginated)
    }),

  create: procedure({ auth: true, scope: organization, can: ["create", "project"], writes: ["projects"] })
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input, context }) => {
      if (input.name === "admin") throw new ApiError("BAD_REQUEST", { message: "Reserved name" });
    }),
};
```

## Rules

- Import `procedure` from `virtual:stack-procedure`, `z` from `@fcalell/plugin-api/schema`, and
  `ApiError` from `@fcalell/plugin-api/error`, never the package root: a route file is bundled
  into the worker, and the root drags in the plugin's Node-only codegen.
- A procedure with a `scope` or `paginated` takes an object input schema (`z.object(...)`); any
  other schema throws when the route loads.
- Use `.query()` for a read and `.mutation()` for a write. They run identically with
  `.handler()`; the name carries intent.
- Declare `reads` on every query and `writes` on every mutation that touches an entity. The client
  invalidates caches from them, and a procedure that declares nothing invalidates nothing.
- Prefer `can: [action, resource]` to `rbac: [resource, actions[]]`; both check the same thing,
  and both run when both are set.
- Never read the session's active organization: a scope's id arrives in the input.

## Options

| Option | Effect |
| --- | --- |
| none | Public, no middleware |
| `auth: true` | Requires a session |
| `scope` | Requires `auth: true`. A scope from `@fcalell/plugin-auth/scope` (`organization`, or one declared with `defineScope`): the input gains `<name>Id`, and the row, every level above it and the caller's `member` row of the organization are loaded into the context. A missing row and a non-member both answer `NOT_FOUND` |
| `can` / `rbac` | Require `auth: true` and a `scope`. Check the caller's role in the scope's organization against the roles the auth config declares. Names autocomplete from `auth({ organization: { ac } })`; with no organization they cannot be set |
| `rateLimit` | `"ip"`, `"email"` (keyed by `input.email`) or both |
| `paginated: true` | Adds `cursor` and `limit` to the input; `limit` defaults to 20 and a value outside 1 to 100 answers `BAD_REQUEST` |
| `reads` / `writes` | The entities the procedure reads or writes, autocompleting from the Drizzle schema's exports and auth's tables. On success the response carries `x-stack-reads` / `x-stack-writes`; a thrown error carries neither |

## Input and output

One schema types two sides: the caller sends `z.input` and the handler reads `z.output`. A
`.default()` field is optional for the caller and present in the handler; a `.transform()` field
takes the value before the transform and hands over the value after it. `.output(schema)`
mirrors it: the handler returns the schema's input, and the caller receives its output.

## Middleware on one procedure

`.use()` returns extra context, typed from its return value. Type a reusable one with
`Middleware<TContextIn, TExtra>` from `@fcalell/plugin-api`:

```ts
procedure({ auth: true })
  .use(async ({ context }) => {
    const project = await findProject(context.db, context.session);
    if (!project) throw new ApiError("NOT_FOUND");
    return { project };
  })
  .query(({ context }) => context.project);
```

**Check:** `pnpm check` passes.
