# @fcalell/api

API framework for Cloudflare Workers. Wraps Hono + oRPC so consumers only define procedures.

**Stack:** Hono + oRPC + Zod (all internal — consumers don't import them)

## Exports

| Export | Purpose |
|--------|---------|
| `@fcalell/api` | `defineApp`, `ApiError`, `Middleware`, `InferRouter` |
| `@fcalell/api/client` | `createClient`, `RouterClient` — typed RPC client for frontend |
| `@fcalell/api/schema` | `z` — Zod re-export (consumers never install zod directly) |
| `@fcalell/api/lib/cursor` | `encodeCursor`, `decodeCursor`, `paginate`, pagination constants |
| `@fcalell/api/lib/slugify` | `slugify`, `isReservedSlug`, `createSlugify` |

## Usage

### 1. Define the app

```ts
import { defineApp } from "@fcalell/api";
import config from "../../stack.config";

const app = defineApp({
  config,
  env: (env: Env) => ({
    db: env.DB_MAIN,
    auth: {
      secret: env.AUTH_SECRET,
      appURL: env.APP_URL,
    },
    rateLimiter: {
      ip: env.RATE_LIMITER_IP,
      email: env.RATE_LIMITER_EMAIL,
    },
  }),
  sendOTP: async ({ email, otp, env }) => {
    await env.RESEND.emails.send({ to: email, subject: "Your code", text: otp });
  },
  sendInvitation: async ({ email, organization, env }) => {
    await env.RESEND.emails.send({ to: email, subject: `Join ${organization.name}` });
  },
});

export const procedure = app.procedure;
```

`defineApp` reads the database schema, auth policy, CORS origins, and RBAC statements directly from `config` — no separate imports needed. Runtime secrets and email callbacks are the only things configured here.

### 2. Write procedures (only business logic)

Call `procedure()` with a config object describing what the procedure needs. All middleware (auth, org, rbac, rate limit, pagination) is configured in one place — invalid combinations are caught at the type level.

```ts
import { z } from "@fcalell/api/schema";

export const projects = {
  list: procedure({ auth: true, org: true, paginated: true })
    .input(z.object({ status: z.enum(["active", "archived"]).optional() }))
    .query(async ({ input, context }) => {
      // context.db, context.auth, context.env — all typed
      // context.organizationId — injected by org: true
      // input.cursor, input.limit — injected by paginated: true
      // input.organizationId — also merged into the schema, enforced by types
      return paginate(context.db.query.projects, {
        where: eq(projects.orgId, context.organizationId),
        orderBy: { column: projects.createdAt, direction: "desc" },
        idColumn: projects.id,
        cursor: input.cursor,
        limit: input.limit,
      });
    }),

  create: procedure({
    auth: true,
    org: true,
    rbac: ["project", ["create"]],
  })
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, context }) => {
      return context.db.insert(projects).values({
        name: input.name,
        organizationId: context.organizationId,
      }).returning();
    }),
};
```

### 3. Export the worker

```ts
const api = app.handler(routes);
export type AppRouter = typeof api._router;
export default api;
```

Auth routes are auto-included when `config.auth` is present. No manual `{ auth: app.authRouter }` wiring needed.

### 4. Client (frontend)

When using `@fcalell/vite`, a typed client is available as a virtual module — no setup file needed:

```ts
import { api } from "virtual:fcalell-api-client";
// api.projects.list({ status: "active" }) → fully typed
// api.auth.getSession() → fully typed
// api.auth.sendOtp({ email: "..." }) → fully typed
```

For custom configuration, create the client manually:

```ts
import { createClient } from "@fcalell/api/client";
import type { AppRouter } from "@repo/api";

export const api = createClient<AppRouter>({ url: "/custom" });
```

The client defaults to `/rpc` — matching the server's default prefix.

## What `defineApp` handles automatically

- Creates the Drizzle D1 client from `env` callback's `db` binding
- Creates the Better Auth instance (when `config.auth` + `env.auth` provided)
- Derives RBAC statements from the access control in `config.auth.organization.ac`
- Reads CORS origins and RPC prefix from `config.api`
- Injects request/response headers for auth/RBAC/rate-limit middleware
- Provides a typed `procedure` builder with RBAC autocomplete
- Passes rate limiter bindings to middleware (actual bindings, not string names)
- Auto-generates and includes auth procedures in the router
- Throws at request time if `config.auth` exists but `env.auth` is missing

## `defineApp` config

```ts
defineApp({
  config: StackConfig,                 // from stack.config.ts — includes db, auth, api sections
  env: (env) => ({
    db: D1Database,                    // actual D1 binding
    auth?: {                           // auth runtime secrets (required when config.auth exists)
      secret: string,
      appURL?: string,                 // defaults to first CORS origin
      trustedOrigins?: string[],       // defaults to [appURL]
    },
    rateLimiter?: {
      ip?: RateLimitBinding,           // actual Cloudflare rate limiter binding
      email?: RateLimitBinding,
    },
    devMode?: boolean,                 // skip rate limiting in development
  }),
  sendOTP?: (data) => Promise<void>,   // email OTP callback (receives env)
  sendInvitation?: (data) => Promise<void>,  // org invitation callback (receives env)
})
```

Returns `{ procedure, handler }`:
- `procedure` — a factory: call `procedure(config?)` with an options object, then chain `.use()`, `.input()`, `.query()`, `.mutation()`, or `.handler()` on the result
- `handler(routes)` — returns a Hono app with auto-included auth routes (Cloudflare Worker default export)

## Auth-less mode

`auth` is optional. For APIs that don't need authentication:

```ts
const app = defineApp({
  config,  // config without auth section
  env: (env: Env) => ({ db: env.DB_MAIN }),
});
// No auth routes are generated
```

## Procedure configuration

```ts
procedure()                                         // public, no middleware
procedure({ auth: true })                           // requires session → adds user/session to context
procedure({ auth: true, org: true })                // + validates active organization → adds context.organizationId
procedure({ auth: true, org: true, rbac: ["project", ["create"]] })  // + permission check
procedure({ rateLimit: "ip" })                      // rate limit by IP
procedure({ rateLimit: "email" })                   // rate limit by input.email
procedure({ rateLimit: ["ip", "email"] })           // both
procedure({ auth: true, org: true, paginated: true })  // adds cursor/limit/organizationId to input
```

Dependencies are enforced at the type level:
- `org: true` requires `auth: true`
- `rbac` requires `auth: true` and `org: true`
- `rbac` action names autocomplete against the statements defined in `config.auth.organization.ac`

Passing an invalid combination (e.g. `{ rbac: [...] }` without `auth` and `org`) is a compile error.

### Procedure termination: `.query()`, `.mutation()`, `.handler()`

All three are functionally identical — use `.query()` for reads and `.mutation()` for writes to communicate intent:

```ts
procedure({ auth: true }).input(schema).query(fn)     // read operation
procedure({ auth: true }).input(schema).mutation(fn)  // write operation
procedure({ auth: true }).input(schema).handler(fn)   // generic (either)
```

### `org: true`

Validates the request against the session's active organization:
- Auto-merges `organizationId: string` into the procedure's input schema — the client MUST pass it, and it's type-enforced
- Validates the passed `organizationId` matches `session.activeOrganizationId`
- Adds `context.organizationId: string` (guaranteed non-null after the check)

### `paginated: true`

Adds cursor-based pagination to a procedure:
- Merges `cursor?: string` and `limit?: number` (clamped 1–100, default 20) into the input
- Clamps the limit automatically before the handler runs
- Use with the `paginate()` query helper from `@fcalell/api/lib/cursor`

### `rateLimit`

Applies a rate limiter binding configured via `env.rateLimiter`:
- `"ip"` — reads the `CF-Connecting-IP` header
- `"email"` — reads `input.email` (procedure must declare it via `.input()`)
- Array form — applies multiple limiters in order

## Auto-generated auth router

When `config.auth` is present, the following procedures are auto-included under `auth.*`:

| Procedure | Condition | What it does |
|-----------|-----------|------|
| `getSession` | Always | Returns sanitized user + session (no sensitive fields) |
| `signOut` | Always | Revokes session, forwards cookies |
| `updateUser` | Always | Accepts `name` + all user `additionalFields` from config |
| `sendOtp` | `sendOTP` callback provided | Rate-limited, timing-safe error masking |
| `verifyOtp` | `sendOTP` callback provided | Rate-limited, forwards session cookies |
| `setActiveOrganization` | organization enabled | Sets active org, forwards cookies |

## Router type export

The `handler()` return is branded with `_router` for type inference:

```ts
const api = app.handler({ projects, teams });
export type AppRouter = typeof api._router;
export default api;
```

Or use the `InferRouter` utility:

```ts
import { defineApp, type InferRouter } from "@fcalell/api";

const api = app.handler({ projects, teams });
export type AppRouter = InferRouter<typeof api>;
export default api;
```

## Custom middleware

Custom middleware returns the extra context to merge into the procedure. TypeScript infers the extension from the return type — no generic parameter needed.

```ts
procedure({ auth: true })
  .use(async ({ context }) => {
    const project = await context.db.query.projects.findFirst({
      where: eq(projects.id, context.session.activeProjectId),
    });
    if (!project) throw new ApiError("NOT_FOUND");
    return { project };
  })
  .input(schema)
  .query(({ context }) => {
    // context.project is fully typed
    return context.project;
  });
```

For reusable middleware, type it with `Middleware<TContextIn, TExtra>`:

```ts
import type { Middleware } from "@fcalell/api";

const withProject: Middleware<
  { db: DrizzleD1; session: { activeProjectId: string } },
  { project: Project }
> = async ({ context }) => {
  const project = await context.db.query.projects.findFirst({ ... });
  if (!project) throw new ApiError("NOT_FOUND");
  return { project };
};
```

## Errors

```ts
import { ApiError } from "@fcalell/api";
throw new ApiError("NOT_FOUND", { message: "Project not found" });
throw new ApiError("FORBIDDEN", { message: "Insufficient permissions" });
```

## Conventions

- Consumers never import `@orpc/*`, `hono`, `zod`, or `drizzle-orm` — the stack wraps everything
- `defineApp` receives the unified `stack.config.ts` — no manual context wiring
- `stack.config.ts` is the single source of truth for schema, auth policy, CORS, and prefix
- Runtime secrets and callbacks are configured in `defineApp()` — not in config
- All runtime bindings provided via `env` callback — no magic binding name strings
- `.query()` for reads, `.mutation()` for writes, `.handler()` for either
- Auth routes are auto-included — no manual router assembly
- `createClient()` defaults to `/rpc` — zero config for the common case
- Cloudflare Workers compatible — no Node.js APIs
