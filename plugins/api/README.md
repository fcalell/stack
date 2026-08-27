# @fcalell/plugin-api

API plugin for the `@fcalell/stack` framework. Wraps Hono + oRPC + Zod so consumers only define procedures. Provides the builder chain, procedure factory, typed RPC client, and slot-driven CLI hooks for dev/build/deploy.

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

The `api` plugin has no required dependencies -- it can be used standalone, though most setups pair it with `db` and `auth`. CORS origins are derived from `app.domain` (and the vite dev port, when a frontend plugin is active); override with `app.origins`. Local origins in an explicit `app.origins` (localhost, 127.0.0.1, `*.localhost`) count as dev origins: they are honoured only under `STACK_DEV` and never reach the deployed allow-list.

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

The CLI also generates `.stack/procedure.ts` -- the `virtual:stack-procedure` target route files import in the next
step, mapped via a `paths` entry in the consumer's `tsconfig.json`. It rebuilds the same `.use()` chain (minus
callbacks/handler) purely so TypeScript can infer the exact request context type -- the const is never exported or
called further:

```ts
// .stack/procedure.ts (generated)
import * as schema from "../src/schema";
import createWorker from "@fcalell/plugin-api/runtime";
import type { AppBuilder } from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime";
import { createProcedure } from "@fcalell/plugin-api/procedure";

const __chain = createWorker({ ... }).use(dbRuntime({ binding: "DB_MAIN", schema }));

type ContextOf<B> = B extends AppBuilder<infer C> ? C : never;
type WorkerContext = ContextOf<typeof __chain>;
type RbacStatements = Record<never, never>; // or auth's contributed statements
type Entity = string; // or a contributed "projects" | "tasks" union

export const procedure = createProcedure<WorkerContext, RbacStatements, Entity>();
```

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
    can: ["create", "project"],
  })
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, context }) => {
      // The org-level permission check runs before the handler.
    }),
};
```

### 4. Procedure configuration

```ts
procedure()                                                    // public, no middleware
procedure({ auth: true })                                      // requires session
procedure({ auth: true, org: true })                           // + validates active organization
procedure({ auth: true, org: true, can: ["create", "project"] })    // + permission check
procedure({ auth: true, org: true, rbac: ["project", ["create"]] }) // same check, resource-first spelling
procedure({ rateLimit: "ip" })                                 // rate limit by IP
procedure({ rateLimit: "email" })                              // rate limit by input.email
procedure({ rateLimit: ["ip", "email"] })                      // both
procedure({ auth: true, org: true, paginated: true })          // adds cursor/limit to input
procedure({ reads: ["projects"] })                             // declares what it reads
procedure({ auth: true, writes: ["projects"] })                // declares what it writes
```

Dependencies are enforced at the type level:
- `org: true` requires `auth: true`
- `rbac`/`can` require `auth: true` and `org: true` -- both are the org-level gate over the same
  statements; `can: [action, resource]` (action first) is the preferred spelling, since it reads the
  same as a handler's `assertCan(ability, action, subject)` and the client's `ability.can(action,
  subject)`. `rbac: [resource, actions[]]` (resource first, multiple actions) stays supported. Both
  may be set on the same procedure; both middlewares run, each performing its own `hasPermission`
  lookup against better-auth -- setting both costs a second permission check for no extra safety, so
  `can` alone is the norm; only set both if you genuinely need both checks to run independently.
  `can`'s tuple is exactly two strings -- conditions aren't expressible, since the org layer is
  unconditional by construction (record-scoped, conditional rules are a handler-side `assertCan`
  concern, see `@fcalell/plugin-auth/ability`).
- `rbac`/`can` action and resource names autocomplete against the statements defined in
  `config.auth.organization.ac`; absent a contributor, both are un-settable (`Record<never, never>`
  -- see "Worker (generated)" above).
- `reads`/`writes` names autocomplete against the entity vocabulary contributed to `api.slots.entities` (a union across every contributing plugin -- `plugin-db` contributes the consumer's Drizzle schema export names, `plugin-auth` contributes its own table names); absent any contributor, both fall back to plain `string`

`reads`/`writes` are available on public, auth-only, and org-scoped configs alike. Declaring them
costs nothing at runtime beyond a response header (below); it's the entity-based cache invalidation
contract consumed by `@fcalell/plugin-api/tanstack-query`'s client interceptor.

#### Cache invalidation headers

A procedure that declares `reads` and/or `writes` gets a response header on success:
`x-stack-reads: projects,tasks` and/or `x-stack-writes: projects`. A thrown error (including a
`rateLimit`/`auth`/`rbac`/`can` failure) never carries either header, so a client never invalidates a
query based on a request that didn't actually touch the entity. Declaring nothing is the default:
the procedure runs exactly as before, no headers, no client-side effect.

```ts
import { STACK_READS_HEADER, STACK_WRITES_HEADER } from "@fcalell/plugin-api/procedure";
```

The two constants are how `@fcalell/plugin-api/tanstack-query`'s client interceptor reads the
headers; a consumer never sets or reads them directly.

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

### 6b. Worker middleware

Two optional conventional files hold plain Hono middleware; both are picked up automatically.

| File | Runs | Sees |
|------|------|------|
| `src/worker/middleware.ts` | after CORS/logging, before the plugin context is built | request only |
| `src/worker/middleware.context.ts` | after the context is built, before any route | `stackContext(c)` |

Put ctx-free guards in the first (they reject before the worker pays for a db client) and anything
needing `db`/`auth` in the second, including the raw Hono routes it registers, which is how a
non-RPC endpoint (a multipart upload, a webhook) reaches the same clients the procedures use. Type
the context with the generated `WorkerContext`, imported type-only:

```ts
// src/worker/middleware.context.ts
import { isForbiddenOrigin, stackContext } from "@fcalell/plugin-api/runtime";
import type { WorkerContext } from "virtual:stack-procedure";
import { createMiddleware } from "hono/factory";

