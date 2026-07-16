# Roadmap: sailward → stack extraction

The living tracker for turning sailward's hand-built plumbing into stack. PRDs under
[`prd/`](./prd/) are the per-workstream drivers; this file is the layer above them: the model, the
decisions, the coverage map, and the PRD pipeline. Update it whenever a finding, a decision, or a
PRD status changes. Point-in-time audits stay in [`analysis/`](./analysis/); this doc is living.

## Model

Sailward (`~/projects/sailward`) is the latest hand-built app on stack's exact target: SolidJS,
Hono, Cloudflare Workers, D1 + Drizzle, and Expo. Its four apps (worker, web, mobile, ota) are
structurally what a `@fcalell/stack` consumer writes by hand today. Stack is the extraction of that
plumbing. Every part of sailward that is not business logic is a candidate for a plugin or a core
CLI capability. The domains line up almost one to one with the plugin roster, down to the same oRPC
version, because stack is being extracted from sailward.

Two consequences follow:

- **Sailward is stack's acceptance test.** A feature is done when sailward could delete its
  hand-rolled version and adopt the plugin's behavior.
- **Sailward migrates to a consumer only after each replaced surface is proven.** It is a live app,
  so correctness gates the migration. Migration is the last step, not the driver.

## Decisions (2026-07-15)

- Sailward becomes a stack consumer incrementally, one proven surface at a time, never before the
  plugin reproduces the live behavior.
- `backend-hardening.md` stays scoped to worker-runtime, db, and authz hardening. It already
  absorbs the bulk of the sailward audit (WS3 invalidation, WS4 version gate, WS5 db gates, WS6
  abilities). Do not expand it to cover tooling or new domains.
- The release and deploy engine (reconcile, deploy lock, blocking gates, enforced order, TUI) is a
  separate PRD. It is CLI tooling, not worker hardening.
- OTA (hot-updater: `apps/ota` plus the mobile client plus the bundle/prune/parity logic in
  `tools/release`) is a separate PRD, `plugin-native-updates`. It pairs with the deploy engine. The
  name states the job and joins the `native-*` family (`plugin-native-ui`); `plugin-ota` (jargon)
  and `plugin-live-updates` (realtime collision) were rejected. `plugin-expo-updates` stays open as
  the namespaced alternative.
- The release TUI port is the generic run engine only: terminal sizing (`term.ts`), the run view
  and event sink (`run.tsx`), and run-log files (`logs.ts`). The bespoke fleet/native/ota dashboard
  stays in sailward. The engine must fall back to linear logs when stdout is not a TTY.
- Acceptance per workstream gains one signal: sailward can delete its hand-rolled equivalent. This
  ties the dogfood goal to each merge.
- P0 hardening fixes (WS1, WS2) are live bugs in sailward-shaped consumers now. Land the fix in the
  plugin and backport it to sailward by hand, so the eventual migration is a no-op there.

## Decisions (2026-07-16)

- Backend hardening shipped end to end (WS1 through WS6): the `plugin-api` runtime guards,
  `plugin-auth` throttling plus org tables, entity cache invalidation, the native version gate, db
  safety gates with seeding, and record-scoped abilities. `backend-hardening.md` is retired. Its WS7
  follow-ups are folded into "Follow-up plugin candidates" below so the parked work survives the
  deletion.
- The local dev D1 wiring was fixed alongside WS5. `wrangler dev` now reads the generated
  `.stack/wrangler.toml`, and for the d1 dialect dev applies migrations into the miniflare database
  the worker and seed share. This part ships unvalidated in-repo (no live wrangler here); smoke-test
  it against a real D1 before relying on d1 dev.

## Decisions (2026-07-16, backend gap analysis)

- The [sailward backend gap analysis](./analysis/sailward-backend-gaps.md) audited all six backend
  domains code to code. The extraction is faithful (auth schemas column-identical bar one additive
  column, same gate algorithms, matching dependency versions), but migration is blocked by four
  clusters: the `x-sw-*` → `x-stack-*` wire rename, plugin-cloudflare deploy-path faults,
  plugin-auth surface gaps, and the unvalidated production-D1 path. Findings carry stable IDs the
  PRD references.
