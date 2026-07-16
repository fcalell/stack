# Sailward backend gap analysis (2026-07-16)

Point-in-time audit of sailward's live backend (`~/projects/sailward`) against the shipped stack
plugins, compared code to code on both sides. It answers one question: can sailward's worker
migrate to a stack consumer without breaking the live app? Findings carry stable IDs (`WIRE-1`,
`CF-3`, ...) so the [backend-parity PRD](../prd/backend-parity.md) and future sessions can cite
them. Sailward paths are relative to `~/projects/sailward`; stack paths are relative to this repo.

## Verdict

The extraction is faithful. Auth table schemas are column-identical except one additive column,
the db gates run the same algorithms as sailward's scripts, and versions match sailward's pins
(better-auth 1.6.14, drizzle-orm ^0.45.2, drizzle-kit ^0.31.0, hono ^4.12.23, same oRPC minor).
The runtime shell reproduces sailward's middleware ordering with more test coverage than the
original. Migration is still blocked by four clusters: the `x-sw-*` to `x-stack-*` wire rename,
four deploy-path faults in plugin-cloudflare, four plugin-auth surface gaps, and an unvalidated
production-D1 path whose deploy semantics are weaker than sailward's release gates.

| Domain | Verdict | Gating findings |
|--------|---------|-----------------|
| Authorization + cache invalidation | ready with two shims | WIRE-1, AZ-1 |
| API/RPC shell | close | WIRE-1, API-1, API-2 |
| Auth data layer | ready | AUTH-5 (one additive migration) |
| Auth runtime + expo client | not ready | AUTH-1..4 |
| DB | not ready for live data | DB-1, DB-2 |
| Cloudflare/wrangler | not ready | CF-1..4 |
| Version gate + misc worker services | parity, latent wire break | WIRE-2..4 |

## Wire contract (WIRE)

Stack renamed all four custom headers. Deployed native builds lag app-store releases by weeks and
speak the old names, so the rename is the single decision that gates three domains.

- **WIRE-1 — `x-sw-reads`/`x-sw-writes` renamed to `x-stack-reads`/`x-stack-writes`**
  (`plugins/api/src/wire.ts:10-11` vs sailward `apps/worker/src/worker/orpc.ts:82-83`). Deployed
  mobile builds parse only `x-sw-*` (`apps/mobile/src/lib/api.ts:85-86`). A stack-backed worker
  kills cache invalidation on every in-field client: stale screens after every mutation, no error
  anywhere. Value format matches exactly (comma-joined, header only when non-empty,
  `plugins/api/src/procedure.ts:474-488`), so mirroring the header is a complete shim.
- **WIRE-2 — version-gate headers renamed** `x-sw-client-build`/`x-sw-client-platform` to
  `x-stack-client-*` (`plugins/expo/src/version-gate-shared.ts:7-8` vs sailward
  `apps/worker/src/worker/version-gate.ts:30-31`). Pre-migration builds become permanently
  invisible to the gate (fail-open), which is exactly the cohort a floor raise would target.
  Consequence-free today: sailward's floors have been 0 since ship
  (`apps/worker/src/worker/min-native-build.ts:9-12`). Everything else matches: 426, integer-regex
  fail-open, 426-before-429 ordering, config-constant floor
  (`plugins/expo/src/worker/version-gate.ts:17,47-63`, `plugins/expo/src/index.ts:414-448`).
- **WIRE-3 — gate scope widened.** Sailward gates only `/rpc/*`
  (`apps/worker/src/worker/index.ts:58-67`); stack gates everything except `/` and `/api/auth`
  (`plugins/expo/src/worker/version-gate.ts:21-29`). A stale client's raw consumer route (sailward:
  `/upload/*`) would newly get 426.
- **WIRE-4 — gate telemetry lost.** Sailward counts every walled and header-less request in an
  Analytics Engine dataset as an alertable canary (`apps/worker/src/worker/version-gate.ts:33-54`,
  `apps/worker/wrangler.toml:82-84`). The stack gate emits nothing, and it short-circuits at
  `after-cors` order 0, before consumer middleware (`before-routes` order 100), so consumer code
  cannot reproduce the counters.