export default createMiddleware(async (c, next) => {
  if (c.req.path === "/photos" && c.req.method === "POST") {
    if (isForbiddenOrigin(c)) return c.json({ code: "FORBIDDEN" }, 403);
    const { db } = stackContext<WorkerContext>(c);
    // ...
  }
  await next();
});
```

`isForbiddenOrigin` is the CSRF guard for those raw routes: the RPC tree gets one for free from its
JSON-content-type check, a multipart upload does not. It refuses a request whose browser `Origin` is
off the CORS allow-list, and passes one with no `Origin` at all (a browser cannot forge that
cross-site; the native client sends none).

### 7. Client (frontend)

`createClient` from `@fcalell/plugin-api/client` is the canonical way to build a typed client, on web and native alike:

```ts
import { createClient } from "@fcalell/plugin-api/client";
import type { AppRouter } from "@repo/api";

export const api = createClient<AppRouter>({
  url: "/rpc",       // default
  credentials: "include",  // default
  headers: { "X-Custom": "value" },
});
```

For native (React Native / Expo), `@fcalell/plugin-api/tanstack-query` pairs the
client with TanStack Query 5 (via `@orpc/tanstack-query`). It is runtime-only --
no plugin contributions; the provider is wired into the generated entry by
`@fcalell/plugin-native-ui` (which contributes it to `plugin-expo.slots.providers`):

```tsx
import { createClient } from "@fcalell/plugin-api/client";
import {
  createApiQueryUtils,
  QueryProvider,
  useQuery,
} from "@fcalell/plugin-api/tanstack-query";
import type { AppRouter } from "@repo/api";

const client = createClient<AppRouter>({ url: process.env.EXPO_PUBLIC_API_URL });
export const orpc = createApiQueryUtils(client);

