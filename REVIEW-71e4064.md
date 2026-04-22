# Code Review — commit `71e4064`

**Commit:** "Extract per-plugin codegen and introduce plugin-cloudflare"
**Reviewed:** 2026-04-22
**Scope:** Core CLI, worker/runtime stack, frontend stack, integration tests

> **Status note (post slot-graph rewrite):** items #1 (callback wiring), #3 (routes-dts on missing dir), #5 (auth cors ordering), #16 (silent-failure barrier events `SolidConfigured` / `ViteConfigured`), and #21 (home-page scaffold collision) were structurally resolved by the move from the event bus to the typed slot graph. Other items remain valid against the current codebase and are tracked separately. References below to `register`, `bus.on`, `after:`, `Init.Prompt`, `events.Worker`, etc. describe the historical event-bus architecture, not today's surface.

Four parallel reviews surfaced 4 critical bugs, 4 medium bugs, 9 simplification opportunities, and one cross-cutting core-level papercut. Items are sorted by severity; each cites file:line.

---

## Critical bugs

### 1. Callback auto-wiring never runs in production

**Location:** `plugins/api/src/index.ts:151-168`

The api plugin's `events.Worker` handler iterates `ctx.discoveredPlugins` and stamps `entry.callbacks` onto each peer's entry in `pluginRuntimes`. But by topological order (`auth.after` and `db.after` both include `api.events.Worker`), api registers its Worker handler BEFORE auth/db. Handlers fire FIFO, so api's loop runs with an empty `pluginRuntimes`, `find` returns `undefined`, and the wiring silently skips. Generated `.stack/worker.ts` is missing `callbacks: authCallbacks`.

The inline comment at line 144 ("Runs after all other Worker handlers") is backwards.

**Evidence chain:**

1. `sortByDependencies` (`packages/cli/src/lib/discovery.ts:132-174`) DFS — dependencies before dependents.
2. `registerPlugins` (`packages/cli/src/lib/registration.ts:86-96`) registers in that sorted order.
3. `createEventBus` (`packages/cli/src/lib/event-bus.ts:97-108`) fires handlers FIFO.
4. Tests pass because they hand-order entries as `[db, auth, api]` — the inverse of real topo order — so auth subscribes before api does. False positive.

**Fix:** Split api's handler. Seed `base`/`imports`/`handler` in the Worker handler; move the `pluginRuntimes` callback-attach loop into api's Generate handler AFTER `await bus.emit(events.Worker, …)` returns, when all peer contributions have landed. Alternative: emit a dedicated `api.events.WorkerFinalize` after `events.Worker`.

**Test fix:** any test exercising cross-plugin Worker-handler interaction must run entries through real `sortByDependencies`, not hand-ordered arrays.

---

### 2. `./app.css` import breaks solid-alone configs

**Location:** `plugins/solid/src/index.ts:102`, cross-check `plugins/solid-ui/src/node/codegen.ts:7-9`

`plugin-solid`'s Entry handler unconditionally pushes a side-effect import of `./app.css`. But `aggregateAppCss` returns `null` when solid-ui contributed nothing, so `.stack/app.css` is never written. A consumer running `solid()` without `solidUi()` generates an `.stack/entry.tsx` that fails to resolve its CSS import on the first Vite build.

**Fix:** have `aggregateAppCss` emit an empty `.stack/app.css` instead of returning null.

---

### 3. Missing `src/app/pages` throws on every `vite dev` / `vite build`

**Location:** `plugins/solid/src/node/vite-routes.ts:46-50`, `routes-core.ts:379-392`

`routesPlugin.configResolved` calls `rebuild()` → `writeRoutesDts()` → `buildRoutesDts()`, which throws via `existsSync` when `absPagesDir` does not exist. This runs on every dev-server / build startup, not just codegen. The try/catch in the Generate handler (`index.ts:241-252`) only protects codegen time. A fresh project or a custom `pagesDir` that hasn't been scaffolded yet can't start Vite at all.

**Fix:** Soft-fallback to empty routes when the directory is missing — let `fg.sync` return `[]` and emit an empty `routes.d.ts` / virtual module. The virtual module already tolerates an empty `routes` array.

---

### 4. Zero coverage of `.stack/worker-configuration.d.ts`

**Location:** tests deleted in this commit; no replacement

The deleted `tests/integration/env-generation.test.ts` (121 lines) and the env assertions in `tests/integration/bindings.test.ts` (−68 lines) were the only guards that the emitted Env interface contained `AUTH_SECRET`, `APP_URL`, `RATE_LIMITER_IP`, `RATE_LIMITER_EMAIL`, `DB_MAIN`. The new pipeline delegates to `wrangler types` via a `postWrite` hook (`plugins/cloudflare/src/index.ts:49-67`), but:

