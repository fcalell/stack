# Over-Engineering & Simplification Audit — `@fcalell/stack`

## Executive summary

`@fcalell/stack` is, structurally, a well-conceived framework: the slot-graph engine genuinely delivers its headline promise (no plugin firing order to reason about), and the bulk of the complexity in the *aggregation* path — list/map slots feeding `.use(...)` chains, provider trees, deduped imports, CORS handshakes — is load-bearing. The over-engineering is concentrated in three predictable places:

1. **A hand-rolled codegen layer built for a language it never emits.** The 546-LOC TS printer carries a full operator-precedence table and branches for `template` literals, `jsx-fragment`, and `union`/`intersection`/`tuple`/`function` types that *zero* production code emits. Alongside it sits a **14-builder terse-AST authoring API that no plugin uses** — every author hand-writes raw `{ kind: ... }` trees instead — and a TOML "printer" that mostly re-nests a structure its sole caller already built. This is the single largest pocket of speculative generality.

2. **Dead generality in the engine and lib layer.** ~280 LOC across `executor.ts`, `wrangler.ts`, half of `proc.ts`, `resolveMany`, `sortByDependencies` (a whole second topological sort over a graph the framework explicitly says must not drive ordering), and seven scattered exports have **zero non-test callers**. They inflate the public surface and make the engine look like a general parallel-resolver / process library it is not.

3. **Author-facing boilerplate the type system already provides.** 7 of 9 plugins restate their entire slot map in an explicit `plugin<...>` generic; 23 contribution sites cast `(ctx.options ?? {}) as XOptions` even though a typed `self.options` already exists; every derived slot spells its input map twice. None of this is required — `db`/`auth` already prove the lean form compiles.

The **highest-leverage simplifications**, in order:

- **Delete the dead code** (engine helpers + lib modules + the 14 unused AST builders): ~600 LOC removed, zero behavior change, narrower public surface. Pure win, do first.
- **Right-size the TS printer** to the ~10 shapes it actually emits and drop the precedence/template/type machinery (~120–150 LOC + proportional test).
- **Fix the two consumer footguns** that contradict the framework's own promises: `plugin-solid` is missing `requires: ["vite"]` (silent broken build today), and `stack add` hard-errors on missing siblings instead of auto-pulling them like `stack init` claims to.
- **Standardize the plugin-author surface**: drop the redundant `plugin<...>` generics (tier-by-tier — `api` has a latent typing wrinkle), replace the 10 in-`contributes` option casts with `self.options`, and fix the scaffold test that teaches the exact anti-pattern `CLAUDE.md` bans.

Where complexity is **load-bearing and correctly kept**: the derived-slot graph itself (the cors→trustedOrigins handshake genuinely needs it), the `value`-vs-`derived` distinction (one structurally rejects contributions, the other allows override), the CSS-escape *security* boundary, the cross-process migration lock (the *need* is real; only the hand-rolling is debatable), and the duplicated `cn()` helper (extracting it would couple two independent runtime bundles).

---

## Cross-cutting themes

1. **Public subpath exports launder dead code into "API."** `./ast`, `./graph`, `./discovery`, `./errors` are all published, so every dead helper has a "but a third party might import it" defense. That defense is uniformly weak here: the framework's *own* plugins and docs route around these surfaces, and the philosophy explicitly names "dead generality / just in case" as a bug class. Treat deletions as minor changelog'd public-API removals, not pure no-ops — but delete them.

2. **A second authoring path that lost.** The terse AST builders, the `slot.value`-vs-empty-`inputs`-`derived` overlap, and `literal()` all create "which way do I author?" confusion. In every case the *verbose* path won in practice. The fix is to pick one and delete the other, not to keep three undocumented options.

3. **Boilerplate the compiler already derives.** Explicit `plugin<...>` generics, explicit `slot.derived<T, I>` type args, and `(ctx.options ?? {}) as X` casts are all restatements of types inference already provides. `db` and `auth` are live proof the lean form works.

4. **Docs promise automation the code doesn't deliver.** "`ctx.options` is typed automatically" (false in contributions), "omitting a required sibling produces an actionable error" (false for solid→vite), "stack init auto-adds the missing dependency" (the loop is dead for solid; `add` throws instead). The gaps are small declarations, not missing machinery.

5. **Normalization rules re-decided at the leaves instead of the chokepoint.** The trailing-newline guard appears 8 times; kebab→camel 5 times (and has already drifted); the CSS-escape policy twice. Each belongs at one boundary.

---

## Core engine

### Delete production-dead engine helpers: `resolveMany` + `sortByDependencies`
**Severity: medium · Effort: small · Audience: maintainer**
Locations: `packages/cli/src/lib/graph.ts:49-52,112-113` · `packages/cli/src/lib/discovery.ts:151-197`

`Graph` exposes both `resolve()` and `resolveMany()`, but `resolveMany` (impl is literally `Promise.all(slots.map(resolveSlot))`) has **zero non-test callers** — every command uses single `resolve()`. Separately, `sortByDependencies` is a complete second topological sort with its own visiting/visited cycle detection over plugin `requires` edges, also with zero non-test callers; its own comment concedes "Phase D may drop this helper." Both inflate the engine's apparent surface — `Graph` looks like a general parallel resolver it isn't, and the framework explicitly says `requires` is presence-only and ordering falls out of slot edges, so nothing should ever consume a requires-topo-sort.

**Recommendation:** Delete both. `resolveMany`: remove interface member + impl; any future caller writes `Promise.all(slots.map(g.resolve))`. `sortByDependencies`: delete outright. Drop the test blocks asserting them. Note: this is *not* a literal duplicate of `detectCycles` (graph.ts:220-256) — that's 3-color DFS over *slot* derived-input edges; `sortByDependencies` is a parallel cycle-detector over *plugin* `requires` edges. Frame the deletion as "remove a dead second topological sort over a graph the framework says must not drive ordering."
**Counterpoint:** Both sit behind public subpath exports (`./graph`, `./discovery`), so this is a (minor) public-API change — note it in a changeset rather than calling it a pure no-op.

### Rename the misleading `sorted` field (it's just config order) and inline `createCommandContext`
**Severity: low · Effort: small · Audience: maintainer**
Locations: `packages/cli/src/lib/build-graph.ts:25,110` · `generate.ts:13,65` · `cli.ts:148-162` · `command-router.ts:132-140`