// Wrap the app with <QueryProvider>; in a screen:
//   const { data } = useQuery(orpc.projects.list.queryOptions({ input: {} }));
```

`@fcalell/plugin-solid-ui`'s `createApp` wires the same pattern for web with `@tanstack/solid-query`.

#### Automatic cache invalidation (WS3.3)

`createClient` records each response's `x-stack-reads` / `x-stack-writes` headers (above), keyed by
the procedure's path. `createQueryClient` (native) and `plugin-solid-ui`'s `createApp` (web) install
a `MutationCache` that invalidates every cached query whose recorded reads intersect a succeeding
mutation's recorded writes -- zero per-callsite client code:

```ts
// Server
list: procedure({ reads: ["todos"] }).query(...)
create: procedure({ writes: ["todos"] }).mutation(...)

// Client: no invalidation code needed -- a successful `create` invalidates `list` automatically
```

A query with no `reads` never auto-invalidates; declaring `reads`/`writes` is the recommended
pattern for any procedure with cross-feature cache dependencies. A mutation opts out with
`meta: { skipAutoInvalidation: true }` on its `useMutation` options -- the correct choice when the
mutation already updates the cache itself (optimistic updates, `setQueryData` in `onSuccess`).
`plugin-solid-ui`'s `useMutation` (`@fcalell/plugin-solid-ui/lib/query`) stamps this automatically
for mutations that declare `updates`.

Supplying a custom `mutationCache` (native) or `queryClient` (web) to `createQueryClient` /
`createApp` opts out of auto-invalidation entirely -- the caller owns invalidation then.

#### Record-scoped abilities: `useAbility` (WS6.3)

`useAbility` gives every screen org-level authorization for free -- no server call to write, no
config:

```tsx
import { useAbility } from "@fcalell/plugin-api/tanstack-query";

function DeleteOrgButton() {
  const ability = useAbility();
  return ability.can("delete", "organization") ? <Button>Delete</Button> : null;
}
```

It fetches the caller's compiled org rules once per session (`staleTime: Infinity`) from the
framework-owned org-rules route and turns them into a CASL `MongoAbility`. **Deny-all** while that
fetch is loading or the caller has no active organization -- `ability.can(...)` returns `false`
until real rules arrive, never a false positive.

Layer record-scoped rules (a consumer procedure that returns `packAbility(ability)` alongside its
data, `@fcalell/plugin-auth/ability`) by passing the packed rules field through:

```tsx
import { subject } from "@fcalell/plugin-auth/ability";

const { data: expense } = useQuery(orpc.expenses.get.queryOptions({ input: { id } }));
const ability = useAbility(expense?.rules);

ability.can("update", subject("Expense", expense)); // instance-scoped check
ability.can("update", "organization"); // org-level check, same instance
```

Org and record rules concatenate into one ability; their subjects never collide by construction
(org subjects are the framework's lowercase resource names -- `"organization"`, `"member"`,
`"invitation"`; record subjects are consumer domain types).

**Never read the `MongoAbility` instance out of a query cache.** It's a class instance -- selecting
it from `queryClient.getQueryData(...)` defeats structural sharing and reconstructs a new instance
every render. `useAbility` already memoizes on the underlying rules arrays' identity, so calling it
repeatedly with the same data is free.

An active-org switch or a role change invalidates the org layer: `queryClient.invalidateQueries({
queryKey: ORG_RULES_QUERY_KEY })`. A mutation that declares `writes` on an org subject (e.g.
`writes: ["member"]` on a role-change mutation) invalidates it automatically, same as any other
`reads`/`writes`-declared query.

`@fcalell/plugin-solid-ui/lib/ability` ships the same primitive for web, accessor-style:
`const ability = useAbility(() => recordRules()); ability().can(...)`.

### 8. Errors

```ts
import { ApiError } from "@fcalell/plugin-api/error";