- `generate-snapshot.test.ts` emits `Generate` with an empty `postWrite` and never runs the populated hooks.
- No plugin-level test shells out to `wrangler types` either.

Auth could drop its `RATE_LIMITER_*` bindings and nothing would fail.

**Fix:** Extend `tests/integration/e2e-cli-subprocess.test.ts` (which runs the real CLI) to grep the produced `.stack/worker-configuration.d.ts` for the expected Env fields.

---

## Medium bugs

### 5. Auth's `p.cors` read is ordering-dependent on vite

**Location:** `plugins/auth/src/index.ts:67-86`

Auth reads `p.cors` inside its `api.events.Worker` handler, but the localhost origin is contributed by plugin-vite's `api.events.Worker` handler. There is no `after:` edge forcing vite's registration before auth's. If a consumer reorders `auth()` before `vite()` in `stack.config.ts`, auth reads a cors list missing the localhost origin, `sameSite` stays default, and dev cross-origin silently breaks.

**Fix:** Add `vite.events.ViteConfigured` (or an equivalent typed token) to `auth.after`.

---

### 6. `z.custom<FontEntry>()` is a no-op validator

**Location:** `plugins/solid-ui/src/types.ts:22-24`

`fonts: z.array(z.custom<FontEntry>())` accepts anything that isn't `undefined`. Malformed entries (wrong `fallback` shape, missing keys) pass validation and crash later inside `buildFontFaceCss` with template-literal `undefined`.

**Fix:** Define a proper Zod schema mirroring `FontEntry` (family / specifier / weight / style + nested fallback) and export the inferred type.

---

### 7. `literal()` silently corrupts non-serializable values

**Location:** `packages/cli/src/ast/build.ts:146`

`literal()` falls through to `String(value)` for unexpected types. Consequences:

- `Date` → `{ kind: "object", properties: [] }` (no own-enumerable props).
- Function/symbol → `String(fn)` emitted as a `"string"` expression — valid codegen, wrong semantics.

`ctx.runtime` is the hot path now (every plugin with a `./runtime` export auto-seeds options via `literalToProps(ctx.options)`). A plugin with `new Date()` as a Zod default will produce a broken `.stack/worker.ts` with no error.

**Fix:** Throw in `literal()` for unexpected types instead of the `String(value)` fallback.

---

### 8. `pagesDir: ""` hijacks the whole project

**Location:** `plugins/solid/src/types.ts:10-12`, `plugins/solid/src/index.ts:25-30`

Empty string passes `?? "src/app/pages"` (only `undefined` triggers the fallback), making `absPagesDir = cwd` and pulling every `.tsx` / `.jsx` in the repo into the route tree.

**Fix:** Swap `??` for `||`, or add `.min(1)` to the Zod field.

---

## Simplifications

### 9. Drop the legacy `events: readonly string[]` form

**Location:** `packages/cli/src/lib/create-plugin.ts:319`

Every first-party plugin migrated to the typed map (`events: { Foo: type<T>() }`). The `Array.isArray` branch and `ResolvedEventsFromArray` are dead migration shims. Smaller type matrix, clearer single-shape contract.

### 10. Deduplicate package-walk logic

**Location:** `packages/cli/src/lib/create-plugin.ts:534-570` vs `packages/cli/src/lib/codegen.ts:18-52`

`findPackageInfo` / `walkUpToPackageJson` and `readPackageJson` / `readJsonWalkingUp` are ~90% identical. Hoist to `#lib/package-info` and have both import it — the only real difference is `findPackageInfo`'s `parsed.name === pkg` validation.

### 11. Drop placeholder throwers in `registration.ts`

**Location:** `packages/cli/src/lib/registration.ts:22, 40, 55`

The only caller is `registerPlugins`, which always stamps ctx via `createPlugin`'s wrapper before user code runs. ~25 lines of defense-in-depth for an unreachable code path. Delete.

### 12. Memoize `hasRuntimeExport`

**Location:** `packages/cli/src/lib/codegen.ts:13-16`

Re-reads package.json for every sibling plugin on every Generate (twice in some paths). Trivial module-scoped `Map` by package name.

### 13. Extract `ctx.emitFile` helper

**Location:** repeated in `plugins/solid/src/index.ts`, `plugins/vite/src/index.ts`, `plugins/solid-ui/src/index.ts`

The pattern `bus.on(Generate, async (p) => { const payload = await bus.emit(events.X, initial); const content = aggregateX(payload); if (content !== null) p.files.push({ path, content }); })` appears ~4 times. A helper would cut ~40 lines and also eliminate plugin-solid's duplicate `writeRoutesDts` call (lines 237-252 write via raw `fs` AND via `p.files`).

### 14. Collapse redundant ternary in api codegen

**Location:** `plugins/api/src/node/codegen.ts:43-46`