## API/RPC shell (API)

At parity: oRPC handler + header plugins, content-type CSRF guard (415), unexpected-error logging,
CORS mechanism and derived origins, `secureHeaders`/`logger` ordering, liveness `GET /`, context
construction with per-env WeakMap caching, `executionCtx.waitUntil`, all three rate-limit surfaces
including the gmail-folding email key, and route assembly with collision guard. Covered by
`plugins/api/src/worker/runtime.test.ts` (575 lines). Error-body cosmetics (404/415/429/426 payload
keys, English vs Italian copy) are non-breaking: the sailward client acts on status codes and
renders its own copy.

- **API-1 — session-resolution failure becomes 401.** `procedure({auth: true})` catches any error
  from `getSession` and converts it to `UNAUTHORIZED` (`plugins/api/src/procedure.ts:267-273`).
  Sailward lets a D1 outage propagate as 500 (`apps/worker/src/worker/orpc.ts:54-62`). Under stack,
  an infra blip reads as "session invalid" and can trigger client sign-out storms.
- **API-2 — consumer raw routes cannot reach the plugin context.** `src/worker/middleware.ts`
  mounts before context injection (`plugins/api/src/worker/index.ts:326-332`), so a migrated raw
  Hono route (sailward's photos upload, `apps/worker/src/worker/index.ts:79`) must rebuild its own
  `db`/`auth` clients. No origin-CSRF helper is exported either (sailward
  `apps/worker/src/worker/origins.ts:20-25`).
- **API-3 — localhost origins baked into production.** plugin-expo contributes
  `http://localhost:8081` to CORS unconditionally at codegen (`plugins/expo/src/index.ts:403-407`);
  sailward gates it on `isProduction` at runtime (`apps/worker/src/worker/origins.ts:11-13`).
  Production deploys accept credentialed localhost origins.
- **API-4 — env validation is presence-only.** Per-plugin `validateEnv` checks truthiness
  (`plugins/auth/src/worker/index.ts:467-484`); sailward's `assertEnv` is a zod schema with format
  checks and two refinements, including "non-localhost APP_URL must be production"
  (`apps/worker/src/worker/env.ts:8-69`). `STACK_DEV=1` on a production deploy would silently
  disable all rate limits with no guard.
- **API-5 — RPC volume limit fixed at 1000/60** (`plugins/api/src/index.ts:421-425`, deliberately
  not a consumer option) vs sailward's 600/60 (`apps/worker/wrangler.toml:67-70`). Accepted
  difference.

## Auth (AUTH)

At parity: better-auth 1.6.14 both sides, `drizzleAdapter` with the same model map, emailOTP
security params (6 digits, 300 s, 3 attempts), `cf-connecting-ip`, cookieCache off for expo,
social providers with `appBundleIdentifier`, per-isolate instance cache, throttling mechanism with
the same email-folding key (limits differ but are options: stack ip 100/60 email 3/60 vs sailward
30/60 and 5/60). Core table schemas are column-identical (names, `timestamp_ms` modes, defaults,
FKs, indexes) per `plugins/auth/src/schema/index.ts:35-142` vs sailward
`apps/worker/src/schema/auth.ts:4-107`.

- **AUTH-1 — no `deleteUser` surface.** Sailward enables account deletion with a `beforeDelete`
  hook: skipper veto, Apple token revocation, R2 cover cleanup, PII scrub
  (`apps/worker/src/worker/auth.ts:66-148`). Stack's `user` config accepts only `additionalFields`
  (`plugins/auth/src/worker/index.ts:305-310`); no hook surface exists. Account deletion is an App
  Review 5.1.1(v) hard requirement. Drags in `session.freshAge: 0` support
  (`apps/worker/src/worker/auth.ts:168`), which stack also lacks.
- **AUTH-2 — expo client drops the cookie prefix.** `createAuthClient` never forwards a
  `cookiePrefix` to `expoClient()` (`plugins/auth/src/expo.tsx:29-36`), which then defaults to
  `"better-auth"` while the server uses the consumer prefix (sailward: `"wn"`,
  `apps/worker/src/worker/auth.ts:150`; sailward's client documents that a mismatch silently drops
  the session cookie, `apps/mobile/src/lib/auth.ts:19-22`). Every native device discards its
  still-valid session cookie: a de-facto global logout. One-line fix, session-critical.
- **AUTH-3 — no `generateOTP` passthrough.** Sailward returns a fixed OTP for the App-Store review
  account (`apps/worker/src/worker/auth.ts:180-183`); stack pins the whole `emailOTP()` config
  (`plugins/auth/src/worker/index.ts:166-176`). Reviewer sign-in is inexpressible.
- **AUTH-4 — `sendOTP` callback cannot reach `env`.** Payload is `{email, code}` only
  (`plugins/auth/src/types.ts:209-212`); sailward's sender needs the `EMAIL` send binding on the
  per-request env (`apps/worker/src/worker/email.ts:14`). The callback file is a static module, so
  there is no route to the binding.
- **AUTH-5 — one additive schema delta.** Stack adds nullable `session.active_organization_id`
  unconditionally (`plugins/auth/src/schema/index.ts:72`). The drizzle adapter selects it on every
  session read, so adoption requires one additive `ALTER TABLE` shipped with the cutover. No data
  loss, no logout; everything else is byte-identical, so live rows and sessions survive (same
  `AUTH_SECRET`, same cookie name via `cookies.prefix`).
- **AUTH-6 — trusted origins baked once at codegen, localhost included.** plugin-expo contributes
  `localhost:8081` into production trustedOrigins and CORS (`plugins/expo/src/index.ts:403-407`);
  sailward keeps it dev-only, citing better-auth's warning (`apps/worker/src/worker/auth.ts:20-29`).
  The cookie `sameSite: "none"` setting is coupled to the same localhost detection
  (`plugins/auth/src/index.ts:153-155`): override origins to prod-only and sameSite silently
  becomes `lax`.
- **AUTH-7 — expo client ergonomics behind sailward's.** No typed sign-in-cancelled errors, no
  Android Apple browser-flow cancel probe, no `appleAuthorizationCode` return (needed for
  deletion-time revocation) (`plugins/auth/src/expo.tsx:139-198` vs sailward
  `apps/mobile/src/lib/auth.ts:74-159`). Sailward can keep its own client, so not blocking.
- **AUTH-8 — auth never contributes `/api/auth` to `api.slots.routePrefixes`** despite plugin-api's
  own comment expecting it (`plugins/api/src/index.ts:111-115`). Breaks the vite dev proxy for web
  consumers; moot for native-only sailward.

## Authorization + cache invalidation (AZ)

At parity: `defineAbility`/`subject()`/`assertCan` cover every rule shape sailward defines
(ownership equality, `$in`, multi-field, literal conditions, `manage` wildcard; enumerated from
`apps/worker/src/worker/authz.ts:77-113`), the packed-rules wire format is byte-identical
(`packRules` passthrough, `plugins/api/src/ability/index.ts:118-125`), reads/writes declaration is
a typed procedure option validated at module init, and the client capture/invalidation pipeline is
functionally equivalent. Nothing sailward expresses is inexpressible. Fleet authority
(`fleet-authz.ts`) is plain DB role checks and migrates verbatim as consumer code.

- **AZ-1 — `assertCan` denial copy is fixed English** ("Insufficient permissions",
  `plugins/api/src/ability/index.ts:100-111`) with no message parameter; sailward's ~20 sites show
  Italian copy via the mobile error toast. Workaround per site: `ability.cannot` plus a custom
  error.
- **AZ-2 — no input-scoped invalidation narrowing.** Sailward skips invalidating other trips'
  queries when both sides carry `tripId` (`apps/mobile/src/lib/api.ts:89-105`); stack intersects
  reads and writes only (`plugins/api/src/query-invalidation.ts:77-92`). Over-invalidates across
  trips; never under-invalidates. Accepted.
- **AZ-3 — typed `can()` takes one action and one subject** (`plugins/api/src/ability/index.ts:53-59`);
  sailward's array-form grants unroll mechanically. Per-subject action pairing (tuple-union typing)
  is also lost. Type-level only.
- **AZ-4 — `useAbility` returns an untyped ability and always fires the `auth/orgRules` query**,
  a wasted request per session when organizations are disabled
  (`plugins/api/src/ability-client.ts:95,121-148`). Sailward's typed per-trip ability rebuilds on
  `unpackAbility` directly.

## DB (DB)

At parity: same drizzle-orm/drizzle-kit versions, same journal and snapshot format so sailward's
17 migrations plus `meta/` copy verbatim and the live `d1_migrations` history is preserved, drift
and destructive gates run the same algorithms as sailward's scripts
(`plugins/db/src/node/migration-safety.ts:109-229` vs sailward `scripts/check-drift.js` and
`scripts/check-destructive.js`, including the drizzle-kit `--out` workaround), seeding is a strict
generalization of sailward's (idempotent upsert + prune, chunked under D1's param budget, composite
PKs handled), and the db client is identical (no `casing`, no `logger`, so no SQL identifier
drift). The destructive-ack marker renamed to `stack:allow-destructive`
(`migration-safety.ts:17`); sailward's old markers are inert since only the newest migration is
checked.