`buildGraphFromDiscovered` returns `sorted: opts.discovered` — the `config.plugins` array verbatim, **no sort applied**. Every consumer does order-independent `.map(p => p.cli)` / `.find(p => p.name === ...)` lookups. The name tells every maintainer a topological pass produced this list and must be preserved — directly contradicting "There is no plugin firing order to think about." A second `sorted` field on `GenerateResult` (generate.ts:13,65, mirrored in testing.ts:56) is **fully dead** — nothing reads it. Separately, `createCommandContext` (command-router.ts:132) is `return opts;` — an identity wrapper over a single object literal with one caller.

**Recommendation:** Rename `sorted` → `plugins` on `BuildGraphFromConfigResult` and its read sites; **delete** the dead `GenerateResult.sorted`. Inline `createCommandContext` at its one caller (cli.ts:164) as a typed `const ctx: CommandContext<unknown> = {...}` literal and delete the export. Mark `collected` (test-harness-only) with a one-line comment. Deleting `sortByDependencies` (above) removes the vestige that makes `sorted` look real in the first place.
**Counterpoint:** None material — the value is unchanged; only the misleading label and an identity hop go away.

### `Contribution.plugin` two-phase empty-string stamp
**Severity: low · Effort: small · Audience: maintainer**
Locations: `packages/cli/src/lib/slots.ts:174-186` · `create-plugin.ts:344-361` · `graph.ts:74-98`

Every `Contribution` is created with `plugin: ""` plus a 3-line comment explaining the placeholder will be "re-stamped by the plugin builder." `graph.ts:89-93` then rebuilds each contribution with `plugin: plugin.name`. The empty string is never valid at resolve time — it exists only because `contribute()` at slot-declaration time doesn't know its owning plugin. `collect()` (create-plugin.ts:344) already has `name` in scope.

**Recommendation:** Stamp once in `collect()` (map `userContribs` + `autoContributions` to `{ ...c, plugin: name }`), provably equivalent because the only consumer of `c.plugin` is `makeCtx(c.plugin)` which resolves to the contributing plugin's options — and `collect()` runs per contributing plugin. Then either drop the graph rebuild entirely, or (preferred, to keep `./graph` robust for external direct callers) keep the bucketing loop defensive: `plugin: raw.plugin || plugin.name`. Best long-term: drop `plugin` from the public `Contribution` interface entirely (it's write-only and always overwritten) and let the graph hold attribution in its own internal tuple. Low priority.
**Counterpoint:** The graph loop must stay regardless (it validates derived-slot contributions and registers unknown slots), so the net win is ~4 lines + one conceptual wrinkle — don't oversell it; the `plugin: ""` placeholder is the only thing that keeps `contribute()` plugin-name-free.

---

## Codegen layer (the largest over-engineering pocket)

### The 14 terse AST builders are 100% production-dead; authors hand-write raw trees
**Severity: high · Effort: small · Audience: plugin-author**
Locations: `packages/cli/src/ast/build.ts:10-220` · `ast/index.ts:4-26`

`build.ts` exports 14 expression builders (`str/num/bool/nul/undef/id/mem/call/newExpr/obj/arr/arrow/asExpr/jsx`) + 4 import-spec helpers, all re-exported from `@fcalell/cli/ast` as the public codegen surface. **Per-builder grep across all plugin/CLI source returns zero production uses for every one of them.** The only live export is `literalToProps` (one site, `plugins/auth/src/index.ts:106`). Meanwhile authors hand-write ~248 raw `{ kind: ... }` literals. This is a 120-LOC builder module + 206-LOC test guarding code nothing consumes, plus the "which way do I author?" confusion for new contributors — `plugin-authoring.md` teaches *only* the raw form (lines 285-297), so the builders aren't even discoverable.

**Recommendation:** Delete the 14 expression builders + 4 import helpers + the now-orphaned private `coerce` (referenced only by the deleted `obj`/`arr`). **Keep `literalToProps` + `literal`** (self-contained; `literal` recurses on itself, `literalToProps` calls only `literal`) — but de-export `literal` since no production code imports it standalone. Remove the deleted symbols from `ast/index.ts` and prune `build.test.ts`. Net: `build.ts` collapses from 219 to ~50 LOC, single live responsibility. Scope note: of the 248 raw literals, only ~126 are TsExpression-kind the builders could ever have replaced — the rest are TOML/HTML/TypeRef kinds builders never covered, so do **not** frame this as "solving raw-tree verbosity." It only kills the dead second path.
**Counterpoint:** `./ast` is a published subpath, so a third-party author *could* import them — but the project's own docs and code actively route around them, which is the definition of dead generality. Add a one-line changelog note.

### Right-size the 546-LOC TS printer to the shapes production actually emits
**Severity: medium · Effort: medium · Audience: maintainer / plugin-author**
Locations: `packages/cli/src/ast/ts-printer.ts:60-145,175-226,405-423` · `specs.ts:54-76,169-172`

The printer carries a full precedence table over all 17 `TsExpression` kinds, `wrapForMember`/`wrapForCast` parenthesization, template-literal backtick/`${` escaping (405-423), jsx-fragment printing, and `writeType` branches for `union`/`intersection`/`tuple`/`function`/`literal`. Verified against real codegen: **zero production emissions** of `template`, `jsx-fragment`, or any of those type kinds — and `build.ts` exposes no builder for them, so they're unreachable through the documented API. The actual histogram tops at `identifier/string/call/object/member/jsx/array` + one `as` + one `new`. The printer + 817-LOC test is the largest single chunk of the AST layer.

**Recommendation:** Delete the dead *printer* branches: `writeType` `union`/`intersection`/`tuple`/`function`/`literal` (74-95,123-144), `writeExpression` `template` (405-423) and `jsx-fragment` (with its leg in `writeJsxChild`), and collapse `PRECEDENCE` to just member/call (+`as`). **Keep** `wrapForMember` (the `5.toString()` guard is exercised), the single `as` case + `wrapForCast` (used at `plugins/solid/src/index.ts:310`), the ts-morph import structuring, and trailing-newline normalization (the load-bearing parts). Add a `default:` throw so the union and printer can't silently diverge. **Critical:** `jsx-fragment` is wired into `TsJsxExpression` (specs.ts:169-172), the declared type of `ProviderSpec.siblings` — drop the printer branch *and* the type member, or the type advertises a shape the printer can't render. The matching spec *type declarations* are cheap and optional to remove; the `default:` throw makes keeping them safe. Net: ~120-150 LOC removed, near-zero behavioral risk. Do **not** route everything through ts-morph's formatter now — that changes byte-exact output and forces snapshot churn.
**Counterpoint:** The unions are the "shared codegen vocabulary" for third-party plugins — but a union of literals is already expressible via the existing `reference` kind (`api/src/node/codegen.ts:85`), so these are redundant escape hatches. Keep the spec declarations if extensibility worries you; delete the printer branches regardless.

