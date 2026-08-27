# PRD — Backend parity: close the sailward migration blockers

Source: the [sailward backend gap analysis](../analysis/sailward-backend-gaps.md) (2026-07-16),
which audited all six backend domains code to code and found the extraction faithful but migration
blocked. This PRD closes every blocking finding. Finding IDs (`WIRE-1`, `CF-3`, ...) refer to that
analysis; read it before starting any workstream.

Several findings are live bugs in any stack consumer today, not just migration blockers: the expo
session-cookie drop (AUTH-2), the rate-limiter codegen shape (CF-3), secrets emitted as vars
(CF-4), and the session-error 401 (API-1). That is why this PRD is sequenced ahead of
deploy-engine.

## Scope

**In:**

- The plugin-cloudflare deploy path: rate-limiter binding shape, secrets emission, and a consumer
  surface for routes and R2 (CF-1..4).
- The plugin-db production-D1 path: validate the wrangler wiring end to end and restore sailward's
  deploy posture (DB-1..3).
- The plugin-auth runtime surface: user deletion hooks, callback env access, OTP override, and the
  expo client cookie prefix (AUTH-1..4).
- Runtime fixes in plugin-api and plugin-expo: session-error propagation, consumer middleware
  context access, dev-origin gating, denial-message override, the `/api/auth` route prefix
  (API-1..3, AZ-1, AUTH-6, AUTH-8).
- The wire-compat decision for the `x-sw-*` to `x-stack-*` rename (WIRE-1..3).
- Version-gate telemetry and env value validation (WIRE-4, API-4), promoted from the roadmap's
  parked list: sailward proves both shapes live, so the parking rationale is satisfied.

**Out:**

- `plugin-email` and `plugin-push`. The gap analysis confirms the code migrates as consumer code;
  both stay parked.
- Studio, db watch push-parity beyond DB-3, and named scenario states. That is the DB-workflow
  parity gap the roadmap defers until plugin-db targets full consumer parity (DB-4).
- The deploy lock, blocking-gate verdicts, reconcile, and TUI (CF-6). Deploy-engine PRD.
- Accepted differences, closed list: the fixed 1000/60 RPC limit (API-5), error-body cosmetics,
  input-scoped invalidation narrowing (AZ-2), array-form `can()` sugar (AZ-3), the `useAbility`
  org-rules request (AZ-4), expo-client cancellation typing and `appleAuthorizationCode` (AUTH-7,
  sailward keeps its own client), and the `database_name` UUID drift (DB-6, verified in WS2).

## Surfaces touched

- `plugins/cloudflare/src/node/codegen.ts`: unsafe-binding shape, secrets emission, managed-list
  merge.
- `plugins/db/src/index.ts` + `src/node/{push,migration-safety,wrangler}.ts`: deploy checks, d1
  local loop, migrations_dir.
- `plugins/auth/src/worker/index.ts`, `src/types.ts`, `src/expo.tsx`, `src/index.ts`: deleteUser +
  hooks, callback payload, `generateOTP`, cookie prefix, trusted-origin gating, routePrefixes
  contribution.
- `plugins/api/src/procedure.ts`, `src/worker/index.ts`, `src/ability/index.ts`: session errors,
  middleware phases, CSRF helper export, `assertCan` message.
- `plugins/expo/src/index.ts`, `src/worker/version-gate.ts`: dev origins, gate scope, telemetry.
- `plugins/cloudflare/src/types.ts`: `analytics_engine` binding kind, secret validation hints.
- No new `stack.config.ts` option unless a milestone's decision explicitly lands one; each such
  decision is recorded in the milestone.

## Workstreams

WS1 through WS4 are independent; WS5 depends on WS4.2; WS6 is independent. Every milestone ships
implementation plus the **Verify** run recorded in its PR, and `pnpm check` passes. Each **Verify**
block is a manual procedure against a scratch consumer project: run the commands, read the named
artifact or response, confirm the stated result.

### WS1 — plugin-cloudflare deploy path

**1.1 Rate-limiter binding shape (CF-3).** Emit the documented unsafe-binding form:
`namespace_id` plus `simple = { limit, period }`. Verify with a real `wrangler deploy` against a
throwaway worker; `wrangler types` alone proves nothing about deployability.
**Verify.** Configure a rate limiter in the scratch consumer, run `stack generate`, and read
`.stack/wrangler.toml`: the unsafe binding carries `namespace_id` and a nested
`simple = { limit, period }`. Deploy that worker with `wrangler deploy` against a throwaway
account and confirm it succeeds. Paste the transcript in the PR.

**1.2 Secrets stop shadowing (CF-4).** Verify against a live worker whether an empty `[vars]` entry
conflicts with a value set via `wrangler secret put`; if it does, stop emitting declared secrets
into `[vars]` and cover dev via the existing `.dev.vars` generation.
**Verify.** Set a secret on the throwaway worker with `wrangler secret put`, run `stack generate`,
and search `.stack/wrangler.toml` for that name: it is absent from `[vars]`, or present only in the
form the live check proved safe. Boot `stack dev` and confirm the same secret still resolves from
`.dev.vars`. Record the deployed worker reading the secret in the PR.

