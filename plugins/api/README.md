# @fcalell/plugin-api

API plugin for the `@fcalell/stack` framework. Wraps Hono + oRPC + Zod so consumers only define procedures. Provides the builder chain, procedure factory, typed RPC client, and event-driven CLI hooks for dev/build/deploy.

**Stack:** Hono + oRPC + Zod (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-api
```

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { db } from "@fcalell/plugin-db";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [
    db({ dialect: "d1", databaseId: "9a619a0b-..." }),
    api({ prefix: "/rpc" }),
  ],
});
```

The `api` plugin has no required dependencies -- it can be used standalone, though most setups pair it with `db` and `auth`. CORS origins are derived from `app.domain` (and the vite dev port, when a frontend plugin is active); override with `app.origins`.

### 2. Worker (generated)

The CLI generates `.stack/worker.ts` automatically. The generated worker uses the builder chain with inlined options:

```ts
// .stack/worker.ts (generated)
import createWorker from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime";
import * as schema from "../src/schema";
import * as routes from "../src/worker/routes";

const worker = createWorker({
  domain: "example.com",
  cors: ["https://example.com", "https://app.example.com"],
})
  .use(dbRuntime({ binding: "DB_MAIN", schema }))
  .handler(routes);

export type AppRouter = typeof worker._router;
export default worker;
```

The builder chain (`createWorker(options).use(plugin).handler(routes)`) accumulates context from each `.use()` call. The final `.handler()` creates a Hono app with CORS, logging, secure headers, and the oRPC handler mounted at the configured prefix.

### 3. Write procedures

```ts
// src/worker/routes/projects.ts
import { z } from "@fcalell/plugin-api/schema";
import { procedure } from "virtual:stack-procedure";

export const projects = {
  list: procedure({ auth: true, org: true, paginated: true })
    .input(z.object({ status: z.enum(["active", "archived"]).optional() }))
    .query(async ({ input, context }) => {
      // context.db, context.user, context.session -- all typed
      // context.organizationId -- injected by org: true
      // input.cursor, input.limit -- injected by paginated: true
    }),

  create: procedure({
    auth: true,
    org: true,
    rbac: ["project", ["create"]],
  })
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, context }) => {
      // RBAC is checked before the handler runs
    }),
};
```

### 4. Procedure configuration

```ts
procedure()                                                    // public, no middleware
procedure({ auth: true })                                      // requires session
procedure({ auth: true, org: true })                           // + validates active organization
procedure({ auth: true, org: true, rbac: ["project", ["create"]] })  // + permission check
procedure({ rateLimit: "ip" })                                 // rate limit by IP
procedure({ rateLimit: "email" })                              // rate limit by input.email
procedure({ rateLimit: ["ip", "email"] })                      // both
procedure({ auth: true, org: true, paginated: true })          // adds cursor/limit to input
```

Dependencies are enforced at the type level:
- `org: true` requires `auth: true`
- `rbac` requires `auth: true` and `org: true`
- `rbac` action names autocomplete against the statements defined in `config.auth.organization.ac`

### 5. Termination: `.query()`, `.mutation()`, `.handler()`

All three are functionally identical -- use `.query()` for reads and `.mutation()` for writes to communicate intent:

```ts
procedure({ auth: true }).input(schema).query(fn)     // read
procedure({ auth: true }).input(schema).mutation(fn)   // write
procedure({ auth: true }).input(schema).handler(fn)    // generic
```

### 6. Custom middleware

Custom middleware returns extra context to merge. TypeScript infers the extension from the return type:

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
  });
```

For reusable middleware, type it with `Middleware<TContextIn, TExtra>`:

```ts
import type { Middleware } from "@fcalell/plugin-api";

const withProject: Middleware<
  { db: DrizzleD1; session: { activeProjectId: string } },
  { project: Project }
> = async ({ context }) => {
  const project = await context.db.query.projects.findFirst({ ... });
  if (!project) throw new ApiError("NOT_FOUND");
  return { project };
};
```

### 7. Client (frontend)

When using `@fcalell/plugin-solid`, a typed client is available as a virtual module:

```ts
import { api } from "virtual:fcalell-api-client";
// api.projects.list({ status: "active" }) -- fully typed
```

For custom configuration:

```ts
import { createClient } from "@fcalell/plugin-api/client";
import type { AppRouter } from "@repo/api";