### Static generated snippets hand-built as deep AST trees
**Severity: medium · Effort: medium · Audience: plugin-author**
Locations: `plugins/solid/src/index.ts:287-324` · `plugins/vite/src/node/codegen.ts:21-52`

`solid`'s `mountExpression` is 37 lines of nested `call`/`arrow`/`jsx`/`as`/`member` literals to emit one snippet that **never varies by config** — `render(() => <Providers><Router>{routes}</Router></Providers>, document.getElementById('app') as HTMLElement)`. `vite`'s static config block (`root`/`publicDir`/`build`) is ~30 lines of static AST tree; only `plugins`/`server.port`/`resolve.alias` are dynamic. The AST representation pays its highest verbosity tax exactly where it buys nothing — no fragment to merge, no import to dedup, no precedence to resolve. Authors must learn to spell `document.getElementById('app') as HTMLElement` as a 12-line tree.

**Recommendation:** Do **solid first** (clean, high-value): the mount body can be a constant string while `entrySource` stays a derived slot templating `${renderedImports}\n\n${MOUNT_SNIPPET}` — `aggregateEntry` already keeps the deduped imports separate. Nothing overrides `mountExpression` today (only solid touches it), so the `value<TsExpression | null>` override seam can stay or be demoted to `value<string | null>` — make that call explicitly. **vite is a smaller, more-involved follow-up**: its `plugins:` array items are `TsExpression[]` contributed by solid/solid-ui, and there's no exported bare-expression renderer, so stringifying the static frame while keeping the arrays as AST is a messier hybrid — gate it on adding a `renderTsExpression` helper. **Drop `api`'s runtime chain from scope** — that's the genuinely dynamic cross-plugin `.use()` merge, correctly AST.
**Counterpoint:** The single-vocabulary guarantee means the printer owns formatting and output stays byte-stable; a hand-formatted string is the one snippet not routed through the deterministic printer. Real but minor — the codebase already mixes string codegen (`routes-core.ts`) and AST without issue.

### TOML printer: keep the live array-table nesting, delete only the dead `tables` field
**Severity: low · Effort: small · Audience: maintainer**
Locations: `packages/cli/src/ast/toml-printer.ts:11-92` · `specs.ts:123-127` · `plugins/cloudflare/src/node/codegen.ts:77-153`

The original finding's premise — "multi-segment path-walking is never exercised" — is **false**, and that's load-bearing. `codegen.ts:387` produces a two-segment `path: ["unsafe", "bindings"]` for `rate_limiter` bindings (plugin-auth), so `resolveParent`/`ensureObject`'s nested branch *is* hit, emitting the `[[unsafe.bindings]]` shape rate-limiting requires. The naive "inline `path[0]`-only fold" would emit malformed `[[unsafe]]` and silently break a first-party feature. The genuinely dead surface is narrow: the `tables` field is always `tables: []` from the sole caller and read only by the printer's own loop.

**Recommendation:** Keep `renderToml` and its array-table nesting. Delete only: the `tables: Array<...>` member from `TomlDocument` (specs.ts:125), the `for (const table of doc.tables)` block (toml-printer.ts:65-76), and the `tables: []` literal at codegen.ts:151. Net ~12 LOC — the over-engineering here is minor.
**Counterpoint:** This contradicts the louder "delete the whole TOML wrapper" framing elsewhere in the audit — and it should. The wrapper is a thin layer over `smol-toml.stringify`, but its one non-trivial job (folding flat array-table paths into `[[unsafe.bindings]]`) is live. If you want the deeper consolidation, see the build-vs-buy section's note, but do **not** delete `renderToml` wholesale.

---

## Build-vs-buy / dependency strategy

Consolidated view of every hand-roll-vs-library decision so the whole picture is visible at once. The framework's "consumers don't install third-party libs" rule applies **only to consumer-facing runtime deps** — CLI-time/`node/` dev dependencies are invisible to consumers, so adopting a library there does **not** violate the philosophy.

| Subsystem | LOC | Verdict | Why |
|---|---|---|---|
| `ast/build.ts` terse builders | ~120 + 206 test | **DELETE (dead)** | Zero production callers; raw trees won. Keep only `literalToProps`/`literal`. |
| `ast/ts-printer.ts` dead branches | ~120-150 | **THIN** | Built for full TS grammar; production emits ~10 shapes. Keep import-structuring + newline norm. |
| `ast/toml-printer.ts` | 92 + 165 test | **THIN (narrow)** | Wrapper over `smol-toml` (already a dep), but array-table nesting is live for `rate_limiter`. Delete only the dead `tables` field (~12 LOC). |
| `command-router.ts` flag parser | ~90 | **REPLACE-WITH-LIB (`node:util parseArgs`)** | `cli.ts` already uses parseArgs; duplicate parser risks drift. One caveat below. |
| `db/node/lock.ts` migration lock | 215 | **REPLACE-WITH-LIB (`proper-lockfile`) — but KEEP-HANDROLLED is defensible** | Need is real (cross-process serialization of drizzle-kit); hand-rolling PID-liveness + stale-reclaim + signal cleanup is a maintenance liability. |
| `executor.ts` / `wrangler.ts` / `proc.ts:5-67` | ~280 | **DELETE (dead)** | See "Indirection & dead generality." |
| `cn()` helper | 2×2 | **KEEP duplicated** | Extracting couples two independent published runtime bundles — false-DRY. |

### Replace the duplicate flag parser with `node:util parseArgs`
**Severity: medium · Effort: small · Audience: maintainer**
Locations: `packages/cli/src/lib/command-router.ts:38-130` · `cli.ts:3-24` · `create-plugin.ts:73-82`

