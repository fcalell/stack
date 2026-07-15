# PRD — Backend Hardening & Production Patterns

Source: audit of `sailward/apps/worker` (a production Cloudflare Workers backend that is
structurally what a `@fcalell/stack` consumer would hand-write today) compared against
`plugin-api`, `plugin-auth`, `plugin-db`, and `plugin-expo`.

## Executive summary

The audit surfaced two classes of work:

1. **Gaps in existing runtimes** — five concrete defects (two security/correctness bugs)
   that sailward had to solve by hand and our runtimes currently don't. These are small,
   option-free fixes inside `plugin-api` and `plugin-auth`.
2. **Battle-tested features worth absorbing** — entity-based cache invalidation, a client
   version gate, record-scoped authorization with client-shared abilities, and DB safety
   gates. Sailward assembled each from scattered files plus lint scripts; because we own
   the procedure builder, the generated client, *and* codegen, we can ship each as a
   structurally-enforced, zero-config framework feature.

Everything below follows the standing rules: automate by default (a new consumer-facing
option is the last resort), features live in the plugin that owns the domain, cross-plugin
dataflow goes through the slot graph, and every change lands with real-graph tests.

## Phasing

| Phase | Workstream | Risk it removes |
|-------|-----------|-----------------|
| P0 | WS1 — `plugin-api` runtime hardening | CSRF mutation vector; invisible production 500s; no `waitUntil` |
| P0 | WS2 — `plugin-auth` runtime hardening | Broken native sessions; OTP brute-force; unthrottled auth surface; missing org tables |
| P1 | WS3 — Entity-based cache invalidation | Hand-written client invalidation in every consumer |
| P1 | WS4 — Client version gate (426) | No way to retire native builds against a breaking API change |
| P1 | WS6 — Record-scoped abilities + unified authorization vocabulary | Duplicated permission logic in consumer UIs; no answer for per-record roles/ownership |
| P2 | WS5 — DB safety gates + seeding | Destructive migration breaking a live worker mid-deploy; hand-rolled seed scripts |
| Later | WS7 — Follow-up plugin candidates | (email, push, env value validation) |

P0 items are independent of each other and of P1/P2; they can ship one PR each.

---

## WS1 — `plugin-api` runtime hardening (P0)

All changes in `plugins/api/src/worker/index.ts` and `plugins/api/src/procedure.ts`.
No new consumer options. No codegen changes.

### 1.1 CSRF content-type guard on `/rpc`