- **DB-1 — the d1 wrangler wiring is unvalidated, with a probable `migrations_dir` bug.** The
  generated config lives at `.stack/wrangler.toml` and emits `migrations_dir = "./src/migrations"`
  (`plugins/db/src/index.ts:340`); wrangler resolves migration paths relative to the config file,
  which points at `.stack/src/migrations`. Failure mode ranges from a hard error to a silent
  "no pending migrations" no-op at deploy. No test runs a real wrangler apply (`push.test.ts`
  mocks `runCommand`). `docs/roadmap.md` already mandates the smoke test.
- **DB-2 — deploy auto-generates and auto-applies migrations, inverting sailward's posture.** A
  `deployChecks` contribution runs `generateMigrations` (writing real files) during deploy planning
  and its action applies them remotely (`plugins/db/src/index.ts:509-519`); non-TTY skips the
  confirm. Sailward's release hard-fails on drift and applies only committed, reviewed SQL
  (`apps/worker/package.json` `release` script). The destructive gate is contributed before the
  generate check (`plugins/db/src/index.ts:502-519`), so a destructive migration generated in the
  same resolve pass is never gated. `drizzle-kit generate` also runs with piped stdin
  (`plugins/db/src/node/exec.ts:11-14`); behavior on an ambiguous-rename prompt is unverified.