- [`backend-parity.md`](./prd/backend-parity.md) is the PRD that closes them, sequenced ahead of
  deploy-engine: several findings are live bugs in any stack consumer today (expo session-cookie
  drop, rate-limiter codegen shape, secrets emitted as vars, session errors read as 401).
- Env value validation and the analytics-engine binding kind are promoted from the parked list
  into backend-parity WS6. Sailward proves both shapes live, so the promote-once-proven rule is
  satisfied. Email and push stay parked; the analysis confirms they migrate as consumer code.
- Wire compat (WIRE-1..3): header names stay `x-stack-*`, no rename option. Migrating consumers
  mirror response headers in consumer middleware; sailward ships a dual-stamping client release
  before any version-gate floor raise, and the pre-release cohort stays un-wallable (accepted,
  measured by gate telemetry).

## Decisions (2026-07-16, ui-core)

- The two UI plugins theme in different languages: `plugin-solid-ui` ships a shadcn-vocabulary
  sheet themed by CSS variable overrides, `plugin-native-ui` generates a Marina-vocabulary sheet
  from a `themeTokens` hex record. [`ui-core.md`](./prd/ui-core.md) extracts the design-decision
  layer into `packages/ui-core` (token contract, parametric OKLCH derivation, invariant CVA
  matrices, shared `cn()`, design laws); both plugins render from it and accept one `theme` option
  schema. `app.theme` was rejected: theme is UI-domain, `app` stays identity.
- The sharing line: ui-core matrices hold platform-invariant cells only (fills, borders, ink,
  padding rungs, radius, type role); interaction and state classes stay platform overlays.
  Behavior, primitives, and a11y never share.
- Marina's guardrails port as the contract: zeroed token namespaces (off-contract classes compile
  to nothing), named spacing rungs, role-based type tokens, emphasis × tone variant axes. The
  shadcn axis names in `plugin-solid-ui` retire; the API break is accepted.
- ui-core runs parallel to the backend track (UI domain, no shared surfaces) and precedes any
  React web UI plugin.

## Coverage map

Sailward domain against stack status. "Tracked in" names the PRD workstream or the gap.

| Domain | Sailward tech | Stack status | Tracked in |
|--------|---------------|--------------|------------|
| API / RPC | Hono + oRPC | `plugin-api` | shipped; parity gaps in backend-parity WS4/WS5 |
| Auth | better-auth (+ expo) | `plugin-auth` | shipped; parity gaps in backend-parity WS3 |
| Cache invalidation | oRPC `reads/writes` entity headers | `plugin-api` + `plugin-db` | shipped; wire compat in backend-parity WS5 |
| Native version gate | per-platform build floor, `426` | `plugin-expo` | shipped; wire compat + telemetry in backend-parity WS5/WS6 |
| Authorization | CASL record-scoped abilities | `plugin-auth` + `plugin-api` | shipped; ready with backend-parity WS4.4 |
| DB safety | drizzle drift + destructive gates, seed | `plugin-db` | shipped; production path in backend-parity WS2 |
| DB workflow | `studio`, `watch:db:local`, `scenario` | gap | unplanned (see below); d1 inner loop in backend-parity WS2.3 |
| CF deploy | wrangler | `plugin-cloudflare` | shipped; deploy-path faults in backend-parity WS1 |
| Mobile | Expo + expo-router | `plugin-expo` + `native-ui` | shipped |
| Web | SolidJS + Vite | `plugin-solid` / `solid-ui` / `vite` | shipped |
| Design system | Marina (`global.css` + `src/ui` + design laws) | split vocabularies: `solid-ui` shadcn, `native-ui` Marina | ui-core PRD |
| Dev multiplexer | mprocs | `stack dev` (supervise) | TUI upgrade in deploy-engine PRD |
| Release orchestration | `tools/release` (Ink TUI) | linear `stack deploy` | deploy-engine PRD |
| OTA updates | hot-updater | gap | plugin-native-updates PRD |
| Inner-loop gates | `check:proc-deps`, drift, destructive | `plugin-api` + `plugin-db` | shipped: WS3 `reads/writes` replaces proc-deps; WS5 drift + destructive |
| Observability | Sentry (worker + mobile) | gap | Sentry parked; analytics-engine binding + gate telemetry in backend-parity WS6 |
| i18n | expo-localization + `src/i18n` | gap | parked |
| Email / push / env validation | CF Email, Expo push, env checks | gap | email/push parked (below); env validation in backend-parity WS6.3 |
| E2E | Maestro + storyboard + db scenarios | gap | unplanned (db scenario states deferred) |