**Problem.** The session cookie is `SameSite=None` for native support, and oRPC parses a
request with a *missing* `Content-Type` as JSON. A browser can send such a request
cross-site **without a CORS preflight** (e.g. a typeless `Blob` body), so any authed
mutation is forgeable from a hostile page. Sailward closes this in its entry; our
`app.post(`${rpcPrefix}/*`)` handler has no guard.

**Requirement.** Before dispatching to the RPCHandler, reject any `/rpc` POST whose
`Content-Type` does not start with `application/json` with
`415 { code: "UNSUPPORTED_MEDIA_TYPE" }`. Our oRPC client always sends the JSON content
type and no procedure takes files, so this is invisible to legitimate callers.

**Test.** Boot the emitted worker under miniflare (per testing rules — assert behavior,
not source strings): a POST to an authed procedure with no `Content-Type` gets 415; the
same request with `application/json` reaches the handler.

### 1.2 Log unexpected procedure errors

**Problem.** oRPC's RPCHandler flattens a non-`ORPCError` throw (a D1 error, a real bug)
into an opaque `INTERNAL_SERVER_ERROR` response *before* it reaches Hono's `onError` —
production 500s from procedures currently leave zero server-side trace.

**Requirement.** `createProcedure` installs a root middleware on every chain (public and
authed, ahead of rate-limit/auth middlewares): catch, `console.error` when the error is
not an `ORPCError` (intentional `ORPCError`s are control flow, not bugs), re-throw.

**Test.** Miniflare: a procedure whose handler throws `new Error("boom")` produces a 500
*and* the error is observable on the console; a procedure throwing
`ORPCError("NOT_FOUND")` logs nothing.

### 1.3 Expose `waitUntil` to procedures

**Problem.** The worker context is `{ env, request, reqHeaders, resHeaders, ...plugins }`.
Procedures cannot schedule fire-and-forget work (push delivery, emails, cleanup) without
holding the response open. Prerequisite for WS7 (push/email).

**Requirement.** `createWorker`'s fetch receives the Workers execution context; inject
`executionCtx: Pick<ExecutionContext, "waitUntil">` into `BaseContext` (typed as the
slice — Hono's and wrangler's `ExecutionContext` types disagree on optional members;
`waitUntil` is the actual contract).

**Test.** Miniflare: a procedure calls `context.executionCtx.waitUntil(...)`; the response
returns before the deferred work completes and the deferred effect is observed after.

### 1.4 (Stretch) Blanket per-IP volume limiter on `/rpc`

Per-procedure `rateLimit` guards hot paths; nothing caps raw request volume from a
scripted caller replaying valid requests to burn D1/CPU. `plugin-api` contributes its own
generous `RATE_LIMITER_RPC` binding (dedicated — sharing auth's 100/60 binding would
under-provision the ceiling, double-draw against per-procedure `rateLimit: "ip"`, and let
rpc volume starve `/api/auth`) and applies a per-IP limit across the whole `/rpc` tree,
production-only (same dev-skip signal the per-procedure limiter uses). Ceiling is high
enough that a shared carrier IP never trips it. Skip silently when the binding is absent
from env.

---

## WS2 — `plugin-auth` runtime hardening (P0)

All runtime changes in `plugins/auth/src/worker/index.ts`; schema work in
`plugins/auth/src/schema.ts` + the plugin's codegen contribution.

### 2.1 Disable `cookieCache` for native consumers

**Problem.** The runtime hard-codes `cookieCache: { enabled: true, maxAge: 300 }`
(`worker/index.ts:172`). Cookie cache sets a second cookie (`<prefix>.session_data`)
alongside the session token; React Native reliably round-trips only one cookie, so a
native device ends up sending `session_data` without `session_token` and **every authed
request resolves to no session**. Sailward hit exactly this and turned the cache off.
Our expo wiring (current branch) is likely affected right now.

**Requirement.** When the runtime's `expo` flag is set, force
`cookieCache: { enabled: false }`. Web-only consumers keep the cache (it saves a D1 read
per `getSession`, a legitimate Workers/D1 optimization). No consumer option; the expo flag
already exists and codegen already sets it.

**Test.** Real-graph: config with `expo()` present → generated runtime options carry the
expo flag; runtime unit: `buildAuth({ expo: true })` produces a Better Auth instance with
cookie cache disabled. End-to-end (miniflare): with `expo: true`, `getSession` on a
request carrying only the session-token cookie resolves the session.

### 2.2 Pin OTP security parameters

**Problem.** We call `emailOTP({ sendVerificationOTP })` and inherit library defaults.
The attempt cap is the *actual* brute-force gate (the verify path is only IP-limited);
none of these should be allowed to drift on a dependency bump.

**Requirement.** Pin explicitly in the runtime: `otpLength: 6`, `expiresIn: 300`,
`allowedAttempts: 3`. Constants, not options.

**Test.** Miniflare: fourth wrong OTP guess is rejected even when the code is correct
(invalidated after 3 attempts).

### 2.3 Rate-limit the Better Auth surface

**Problem.** Our `rateLimit` option lives on the oRPC procedure builder, but OTP
send/verify are Better Auth routes under `/api/auth/*` — the auth runtime's `fetch()`
hands them straight to `auth.handler()` with no throttle. The two most abusable
endpoints in the system (OTP send = email-bombing amplifier; OTP verify = brute-force
surface) are unprotected. We already contribute the `RATE_LIMITER_*` bindings.

**Requirement.** Inside the auth runtime's `fetch()` (it owns the `/api/auth` prefix,
so no new middleware wiring is needed):

- **Per-IP** limit on every `/api/auth/*` request, keyed on `cf-connecting-ip`
  (Cloudflare-set, unspoofable — never `X-Forwarded-For` here).
- **Per-email** limit on the OTP-send path (`…/email-otp/send-verification-otp`), keyed
  on a **folded email** so one inbox can't be targeted from many addressing variants:
  lowercase; strip `+tag` from the local part; collapse dots in the local part for
  `gmail.com`/`googlemail.com`. Read the email by cloning the request body (Better Auth
  must still read the original downstream); a body that fails to parse skips the
  per-email check (the per-IP limit still applies).
- Enforcement is **production-only**, reusing the same dev-mode signal the per-procedure
  limiter uses (`_devMode`) — dev must never throttle and the local binding isn't
  meaningfully simulated anyway.
- On limit: `429 { code: "TOO_MANY_REQUESTS" }`.
- When no limiter bindings are configured, skip silently (presence of the bindings is
  already driven by the plugin's `rateLimiter` options).

**Tests.** Unit: `emailKey` folding (`Victim+1@Gmail.com` ≡ `v.i.c.t.i.m@gmail.com` for
gmail; dots preserved for other domains). Miniflare with a stub limiter binding: N+1th
OTP send for the same inbox via different `+tags` is 429; per-IP limit gates non-OTP auth
routes; dev mode never throttles.

### 2.4 Organization tables — fix the drift, then prevent the class

**Problem.** The runtime supports `organization: true` and hands `drizzleAdapter` a schema
map of `{ user, session, account, verification }` only. The organization plugin's tables
(`organization`, `member`, `invitation`) exist nowhere — enabling the option almost
certainly breaks at first query. More generally, any future table-bearing Better Auth
plugin reintroduces the same drift.

**Requirement.**
1. Ship the organization tables in `plugins/auth/src/schema.ts` and include them in the
   adapter's schema map (and in whatever surface feeds the consumer's Drizzle
   schema/migrations) **when the organization option is enabled**.
2. **Prevent the class with a drift test**, borrowing sailward's `auth.cli.ts` trick
   inverted for CI: a test builds the real runtime config (with placeholder credentials —
   generation reads adapter shape, never a live connection), runs `better-auth generate`
   style schema introspection against it, and asserts our static schema declares every
   table/column Better Auth expects — for both the base config and the
   `organization: true` config. Enabling a table-bearing plugin without updating the
   schema turns the suite red.

**Test.** As above, plus miniflare: with `organization: true`, creating an organization
through the auth handler succeeds against a D1 migrated from our schema.

---

## WS3 — Entity-based cache invalidation (P1)

**The pattern (from sailward).** Every procedure declares the entities (≈ tables at which
cross-feature coupling occurs) it reads or writes. The worker ships them to the client as
response headers; a client interceptor invalidates any cached query whose read-set
intersects a mutation's write-set. Result: automatic, precise cache invalidation with
zero per-callsite client code. Sailward needed a regex lint gate to make the (forgettable)
middleware annotation mandatory — we make it structural instead.

**Ownership.** `plugin-api` owns the wire contract (builder options, headers, client
interceptor). `plugin-db` owns the entity vocabulary (it knows the consumer's tables).
Handoff through the slot graph.

### 3.1 Wire contract (`plugin-api`)

- Procedure config grows `reads?: readonly Entity[]` and `writes?: readonly Entity[]`
  (sibling of `auth`/`org`/`rateLimit` — an option object, not a chainable middleware, so
  it is visible in one place and lintable by type).
- The builder emits `x-stack-reads` / `x-stack-writes` response headers via `resHeaders`
  (already in context through `ResponseHeadersPlugin`). Empty/absent → no header.
- `Entity` is a generic `string` union parameter of `createProcedure`, defaulting to
  `string` — the api plugin stays domain-agnostic.

### 3.2 Entity vocabulary (`plugin-db` codegen)

- `stack generate` emits an entity union type derived from the consumer's Drizzle schema
  export names (`src/schema`), surfaced to the procedure builder the same way route types
  reach `routes.d.ts` today (a generated `.stack/*.d.ts` + module augmentation). A typo'd
  entity is a type error; a new table extends the union on the next generate.
- Consumers never author the vocabulary. (Sailward hand-maintains `entities.ts`; we derive
  it.)

### 3.3 Client interceptor (`plugin-api` tanstack-query integration)

- The generated client records each query's read-set from `x-stack-reads` (keyed by query
  key) and, on every successful mutation, invalidates queries whose recorded reads
  intersect the mutation's `x-stack-writes`.
- Applies identically to web (solid) and native (expo) clients — the integration lives in
  `plugin-api/tanstack-query`, which both consume.

### 3.4 Enforcement

- v1: declarations are optional (no breaking change); a query with no `reads` simply never
  auto-invalidates. Recommended pattern documented in the plugin README.
- Design note for later: because `plugin-db`'s runtime provides the `db` context value, a
  future version can *observe* touched tables at runtime and warn on undeclared
  reads/writes in dev — full automation of the declaration. Out of scope here; the header
  contract is designed so this can land without a wire change.

**Tests.** Real-graph: generated entity union matches a fixture schema. Miniflare: a query
response carries `x-stack-reads`; a mutation carries `x-stack-writes`. Client unit
(happy-dom, real tanstack-query): mutation writing `["todos"]` invalidates a cached query
that read `["todos"]` and leaves a `["users"]` query untouched.

---

## WS4 — Client version gate (P1)

**The pattern (from sailward).** Native builds can't be force-updated; a
breaking backend change strands old builds in undefined behavior. A per-platform integer
build floor walls stale clients with `426 Upgrade Required` so the app shows an "update
from the store" screen instead of misbehaving.

**Ownership.** `plugin-expo` owns the feature end-to-end (it owns the native domain): the
middleware contribution, the client headers, and the floor config.

### Requirements

- `expo({ minNativeBuild: { ios?: number; android?: number } })` — default `0` per
  platform (dormant: every build passes). This is a legitimate consumer option: the floor
  is a product decision bumped by hand, atomically with the breaking change.
- `plugin-expo` contributes middleware via `api.slots.middlewareEntries`
  (phase `before-cors` is not needed — `after-cors`, ordered before any rate-limit
  middleware so a walled client's retry storm sees 426, never a confusing 429; encode via
  the `order` field). Behavior, per sailward's hardening:
  - Reads `x-stack-client-build` / `x-stack-client-platform` request headers.
  - Build must match `/^\d+$/` (EAS build numbers are integers; `Number("")` is 0 and
    `parseInt("1.2.3")` is 1 — both would mis-gate). Anything non-integer, an unknown
    platform, or a missing header **fails open** — the wall is a UX nudge, not a security
    control, and web callers carry no headers.
  - Below-floor → `426` with a plain JSON body (the client renders its own copy).
- The generated expo API client stamps the two headers on every request (build number and
  platform are available from `expo-constants`/`Platform` at runtime — auto-wired, no
  consumer code) and maps a 426 response to an update-wall signal the app template
  handles.
- `/api/auth/*` stays ungated: a stranded user must still be able to re-auth after
  updating.
- (Stretch) Observability: count walled and headerless requests to an Analytics Engine
  binding. Requires an `analytics_engine` kind on `WranglerBindingSpec`
  (`plugin-cloudflare`). Optional; do not block the gate on it.

**Tests.** Real-graph: with `expo()` + `minNativeBuild`, the generated worker source wires
the middleware and the generated client stamps headers. Miniflare: build 5 with floor 10 →
426 on `/rpc/*` and 200 on `/api/auth/*`; header-less request → 200; `"1.2.3"` build →
200 (fail-open); walled request never returns 429 even when a rate limiter would trip.

---

## WS5 — DB safety gates + first-class seeding (P2)

**Ownership.** All in `plugin-db` (commands + `deployChecks`/`devWatchers`
contributions).

### 5.1 Destructive-migration gate

**Problem.** Nothing stops a generated migration that drops a table/column from deploying;
a drop breaks the live worker mid-deploy (old code still reads the column during rollout).
Sailward gates this by diffing **drizzle's meta snapshots** — not the SQL text, which
false-flags SQLite's rebuild-the-table pattern for benign changes.

**Requirements.**
- Diff the newest migration's snapshot against its predecessor; flag dropped
  tables/columns/views. Older migrations are shipped history — never re-flagged.
- Fail with an expand/contract explainer. An intentional, reviewed drop is acknowledged by
  a `-- stack:allow-destructive` line anywhere in that migration's `.sql`.
- Runs as: part of a new `stack db check` command, and a `cliSlots.deployChecks`
  contribution (hard gate before `deploySteps` run migrations remotely).

### 5.2 Drift gate

**Problem.** Editing `src/schema/*` and forgetting `stack db generate` currently surfaces
only at deploy time (the existing pending-migrations check). The inner loop should catch
it.

**Requirements.**
- Non-mutating check: copy committed migrations to a temp dir, run `drizzle-kit generate`
  against the live schema with `--out` pointed there; a newly emitted file ⇒ drift ⇒ fail
  with "run `stack db generate`". Real migrations dir untouched. (Sailward gotcha to
  inherit: drizzle-kit 0.31 mangles absolute `--out` paths — keep the temp dir relative to
  cwd and gitignored.)
- Part of `stack db check`; the existing deploy-time pending-migrations check already
  covers the release path.

### 5.3 First-class seeding

**Problem.** Every real project grows a hand-rolled seed script. Sailward's is ~185 lines
of column-mapping + SQL-literal escaping + chunking that a framework should own. Our dev
watcher already ignores `**/seed.ts` — the slot is half-reserved.

**Requirements.**
- Consumer authors `src/schema/seed.ts` exporting seed data keyed by their Drizzle tables
  (typed against the schema — no column-name mapping, no SQL).
- `stack db seed [--remote]` applies it idempotently: upsert by primary key, then prune
  rows whose key left the seed (so user FK links survive via `ON DELETE SET NULL`);
  tables without a PK are replaced wholesale. Multi-row inserts chunked to stay under
  D1's 100-bound-params-per-statement cap.
- Auto-wired into dev: seed applied at `devReadySetup` after the schema push, and re-applied
  by a watcher when `seed.ts` changes (this is why the schema watcher ignores it).
- Deploy: contributed as a `deploySteps` entry after migrations **only when the seed file
  exists** (skip via `ctx.fileExists`).
- Named scenario states (sailward's `scenario.js`) are explicitly out of scope — revisit
  after seeding ships.

**Tests.** Destructive gate: fixture snapshot pairs (benign rebuild passes; column drop
fails; acknowledged drop passes). Drift: fixture repo with an uncommitted schema edit
fails, clean repo passes, migrations dir hash-identical after either run. Seed: against a
real local D1 — second run is a no-op, removed row prunes, FK links survive an upsert.

---

## WS6 — Record-scoped abilities + unified authorization vocabulary (P1)

**The pattern (from sailward).** Two authorization layers coexist in a real backend:
container-membership roles (org-level — we already have this via better-auth's
organization plugin and the procedure builder's `rbac` option) and **record-scoped
abilities** — a CASL `MongoAbility` built per request from the viewer's *domain* role (a
row in a business table, e.g. `bookings.role` for one trip) plus per-seat facts, mixing
role grants and instance-ownership conditions in one model
(`can("update", "Expense", { paidById: userId })`). The payoff is the wire trick: the
server serializes the caller's ability (`packRules`) into a query response, the client
reconstructs the identical ability and drives every UI affordance from `ability.can(...)`
— one definition of authority gates the server *and* renders the client, with zero
duplicated permission logic in the app.

We have no answer for this layer today, and consumers building per-record collaboration
(projects, documents, teams) would hand-wire exactly this glue. The rules themselves are
business logic and stay in consumer code; everything around them becomes framework.

**Ownership.** `plugin-auth` owns the ability module (it owns the access-control domain —
`access.ts` already lives there). `plugin-api` owns the `can:` procedure option and the
client hook (procedure builder + tanstack-query integration are its surfaces). CASL is
wrapped, never exposed: consumers must not install or import `@casl/ability` directly,
same rule as drizzle/hono/zod.

### 6.1 Ability module — `@fcalell/plugin-auth/ability`

- `defineAbility<Subjects>()` — typed wrapper over CASL's `AbilityBuilder` with the
  action+subject tuple pattern built in: instance-checked subjects declare the fields
  their conditions read, so a tagged row type-checks at the call site; abstract subjects
  stay string-only. Re-export `subject` for row tagging.
- `assertCan(ability, action, subjectArg, opts?)` — throws
  `ORPCError("FORBIDDEN")`; `{ cloak: true }` throws `NOT_FOUND` instead for sites that
  must not reveal a resource exists.
- `packAbility(ability)` + `PackedRules<A>` — the wire format for procedure outputs
  (CASL `packRules` underneath, typed so the client-side unpack round-trips). The type is
  exported type-only; no server code may enter a client bundle.
- Ability construction stays in handlers (a consumer helper returning
  `{ seat, ability }` is the documented pattern). Explicit non-goal: no declarative
  record-ability option on the procedure builder — abilities depend on domain data only
  the handler's queries know.

### 6.2 One vocabulary: compile org statements → CASL rules

Better-auth's statements model (`resource → actions`, no conditions) is a strict subset
of CASL's rule model, which makes a **one-way compile** (statements → unconditional CASL
rules) mechanical and drift-free.

- Statements remain the single source of truth for org roles — better-auth's organization
  endpoints (invite/remove member, update org) consult them internally and cannot be
  substituted. We derive from statements, never fork them.
- The procedure builder gains `can: [action, resource]` as the org-level gate, sugar over
  the existing `rbac` machinery (`rbac` stays; `can` is the preferred spelling so config
  gates, handler asserts, and client checks all read as actions-on-subjects). Its type
  **structurally forbids conditions** — the org layer is unconditional by construction,
  and allowing a conditions argument would break the subset relationship the compile
  relies on.
- A per-session **org ability** is compiled from the active member's role statements
  (unconditional rules, so the compile is trivial and cacheable per role).

### 6.3 Layered client authority — tanstack-query integration

- `useAbility()` — org-level authority everywhere: unpacks the compiled org rules
  (shipped once per session / active-org switch).
- `useAbility(recordRulesQuery)` — org ∪ record: CASL rules compose by concatenation, so
  the record layer (a `PackedRules` field on any query the consumer chooses) layers onto
  the org rules in one ability instance. Subject namespaces cannot collide: org subjects
  are framework-owned (`Organization`, `Member`, `Invitation`), record subjects are the
  consumer's domain types.
- Hardening baked into the hook (both learned by sailward in production): **deny-all
  default** while rules are loading or absent, and the ability instance is memoized on the
  plain rules array — it is a class instance that defeats structural sharing, so it must
  never be selected from the query cache directly.
- Ships in `plugin-api/tanstack-query` so solid and expo consumers both get it; composes
  with WS3 for free — a role-changing mutation that declares `writes` on the membership
  entity auto-refreshes the query carrying the packed rules.

**Tests.** Unit: statements→rules compile produces an ability whose `can()` answers match
`hasPermission` for every (role, resource, action) in the default org roles — the
subset-fidelity test that guards the whole merge. Miniflare: `assertCan` failure returns
`FORBIDDEN` (and `NOT_FOUND` when cloaked); a procedure output carrying `packAbility`
round-trips through the typed unpack. Client unit (real tanstack-query): deny-all before
data; org ∪ record layering answers both org-level and condition-carrying record checks;
re-rendering with an unchanged rules array yields a stable ability instance.

---

## WS7 — Follow-ups (not in scope; recorded so they aren't lost)

- **`plugin-email`** — wrap the Cloudflare Email Sending binding: new `send_email` kind on
  `WranglerBindingSpec`, a `ctx.email.send()` runtime, and a default OTP template so
  `auth.defineCallbacks` gains a zero-config default `sendOTP` (today every consumer must
  write it). Keep sailward's rule: the code never rides the Subject line (lock-screen
  previews, relay logs).
- **Push notifications** (`plugin-expo` or a `plugin-push`) — contributed `pushTokens`
  table, `queuePush()` on the procedure context: `waitUntil` fire-and-forget (depends on
  WS1.3), 100-message Expo batching, automatic `DeviceNotRegistered` token pruning.
- **Env *value* validation** — `validateEnv` today checks presence only. Extend the
  `cloudflare.slots.secrets` spec with an optional validation hint (min length, URL
  shape) and generate a once-per-isolate runtime assertion; consider sailward's
  refuse-to-serve refinement (non-production auth config on a non-localhost URL).
- **Analytics Engine binding kind** on `plugin-cloudflare` (unblocks WS4 stretch).

## Non-goals

- No new consumer-facing options beyond `expo.minNativeBuild` and the optional
  `reads`/`writes`/`can` procedure keys. Everything else is constants or auto-wiring.
- No domain types in `@fcalell/cli`; every feature lands in its owning plugin.
- No runtime query tracing for entity declarations in v1 (WS3.4 design note only).
- No scenario tooling (WS5.3 note).
- No CASL reimplementation of better-auth's internal org checks (WS6.2 — statements stay
  the source of truth; the compile is one-directional), no conditions on the org-level
  `can:` option, and no declarative record-ability construction in procedure config
  (WS6.1 — abilities depend on data only handlers know).

## Acceptance (per workstream)

A workstream is done when: implementation + co-located tests land, tests drive the real
graph / miniflare-booted worker per the testing rules (no string-only assertions as
primary evidence), `pnpm test` and `pnpm check` pass, and plugin READMEs document any new
consumer-visible surface.