**1.3 Consumer surface for routes and R2 (CF-1, CF-2).** Decision to settle in the milestone:
merge consumer-owned entries in framework-managed lists (collision-checked, like `[vars]`) versus
new plugin options. Default to the merge: consumer wrangler.toml is an existing surface, and the
philosophy makes a new option the last resort. The merge must compose with future slot
contributors (plugin-native-updates contributes routes), so collisions between a consumer entry
and a contributed entry stay hard errors.
**Verify.** Add `[[routes]]` and `[[r2_buckets]]` to the consumer `wrangler.toml`, run
`stack generate`, and confirm both survive into `.stack/wrangler.toml` next to the framework
entries. Rename a consumer binding to collide with a framework-contributed one: `stack generate`
exits non-zero and names the collision.

### WS2 — plugin-db production path

**2.1 Validate the d1 wiring end to end (DB-1, DB-6).** Fix `migrations_dir` resolution relative to
`.stack/wrangler.toml`, then smoke-test the full path against a throwaway D1: local dev apply,
remote apply, `database_name` as UUID, seed via `wrangler d1 execute`. The roadmap already mandates
this before relying on d1 dev.
**Verify.** Run `stack generate` in a d1 consumer and read `migrations_dir` in
`.stack/wrangler.toml`: it resolves to the consumer's migrations folder when read from `.stack/`.
Against a throwaway D1, apply locally, apply remotely through `stack deploy`, confirm
`database_name` is the UUID, and seed via `wrangler d1 execute`. Record the transcript in the PR
and remove the roadmap caveat.

**2.2 Deploy posture: drift hard-fails, only committed SQL applies (DB-2).** Replace the
deploy-time `generateMigrations` check with the drift gate: pending schema changes without a
committed migration abort the deploy. The destructive gate then only ever evaluates committed
migrations, closing the gate-ordering hole. Keep the pending-migrations confirm for what is
committed.
**Verify.** Edit a schema without generating a migration, then run `stack deploy`: it aborts before
any deploy step and names the drift. Commit a destructive migration without the ack marker and
confirm `stack deploy` still aborts. Commit a clean migration and confirm the deploy runs through.

**2.3 D1 local iteration (DB-3).** Point `stack db push` and the schema watcher at the miniflare
sqlite that `wrangler dev --persist-to .stack/dev` reads, matching sailward's inner loop. Until
that lands, `push` on d1 must refuse with a pointer instead of writing to a file nothing reads.
**Verify.** With `stack dev` running, add a column to a schema and run `stack db push`, then read
that column through a worker route: the change is live without a restart. Confirm `.stack/dev/local.db`
was never created. Before this milestone lands, `stack db push` on d1 exits with the pointer message
and writes nothing.

### WS3 — plugin-auth surface

**3.1 Expo client cookie prefix (AUTH-2).** Forward the consumer cookie prefix to `expoClient()`.
One line plus a config field; session-critical for every native consumer.
**Verify.** Set a cookie prefix in `stack.config.ts`, run `stack generate`, and read the emitted
expo client: `expoClient()` receives that prefix. Drop the field and confirm nothing is passed.
Sign in from the native app against a dev worker and confirm the session survives a reload.

**3.2 Callbacks receive `env` (AUTH-4).** Extend the callback payload (or make the callbacks module
a factory) so `sendOTP`/`sendInvitation` reach per-request bindings. Unblocks OTP email via the
`EMAIL` send binding and the review-account skip.
**Verify.** Write a `sendOTP` callback that reads a binding off the payload env, boot `stack dev`,
and request an OTP: the callback logs the binding instead of throwing on undefined.

**3.3 User deletion (AUTH-1).** Expose better-auth's `deleteUser` with a consumer `beforeDelete`
hook and `session.freshAge` support. The hook contents (veto, revocation, cleanup) stay consumer
code.
**Verify.** Against a dev worker, delete a user and confirm the `beforeDelete` hook runs. Make the
hook throw and confirm the deletion is refused. With `freshAge: 0`, confirm a passwordless account
deletes.

**3.4 `generateOTP` passthrough (AUTH-3).** Let the consumer override OTP generation while the
pinned security params stay pinned.
**Verify.** Supply a `generateOTP` override returning a fixed code, request an OTP, and verify with
that code. Read the emitted worker source: the pinned params are still 6/300/3.

### WS4 — runtime fixes (plugin-api, plugin-expo) — shipped

**4.1 Session errors propagate (API-1).** In the auth middleware, rethrow non-`ORPCError` failures
so an infra blip is a 500, not a 401 sign-out.
**Verify.** Break the session lookup (point the D1 binding at a bad id) and call an authed route:
the response is 500. Call the same route with no session cookie: 401.