export const api = createClient<AppRouter>({
  url: "/rpc",       // default
  credentials: "include",  // default
  headers: { "X-Custom": "value" },
});
```

### 8. Errors

```ts
import { ApiError } from "@fcalell/plugin-api";

throw new ApiError("NOT_FOUND", { message: "Project not found" });
throw new ApiError("FORBIDDEN", { message: "Insufficient permissions" });
```

### 9. Router type export

```ts
const worker = createWorker(options).use(...).handler(routes);
export type AppRouter = typeof worker._router;
export default worker;
```

Or use the `InferRouter` utility:

```ts
import type { InferRouter } from "@fcalell/plugin-api";
export type AppRouter = InferRouter<typeof worker>;
```

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prefix` | `string` (must start with `/`) | `"/rpc"` | RPC handler path prefix |

CORS origins and API domain are derived from `app.domain` / `app.origins` (top-level config), not from the plugin options.

## Utilities

### Cursor pagination

```ts
import { encodeCursor, decodeCursor, paginate, clampLimit, DEFAULT_LIMIT, MAX_LIMIT } from "@fcalell/plugin-api/lib/cursor";

const result = await paginate(db.query.projects, {
  where: eq(projects.orgId, orgId),
  orderBy: { column: projects.createdAt, direction: "desc" },
  idColumn: projects.id,
  cursor: input.cursor,
  limit: input.limit,
});
// result: { data: T[], nextCursor: string | null }
```

Limits are clamped to 1--100 (default 20).

### Slugify

```ts
import { slugify, isReservedSlug, createSlugify } from "@fcalell/plugin-api/lib/slugify";

slugify("My Project")     // "my-project"
isReservedSlug("admin")   // true

// Custom reserved list
const { slugify: s, isReserved } = createSlugify(["admin", "api", "system"]);
```

Default reserved slugs: `admin`, `api`, `system`, `auth`, `new`, `settings`.

## Plugin implementation

Built with `createPlugin` from `@fcalell/cli`:

```ts
import { createPlugin } from "@fcalell/cli";
import { Init, Generate, Remove, Dev } from "@fcalell/cli/events";

export const api = createPlugin("api", {
  label: "API",
  schema: apiOptionsSchema,
  register(ctx, bus) {
    bus.on(Init.Scaffold, (p) => { ... });
    bus.on(Generate, (p) => { ... });
    bus.on(Remove, (p) => { ... });
    bus.on(Dev.Start, (p) => { ... });
  },
});
```

### Event handlers

| Event | Behavior |
|-------|----------|
| `Init.Scaffold` | Creates `wrangler.toml`, adds deps (`@fcalell/plugin-api`, `wrangler`), gitignores `.wrangler`, `.stack` |
| `Generate` | Generates `src/worker/routes/index.ts` barrel file from route files |
| `Remove` | Declares `src/worker/routes/` and package deps for cleanup |
| `Dev.Start` | Starts wrangler dev server, watches `src/worker/routes/` for file add/remove to regenerate the barrel (300ms debounce) |

### Runtime

The `./runtime` export provides `createWorker()` for building the worker:

```ts
import createWorker from "@fcalell/plugin-api/runtime";

// Takes plain ApiWorkerOptions -- no config dependency.
// The generated worker passes origins derived from app.domain / app.origins.
createWorker({ domain: "example.com", cors: ["https://example.com"], prefix: "/rpc" })
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-api` | `api()`, `ApiOptions`, `ApiError`, `Middleware`, `InferRouter` |
| `@fcalell/plugin-api/runtime` | `createWorker()`, `AppBuilder`, `WorkerExport`, `ApiWorkerOptions` |
| `@fcalell/cli/runtime` | `RuntimePlugin` |
| `@fcalell/plugin-api/client` | `createClient()`, `RouterClient`, `ClientConfig` |
| `@fcalell/plugin-api/schema` | `z` (Zod re-export), `ZodObject`, `ZodType`, `ZodRawShape` |
| `@fcalell/plugin-api/lib/cursor` | `encodeCursor`, `decodeCursor`, `paginate`, `clampLimit`, constants |
| `@fcalell/plugin-api/lib/slugify` | `slugify`, `isReservedSlug`, `createSlugify` |

## License

MIT
