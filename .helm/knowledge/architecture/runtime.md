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
and vice versa (see `.helm/agents/conventions.md`).

A `RuntimePlugin` declares `dependsOn: readonly string[]` (other plugins' `name`s) when it reads
another plugin's `context()` output. `createWorker`'s `.handler()` topologically sorts the `.use()`
chain by `dependsOn` before running any `context()`/`fetch()`, so a dependency's context always
builds first regardless of `.use()` registration order. This is the runtime analog of a slot's
`inputs`. `authRuntime` declares `dependsOn: ["db"]` since it reads `upstream.db`.

`.dev.vars` carries `STACK_DEV=1` (contributed by `plugin-cloudflare`, never through `api.slots.env`,
so it's never prompted as a deploy secret). `createWorker` derives `_devMode` from
`env.STACK_DEV === "1"` and threads it through the base context; `.dev.vars` only loads under
wrangler/Miniflare local dev, so `_devMode` is false in production. Rate limiting (`plugin-api`'s
`rateLimit` middleware, `plugin-auth`'s `/api/auth/*` limiter) is skipped whenever `_devMode` is
true.

Env vars the worker reads are declared on `api.slots.env` by the plugin that reads them, never
by a deploy target: cloudflare renders the list into `.dev.vars` and `[vars]`, node sets each
var the shell leaves unset to its `devDefault` in the dev process, and both bake the same
`envChecks`. A static-only cloudflare deploy (no api) reads the slot as `[]`.

Env values are asserted once per isolate, on the first request: `createWorker({ envChecks })`
carries every `api.slots.env` entry plus its validation hints (presence always;
`minLength`, `url`, `devLocalhost` when declared), baked by `api.slots.workerBase`. A failed check
throws by var name on every request until fixed; `devLocalhost` refuses to serve when `STACK_DEV`
is set but the var's hostname is not local, so dev settings can't ride into a deploy. Binding
presence stays a per-request `validateEnv` on the runtime plugin that owns the binding (db).

The same flag gates the dev origins. `api.slots.devCorsOrigins` holds the localhost origin of
each frontend dev server (vite, metro) and `api.slots.devTargetOrigins` that of each deploy
target's dev process (the node server, wrangler). The two, frontends first, are emitted as
`createWorker({ devCors })` and `authRuntime({ devTrustedOrigins })`, separate from the
production lists, and each runtime appends them only when `STACK_DEV` is set, so the deployed
worker refuses a credentialed localhost origin. Auth also widens its cookie `sameSite` to `none`
while those dev origins are live. `APP_URL`'s dev default is the first frontend origin, else the
first deploy-target origin, so a project with no frontend still passes its `devLocalhost` check
under `stack dev`.

## Node target (`plugin-node`)

`plugin-cloudflare` and `plugin-node` are alternative deploy targets for the same worker. On the
node target, `.stack/server.ts` (composed by `node.slots.serverSource`) calls
`startNodeServer` from `@fcalell/plugin-node/server`: an outer Hono app that mounts the worker's
fetch handler on every `api.slots.routePrefixes` path, serves `dist/client` statically with SPA
fallback to its `index.html` (the fallback shadows the worker's `GET /` liveness route), and runs
consumer background services (`src/server/services/<name>.ts`, each default-exporting a
`defineService({ name, start })`; start may return a stop handle, stops run in reverse order on
shutdown).

`start(ctx)` receives `{ log, ws, http }`. `http.port` is the server's listen port and
`http.mount(prefix, handler)` registers a raw fetch-style route: every request whose path equals
`prefix` or is under `prefix + "/"` goes to `handler` (longest registered prefix wins, duplicate
throws), matched after `/ws` and before the worker/static/SPA, so a service can host its own HTTP
subtree (e.g. an in-process MCP endpoint the spawned CLI reaches directly by port, not through the
vite dev proxy).

The entry hands `startNodeServer` module URLs (`workerModule`/`procedureModule`/`servicesModule`)
instead of importing them: route files import `virtual:stack-procedure`, which plain node cannot
resolve (tsx/esbuild resolve it via tsconfig paths). Static imports resolve at link time, before
any hook can register, so the boot calls `node:module`'s `registerHooks` to map
`virtual:stack-procedure` to `.stack/procedure.ts` and only then dynamic-imports the worker and
the services barrel.

Node has no bindings: the worker gets `env = process.env`, `executionCtx` degrades to a no-op
`waitUntil`, and binding-backed features (rate limiters) skip themselves when the binding is
absent. `STACK_DEV=1` and the `devDefault` of every `api.slots.env` var the shell leaves unset
arrive via `ProcessSpec.env` on the dev process, not `.dev.vars`. The consumer's TypeScript
(`.stack/`, `src/`) runs directly under Node >= 24 (type stripping) while the stack packages it
imports load compiled from `dist/`, so everything of the consumer's on the runtime import path
stays erasable-only syntax (no parameter properties, no enums) and names the file of every
value import (`./types.ts`, `../src/schema/index.ts`): node resolves neither a missing extension
nor a directory (`ERR_UNSUPPORTED_DIR_IMPORT`). The generated worker imports the sqlite schema
as `../src/schema/index.ts` for that reason, and a node consumer's route files name their files
the same way; the d1 import stays `../src/schema`, which esbuild resolves.

### Database on the node target

`db({ dialect: "sqlite" })` runs through `@fcalell/plugin-db/runtime/sqlite` (`src/server/`), a
module separate from the D1 `./runtime` so a Workers bundle never pulls in a native driver. The
driver is `better-sqlite3` through plugin-db's own `createClient` (a plain dependency of the
plugin): the pinned `drizzle-orm@0.45.2` ships no `node:sqlite` driver. The installation decides
where the file lives: the runtime opens the file the `fileVar` env var names (default `DB_FILE`),
once per process, and `path` is only that var's `devDefault`. Both `validateEnv` and `context`
refuse a missing var by name, because better-sqlite3 opens an anonymous temporary database for an
undefined path and would serve an empty database silently. The context is `{ db }` exactly as on
D1, so a procedure is the same code on both dialects.

`stack db push` (and the sqlite local migrate) create the file's directory before drizzle-kit
runs: drizzle-kit neither creates it nor fails without it, reporting success while writing
nothing.

### Auth on the node target, passkeys, consumer plugins

`plugin-auth` requires `api` and `db` only; its rate-limiter bindings and `nodejs_compat` flag
are cloudflare contributions that stay inert on node, where the limiter skips itself. Every value
import on its runtime path names its file, so `authRuntime` loads under plain node.

`auth({ passkey })` adds `@better-auth/passkey`'s `passkey()` configured, not wrapped. Codegen
bakes every default: `rpID` from `app.domain` (a registrable suffix of the derived origins, as
WebAuthn requires of the relying party), `rpName` from `app.name`, `origin` from the resolved
production CORS list. A `localhost` ceremony matches neither, so codegen also bakes
`passkey.devOrigin` (the dev origins) and the runtime, under `STACK_DEV`, passes
`rpID: "localhost"` and those origins to `passkey()` instead, as it does for
`devTrustedOrigins`. `@better-auth/passkey` is pinned to the exact `better-auth` version: each
release peer-requires its own version of `better-auth` and `@better-auth/core`.

The callbacks file is the consumer's seam into better-auth's own extension mechanism:
`AuthCallbacks.plugins` are registered after the framework's plugins, and the file is wired
whenever it exists. Every callback is optional in `AuthCallbacks`; with `emailOtp` on, generate
refuses a missing file and the runtime refuses to build better-auth without `sendOTP`, naming
it, while `emailOtp: false` requires neither. `drizzleAdapter`'s schema
map starts from the drizzle client's full schema (the consumer's `src/schema`) and then names the
framework's tables explicitly (`organization` and `passkey` tables only when enabled), so a
consumer plugin's model resolves to the consumer's table of that name while the framework's
models never depend on the consumer's export names.

The typed WebSocket surface lives on this target: `@fcalell/plugin-node/ws` (the isomorphic
`defineChannel` contract), `./server`'s hub (`ctx.ws.channel(def, { onSubscribe, onUnsubscribe,
onMessage })` → `broadcast`/per-connection `send`; a connection carries an `id` stable for the
socket's life, and `onUnsubscribe` runs once on an unsub or the socket's close, so per-connection
state such as presence never outlives the socket), and `./client` (browser client, shared socket,
auto-reconnect with resubscribe). The target bounds its transports from `node({ bounds })`: a body
over `body` bytes is refused with 413 by Hono's body limit, and a frame over `frame` bytes closes
its socket through `ws`'s `maxPayload`. Everything is zod-validated at both ends; invalid frames are dropped and
logged. Gotcha: `@hono/node-ws` peer-pins `@hono/node-server` v1 and must not be used; node-server
v2 ships its own `upgradeWebSocket` plus `serve({ websocket: { server } })` with a
`ws` `WebSocketServer({ noServer: true })`. Graceful shutdown must `terminate()` the tracked WS
clients before `server.close()` or close hangs on live sockets.

## `virtual:stack-procedure`

`src/worker/routes/*.ts` files author procedures via `import { procedure } from "virtual:stack-procedure"`
(plugin-api README, "Write procedures"). That specifier resolves through a tsconfig `paths` alias
(`packages/cli/src/templates/tsconfig.ts`) to `api.slots.procedureSource`'s generated
`.stack/procedure.ts` — not a bundler virtual-module plugin, since the worker never runs through
Vite. esbuild (`wrangler` dev and deploy bundling) resolves tsconfig `paths` natively; the node
target maps the specifier with a `registerHooks` resolve hook (above).

`.stack/procedure.ts` rebuilds the same `.use()` chain `workerBase` + `pluginRuntimes` produce (minus
callbacks/handler) as real, never-exported code, purely so `typeof` can extract the exact
`TContext` a route handler's `context` will carry — the same trick `workerSource` uses for
`AppRouter` (`typeof worker._router`). `TStatements` (for `procedure({ rbac })` / `procedure({ can })`'s
autocomplete) comes from `api.slots.rbacStatements`, a plain-JSON handoff `auth` contributes from
`organization.ac.statements`; absent that contribution it falls back to `Record<never, never>`, which
makes `rbac`/`can` un-settable rather than accepting an arbitrary string.