`cli.ts` parses top-level flags with `parseArgs`; plugin subcommand flags go through `parseCommandFlags`, a ~90-LOC from-scratch parser (long/short lookup maps, defaults, number coercion, bespoke unknown-flag/missing-value errors). The `FlagDefinition` shape maps almost 1:1 onto `parseArgs` options. Two parsers means a contributor must learn both, and error/coercion semantics can drift.

**Recommendation:** Map `FlagDefinition` → `parseArgs` options, post-coerce number flags with `Number()`+NaN-check, re-wrap throws in `StackError` to preserve the `UNKNOWN_FLAG`/`MISSING_FLAG_VALUE`/`INVALID_FLAG_VALUE` codes the tests assert. The `--name --remote` ambiguous case already throws correctly in current Node, so it needs no special porting. **The one real behavior change:** `parseArgs` has no multi-char long alias, so `alias` only maps to single-char `short`. Either (a) drop multi-char alias support deliberately (real first-party usage — expo `--clear/--clean/--platform`, db `--remote` — uses zero aliases and zero number flags, so nothing breaks), or (b) keep a thin pre-pass rewriting `--<longAlias>` → `--<key>` before parseArgs. Gate on `command-router.test.ts` staying green.
**Counterpoint:** Multi-char long aliases (`--confirm` → `yes`) are a public `FlagDefinition` field parseArgs can't express; if you must preserve that contract, option (b). Otherwise option (a) is cleanest.

### `db/node/lock.ts`: replace the cross-process machinery; collapse the redundant in-process serializer
**Severity: medium · Effort: medium · Audience: plugin-author**
Locations: `plugins/db/src/node/lock.ts:1-216` · `push.ts:48-198`

`lock.ts` hand-rolls a full advisory lock: `O_EXCL` creation, PID written + `process.kill(pid,0)` liveness reclaim, exponential-backoff polling, an in-process Promise mutex, and SIGINT/SIGTERM/exit/uncaughtException cleanup. The need is genuine — it serializes `drizzle-kit generate`/`push` so concurrent `stack dev` watcher pushes don't corrupt the migrations dir or hit SQLite "database is locked", and it must be cross-process. But every concern (atomic acquire, stale detection, retry/backoff, on-exit cleanup) is exactly `proper-lockfile`'s feature set, and 215 LOC of concurrency-sensitive systems code is a liability for a CLI-time-only tool.

**Recommendation:** Replace the cross-process bits (`tryAcquire`/`pidIsAlive`/`waitFor`/exit-handlers, ~110 LOC) with `proper-lockfile`'s `lock()`/`unlock` (`{ stale, retries, realpath:false, onCompromised }`). **Note there are already two in-process serializers** (the `Map<lockPath,Promise>` in lock.ts *and* `createSerializedPush` in index.ts:24-45) — the real win is collapsing to one in-proc layer + proper-lockfile, not just swapping the file lock. Net deletion is closer to ~110 LOC than the headline 150.
**Counterpoint (legitimate KEEP-HANDROLLED):** The hand-rolled version reclaims a stale lock *instantly* on PID death (liveness probe), whereas proper-lockfile waits out an mtime staleness *timeout* — a minor `stack dev` responsiveness regression. If that matters, set a short `stale` (5s) and document the trade, or just delete the redundant *second* in-proc serializer and keep the file lock.

---

## Plugin duplication & standardization

### Drop the redundant `plugin<...>` generics (tier-by-tier — `api` has a latent fix)
**Severity: medium · Effort: small · Audience: plugin-author**
Locations: `plugins/{api,cloudflare,expo,solid,native-ui,solid-ui,vite}/src/index.ts` · `create-plugin.ts:256-268`

7 of 9 plugins write `plugin<"name", Options, { slotA: typeof slotA; ... }>(...)`, re-listing every slot a third time (slot decl, generic param, `slots:` field) — api restates 12, expo 13, solid 12. `db` and `auth` already use the bare `plugin("name", {...})` form, and **both `CLAUDE.md` and `plugin-authoring.md` document only the bare form.** The generic must be hand-kept in sync with `slots:`. Stripping cloudflare's generic and running `tsc` exits 0 with `.slots` fully typed.

**Recommendation:** Delete the generic, but **tier-by-tier** — the blanket "no-op" framing is wrong: (1) cloudflare, expo, native-ui, solid-ui, solid, vite have **0 schema `.default()`s** so input≈output — verified no-op, strip these. (2) auth already passes an explicit 5th `ResolvedAuthOptions` arg and declares callbacks — it's live proof the bare form survives callbacks; cite **db + auth** as the canonical clean shapes. (3) **api is special**: stripping its generic tightens `ctx.options.prefix` from `string | undefined` to `string` (because its `.default("/rpc")` schema-output inference was being suppressed). This is a **latent fix, not a regression** — `{ prefix: string }` is the documented intended resolved type. Strip it *and* fix the one input-shape call site (`api/src/index.test.ts:86`). Then update the docs to show only `plugin("name", {...})`. ~60 sync-prone lines removed.
**Counterpoint:** The generic gives a reader the slot surface at the call header — but `slots:` lists the same names two lines below, so it duplicates rather than reveals.

### `ctx.options` is `unknown` — 23 casts where a typed `self.options` already exists
**Severity: medium · Effort: medium · Audience: plugin-author**
Locations: `packages/cli/src/lib/slots.ts:74` · `create-plugin.ts:93-97` · 23 sites across solid/expo/native-ui/vite/auth/api/solid-ui