- **DB-3 — `stack db push` and the dev watcher miss d1's local loop.** On d1, push writes to
  `.stack/dev/local.db`, a plain file the miniflare worker never reads
  (`plugins/db/src/node/push.ts:14-18,45-57`), and the watcher applies committed migrations rather
  than pushing schema edits (`plugins/db/src/index.ts:448-459`). Sailward's inner loop pushes
  straight into the miniflare sqlite (`scripts/dev-db-watch.js:84-92`,
  `apps/worker/drizzle-local.config.ts:15-32`).
- **DB-4 — no studio, no scenario harness.** Sailward ships `studio:db:local` and nine named,
  idempotent scenario states its e2e suite depends on (`scripts/scenario.js`). Tracked as the
  DB-workflow parity gap in the roadmap; not a backend-migration blocker.
- **DB-5 — seed authoring must be rewritten** from `scripts/seed.js` catalogs to
  `src/schema/seed.ts` `defineSeed` (mechanical). Stack prunes per table in entry order
  (`plugins/db/src/node/seed.ts:140-157`) where sailward prunes children-before-parents at the end,
  so entry order must respect FK actions.
- **DB-6 — `database_name` drifts to the databaseId UUID** (`plugins/db/src/index.ts:337-338`) vs
  the live `database_name = "sailward"`. Deploy keys on `database_id`, so cosmetic; include in the
  DB-1 smoke test.

