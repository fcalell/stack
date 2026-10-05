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
import * as schema from "../src/schema/index.ts";
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

The base context every procedure starts from is `env`, `httpRequest` (the raw HTTP `Request`),
`reqHeaders`, `resHeaders` (oRPC's header plugins), `executionCtx` and `_devMode`. `env` takes the
type the deploy target names through `api.slots.envType`: `BaseContext<TEnv>` and `createWorker<TEnv>`
carry it, and the generated worker and procedure entry render `createWorker<Env>(…)` on Cloudflare,
so `context.env.APP_URL` reads as `string` and an undeclared var is a type error. Without a target
that names one (node) `env` is `unknown`. The parameter is type-only; `envChecks` stays the runtime
guard. Plugin-db adds
`db`, plugin-auth's runtime `auth`, `tenancy` and `_rateLimiter` (and `oauth` with `mcp`), and its auth middleware `user`
and `session`; the MCP endpoint adds `_caller`. A scoped procedure then writes each resolved level's row under its scope's name,
`organization` and `member` at the root. The raw request is `httpRequest`, not `request`, because
a consumer's scope takes its table's name and `request` is a common one. `defineScope` refuses
every one of these keys as a scope name, since the row would overwrite it; its list checks
plugin-api's `BaseContext` keys by type, so a key added there fails to compile until it is listed.

With `src/worker/mcp.ts`, `.handler(routes, { mcp, name })` also mounts `POST /mcp` after context
injection (any other method is `405`). Its order: a forbidden `Origin` is `403`; the context's
`oauth.verify(request)` answers the verified agent or its challenge `Response`, returned unchanged
(`401` first draws the per-IP `RATE_LIMITER_RPC` budget, outside dev mode, since a forged `kid`
costs a key refetch; an accepted token never does, `verify` limits per grant); the body is read to
4 MiB (`413`; invalid JSON `400`, a batch `400`). The MCP SDK serves it statelessly for both
protocol eras, each request a fresh server. Each listed procedure runs through oRPC in process
with the stack context, the pinned `tenancy`, `_caller: { user, session }` from `verify` (the
auth gate takes it in place of `getSession`; `/rpc` never sets it), `reqHeaders` without
`cookie` and `authorization`, an `httpRequest` rebuilt from them with no body, and a fresh
`resHeaders`. The tools resolve against the consumer routes when `.handler()` runs, so a tool the
endpoint cannot serve fails the boot; the SDK loads on the first `/mcp` request. `.query()` and
`.mutation()` stamp oRPC meta `kind`, from which a query tool carries `readOnlyHint`. An
`ORPCError` is an `isError` result of `{ code, message, data }`; any other throw is a masked
`INTERNAL_SERVER_ERROR` result and is logged. The test handle's `mcp({ token, era })` is the SDK
client over `fetch`, one connection per call, turning an HTTP refusal into an error with
`status` and `wwwAuthenticate`.

Env vars the worker reads are declared on `api.slots.env` by the plugin that reads them, never
by a deploy target: cloudflare renders the list into `.dev.vars` (each var deploys as a secret), node sets each
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
fetch handler on every `api.slots.routePrefixes` path, serves the web client's build
(`vite.slots.outDir`, `dist/client`) statically with SPA fallback to its `index.html` (the
fallback shadows the worker's `GET /` liveness route; with no vite neither is mounted), and runs
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
nor a directory (`ERR_UNSUPPORTED_DIR_IMPORT`). The generated worker imports the schema as
`../src/schema/index.ts` on both dialects for that reason: the sqlite worker runs under node on
this target, and the d1 worker runs under node in the test entry. esbuild resolves the file form
for the Workers bundle. A node consumer's route files name their files the same way.

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
`devTrustedOrigins`. `@better-auth/passkey`, `/expo`, `/mcp`, `/oauth-provider`, `/cimd` and
`/core` are pinned to the exact `better-auth` version: each release peer-requires its own version
of `better-auth` and `@better-auth/core`.

`auth({ mcp: true })` (refused without `organization`) makes the worker an OAuth authorization
server for MCP clients. The runtime adds `jwt()`, `mcp()` and `cimd()` (profile
`mcp-2026-07-28`) in that order, then a guards plugin, and `disabledPaths` closes the session
`/token` and the four `/oauth2/*-consent(s)` paths. The pins: the login, organization-choice and
consent pages (`/sign-in`, `/connect/organization`, `/connect/consent`), the resource
`${APP_URL}/mcp`, scopes `mcp` and `offline_access`, the authorization-code and refresh grants only,
a 600 s code, a 3600 s access JWT, a 30-day refresh token reusable for 30 s, dynamic registration
off, and `clientPrivileges` refusing every action (clients come from metadata documents, never a
session). The guards force `prompt=consent` on every external authorization (CIMD clients share a
`client_id`), refuse a `set-active` carrying the authorization's signed query for an organization
the tenancy does not resolve (`ORGANIZATION_NOT_RESOLVED`) and mark the request that chose, which
is what lets the resumed authorization pass the organization step, delete a client's older tokens
when its consent is accepted, and, with the organization hooks, delete a member's grants when they
are removed, leave, or the organization is deleted. A grant is one `oauthConsent` row, unique by
client, member and organization (`referenceId`). The runtime's `fetch` also hands the two
`/.well-known/oauth-*` prefixes to Better Auth behind the IP limiter.

`context.oauth.verify(request)` reads only the `Authorization` header: signature against the stored
keys (never a fetch of the worker's own JWKS URL), issuer, exact audience, `typ` `at+jwt`, expiry,
scope `mcp`, DPoP binding, then one read joining the consent (client, member, `organization_id`),
the user and the member under the membership predicate; a token issued before the consent's
`createdAt` is refused. It answers `{ user (with `agent: true`), session (the grant's, no token),
member, grant, tenancy }` or the `401`, `403` or `429` `Response` a client reads, and its
`tenancy` resolves the grant's organization alone. `revokeGrant(id)` ends a grant by its consent id.
The per-grant limiter (`RATE_LIMITER_AGENT`) is applied inside `verify`, skipped under dev mode.
The CIMD transport is `worker/cimd-transport.ts`: HTTPS `GET`/`HEAD` only, no IP literal or
special-use name, the host resolved over DNS over HTTPS and every address required public, redirects
returned unfollowed; it cannot pin the connection to the checked address, a window accepted because
a Worker's egress reaches the public internet only.

The callbacks file is the consumer's seam into better-auth's own extension mechanism:
`AuthCallbacks.plugins` are registered after the framework's plugins, and the file is wired
whenever it exists. Every callback is optional in `AuthCallbacks`; with `emailOtp` or `magicLink` on, generate
refuses a missing file and the runtime refuses to build better-auth without `sendOTP` or
`sendMagicLink`, naming it, while `emailOtp: false` without `magicLink` requires neither. The
per-email rate limit covers the OTP send and `/sign-in/magic-link`, which share a bucket. `drizzleAdapter`'s schema
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

## Test entry

`.stack/testing.ts` (`api.slots.testingSource`, emitted whenever the worker is) is how a consumer
test calls its own worker: `createTestEntry` from `@fcalell/plugin-api/testing` loads
`.stack/worker.ts` under plain node and binds a typed `RouterClient<AppRouter>` to `worker.fetch`,
so a test asserts an answer, or a refusal by its `ORPCError` code, without a server, a port or a
spawned `stack`.

- **Hook, once per process.** Route files import `virtual:stack-procedure`, which plain node cannot
  resolve, so `boot` registers a `registerHooks` resolve to `.stack/procedure.ts` and then
  dynamic-imports the worker, as the node target does. Hooks only append and a resolved module
  stays cached, so a process serves one procedure module; a second entry naming another is
  refused. `node --test` runs each file in its own process.
- **Explicit URLs.** The generated file passes the worker, procedure and root URLs against
  `import.meta.url` rather than the runtime assuming a layout, so the file says what it loads and a
  fixture can live anywhere.
- **A fresh worker per boot.** The worker asserts its `envChecks` once per `.handler()` call, so
  each boot imports the worker with its own query string: every boot's first request is checked
  against that boot's env, and a bad override fails as a deploy would. Routes, the procedure module
  and the packages stay cached.
- **Env composition.** The baked env is `STACK_DEV: "1"` plus every `api.slots.env` entry's
  `devDefault`, the env `stack dev` gives the worker; `boot({ env })` overlays it, and each testing
  plugin's `setup` adds to the same live object every request reads (a D1 binding).
- **Quiet.** `boot` sets `STACK_QUIET: "1"` beneath the overrides, and the worker reads it per
  request where it mounts Hono's `logger()` and where it prints the env-check line: under it the
  worker writes neither, so `node --test` output carries only the tests' own. `stack dev` and a
  deploy never set it, so their logs are unchanged; an unhandled error still logs with its cause.
  `boot({ env: { STACK_QUIET: "" } })` turns the logs back on for one boot.
- **Dependency order and dispose.** A plugin contributing to `api.slots.testingEntries` ships a
  `./testing` subpath whose default export returns a `TestingPlugin`. The file applies `.use()` in
  plugin-name order; `boot` runs the setups by `dependsOn` with `createWorker`'s stable
  topological rule (a cycle throws naming it, an unknown name is ignored), each seeing earlier
  `provides` as `upstream`, and merges every `provides` onto the handle, which types it.
  `setup` is declared in method syntax so `.use()` accepts a plugin before its dependencies.
  `dispose` (and `await using`) runs the disposers in reverse; a boot that throws runs the
  disposers collected so far before rejecting, so nothing a setup opened keeps the test
  process alive. A `provides` key the handle owns (`env`, `worker`, `fetch`, `client`,
  `dispose`) is refused at boot.
- **Local D1.** plugin-db's `dbTesting` (d1 only) gives each boot its own database: an in-memory
  `node:sqlite` database in the test's own process, behind the D1 binding's statement surface
  (`prepare`, `bind`, `run`, `all`, `raw`, `first`, and `batch` as one transaction), each
  answering as D1 answers (a boolean binds as 1 or 0, a blob reads as an array of bytes, foreign
  keys are enforced). No call crosses a socket or blocks on another thread, so a test cannot stall
  on a runtime that stopped answering, and test files run in parallel. It applies the committed
  migrations as `wrangler d1 migrations apply` does at deploy, not as drizzle's journal would:
  every `.sql` file in filename order, each run with its `d1_migrations` record in one
  transaction, so a test database is built by the order production runs and a failing file
  leaves no record. An empty migrations directory is refused by name. The binding lands in `env`
  under its name and `provides.db` is the drizzle client the worker's `dbRuntime` also gets
  (both go through `createClient`'s per-binding cache). A setup whose migration fails closes its
  database itself, since `boot` runs only the disposers already returned. `stack dev` and a
  deploy run the real D1; the test boot trades workerd's D1 for a process with nothing to wait
  on, and a D1 behaviour sqlite lacks is not reproduced. The sqlite dialect contributes no testing
  plugin: its baked env carries the `fileVar` (`DB_FILE`) at its dev default, so that test entry's
  worker opens the configured dev sqlite file (resolved against the test process's working
  directory), the same file `stack dev` uses, with no per-boot isolation.
- **Signed in.** plugin-auth's `authTesting` signs a test in without an OTP and without a Better
  Auth instance: its helpers write a user, an organization and a membership through the `db`
  plugin's drizzle client, then a `session` row, and the cookie is that row's token signed with
  the env's secret as Better Auth signs its own (`token.signature`, HMAC-SHA256 in standard
  base64). The worker's session check finds the row by token, so the cookie passes it as a real
  sign-in's would. The name is `<prefix>.session_token`, with `__Secure-` exactly when the app URL
  is https, Better Auth's own rule; the secret and the app URL are read from the live env after
  `boot({ env })`, and a missing one is refused by its var name. A boot with no `db` testing
  plugin upstream (a sqlite consumer's) is refused by that name. The organization helpers exist
  only when roles are baked, so `role` is typed to the configured names and a consumer without
  organizations has no `auth.member` at all. With `mcp`, `auth.oauth` runs the authorization through
  the worker's `fetch` with a cookie jar: `register()` writes a managed public client (no metadata
  lookup leaves the process), `connect({ member, organizationId, client })` authorizes, chooses the
  organization when asked, consents and exchanges the PKCE code, and `refresh` rotates the pair.

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

The builder derives two types from one input schema: the caller's side is the config's additions
merged with `z.input`, the handler's side the additions' handler form merged with `z.output`.
The additions split the same way: a scope adds `<name>Id: string` to both, and `paginated: true`
adds an optional `limit` for the caller and `limit: number` for the handler, because the input
defaults it. `.output(schema)` swaps the sides: the handler returns `z.input` and the caller
receives `z.output`. oRPC parses the input before the handler runs and sends the validated output,
so the split is types only; the runtime chain is unchanged. `Procedure<TInput, TOutput>` carries
the caller's side only, because every reader of a built procedure is a caller: `RouterClient`,
`createClient`, `createApiQueryUtils`, the test entry's `client()` and the emitted `.stack/types`
declarations, which inline the brand. The handler's side is used only where the handler is
written, so a third parameter would be read by nothing and grow every emitted declaration.
