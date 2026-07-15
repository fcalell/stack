# Runtime architecture

`stack.config.ts` is never imported by the worker. The slot graph reads config at generate time and
inlines plugin options as JS literals into the file produced by `api.slots.workerSource`. Runtime
factories receive plain option objects, never `PluginConfig`.

Generated `.stack/worker.ts` (composed by `api.slots.workerSource` from contributions to
`api.slots.workerImports` / `pluginRuntimes` / `callbacks` / `cors`):

```ts
import createWorker from "@fcalell/plugin-api/runtime";
import dbRuntime from "@fcalell/plugin-db/runtime";
import authRuntime from "@fcalell/plugin-auth/runtime";
import * as schema from "../src/schema";
import authCallbacks from "../src/worker/plugins/auth";
import * as routes from "../src/worker/routes";

const worker = createWorker({
  cors: ["https://example.com", "https://app.example.com"],
})
  .use(dbRuntime({ binding: "DB_MAIN", schema }))
  .use(authRuntime({ trustedOrigins: ["https://example.com", "https://app.example.com"], callbacks: authCallbacks }))
  .handler(routes);

export type AppRouter = typeof worker._router;
export default worker;
```

Runtime code lives in each plugin's `src/worker/` and is published from the `./runtime` subpath;
the CLI discovers it by checking `package.json` exports. `worker/` files never import from `node/`
and vice versa (see `.claude/playbooks/conventions.md`).

A `RuntimePlugin` declares `dependsOn: readonly string[]` (other plugins' `name`s) when it reads
another plugin's `context()` output. `createWorker`'s `.handler()` topologically sorts the `.use()`
chain by `dependsOn` before running any `context()`/`fetch()`, so a dependency's context always
builds first regardless of `.use()` registration order. This is the runtime analog of a slot's
`inputs`. `authRuntime` declares `dependsOn: ["db"]` since it reads `upstream.db`.

`.dev.vars` carries `STACK_DEV=1` (contributed by `plugin-cloudflare`, never through the `secrets`
slot, so it's never prompted as a deploy secret). `createWorker` derives `_devMode` from
`env.STACK_DEV === "1"` and threads it through the base context; `.dev.vars` only loads under
wrangler/Miniflare local dev, so `_devMode` is false in production. Rate limiting (`plugin-api`'s
`rateLimit` middleware, `plugin-auth`'s `/api/auth/*` limiter) is skipped whenever `_devMode` is
true.

## `virtual:stack-procedure`

`src/worker/routes/*.ts` files author procedures via `import { procedure } from "virtual:stack-procedure"`
(plugin-api README, "Write procedures"). That specifier resolves through a tsconfig `paths` alias
(`packages/cli/src/templates/tsconfig.ts`) to `api.slots.procedureSource`'s generated
`.stack/procedure.ts` — not a bundler virtual-module plugin, since the worker never runs through
Vite. Both loaders that touch the worker (tsx for `stack dev`'s subprocess boot, esbuild for
`wrangler`/deploy bundling) resolve tsconfig `paths` natively.

`.stack/procedure.ts` rebuilds the same `.use()` chain `workerBase` + `pluginRuntimes` produce (minus
callbacks/handler) as real, never-exported code, purely so `typeof` can extract the exact
`TContext` a route handler's `context` will carry — the same trick `workerSource` uses for
`AppRouter` (`typeof worker._router`). `TStatements` (for `procedure({ rbac })`'s autocomplete) comes
from `api.slots.rbacStatements`, a plain-JSON handoff `auth` contributes from
`organization.ac.statements`; absent that contribution it falls back to
`Record<string, readonly string[]>`.