throw new ApiError("NOT_FOUND", { message: "Project not found" });
throw new ApiError("FORBIDDEN", { message: "Insufficient permissions" });
```

Import from `@fcalell/plugin-api/error`, not the package root -- a route file (bundled straight into the
worker) pulling in the root export would drag in the plugin's Node-only codegen graph. `ApiError` is
also re-exported from `@fcalell/plugin-api` for non-worker (config-side) code.

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

## Migration notes

The response headers that carry cache invalidation are `x-stack-reads` and `x-stack-writes`
(`STACK_READS_HEADER` / `STACK_WRITES_HEADER`). A worker replacing hand-rolled code whose deployed
clients parse different names mirrors them in `src/worker/middleware.ts`, no framework option
needed:

```ts
// src/worker/middleware.ts
import {
  STACK_READS_HEADER,
  STACK_WRITES_HEADER,
} from "@fcalell/plugin-api/procedure";
import { createMiddleware } from "hono/factory";

const LEGACY: Record<string, string> = {
  [STACK_READS_HEADER]: "x-sw-reads",
  [STACK_WRITES_HEADER]: "x-sw-writes",
};

export default createMiddleware(async (c, next) => {
  await next();
  for (const [current, legacy] of Object.entries(LEGACY)) {
    const value = c.res.headers.get(current);
    if (value) c.header(legacy, value);
  }
});
```

Both names then go out on every response, so clients already in the field keep invalidating while
the new release rolls out. Delete the file once those builds are gone.

Request headers do not work the same way. `plugin-expo`'s version gate reads
`x-stack-client-build` and `x-stack-client-platform` only, and a build stamping other names is
invisible to it, which means it fails open and is never walled. Ship a client release that stamps
the current names before raising a floor; every build older than that release stays un-wallable.

## Plugin implementation

Built with `plugin` from `@fcalell/cli`. Owns every fragment of `.stack/worker.ts` as a slot; peer plugins (`db`, `auth`, `vite`, …) contribute via the typed slot tokens below.

```ts
import { plugin, slot } from "@fcalell/cli";
import { emitArtifact } from "@fcalell/cli/cli-slots";

