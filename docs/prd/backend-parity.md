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
implementation plus co-located tests, and `pnpm test` + `pnpm check` pass.

### WS1 — plugin-cloudflare deploy path

**1.1 Rate-limiter binding shape (CF-3).** Emit the documented unsafe-binding form:
`namespace_id` plus `simple = { limit, period }`. Verify with a real `wrangler deploy` against a
throwaway worker; `wrangler types` alone proves nothing about deployability.
**Test.** Codegen unit test asserts the nested shape; the live smoke test is recorded in the PR.

**1.2 Secrets stop shadowing (CF-4).** Verify against a live worker whether an empty `[vars]` entry
conflicts with a value set via `wrangler secret put`; if it does, stop emitting declared secrets
into `[vars]` and cover dev via the existing `.dev.vars` generation.
**Test.** Codegen unit test asserts secrets are absent from `[vars]` (or the verified-safe form);
live smoke test recorded.

**1.3 Consumer surface for routes and R2 (CF-1, CF-2).** Decision to settle in the milestone:
merge consumer-owned entries in framework-managed lists (collision-checked, like `[vars]`) versus
new plugin options. Default to the merge: consumer wrangler.toml is an existing surface, and the
philosophy makes a new option the last resort. The merge must compose with future slot
contributors (plugin-native-updates contributes routes), so collisions between a consumer entry
and a contributed entry stay hard errors.
**Test.** Real-graph: a consumer wrangler.toml with `[[routes]]` and `[[r2_buckets]]` lands both in
the generated config; a binding-name collision with a framework contribution throws.

### WS2 — plugin-db production path

**2.1 Validate the d1 wiring end to end (DB-1, DB-6).** Fix `migrations_dir` resolution relative to
`.stack/wrangler.toml`, then smoke-test the full path against a throwaway D1: local dev apply,
remote apply, `database_name` as UUID, seed via `wrangler d1 execute`. The roadmap already mandates
this before relying on d1 dev.
**Test.** Unit test on the emitted `migrations_dir`; the live smoke-test transcript is recorded in
the PR and the roadmap caveat is removed.

**2.2 Deploy posture: drift hard-fails, only committed SQL applies (DB-2).** Replace the
deploy-time `generateMigrations` check with the drift gate: pending schema changes without a
committed migration abort the deploy. The destructive gate then only ever evaluates committed
migrations, closing the gate-ordering hole. Keep the pending-migrations confirm for what is
committed.
**Test.** Integration: uncommitted schema drift aborts the deploy before any step; a committed
destructive migration without the ack marker still aborts; committed clean migrations apply.

**2.3 D1 local iteration (DB-3).** Point `stack db push` and the schema watcher at the miniflare
sqlite that `wrangler dev --persist-to .stack/dev` reads, matching sailward's inner loop. Until
that lands, `push` on d1 must refuse with a pointer instead of writing to a file nothing reads.
**Test.** Integration: a schema edit followed by push is visible to a miniflare-booted worker;
push against d1 never writes `.stack/dev/local.db`.

### WS3 — plugin-auth surface

**3.1 Expo client cookie prefix (AUTH-2).** Forward the consumer cookie prefix to `expoClient()`.
One line plus a config field; session-critical for every native consumer.
**Test.** Unit: the client passes `cookiePrefix` through; default remains better-auth's when unset.

**3.2 Callbacks receive `env` (AUTH-4).** Extend the callback payload (or make the callbacks module
a factory) so `sendOTP`/`sendInvitation` reach per-request bindings. Unblocks OTP email via the
`EMAIL` send binding and the review-account skip.
**Test.** Runtime: a `sendOTP` implementation reads a binding off the payload env under miniflare.

**3.3 User deletion (AUTH-1).** Expose better-auth's `deleteUser` with a consumer `beforeDelete`
hook and `session.freshAge` support. The hook contents (veto, revocation, cleanup) stay consumer
code.
**Test.** Runtime: deletion runs the hook, a hook throw vetoes, `freshAge: 0` permits passwordless
deletion.

