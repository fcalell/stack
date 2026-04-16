# @fcalell/plugin-api

API plugin for the `@fcalell/stack` framework. Wraps Hono + oRPC + Zod so consumers only define procedures. Provides the builder chain, procedure factory, typed RPC client, and CLI hooks for dev/build/deploy.

**Stack:** Hono + oRPC + Zod (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-api
```

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/config";
import { api } from "@fcalell/plugin-api";
import { db } from "@fcalell/plugin-db";
import * as schema from "./src/schema";

export default defineConfig({
  plugins: [
    db({ dialect: "d1", databaseId: "9a619a0b-...", schema }),
    api({
      cors: ["https://app.example.com"],
      prefix: "/rpc",
    }),
  ],
});
```

The `api` plugin has no required dependencies -- it can be used standalone, though most setups pair it with `db` and `auth`.

### 2. Build the worker

```ts
// src/worker/index.ts
import { createWorker } from "@fcalell/plugin-api/runtime";
import { dbRuntime } from "@fcalell/plugin-db/runtime";
import config from "../../stack.config";
import * as routes from "./routes";

const worker = createWorker(config)
  .use(dbRuntime(getPlugin(config, "db")))
  .handler(routes);

export type AppRouter = typeof worker._router;
export default worker;
```

The builder chain (`createWorker(config).use(plugin).handler(routes)`) accumulates context from each `.use()` call. The final `.handler()` creates a Hono app with CORS, logging, secure headers, and the oRPC handler mounted at the configured prefix.

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

When using `@fcalell/plugin-app`, a typed client is available as a virtual module:

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
const worker = createWorker(config).use(...).handler(routes);
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
| `cors` | `string \| string[]` | -- | CORS allowed origins |
| `prefix` | `` `/${string}` `` | `"/rpc"` | RPC handler path prefix |
| `domain` | `string` | -- | API domain |

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

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-api` | `api()`, `ApiOptions`, `ApiError`, `Middleware`, `InferRouter` |
| `@fcalell/plugin-api/runtime` | `createWorker()`, `RuntimePlugin`, `AppBuilder`, `WorkerExport` |
| `@fcalell/plugin-api/client` | `createClient()`, `RouterClient`, `ClientConfig` |
| `@fcalell/plugin-api/schema` | `z` (Zod re-export), `ZodObject`, `ZodType`, `ZodRawShape` |
| `@fcalell/plugin-api/lib/cursor` | `encodeCursor`, `decodeCursor`, `paginate`, `clampLimit`, constants |
| `@fcalell/plugin-api/lib/slugify` | `slugify`, `isReservedSlug`, `createSlugify` |
| `@fcalell/plugin-api/cli` | CLI plugin (detect, scaffold, dev, build, deploy hooks) |

## For plugin authors / maintainers

### Builder chain internals

`createWorker(config)` reads the `api` plugin options from the config and returns an `AppBuilder`. The builder maintains an ordered list of `UseEntry` items (either `RuntimePlugin` instances or plain functions). On `.handler(routes)`:

1. All plugin entries contribute routes via their `routes()` method
2. Plugin routes are merged with consumer routes (consumer routes take precedence)
3. An oRPC `RPCHandler` is created with request/response header plugins
4. A Hono app is created with logger, secure headers, and optional CORS middleware
5. On each POST to `{prefix}/*`, the builder validates env, builds context by calling each entry in order, and delegates to the oRPC handler
6. Plugin collision detection prevents registering two plugins with the same name

### RuntimePlugin interface

```ts
interface RuntimePlugin<TName, TDeps, TProvides> {
  name: TName;
  validateEnv?(env: unknown): void;
  context(env: unknown, upstream: TDeps): TProvides | Promise<TProvides>;
  routes?(procedure: any): Record<string, Procedure>;
}
```

Plugins can also expose `handlers()` returning `{ scheduled?, queue?, email? }` for non-fetch Cloudflare Worker event handlers.

### CLI plugin hooks

| Hook | Behavior |
|------|----------|
| `detect` | Checks if `"api"` is in the config's plugin list |
| `prompt` | No prompts (returns `{}`) |
| `scaffold` | Creates `src/worker/routes/`, writes `wrangler.toml` (D1 only), adds deps (`@fcalell/plugin-api`, `wrangler`), gitignores `.wrangler`, `.stack` |
| `bindings` | No bindings (returns `[]`) |
| `generate` | Generates `src/worker/routes/index.ts` barrel file from route files |
| `dev` | Starts wrangler dev server, watches `src/worker/routes/` for file add/remove to regenerate the barrel (300ms debounce) |
| `build` | Post-build hook placeholder for wrangler build |
| `deploy` | Deploys the API worker |

### Worker contribution

The plugin contributes runtime, routes, and middleware:

```ts
worker: {
  runtime: {
    importFrom: "@fcalell/plugin-api/runtime",
    factory: "createWorker",
  },
  routes: true,
  middleware: true,
}
```

## License

MIT