export const api = plugin("api", {
  label: "API",
  schema: apiOptionsSchema,
  dependencies: { "@fcalell/plugin-api": "workspace:*" },
  devDependencies: { wrangler: "^4.14.0" },
  gitignore: [".wrangler", ".stack"],
  slots: { workerImports, pluginRuntimes, /* ... */ workerSource },
  contributes: (self) => [
    emitArtifact(".stack/worker.ts", self.slots.workerSource),
    // route barrel, dev process, route watcher, deploy step, remove cleanup …
  ],
});
```

### Owned slots

| Slot | Kind | Purpose |
|------|------|---------|
| `api.slots.workerImports` | `list<TsImportSpec>` | Imports for `.stack/worker.ts` |
| `api.slots.pluginRuntimes` | `list<PluginRuntimeEntry>` | `.use(xRuntime({...}))` entries; `db` and `auth` push here |
| `api.slots.middlewareEntries` | `list<MiddlewareSpec>` | Hono middleware (phase-ordered); `after-context` mounts after context injection, every other phase before |
| `api.slots.middlewareCalls` | `derived<MiddlewareCall[]>` | Sorted calls from `middlewareEntries`, each with the method that mounts it (`use` / `useAfterContext`) |
| `api.slots.middlewareImports` | `derived<TsImportSpec[]>` | Deduplicated middleware imports |
| `api.slots.routesHandler` | `value<{ identifier } \| null>` | Routes namespace identifier (seeded from `src/worker/routes` existence) |
| `api.slots.corsOrigins` | `list<string>` | Extra production origins |
| `api.slots.devCorsOrigins` | `list<string>` | Dev-server origins (frontend plugins push localhost here); applied only under `STACK_DEV` |
| `api.slots.routePrefixes` | `list<string>` | URL prefixes the worker owns (api pushes its `prefix`, auth its `/api/auth`); deploy targets read this to mount or forward worker paths |
| `api.slots.cors` | `derived<string[]>` | Final production CORS list: `app.origins` minus local origins, or `[https://domain, https://app.domain, ...corsOrigins]` |
| `api.slots.callbacks` | `map<string, CallbackSpec>` | Plugin-name → callback identifier; spliced onto matching runtime |
| `api.slots.workerBase` | `derived<TsExpression>` | The `createWorker({...})` call expression |
| `api.slots.workerSource` | `derived<string \| null>` | Final `.stack/worker.ts` source; null when no runtimes are present |
| `api.slots.rbacStatements` | `value<Record<string, readonly string[]> \| null>` (`override`) | RBAC action statements for `procedure({ rbac })` / `procedure({ can })`'s type-level autocomplete; `auth` contributes from `organization.ac.statements` |
| `api.slots.entities` | `list<string>` | Entity vocabulary for `procedure({ reads, writes })`'s type-level autocomplete (sorted, deduplicated union); `db` contributes the consumer's Drizzle schema export names, `auth` contributes its own table names |
| `api.slots.procedureSource` | `derived<string \| null>` | Final `.stack/procedure.ts` source (`virtual:stack-procedure`'s target); null when no runtimes are present |

### Lifecycle contributions

| `cliSlots` slot | Behavior |
|-----------------|----------|
| `initScaffolds` | Wrangler.toml + base routes scaffold |
| `artifactFiles` | Writes `.stack/worker.ts` and `.stack/procedure.ts` (when any runtime is present) and `src/worker/routes/index.ts` barrel |
| `devProcesses` | Spawns `wrangler dev` (port 8787) |
| `devWatchers` | Watches `src/worker/routes/**` and regenerates the barrel on add/unlink |
| `deploySteps` | `wrangler deploy --config .stack/wrangler.toml` |
| `removeFiles` | `src/worker/routes/` |

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
| `@fcalell/plugin-api/runtime` | `createWorker()`, `AppBuilder`, `WorkerExport`, `ApiWorkerOptions`, `stackContext()`, `isForbiddenOrigin()` |
| `@fcalell/plugin-api/procedure` | `createProcedure()`, `Middleware`, `ProcedureConfig`, `STACK_READS_HEADER`, `STACK_WRITES_HEADER` -- what the generated `.stack/procedure.ts` (`virtual:stack-procedure`) imports |
| `@fcalell/plugin-api/error` | `ApiError` -- worker-safe (no Node-only deps); import this from route files |
| `@fcalell/cli/runtime` | `RuntimePlugin` |
| `@fcalell/plugin-api/client` | `createClient()`, `RouterClient`, `ClientConfig` |
| `@fcalell/plugin-api/tanstack-query` | `createQueryClient()`, `createApiQueryUtils()`, `QueryProvider`, `useAbility()`, `ORG_RULES_QUERY_KEY`, query hooks -- native TanStack Query client (runtime-only) |
| `@fcalell/plugin-api/query-invalidation` | `captureEntityHeaders()`, `invalidateForWrites()`, `handleMutationSuccess()`, `createEntityRegistry()` -- framework-agnostic auto-invalidation core (runtime-only) |
| `@fcalell/plugin-api/ability-client` | `composeAbility()`, `fetchOrgRules()`, `registerApiClient()`, `ORG_RULES_QUERY_KEY`, `PackedRulesLike` -- framework-agnostic `useAbility()` core (runtime-only), consumed by `./tanstack-query` and `@fcalell/plugin-solid-ui/lib/ability` |
| `@fcalell/plugin-api/schema` | `z` (Zod re-export), `ZodObject`, `ZodType`, `ZodRawShape` |
| `@fcalell/plugin-api/lib/cursor` | `encodeCursor`, `decodeCursor`, `paginate`, `clampLimit`, constants |
| `@fcalell/plugin-api/lib/slugify` | `slugify`, `isReservedSlug`, `createSlugify` |

## License

MIT