**3.4 `generateOTP` passthrough (AUTH-3).** Let the consumer override OTP generation while the
pinned security params stay pinned.
**Test.** Runtime: a fixed-code override reaches the verify flow; params remain 6/300/3.

### WS4 — runtime fixes (plugin-api, plugin-expo)

**4.1 Session errors propagate (API-1).** In the auth middleware, rethrow non-`ORPCError` failures
so an infra blip is a 500, not a 401 sign-out.
**Test.** Runtime: a throwing session lookup yields 500; a missing session still yields 401.

**4.2 Consumer middleware after context (API-2).** Give consumer middleware a phase that runs after
context injection so raw routes reach `db`/`auth`, and export the origin-CSRF helper. Decision in
the milestone: second entry point versus moving the existing phase; default to a documented second
phase so existing consumers keep their ordering.
**Test.** Real-graph: a consumer route handler reads `db` from context; the helper rejects a
disallowed origin.

**4.3 Dev origins gated at runtime (API-3, AUTH-6).** Dev-server localhost origins join CORS and
trustedOrigins only when the worker runs in dev (`STACK_DEV`), not baked at codegen. Decouple the
cookie `sameSite` choice from localhost detection: derive it from the expo option explicitly.
**Test.** Runtime: with `STACK_DEV` unset, localhost is absent from CORS and trustedOrigins and
`sameSite` still matches the expo configuration; with it set, localhost is accepted.

**4.4 `assertCan` message override (AZ-1).** Optional message parameter; default copy unchanged.
**Test.** Unit: override appears in the FORBIDDEN error; cloaking still yields NOT_FOUND.

**4.5 Auth contributes `/api/auth` to `api.slots.routePrefixes` (AUTH-8).** Closes the vite
dev-proxy gap plugin-api's comment already expects.
**Test.** Real-graph: the resolved prefixes include `/api/auth` when auth is present.

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

**Test.** Runtime: a mirror middleware duplicates `x-stack-reads`/`x-stack-writes` onto legacy
names; the gate returns 426 on a prefixed route and passes a consumer raw route untouched.

### WS6 — observability and env parity (WIRE-4, API-4)

**6.1 `analytics_engine` binding kind** on `WranglerBindingSpec`, contributable like the existing
kinds.
**Test.** Codegen: a contributed dataset renders `[[analytics_engine_datasets]]`.

**6.2 Version-gate telemetry.** The gate writes walled and header-less counters to a contributed
dataset when the binding is present, and stays silent when absent. Restores sailward's fail-open
canary.
**Test.** Runtime: a walled request and a header-less request each write a datapoint against a stub
binding; no binding, no write, no error.

**6.3 Env value validation.** Extend `cloudflare.slots.secrets` with optional validation hints
(min length, URL shape) and generate a once-per-isolate assertion, replacing presence-only checks.
Include the refuse-to-serve refinement: a non-localhost `APP_URL` with dev-mode settings fails
fast.
**Test.** Runtime: a too-short secret fails the first request with a named error; valid env passes
and validates once.

## Non-goals

- No header-name or rate-limit-value consumer options; the closed accepted-differences list above
  is the boundary.
- No sailward-side changes in this repo. The backport of these fixes and the staged client release
  (WS5) are sailward work items tracked in the roadmap sequencing.

## Acceptance

Per milestone: implementation plus co-located tests land, tests drive the real graph or a
miniflare-booted worker, `pnpm test` and `pnpm check` pass. WS1 and WS2 additionally record a live
smoke test against throwaway Cloudflare resources, since both sit on the production deploy path.
The dogfood signal for the PRD as a whole: every blocking finding in the gap analysis is closed or
sits on the accepted-differences list, and a staged in-place cutover of the live `sailward` worker
is attemptable.