`ContributionCtx.options` is `unknown`, so 23 sites write `const opts = (ctx.options ?? {}) as XOptions`. Meanwhile `self.options` is fully typed/defaulted (`TResolvedOptions`) and db/auth already use it cleanly. `CLAUDE.md:117` and `plugin-authoring.md:120` both claim "`ctx.options` is typed automatically" — **false** for the contribution ctx (it's only true for `CommandContext`). The cast also defeats the schema's type safety (a wrong cast compiles), and the `?? {}` fallback is dead (defaults are applied before contributions run).

**Recommendation:** Split by structure — the 23 sites have two different fixes:
- **Part A (10 in-`contributes` sites, zero-risk, do now):** solid:330/338/342/347/352, native-ui:276/279/294/299, vite:152 are inside `contributes: (self) => [...]` reading their *own* options — replace the cast with `self.options` directly. Drops the cast *and* the dead `?? {}`.
- **Part B (13 module-level seed/compute sites, typing-only):** solid:93, native-ui:59/70, expo:141/154/169/179/206, vite:49, api:169, solid-ui:126, auth:92/99 live in standalone `slot.derived`/`slot.value` where `self` is out of scope. Make `slot.derived`/`slot.value` generic over an opt-in options type so `compute`/`seed`'s `ctx.options` is typed — the runtime ctx is **always** built from the slot owner (graph.ts:156-157,188-189), so options==owner is guaranteed here. Default `unknown` so cross-plugin contributions are unaffected.
- Fix the two false doc lines.

**Counterpoint (the architectural constraint that bounds Part B):** For *contributions*, `ctx.options` is the **contributing** plugin's options, not the slot owner's (graph.ts:169 stamps the contributor) — so `ContributionCtx.options` cannot soundly be made generic over any one plugin's type. Keep it `unknown` as the base contract; the typed fix is sound only for in-closure `self.options` (A) and owner-guaranteed seed/compute (B). Do **not** add a generic on `Slot<T>` itself.

### Every derived `*Source` slot spells its input map twice
**Severity: low · Effort: medium · Audience: plugin-author**
Locations: `plugins/{cloudflare,vite,solid,api}/src/index.ts` · `packages/cli/src/lib/slots.ts:165-243`

`slot.derived<T, I>` already infers `I` from the `inputs` object and `T` from `compute`'s return, yet every derived slot hand-writes `slot.derived<string | null, { imports: typeof configImports; ... }>` restating the keys passed to `inputs:` immediately below. This is the densest repeated typing in the plugin layer.

**Recommendation:** Strip the explicit `slot.derived<T, I>` type args across cloudflare.wranglerToml, api.workerSource/middlewareCalls/middlewareImports/cors, vite.viteConfig, and solid's four `*Source` slots — let `inputs`/`compute` drive inference. Verified: stripping vite's `viteConfig` generic exits 0 and `T` correctly infers as `string | null` (a `@ts-expect-error` on `Slot<string>` fired, proving the union isn't narrowed). Also make `inputs` *optional* on `slot.derived` (default `{}`) so the 6 empty-input derived slots drop the `, Record<string, never>` + `inputs: {}` ceremony. Do **not** add an `aggregatorArtifact` helper — the compute bodies aren't uniform (each gates differently), so it would sprout escape hatches. `emitArtifact` already collapses the uniform (file-emission) half.
**Counterpoint:** The explicit `T` pins the output type at the declaration site so a bad `compute` fails *there* — but `T` is already anchored by the typed aggregator functions, so the guard is weak.

### CSS-escape security boundary duplicated between solid-ui and native-ui
**Severity: medium · Effort: medium · Audience: plugin-author**
Locations: `plugins/solid-ui/src/node/css-escape.ts:24-72` · `plugins/native-ui/src/node/css.ts:9-46`

Both UI plugins independently implement the CSS interpolation-escape policy guarding the consumer trust boundary (theme/token/font names flowing from config into generated CSS). `STRING_ESCAPE_RE` + `STRING_ESCAPE_MAP` + `cssString` are **byte-identical**; `isCssIdent`/`cssIdent` differ only in the plugin name in the error string. This is a **security-critical** boundary (both files' comments call out CSS-injection breakout) — two copies is exactly the code that drifts: a future hardening of `cssString` applied to one leaves the other vulnerable. These are domain-agnostic string-escaping, not UI-framework-specific.

**Recommendation:** Extract only the genuinely-shared primitives — `cssString`, `isCssIdent`/`cssIdent`, and the superset `cssUrl`/`cssSupportsExpression` — into one node-only module exported from `@fcalell/cli` at a new `@fcalell/cli/css` subpath, next to `@fcalell/cli/ast`. Well-precedented: cli already owns the parallel HTML-escape (`html-printer` `escapeAttr`/`escapeText`) and TS template-literal escape boundaries. Parameterize the error-message plugin tag. **Keep native-ui's `cssVarName`/`cssTokenValue` local** — they encode native-specific policy (raw *unquoted* token streams that must not be quoted because `oklch()`/`4px`/font stacks contain legal spaces/commas); lifting them would wrongly couple unrelated rules.
**Counterpoint:** "Plugins own their domain" — but the domain here is "escape a CSS string," not a UI concern, and cli already owns exactly this category of cross-cutting codegen primitive.

### Trailing-newline guard duplicated across 8 codegen sites
**Severity: low · Effort: small · Audience: plugin-author**
Locations: `ts-printer.ts:545` · `cli-slots.ts:105-114` · api/cloudflare/solid(×3)/vite codegen + expo's `ensureTrailingNewline`

The same `rendered.endsWith("\n") ? rendered : rendered + "\n"` guard appears verbatim at 8 leaf sites across 6 files. A single formatting invariant (artifacts end with exactly one newline) enforced defensively at every leaf instead of once at the source→file boundary — new aggregators must remember it or emit format churn.

**Recommendation:** Centralize at the write boundary, not the leaves. `emitArtifact` (cli-slots.ts:109-114) is the right primary site — normalize `content` there, leaving renderer output untouched so the 817-LOC printer test and toml/html tests stay green. Delete the 6 inline guards + expo's helper. **Caveat:** two raw `cliSlots.artifactFiles.contribute` sites bypass `emitArtifact` (expo index.ts:443 `EXPO_ENV_DTS`, cloudflare index.ts:130 `.dev.vars`) — both happen to self-terminate today, so "covers EVERY artifact" is true only by coincidence. For truly universal coverage, the per-file write step in the generate procedure is the even-cleaner chokepoint (subsumes emitArtifact + raw contributions + TOML). Either is valid; prefer the write step if it's a small change.
**Counterpoint:** Keep the rule out of the renderers (they're deliberately policy-free primitives directly asserted by tests) — which is exactly why `emitArtifact`/write-step is correct, not the leaves.

### `cn()` and generated-banner micro-duplication
**Severity: low · Effort: small · Audience: plugin-author**
Locations: `plugins/{native-ui,solid-ui}/src/ui/lib/cn.ts` · `api/src/node/barrel.ts:4` and others

`cn()` = `twMerge(clsx(inputs))` is byte-identical in both UI plugins, and each codegen file re-declares its own do-not-edit banner constant.

**Recommendation:** **Do NOT extract `cn`** — it's a 2-line *published runtime* helper shipping in two independent consumer bundles (Kobalte/web vs uniwind/RN); extracting forces a new published `@fcalell/*` dependency edge and couples their bundles, tensioning "small, single-purpose, independently consumable." This is the correct call, flagged so it isn't mistakenly DRYed. For the banner: the only clear defect is `api/barrel.ts:4` attributing generation to "@fcalell/cli" instead of "@fcalell/plugin-api" — fix that one string. Broader standardization is cosmetic and the four producers use different comment syntaxes (`//` vs `/* */`) and don't all flow through one chokepoint, so don't force it into `emitArtifact`. Optionally, add a `banner?:` field to `TsSourceFile` (specs.ts:111 already anticipates this) for TS-rendered files only — a ride-along worth doing alongside the trailing-newline fold.
**Counterpoint:** Both are near-load-bearing; the "don't extract" half is the finding's main value.

---

## Consumer experience

### `plugin-solid` is missing `requires: ["vite"]` — silent broken build today
**Severity: high · Effort: small · Audience: both**
Locations: `plugins/solid/src/index.ts:219-260` · `graph.ts:131-143` · `discovery.ts:131-148`

`plugin-solid` contributes four times to `vite.slots.configImports`/`pluginCalls` (to register the Solid + routes Vite plugins) yet **declares no `requires` at all** (confirmed: grep shows zero). When a consumer lists `solid()` without `vite()`, `validateDependencies` passes, the graph silently registers solid's contributions against orphan vite slots, vite's `viteConfig` emitArtifact never runs, and `.stack/vite.config.ts` is never written — **no error, just a non-working build.** This is the single most likely frontend misconfiguration, and it fails the most confusingly. `CLAUDE.md` promises "stack init auto-adds the missing dependency when you pick solid" — but `dependencyNames(solid)` returns `[]`, so that auto-add **literally cannot fire**.

**Recommendation:** Add `requires: ["vite"]` to plugin-solid and `requires: ["solid", "vite"]` to plugin-solid-ui (confirmed second gap — solid-ui/src/index.ts:152 contributes to both with zero requires). Audit confirms scope is exactly these two: db/auth/native-ui all correctly declare their hard requires; api/cloudflare correctly declare none; vite→api and expo→api are intentionally undeclared (optional soft-CORS). Two lines restore the `validateDependencies` error, make init's auto-add fire, and make `stack add solid` raise `MissingPluginError` instead of producing a broken build.
**Counterpoint:** None — `requires` is presence-only and doesn't affect ordering; the only change is that a broken config fails loudly instead of silently, which is the intended improvement.

### `stack add` hard-errors on missing siblings instead of auto-pulling them
**Severity: medium · Effort: medium · Audience: end-user**
Locations: `packages/cli/src/commands/add.ts:51-58` · `init.ts:78-90,251-261`

`stack init` auto-resolves missing required siblings (unshift + "requires X — adding automatically"). `stack add <plugin>` does the opposite: it walks `dependencyNames` and **throws** `MissingPluginError` the moment a sibling is absent (confirmed at add.ts:51-58), forcing the consumer through a 4-command error chain (`add auth` → told to add db → add db → told to add cloudflare → …). This violates "Automate by default" and is internally inconsistent — the same `requires` edge is auto-satisfied during init but a manual chore during add. The machinery to fix it (`syntheticConfigFromSelection`, `mergedSelection`, `buildGraphFromDiscovered`) is already in `add.ts`.

**Recommendation:** Replace the throwing loop with init-style auto-add: compute the **transitive** `requires` closure (a small fixpoint), append missing siblings to `mergedSelection`, append their config calls + scoped deps in the same pass, and log per sibling. **Correction the finding undersells:** `dependencyNames` returns only *direct* requires and init iterates a snapshot — so init is currently *single-level too*, not transitive (e.g. picking `auth` adds db but never re-walks db's requires). Lift one shared closure helper used by both commands and fix init's snapshot bug at the same time. Keep a hard error only for genuinely-unknown plugins; `validateDependencies` in generate stays as the backstop.
**Counterpoint:** `add <plugin>` is a single explicit intent, and auto-pulling 3 packages + a db config the user never asked for is a surprise — but it mirrors init's shipped behavior and is logged. Lowest-risk variant: auto-add but print a clear summary of what was pulled in.

### D1 consumers hand-paste a `databaseId`; init seeds a placeholder that type-checks but fails at deploy
**Severity: medium · Effort: medium · Audience: end-user**
Locations: `plugins/db/src/types.ts:7-30` · `plugins/db/src/index.ts:170-182,211-222`

The d1 dialect requires `databaseId`; the init prompt defaults to the literal placeholder `YOUR_D1_DATABASE_ID`, which lands in `stack.config.ts` and flows into the wrangler binding and `wrangler d1 migrations apply`. A consumer who accepts the default ships a config with a fake id that **generates fine but fails at deploy** — exactly the hand-wired glue ("zero hand-written glue") the framework aims to eliminate.

**Recommendation:** The automation **already exists as dead code** — `packages/cli/src/lib/wrangler.ts:16-55` defines `createD1Database(name)` (shells `wrangler d1 create <name> --json`, extracts the id) and `ensureWranglerAuth()`, and **neither is referenced anywhere** (confirmed: grep returns only the definitions). The create-copy-paste elimination was scoped and abandoned mid-flight. (1) Wire `createD1Database` into the db init prompt: when d1 + interactive + authed, offer "Create a D1 database now?"; write the real id, keep the placeholder as the explicit fallback for offline/declined paths. (2) Add a loud pre-deploy guard — deploy.ts and the db `deployChecks` contribution currently pass `YOUR_D1_DATABASE_ID` straight to wrangler with no validation; fail with "databaseId is still the placeholder; run `stack db create`". (3) **Domain ownership:** per conventions, `createD1Database`/`ensureWranglerAuth` are D1-specific and sit wrongly in `packages/cli/src/lib` — move to plugin-cloudflare/plugin-db, or delete if wiring is deferred (shipping unused domain code in core violates the framework's own rule). A `stack db create` subcommand is the cleanest home.
**Counterpoint:** D1 creation is a network/auth side effect that mutates the consumer's Cloudflare account — must be opt-in/confirmed, with the placeholder remaining the safe offline fallback.

### Presence-flag plugins (cloudflare/api/vite) as config noise
**Severity: low · Effort: large · Audience: end-user**
Locations: `plugins/cloudflare/src/types.ts:3` · `plugins/api/src/index.ts:19-28` · `plugins/vite/src/types.ts:10-14`

`cloudflare()` has an empty options schema; `api()` has one optional `prefix`; `vite()` three optional perf knobs. Yet every consumer must import and list each, even though presence is fully derivable from the `requires` edges of plugins they *did* choose.

**Recommendation:** **Reject** the headline proposal (build-time transitive-closure expansion of `config.plugins`) — it breaks the "no implicit-resolution layer; every plugin listed explicitly" invariant stated three times in `CLAUDE.md`, which keeps discovery transparent (what you read is what runs; third-party discovery via `__package` only works on listed entries). Adopt the **fallback**, which is the framework's own intended fix: make init/add reliably *populate* the explicit array so the consumer never hand-types a bare presence call. This dedupes entirely against the `add`-auto-pull and solid-`requires` fixes above — track it there, not separately.
**Counterpoint:** The explicit array is a deliberate transparency choice, not an oversight; the right move is filling it for the user, not bypassing it.

---

## Plugin-author experience

### The scaffold test teaches the exact anti-pattern `CLAUDE.md` bans
**Severity: medium · Effort: small · Audience: plugin-author**
Locations: `packages/cli/src/templates/plugin.ts:95-115` · `commands/plugin.ts:62`

`stack plugin init` scaffolds an `index.test.ts` made entirely of identity-echo assertions: `plugin.name === name`, `plugin.cli.label` is a string, `plugin.cli.package === packageName`, `plugin.slots.example.source === name`, `plugin.slots.example.kind.type === "list"`. `CLAUDE.md`'s "Don't write low-value tests" names *exactly these* as the canonical anti-patterns ("worse than no test"). The official starting point a third-party author copies teaches the precise discipline the framework enforces on itself.

**Recommendation:** Replace the two identity `it()` blocks with one real-graph example that runs green for a fresh scaffold: `buildTestGraphFromPlugins({ plugins: [{ factory, options: {} }] })`, then `expect(await graph.resolve(cliSlots.initDeps)).toHaveProperty("<packageName>")` — green because the scaffold's `dependencies` auto-wires into `initDeps` (create-plugin.ts:308-310), and it exercises the real consumer path. Add a comment telling the author to swap in an assertion on their own `example.contribute(...)` effect once they uncomment it. Drop the `.cli.collect()` block (internal seam + "aggregation works" anti-pattern). Note: `buildTestGraphFromPlugins` is sync but `graph.resolve` is async, so the `it` callback must be `async`.
**Counterpoint:** The scaffold must run green with zero edits, and `CLAUDE.md` carves out *one* smoke test — but that justifies at most one, not five identity assertions, and a real-effect test is equally available.

### Collapse the `value`-vs-empty-`inputs`-`derived` ceremony (keep both kinds)
**Severity: low · Effort: medium · Audience: plugin-author**
Locations: `plugins/solid/src/index.ts:88-100` · `plugins/api/src/index.ts:204-212` · others · `slots.ts:17-29`

6 of 25 `derived` slots declare `inputs: {}` and compute purely from `ctx.options`/`ctx.cwd` — functionally a lazy value with no slot inputs, paying the `slot.derived<T, Record<string, never>>({ inputs: {} })` ceremony.

**Recommendation:** **Keep `derived` and `value` distinct** — the axis is real and load-bearing: `derived` *structurally rejects* contributions (graph.ts:79-84) while `value({seed})` lets a stray contribution silently override the seed. For `routesPagesDir`/`fonts`/`themeTokens` — each read as an input by *other* derived slots — non-overridability is the point (a peer plugin contributing a competing "fonts" must be a build error, not a silent stomp). So don't route them through `slot.value`; instead **kill the ceremony**: make `inputs` optional on `slot.derived` (default `{}`). The 6 sites then drop the `, Record<string, never>` type arg and the `inputs: {}` line. Do **not** add a `slot.fromOptions` primitive — that adds a 5th vocabulary entry to fix a vocabulary-size complaint.
**Counterpoint:** None — this preserves the structural guarantee while removing exactly the noise.

---

## Indirection & dead generality

### Delete three whole dead modules + scattered dead exports (~280 LOC)
**Severity: medium · Effort: small · Audience: maintainer**
Locations: `executor.ts:1-17` · `wrangler.ts:1-55` · `proc.ts:5-67` · `graph.ts:49-52,112-113` · `discovery.ts:160-197` · `command-router.ts:142-160` · `config-writer.ts:29-50` · `scaffold.ts:68-86` · `errors.ts:70-86`

15 symbols with **zero non-test callers** (grep-confirmed across packages/ and plugins/): `executor.ts` (`sortStepsByPhase` — own comment admits it's a leftover; cli-slots.ts:23-29 has an exact clone), `wrangler.ts` entirely (`ensureWranglerAuth`/`createD1Database` — confirmed dead above; wrangler invocation lives in plugin-cloudflare), `proc.ts:5-67` (`ManagedProcess`/`spawnPrefixed`/`killAll`/`onExit` — dev.ts uses only `supervise()`), `resolveMany`, `sortByDependencies`, `formatPluginCommands`, `hasPluginCall`, `requireFeature`/`skipIfConfigured`/`ensureDir`, and `EventHandlerError` (`CLAUDE.md`: "There is no event lifecycle"). ~280 LOC a maintainer must read past, making the engine look like a general parallel-resolver / process library / topological sorter it isn't.

**Recommendation:** Delete `executor.ts` and `wrangler.ts` entirely; delete `proc.ts:5-67` (keep `supervise()`+`restartBackoffMs`); delete the rest plus orphaned tests. Host modules (scaffold.ts, config-writer.ts, command-router.ts, discovery.ts, graph.ts, errors.ts) stay — sibling exports (`writeIfMissingString`, `editConfig`, `removePluginCall`, `supervise`, etc.) are live. Net zero behavior change. (This subsumes the `resolveMany`/`sortByDependencies` core-engine finding above — consolidate.)
**Counterpoint:** graph.ts/discovery.ts/errors.ts ARE documented subpath exports, so deleting `resolveMany`/`sortByDependencies`/`EventHandlerError` is a minor public-API removal — note it in a changeset, but no in-repo consumer uses them.

### Two flag parsers + kebab→camel re-implemented 5 times (already drifted)
**Severity: low · Effort: medium · Audience: maintainer**
Locations: `command-router.ts:38-130` · `cli.ts:3-30` · `discovery.ts:75` · `config-writer.ts:16-17` · `add.ts:177` · `templates/{stack-config,plugin}.ts`

(The flag-parser half is covered in build-vs-buy above.) The kebab→camel transform `name.replace(/-([a-z])/g, ...)` is copy-pasted in ≥5 files — and **has already drifted**: `templates/plugin.ts:192` uses `/-([a-z0-9])/g` (so `plugin-3d` → `plugin3D`) while the other four use `/-([a-z])/g` (`plugin-3d` → `plugin3d`).

**Recommendation:** Extract one exported `toCamelCase` in `lib/naming.ts` and import at all five sites; converge on the `0-9` variant (correct for plugin slugs). Near-zero risk, high value precisely because the drift is real, not hypothetical.
**Counterpoint:** None for the naming extraction.

---

## Recommended sequence

Quick wins (pure deletion / one-line fixes) first, then the structural simplifications they unblock.

| # | Action | Sev | Effort | Impact | Notes / unlocks |
|---|---|---|---|---|---|
| 1 | Add `requires: ["vite"]` to solid, `["solid","vite"]` to solid-ui | High | S | High | Fixes silent broken build; enables init auto-add + add error. Do today. |
| 2 | Delete 3 dead modules + scattered dead exports (~280 LOC) | Med | S | High | Subsumes `resolveMany`/`sortByDependencies`. Zero behavior change. |
| 3 | Delete the 14 unused AST builders + `coerce` (~325 LOC) | High | S | High | Keep `literalToProps`/`literal`. Kills "which way do I author?". |
| 4 | Part A: replace 10 in-`contributes` casts with `self.options` | Med | S | High | Zero-risk; aligns code with its own doc comment. |
| 5 | Fix scaffold test to a real-graph assertion | Med | S | Med | Stops teaching the banned anti-pattern. |
| 6 | Extract `toCamelCase`; fix `api/barrel.ts` banner string | Low | S | Med | Fixes already-present drift. |
| 7 | Rename `sorted`→`plugins`; delete dead `GenerateResult.sorted`; inline `createCommandContext` | Low | S | Med | After #2 (`sortByDependencies` gone), `sorted` has no plausible cover. |
| 8 | Right-size TS printer (drop template/fragment/type branches) | Med | M | High | After #3. ~120-150 LOC; remove `jsx-fragment` from `TsJsxExpression` too. |
| 9 | Drop redundant `plugin<...>` generics (tier-by-tier; api is a latent fix) | Med | S | Med | Update docs to bare form. ~60 lines. |
| 10 | Strip `slot.derived<T,I>` type args; make `inputs` optional (default `{}`) | Low | M | Med | Subsumes the value-vs-derived ceremony fix. |
| 11 | Part B: typed `ctx.options` for owner-guaranteed seed/compute; fix 2 false doc lines | Med | M | Med | After #4. Opt-in generic, default `unknown`. |
| 12 | Centralize trailing-newline at emitArtifact / write step | Low | S | Med | Pairs with optional banner field. |
| 13 | Static-body → template literal for solid mount (vite as follow-up) | Med | M | Med | Solid clean; vite gated on a bare-expression renderer. |
| 14 | Make `stack add` auto-pull transitive requires; fix init's single-level bug | Med | M | Med | Shared closure helper; subsumes presence-flag-noise concern. |
| 15 | Extract CSS-escape primitives to `@fcalell/cli/css` | Med | M | Med | Security boundary — dedup the byte-identical core, keep native validators local. |
| 16 | Replace command-router parser with `node:util parseArgs` | Med | S | Med | Drop multi-char aliases (option a) — no real consumer uses them. |
| 17 | Wire dead `createD1Database` into db init + pre-deploy guard; relocate to plugin | Med | M | Med | Eliminates create-copy-paste; move D1 helpers out of core. |
| 18 | Delete dead `TomlDocument.tables` field (~12 LOC) | Low | S | Low | Keep array-table nesting (live for rate_limiter). |
| 19 | `proper-lockfile` for db lock; collapse redundant in-proc serializer | Med | M | Low-Med | KEEP-HANDROLLED is defensible; optional. |
| 20 | Single-stamp `Contribution.plugin` in `collect()` | Low | S | Low | Cosmetic; loop stays. Lowest priority. |

---

## Deliberately kept / not over-engineered

The audit considered and **rejected** the largest possible claim — that the derived-slot graph is itself over-built — and several extraction temptations. Keeping these honest:

- **The derived topological graph is justified.** It's true that only ~2 *cross-plugin* derived edges exist (auth's `runtimeOptions` and `appUrlDevDefault`, both `inputs: { cors: api.slots.cors }`), and the bulk of composability is list/map aggregation. But the cors handshake itself traverses **both** a list aggregation (`corsOrigins`, contributed by vite+expo) **and** a derived chain (`cors` → `auth.runtimeOptions`) — so the two mechanisms aren't cleanly separable, and the derived path is load-bearing for the one thing it's hardest to do otherwise: a value that must be fully resolved across plugins before another plugin computes from it. Nothing actionable; the rejection is of the interpretation, not the code.

- **`value` vs `derived` stays four kinds.** The accepts-contributions-or-not axis is real: `derived` structurally rejects contributions; `value({seed})` allows override. Canonical resolved values (`fonts`, `routesPagesDir`, `themeTokens`) read by other slots are deliberately non-overridable. We trim the *ceremony*, not the kind.

- **`cn()` stays duplicated.** Extracting two lines would couple two independent published consumer-runtime bundles (Kobalte/web vs uniwind/RN) and add a dependency edge — false-DRY. The component trees and `theme.ts` files are likewise genuinely independent domains and must not be merged.

- **The CSS-escape *plugin-specific* validators stay local.** Only the byte-identical security core is shared; native-ui's `cssVarName`/`cssTokenValue` encode real native-vs-web policy differences.

- **The migration lock's *need* is real.** Cross-process serialization of drizzle-kit against the migrations dir and SQLite locking is genuinely required; only the hand-rolling (vs `proper-lockfile`) is debatable, and instant-on-crash PID reclaim is a legitimate reason to keep it.

- **The explicit `plugins:` array stays explicit.** Build-time transitive-closure expansion was rejected — it breaks the transparency invariant. Fill the array for the user via init/add; don't bypass it.