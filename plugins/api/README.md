# @fcalell/plugin-api

API plugin for the `@fcalell/stack` framework. Wraps Hono + oRPC + Zod so consumers only define procedures. Provides the builder chain, procedure factory, typed RPC client, and slot-driven CLI hooks for dev/build/deploy.

**Stack:** Hono + oRPC + Zod (all internal -- consumers don't import them)

## Install

```bash
pnpm add @fcalell/plugin-api
```

## Guide

Writing procedures, worker middleware, the client, tests, options, pagination and slugs lives in
`guide/`, indexed into a consumer's `.stack/guide.md`:
[`add-a-procedure.md`](./guide/add-a-procedure.md), [`procedures.md`](./guide/procedures.md),
[`middleware.md`](./guide/middleware.md), [`client.md`](./guide/client.md),
[`testing.md`](./guide/testing.md), [`config.md`](./guide/config.md) and
[`utilities.md`](./guide/utilities.md).

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
| `api.slots.devCorsOrigins` | `list<string>` | Frontend dev origins (vite and expo push their localhost here, api the local entries of `app.origins`); applied only under `STACK_DEV` |
| `api.slots.devTargetOrigins` | `list<string>` | Deploy-target dev origins (node and cloudflare push their dev process's localhost here); baked after `devCorsOrigins` as `createWorker({ devCors })`, applied only under `STACK_DEV` |
| `api.slots.routePrefixes` | `list<string>` | URL prefixes the worker owns (api pushes its `prefix`, auth its `/api/auth`); deploy targets read this to mount or forward worker paths |
| `api.slots.localOrigins` | `value<"dev" \| "deployed">` | Whether the local origins of `app.origins` are dev origins or the deployed list; a local deploy target (node on loopback) sets `deployed` |
| `api.slots.cors` | `derived<string[]>` | Final production CORS list: `app.origins` minus local origins (kept under `localOrigins: deployed`), or `[https://domain, https://app.domain, ...corsOrigins]` |
| `api.slots.callbacks` | `map<string, CallbackSpec>` | Plugin-name → callback identifier; spliced onto matching runtime |
| `api.slots.env` | `list<EnvSpec>` (`uniqueBy: name`) | Env vars the worker reads (`{ name, devDefault, validate? }`), declared by the plugin that reads them (api contributes the consumer's `env` option); cloudflare renders `.dev.vars`, node sets unset vars to `devDefault` in the dev process |
| `api.slots.workerBase` | `derived<TsExpression>` | The `createWorker({...})` call expression; bakes `env` into `envChecks` |
| `api.slots.workerSource` | `derived<string \| null>` | Final `.stack/worker.ts` source; null when no runtimes are present |
| `api.slots.rbacStatements` | `value<Record<string, readonly string[]> \| null>` (`override`) | RBAC action statements for `procedure({ rbac })` / `procedure({ can })`'s type-level autocomplete; `auth` contributes from `organization.ac.statements` |
| `api.slots.entities` | `list<string>` | Entity vocabulary for `procedure({ reads, writes })`'s type-level autocomplete (sorted, deduplicated union); `db` contributes the consumer's Drizzle schema export names, `auth` contributes its own table names |
| `api.slots.testingImports` | `list<TsImportSpec>` | Imports the test entries' option values need, sorted by source |
| `api.slots.testingEntries` | `list<PluginRuntimeEntry>` | `.use(xTesting({...}))` entries on the test entry, one per plugin with a `./testing` subpath, sorted by plugin |
| `api.slots.testingSource` | `derived<string \| null>` | Final `.stack/testing.ts` source; null when `workerSource` is |
| `api.slots.procedureSource` | `derived<string \| null>` | Final `.stack/procedure.ts` source (`virtual:stack-procedure`'s target); null when no runtimes are present |

### Lifecycle contributions

| `cliSlots` slot | Behavior |
|-----------------|----------|
| `initScaffolds` | Wrangler.toml + base routes scaffold |
| `artifactFiles` | Writes `.stack/worker.ts`, `.stack/procedure.ts` and `.stack/testing.ts` (when any runtime or route is present) and `src/worker/routes/index.ts` barrel |
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

### The generated worker

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

The CLI also generates `.stack/procedure.ts` -- the `virtual:stack-procedure` target route files import,
mapped via a `paths` entry in the consumer's `tsconfig.json`. It rebuilds the same `.use()` chain (minus
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

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-api` | `api()`, `ApiOptions`, `ApiError`, `Middleware`, `InferRouter` |
| `@fcalell/plugin-api/runtime` | `createWorker()`, `AppBuilder`, `WorkerExport`, `ApiWorkerOptions`, `stackContext()`, `isForbiddenOrigin()` |
| `@fcalell/plugin-api/procedure` | `createProcedure()`, `Middleware`, `ProcedureConfig`, `STACK_READS_HEADER`, `STACK_WRITES_HEADER` -- what the generated `.stack/procedure.ts` (`virtual:stack-procedure`) imports |
| `@fcalell/plugin-api/error` | `ApiError` -- worker-safe (no Node-only deps); import this from route files |
| `@fcalell/cli/runtime` | `RuntimePlugin` |
| `@fcalell/plugin-api/client` | `createClient()`, `RouterClient`, `ClientConfig` |
| `@fcalell/plugin-api/testing` | `createTestEntry()`, `TestEntry`, `TestApp`, `TestingPlugin`, `TestingContext`, `TestingSetup`, `ORPCError` -- the Node-only runtime `.stack/testing.ts` calls |
| `@fcalell/plugin-api/tanstack-query` | `createQueryClient()`, `createApiQueryUtils()`, `QueryProvider`, `useAbility(organizationId, recordRules?)`, `ORG_RULES_QUERY_KEY`, `orgRulesQueryKey()`, query hooks -- native TanStack Query client (runtime-only) |
| `@fcalell/plugin-api/query-invalidation` | `captureEntityHeaders()`, `invalidateForWrites()`, `handleMutationSuccess()`, `createEntityRegistry()` -- framework-agnostic auto-invalidation core (runtime-only) |
| `@fcalell/plugin-api/ability-client` | `composeAbility()`, `fetchOrgRules(organizationId)`, `registerApiClient()`, `ORG_RULES_QUERY_KEY`, `orgRulesQueryKey()`, `PackedRulesLike` -- framework-agnostic `useAbility()` core (runtime-only), consumed by `./tanstack-query` |
| `@fcalell/plugin-api/schema` | `z` (Zod re-export), `ZodObject`, `ZodType`, `ZodRawShape` |
| `@fcalell/plugin-api/lib/cursor` | `encodeCursor`, `decodeCursor`, `paginate`, `clampLimit`, constants |
| `@fcalell/plugin-api/lib/slugify` | `slugify`, `isReservedSlug`, `createSlugify`, `RESERVED_SLUGS` |

## License

MIT