## Cloudflare/wrangler (CF)

At parity: worker `name` preserved via consumer wrangler.toml or `app.name`, compat date via
consumer file, `nodejs_compat` via plugin-auth's contribution, D1 via plugin-db, `[vars]` merge
with collision detection, `.dev.vars` generation with `STACK_DEV=1`, and verbatim pass-through for
everything outside `FRAMEWORK_MANAGED_LISTS` (`plugins/cloudflare/src/node/codegen.ts:25-32,84-92`),
which covers sailward's `send_email`, `analytics_engine_datasets`, `send_metrics`, and
`[observability]`. Deploy sequencing (migrate, seed, then `wrangler deploy --config
.stack/wrangler.toml`) matches sailward's release legs.

- **CF-1 — routes is a dead slot.** `cloudflare.slots.routes` has zero contributors, the plugin
  exposes no option (`cloudflareOptionsSchema` is empty, `plugins/cloudflare/src/types.ts:3`), and
  consumer `[[routes]]` is rejected as framework-managed (`codegen.ts:25-32`). Sailward's
  `api.sailward.app` custom domain is undeclarable; a fresh environment could never recreate it.
- **CF-2 — R2 bindings are unreachable.** The `r2` kind exists in `WranglerBindingSpec` and codegen
  (`codegen.ts:385-391`) but no plugin contributes it, there is no consumer surface, and consumer
  `[[r2_buckets]]` is rejected. The live `PHOTOS` bucket cannot be bound.
- **CF-3 — rate-limiter codegen shape is probably undeployable.** Generated `[[unsafe.bindings]]`
  entries carry flattened `limit`/`period` and no `namespace_id` (`codegen.ts:412-420`); the
  documented shape (and sailward's working config, `apps/worker/wrangler.toml:55-58`) nests
  `simple = { limit, period }` with a `namespace_id`. Wrangler does not validate `unsafe`, so this
  surfaces as a Cloudflare API error at the first real deploy. Never live-tested (`wrangler types`
  is the only round-trip in the plugin's tests).
- **CF-4 — declared secrets are emitted as empty `[vars]`** (`codegen.ts:276-278`). A plain-text
  var sharing a name with a value set via `wrangler secret put` likely conflicts at deploy. Needs
  live verification; sits directly on the cutover path.
- **CF-5 — no surface for extra rate limiters or compat flags.** Sailward's `RATE_LIMITER_UPLOAD`
  has no contributor; top-level `[[ratelimits]]` passes through but coexists uncoordinated with the
  framework's `[[unsafe.bindings]]` limiters. Compat flags beyond `nodejs_compat` have no surface.
- **CF-6 — deploy loses sailward's clean-tree and lock gates** and the git-sha `--message`. The
  deploy lock and blocking gates are deploy-engine PRD scope; noted here for the coverage map.

## Consumer-code classification

Everything else in sailward's worker classifies as business logic with a home in the stack consumer
shape (procedures in `src/worker/routes/`, shared services in `src/worker/`, non-framework bindings
via consumer wrangler.toml pass-through): push send/batch/prune (`push.ts`), OTP email copy
(`email.ts`), Apple code exchange and revocation (`apple.ts`), provisioning, itinerary, money,
names, time, the entity vocabulary list, and the two catalog seed files. The parked plugin-email
and plugin-push are therefore not migration blockers; the code migrates as consumer code and folds
into plugins when they unpark. Stack has no partial email or push surface today (verified: no
`exp.host`, `send_email`, or `expo-notifications` hits in `plugins/` or `packages/`).