Notes on the partial rows:

- **DB workflow.** The shipped db safety surface covers drift, destructive migrations, and seeding.
  Sailward also ships `studio:db:local`, `watch:db:local`, and named `scenario` states. The d1
  push/watch inner loop is backend-parity WS2.3; named scenarios are deferred and studio is not yet
  tracked. Decide those when `plugin-db` targets full consumer parity.
- **Inner-loop gates.** `check:proc-deps` exists in sailward only because the `reads/writes`
  annotation is a forgettable middleware. Stack makes the declaration a typed procedure option, so
  the gate is unnecessary. A generic cross-plugin `stack check` slot is out of scope; gates live in
  their owning plugin (`plugin-db` owns `stack db check`).

## PRD pipeline

- **Shipped and retired:** backend-hardening (WS1 through WS6). The parked follow-ups it recorded
  are folded into the next section.
- **Drafted:** [`backend-parity.md`](./prd/backend-parity.md) (closes the blocking findings from
  the [backend gap analysis](./analysis/sailward-backend-gaps.md); first in line, holds live
  consumer bugs). [`deploy-engine.md`](./prd/deploy-engine.md) (reconcile + lock + gates + enforced
  order + TUI, extracted from `tools/release`). [`plugin-native-updates.md`](./prd/plugin-native-updates.md)
  (hot-updater domain; consumes the deploy-engine surfaces). [`ui-core.md`](./prd/ui-core.md) (one
  token contract + variant matrices + design laws for both UI plugins, extracted from Marina;
  domain-parallel to the backend track).
- **Parked:** i18n, observability (Sentry), and the follow-up plugin candidates below. Promote to a
  PRD only once sailward proves the shape, per the philosophy rule that a new consumer surface is the
  last resort.

## Follow-up plugin candidates (parked)

Recorded from the retired backend-hardening PRD (its WS7). Each is a new consumer-facing domain, so
each waits until sailward proves the shape.

- **`plugin-email`.** Wrap the Cloudflare Email Sending binding: a `send_email` kind on
  `WranglerBindingSpec`, a `ctx.email.send()` runtime, and a default OTP template so
  `auth.defineCallbacks` gains a zero-config `sendOTP` (every consumer writes it by hand today).
  Email content never rides the Subject line (lock-screen previews, relay logs).
- **Push notifications (`plugin-expo` or `plugin-push`).** A contributed `pushTokens` table and a
  `queuePush()` on the procedure context: `waitUntil` fire-and-forget (the `executionCtx` wiring
  shipped in WS1.3), 100-message Expo batching, automatic `DeviceNotRegistered` token pruning.

Env value validation and the Analytics Engine binding kind, formerly parked here, are promoted
into [backend-parity](./prd/backend-parity.md) WS6 (2026-07-16 decision above).

## Sequencing

By leverage, not effort:

1. Execute the [backend-parity](./prd/backend-parity.md) PRD. It gates the migration and holds
   live consumer bugs; WS1/WS2 also de-risk the deploy path deploy-engine builds on.
2. Backport the shipped hardening and db gates to sailward so its eventual migration is a no-op,
   and ship the dual-stamping client release (backend-parity WS5's sailward-side half).
3. Open and execute the deploy-engine PRD, then `plugin-native-updates`. Largest and most
   differentiated; the `tools/release` code is the design spec.
4. Migrate sailward surface by surface as each plugin reaches parity, backend order per the gap
   analysis: db (history copy + additive auth migration) → worker shell → auth → clients.
5. Decide the DB-workflow parity gap (studio, watch, named scenarios) when `plugin-db` targets full
   consumer parity.