**4.2 Consumer middleware after context (API-2).** Give consumer middleware a phase that runs after
context injection so raw routes reach `db`/`auth`, and export the origin-CSRF helper.
**Settled:** the second entry point. `MiddlewareSpec` gained an `after-context` phase, the runtime a
`.useAfterContext()` mount point, and the consumer a second conventional file,
`src/worker/middleware.context.ts`; `src/worker/middleware.ts` keeps its pre-context ordering
untouched. `stackContext(c)` and `isForbiddenOrigin(c)` ship from `@fcalell/plugin-api/runtime`,
and `.stack/procedure.ts` now exports `WorkerContext` to type the first.
**Verify.** Register a consumer middleware in the post-context phase and log `db` from a raw route:
it is defined. Call that route with a disallowed `Origin` header and confirm the exported CSRF
helper rejects it.

**4.3 Dev origins gated at runtime (API-3, AUTH-6).** Dev-server localhost origins join CORS and
trustedOrigins only when the worker runs in dev (`STACK_DEV`), not baked at codegen. Decouple the
cookie `sameSite` choice from localhost detection: derive it from the expo option explicitly.
**Settled:** a new `api.slots.devCorsOrigins` list carries the vite/metro origins, emitted as
`createWorker({ devCors })` and `authRuntime({ devTrustedOrigins })` and appended by each runtime
only under `STACK_DEV`. `sameSite: "none"` is baked from the expo option alone, and the auth
runtime widens it to `none` while the dev origins are live — without that, a web consumer on
cross-origin localhost dev would silently lose its session cookie.
**Verify.** Boot the worker with `STACK_DEV` unset and send a preflight from
`http://localhost:5173`: it is rejected, and the emitted cookie `sameSite` still matches the expo
option. Set `STACK_DEV` and confirm the same preflight is accepted.

**4.4 `assertCan` message override (AZ-1).** Optional message parameter; default copy unchanged.
**Verify.** Call a route whose `assertCan` passes a message override and read the FORBIDDEN body:
it carries the override. Call a cloaked route and confirm the response is still NOT_FOUND.

**4.5 Auth contributes `/api/auth` to `api.slots.routePrefixes` (AUTH-8).** Closes the vite
dev-proxy gap plugin-api's comment already expects.
**Verify.** With auth in the config, run `stack generate` and read the emitted vite config:
`/api/auth` is proxied to the worker. Remove auth, regenerate, and confirm the prefix is gone.

### WS5 — wire compatibility (WIRE-1..3)

Depends on WS4.2. Decision to settle in the milestone; the default position, chosen against a
header-name option (philosophy: options are the last resort, and the framework should not carry
every consumer's legacy names):

- **Response headers (WIRE-1):** header names stay `x-stack-*`. A migrating consumer mirrors them
  to legacy names in one consumer middleware (possible once WS4.2 lands). Document the recipe in
  the plugin-api README's migration notes.
- **Request headers (WIRE-2):** the gate keeps reading `x-stack-client-*` only. Sailward ships a
  client release stamping both header sets before any floor raise; builds older than that release
  stay un-wallable, an accepted residue measured by WS6 telemetry.
- **Gate scope (WIRE-3):** narrow the version gate to the resolved `api.slots.routePrefixes`
  instead of everything-but-auth, restoring sailward's `/rpc`-only scope without an option.

**Verify.** Add the mirror middleware from the README recipe and read the response headers on an
RPC call: `x-stack-reads`/`x-stack-writes` and the legacy names are both present. Send a request
stamped with a below-floor client version to a prefixed route and get 426; send the same to a
consumer raw route and it passes untouched.

### WS6 — observability and env parity (WIRE-4, API-4)

**6.1 `analytics_engine` binding kind** on `WranglerBindingSpec`, contributable like the existing
kinds.
**Verify.** Contribute a dataset, run `stack generate`, and confirm
`[[analytics_engine_datasets]]` appears in `.stack/wrangler.toml`.

**6.2 Version-gate telemetry.** The gate writes walled and header-less counters to a contributed
dataset when the binding is present, and stays silent when absent. Restores sailward's fail-open
canary.
**Verify.** With the dataset bound, send a walled request and a header-less request, then query the
dataset: one datapoint each. Remove the binding and confirm both requests still succeed, with
nothing written and no error logged.

**6.3 Env value validation.** Extend `cloudflare.slots.secrets` with optional validation hints
(min length, URL shape) and generate a once-per-isolate assertion, replacing presence-only checks.
Include the refuse-to-serve refinement: a non-localhost `APP_URL` with dev-mode settings fails
fast.
**Verify.** Set a secret shorter than its declared minimum and send the first request: it fails with
the named error. Fix the value and confirm requests pass and the assertion logs once per isolate.
Set a non-localhost `APP_URL` with dev-mode settings and confirm the worker refuses to serve.

## Non-goals

- No header-name or rate-limit-value consumer options; the closed accepted-differences list above
  is the boundary.
- No sailward-side changes in this repo. The backport of these fixes and the staged client release
  (WS5) are sailward work items tracked in the roadmap sequencing.

## Acceptance

Per milestone: the implementation lands, the milestone's **Verify** steps run green against a
scratch consumer project with the transcript recorded in the PR, and `pnpm check` passes. WS1 and
WS2 run theirs against throwaway Cloudflare resources, since both sit on the production deploy
path.
The dogfood signal for the PRD as a whole: every blocking finding in the gap analysis is closed or
sits on the accepted-differences list, and a staged in-place cutover of the live `sailward` worker
is attemptable.
