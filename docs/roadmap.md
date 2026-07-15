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

## Coverage map

Sailward domain against stack status. "Tracked in" names the PRD workstream or the gap.

| Domain | Sailward tech | Stack status | Tracked in |
|--------|---------------|--------------|------------|
| API / RPC | Hono + oRPC | `plugin-api` | backend-hardening WS1 |
| Auth | better-auth (+ expo) | `plugin-auth` | backend-hardening WS2 |
| Cache invalidation | oRPC `reads/writes` entity headers | gap | backend-hardening WS3 |
| Native version gate | per-platform build floor, `426` | gap | backend-hardening WS4 |
| Authorization | CASL record-scoped abilities | gap | backend-hardening WS6 |
| DB safety | drizzle drift + destructive gates, seed | gap | backend-hardening WS5 |
| DB workflow | `studio`, `watch:db:local`, `scenario` | gap | unplanned (see below) |
| CF deploy | wrangler | `plugin-cloudflare` | shipped |
| Mobile | Expo + expo-router | `plugin-expo` + `native-ui` | shipped |
| Web | SolidJS + Vite | `plugin-solid` / `solid-ui` / `vite` | shipped |
| Dev multiplexer | mprocs | `stack dev` (supervise) | TUI upgrade in deploy-engine PRD |
| Release orchestration | `tools/release` (Ink TUI) | linear `stack deploy` | deploy-engine PRD |
| OTA updates | hot-updater | gap | plugin-native-updates PRD |
| Inner-loop gates | `check:proc-deps`, drift, destructive | partial | WS3 subsumes proc-deps; WS5 covers drift + destructive |
| Observability | Sentry (worker + mobile) | gap | parked (WS4 stretch: analytics engine) |
| i18n | expo-localization + `src/i18n` | gap | parked |
| Email / push / env validation | CF Email, Expo push, env checks | gap | backend-hardening WS7 (parked) |
| E2E | Maestro + storyboard + db scenarios | gap | unplanned (scenario deferred WS5.3) |

Notes on the partial rows:

- **DB workflow.** WS5 covers the safety-critical db surface (drift, destructive, seed). Sailward
  also ships `studio:db:local`, `watch:db:local`, and named `scenario` states. Scenario is deferred
  in WS5.3; studio and watch are not yet tracked. Decide these when `plugin-db` targets full
  consumer parity.
- **Inner-loop gates.** `check:proc-deps` exists in sailward only because the `reads/writes`
  annotation is a forgettable middleware. WS3 makes the declaration structural (a typed option), so
  the gate is unnecessary once WS3 lands. A generic cross-plugin `stack check` slot is out of scope;
  gates live in their owning plugin.

## PRD pipeline

- **Active:** [`backend-hardening.md`](./prd/backend-hardening.md). P0 (WS1, WS2) in progress.
- **Drafted:** [`deploy-engine.md`](./prd/deploy-engine.md) (reconcile + lock + gates + enforced
  order + TUI, extracted from `tools/release`). [`plugin-native-updates.md`](./prd/plugin-native-updates.md)
  (hot-updater domain; consumes the deploy-engine surfaces).
- **Parked:** i18n, observability (Sentry), and the WS7 follow-ups (email, push, env-value
  validation). Promote to a PRD only once sailward proves the shape, per the philosophy rule that a
  new consumer surface is the last resort.

## Sequencing

By leverage, not effort:

1. Finish P0 backend hardening (WS1, WS2); backport each fix to sailward.
2. Land WS3 (`reads/writes`) and WS6 (abilities): pure plumbing wins, minimal new surface.
3. Land WS5 db safety gates; decide the DB-workflow parity gap.
4. Open and execute the deploy-engine PRD, then `plugin-ota`. Largest and most differentiated; the
   `tools/release` code is the design spec.
5. Migrate sailward surface by surface as each plugin reaches parity.