Both branches produce `[{ kind: "object", properties: [] }]` when `properties.length === 0`. Simplify to `args: [{ kind: "object", properties }]`.

### 15. Dead fallbacks

- `plugins/cloudflare/src/index.ts:25` and `plugins/cloudflare/src/node/codegen.ts:67` — `?? ""` on `split("T")[0]` is unreachable; a valid ISO always yields a string.
- `plugins/cloudflare/src/node/codegen.ts:20-27` — the `-{2,}` replace is unreachable; the greedy `[^a-z0-9-]+` already collapses runs of illegal chars to a single dash.

### 16. Stop hand-ordering plugins in tests

**Location:** `tests/integration/virtual-worker.test.ts:92-96`, `tests/integration/generate-snapshot.test.ts:177-194`

Tests fabricate registration order instead of running through real `sortByDependencies`. This is what masks bug #1. Introduce a shared helper that topologically sorts the entries.

### 17. `callback.optional` cleanup

**Location:** `packages/cli/src/lib/create-plugin.ts:56-63`

The cast-assign-cast chain is noisy. One-liner alternative:

```ts
export const callback = Object.assign(<T>(): CallbackMarker<T> => ({}), {
	optional: <T>(): OptionalCallbackMarker<T> => ({ __optional: true as const }),
}) as CallbackFactory;
```

---

## Cross-cutting papercut

### 18. Force-cast `opts as ResolvedXOptions` at every plugin use site

**Location:** `packages/cli/src/lib/create-plugin.ts` — `schema?: z.ZodType<unknown, TOptions>` pins `TOptions` to `z.input`, but every handler wants `z.output` (post-defaults).

Currently auth (`plugins/auth/src/index.ts:40`) casts `opts as ResolvedAuthOptions` to access defaulted fields without `??`. Every Zod-using plugin will hit the same papercut.

**Fix (core change):** Add a second generic inferring `z.output<typeof schema>` and use it for `RegisterContext.options`. One-time change, removes the cast for every current and future plugin.

---

## Other findings worth noting

### 19. Provider sibling rendering placement

**Location:** `plugins/solid/src/node/codegen.ts:48-51`

`aggregateProviders` renders `spec.siblings` inside the wrapper AFTER the wrapped subtree. If `<Toaster />` is supposed to live alongside the page tree at root level, it's actually nested inside whatever the wrapper renders. Current behavior is what the test asserts — but the wording "siblings render alongside" is misleading.

### 21. Scaffold-target collision is fragile

**Location:** `plugins/solid/src/index.ts` (`if (!ctx.hasPlugin("solid-ui"))` guard)

Works today for the solid / solid-ui pair, but a third plugin that wants to ship a home page would hit a duplicate-target crash. Consider a core-level "first plugin wins" (or explicit `ScaffoldSpec.priority`) to generalize.

### 22. `@import` string is lossy

**Location:** `plugins/solid-ui/src/node/codegen.ts:12-14`

`JSON.stringify(imp)` produces `@import "string";` — correct for plain imports, but `@import "tailwindcss" layer(foo)` would become the whole thing inside quotes (one big string). No current contributor does this, but the shape forecloses future Tailwind v4 patterns. Consider `imports: Array<{ url: string; layer?: string; supports?: string }>`.

### 23. Silent font-specifier resolution

**Location:** `plugins/solid-ui/src/node/fonts.ts`

`resolveFontAbs` and `findBundleUrl` tolerate misses gracefully — a broken `specifier` degrades to "fallback `@font-face` only, no real woff2" — but no warning is logged. A consumer typo renders with fallback fonts indefinitely, no signal.

**Fix:** `ctx.log.warn` or a Vite warning when `resolveFontAbs` returns null for a real specifier.

### 24. `writeScaffoldSpecs` duplicate-target semantics

**Location:** `packages/cli/src/lib/create-plugin.ts:427-434`, `packages/cli/src/lib/scaffold.ts:36-47`

The docstring on the auto-callback-scaffold claims running BEFORE `definition.register()` prevents the user from pushing a duplicate. Actually, running first guarantees the user's later push will THROW with `ScaffoldError("Duplicate scaffold target …")`. The comment should be rewritten to reflect the actual "fail fast on duplicate" behavior.

---

## Suggested fix order

1. **Bug #1** — callback wiring. Silently broken in production. Fix + a test that runs through real `sortByDependencies`.
2. **Bug #3** — dev-server crash on fresh projects. Blocks `stack init → stack dev`.
3. **Bug #2** — `app.css` import. Blocks `solid()`-only configs.
4. **Bug #4** — worker-configuration.d.ts E2E coverage, so bugs like #1 can't hide.
5. **#5, #7** — ordering bug and `literal()` corruption (both silent-failure class).
6. **#18** — `z.output` inference at `createPlugin`, removes one papercut from every Zod plugin.
7. Everything else is cleanup.
