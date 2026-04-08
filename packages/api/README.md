# @fcalell/api

API framework for Cloudflare Workers. Wraps Hono + oRPC so consumers only define procedures.

**Stack:** Hono + oRPC + Zod (all internal — consumers don't import them)

## Exports

| Export | Purpose |
|--------|---------|
| `@fcalell/api` | `defineApp`, `ApiError`, `Middleware`, `InferRouter` |
| `@fcalell/api/client` | `createClient` — typed RPC client for frontend |
| `@fcalell/api/schema` | `z` — Zod re-export (consumers never install zod directly) |
| `@fcalell/api/lib/cursor` | `encodeCursor`, `decodeCursor`, `paginate`, pagination constants |
| `@fcalell/api/lib/slugify` | `slugify`, `isReservedSlug`, `createSlugify` |

## Usage

### 1. Define the app

```ts
import { defineApp } from "@fcalell/api";
import dbConfig from "../../db/db.config";

const app = defineApp({
  db: dbConfig,
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
  cors: ["https://app.example.com"],
});

export const procedure = app.procedure;
```

`defineApp` reads the database schema and RBAC statements directly from `dbConfig` — no separate `schema` or `statements` import needed. Runtime secrets and email callbacks are configured here — not in `defineAuth()`.

### 2. Write procedures (only business logic)

```ts
import { z } from "@fcalell/api/schema";

export const projects = {
  list: procedure
    .auth()
    .orgScoped()
    .paginated()
    .input(z.object({ status: z.enum(["active", "archived"]).optional() }))
    .query(async ({ input, context }) => {
      // context.db, context.auth, context.env — all typed
      // context.organizationId — injected by orgScoped()
      // input.cursor, input.limit — injected by paginated()
      return paginate(context.db.query.projects, {
        where: eq(projects.orgId, context.organizationId),
        orderBy: { column: projects.createdAt, direction: "desc" },
        idColumn: projects.id,
        cursor: input.cursor,
        limit: input.limit,
      });
    }),

  create: procedure
    .auth()
    .orgScoped()
    .rbac("project", ["create"])
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, context }) => {
      return context.db.insert(projects).values({
        ...input,
        organizationId: context.organizationId,
      }).returning();
    }),
};
```

### 3. Export the worker

```ts
const api = app.handler({ projects });
export type AppRouter = typeof api._router;
export default api;
```

Auth routes are auto-included when `dbConfig.auth` is configured. No manual `{ auth: app.authRouter }` wiring needed.

### 4. Client (frontend)

```ts
import { createClient } from "@fcalell/api/client";
import type { AppRouter } from "@repo/api";

export const api = createClient<AppRouter>();
// api.projects.list({ status: "active" }) → fully typed
// api.auth.getSession() → fully typed
// api.auth.sendOtp({ email: "..." }) → fully typed
```

The client defaults to `/rpc` — matching the server's default prefix. Pass `{ url: "/custom" }` to override.

## What `defineApp` handles automatically

- Creates the Drizzle D1 client from `env` callback's `db` binding
- Creates the Better Auth instance (when `dbConfig.auth` + `env.auth` provided)
- Derives RBAC statements from the access control in `dbConfig.auth.organization.ac`
- Injects request/response headers for auth/RBAC/rate-limit middleware
- Provides a typed `procedure` builder with RBAC autocomplete
- Passes rate limiter bindings to middleware (actual bindings, not string names)
- Applies CORS config
- Auto-generates and includes auth procedures in the router
- Throws at request time if `dbConfig.auth` exists but `env.auth` is missing

## `defineApp` config

```ts
defineApp({
  db: DatabaseConfig,                  // from defineDatabase() — includes schema module + auth policy
  env: (env) => ({
    db: D1Database,                    // actual D1 binding
    auth?: {                           // auth runtime secrets (required when dbConfig.auth exists)
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
  cors?: CorsOrigin,
  prefix?: `/${string}`,               // RPC endpoint prefix (default: /rpc)
  sendOTP?: (data) => Promise<void>,   // email OTP callback (receives env)
  sendInvitation?: (data) => Promise<void>,  // org invitation callback (receives env)
})
```

Returns `{ procedure, handler }`:
- `procedure` — chainable builder: `.auth()`, `.orgScoped()`, `.rbac()`, `.rateLimit()`, `.paginated()`, `.use()`, `.input()`, `.query()`, `.mutation()`, `.handler()`
- `handler(routes)` — returns a Hono app with auto-included auth routes (Cloudflare Worker default export)

## Auth-less mode

`auth` is optional. For APIs that don't need authentication:

```ts
const app = defineApp({
  db: dbConfig,
  env: (env: Env) => ({ db: env.DB_MAIN }),
  cors: ["https://app.example.com"],
});
// No auth routes are generated
```

## Procedure builder chain

```ts
procedure                                        // public, no auth
procedure.auth()                                 // requires session → adds user/session to context
procedure.auth().orgScoped()                     // validates organizationId, adds to context
procedure.auth().orgScoped().rbac("project", ["create"])  // permission check
procedure.rateLimit("ip")                        // rate limiting via binding
procedure.rateLimit("email")                     // email-based rate limiting
procedure.auth().orgScoped().paginated()         // adds cursor/limit to input
procedure.use(customMiddleware)                  // custom middleware
```

### Procedure termination: `.query()`, `.mutation()`, `.handler()`

All three are functionally identical — use `.query()` for reads and `.mutation()` for writes to communicate intent:

```ts
procedure.auth().input(schema).query(fn)     // read operation
procedure.auth().input(schema).mutation(fn)  // write operation
procedure.auth().input(schema).handler(fn)   // generic (either)
```

### orgScoped()

Auto-injects `organizationId` into the procedure:
- Reads `organizationId` from the raw input
- Validates it matches `session.activeOrganizationId`
- Adds `context.organizationId` (typed as `string`)
- Consumer's `.input()` schema does NOT need to include `organizationId`

### paginated()

Adds cursor-based pagination to a procedure:
- Merges `cursor?: string` and `limit?: number` (clamped 1–100, default 20) into input
- Use with the `paginate()` query helper from `@fcalell/api/lib/cursor`

## Auto-generated auth router

When `dbConfig.auth` is configured, the following procedures are auto-included under `auth.*`:

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

```ts
import type { Middleware } from "@fcalell/api";

const withProject: Middleware<
  { db: DrizzleD1; session: { activeProjectId: string } },
  { project: Project }
> = async ({ context, input, next }) => {
  const project = await context.db.query.projects.findFirst({ ... });
  if (!project) throw new ApiError("NOT_FOUND");
  return next({ project });
};

procedure.auth().use(withProject).input(schema).query(fn);
```

## Errors

```ts
import { ApiError } from "@fcalell/api";
throw new ApiError("NOT_FOUND", { message: "Project not found" });
throw new ApiError("FORBIDDEN", { message: "Insufficient permissions" });
```

## Conventions

- Consumers never import `@orpc/*`, `hono`, `zod`, or `drizzle-orm` — the stack wraps everything
- `defineApp` is the single entry point — no manual context wiring
- Database config (`defineDatabase()`) is the single source of truth for schema and auth policy
- Runtime secrets and callbacks are configured in `defineApp()` — not in `defineAuth()`
- All runtime bindings provided via `env` callback — no magic binding name strings
- `.query()` for reads, `.mutation()` for writes, `.handler()` for either
- Auth routes are auto-included — no manual router assembly
- `createClient()` defaults to `/rpc` — zero config for the common case
- Cloudflare Workers compatible — no Node.js APIs
