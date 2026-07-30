---
id: 001-04
status: done
depends: [001-01, 001-02]
merged: 0692b3f
gate:
  rounds: 2
  flags: 11 + 6
  outcome: all fixed, none dismissed
  round-1-blocking: pressed danger label would ship canvas-on-danger-soft (invisible); fixed via
    decision 6's pressed-render-prop mechanism, later verified against uniwind's Pressable
  round-2-serious: native Text default tone (RN inherits nothing); checkbox tick disposition
runs:
  - id: A (options, emission, codegen, harness)
    commits: dd36742..07017f8
    review: spec APPROVE (1 should-fix deferred to B), standards APPROVE (2 should-fix, fixed)
  - id: B (matrix adoption, sweep, text/field)
    commits: 8253e0e..0692b3f
    review: spec APPROVE, standards APPROVE (2 should-fix + 3 notes, all fixed)
close-out:
  - all suites green from the real checkout — ui-core 24/24, solid-ui 18/18, native-ui 7/7,
    turbo check-types 12/12, biome 264 files clean
  - guard mutations across gate + reviews + close-out, 9 distinct, every one caught; close-out
    pair — placeholder text-ink-3→text-ink-4 (the exact M3 decision-15 mistake) FAIL b5;
    rounded-t-sheet→rounded-t-2xl FAIL b5
  - uniwind pipeline values recorded — bg-canvas #f1f4f8/#0d1625, bg-accent(light)=text-ink-1
    (light)=#0f1a2e (alias law), text-h1 fontSize 28 lineHeight 1.29, shadow-1 boxShadow present,
    min-h-11=44
  - NO on-device render — no native consumer or simulator exists; the live half of PRD M4 Verify
    is reduced to the uniwind-compiled stylesheet, ratified at the board seat, render owed when a
    native consumer first exists
carried-forward:
  - >
    The button GROUND press/hover tables are now hand-synced in two plugins (M7's ground-table
    data points are complete; the move is the tokens as data, not the prefixed classes).
  - >
    useButtonContentColor ships with no in-tree consumer; the first busy-button/spinner
    composition (M5/M7) proves its shape.
  - >
    a8 cannot see the dynamic `--color-${buttonContentTone(...)}` template; covered indirectly by
    ui-core's harness pinning every buttonContentTone output to a contract color.
  - >
    Web's field shell sets font-mono; native fields use the default face (platform-overlay law
    permits it) — a future parity pass may reconcile.
  - >
    expo.slots.* is absent from the slot catalog (consumed at native-ui index.ts contributions);
    pre-existing drift, wants its own chore.
  - >
    uniwind regenerates its in-package uniwind.css artifact in the shared pnpm store on every
    build; upstream design, the harness re-stamps it deliberately (a7 before a6).
  - >
    biome-config's `!**/.claude/worktrees` exclusion makes pnpm check's lint half a no-op inside
    agent worktrees; both runs had to gate via an exported tree or a lifted exclusion.
---

# plugin-native-ui adoption

Driver: `docs/prd/ui-core.md` M4 (`:277-289`). ui-core ships the contract (`001-01`) and the
matrices (`001-02`); `plugin-solid-ui` adopted both (`001-03`). This story makes the native plugin
the second renderer, so one `theme` object themes both platforms.

## Goal

`plugin-native-ui` derives its stylesheet from ui-core (deleting its neutral hex defaults),
replaces the N-theme `themeTokens` option with the shared `theme` schema, emits the shadow ladder
as `@utility`, re-exports ui-core's `cn`, adopts the shared matrices for button, badge (renamed
from `pill`), card, and field, authors the missing `text` and `field` components, and sweeps every
component off the utilities the zeroed namespaces retire — after the reset, `text-sm` or
`rounded-lg` on native compiles to nothing, exactly as on web.

## Measured facts

The uniwind pipeline (all verified by driving uniwind 1.8.0's own dist compiler over a candidate
`global.css` generated from ui-core's real derivation; technique recorded in Approach):

- **uniwind is real Tailwind v4, not a reimplementation.** `compileTailwind`
  (`uniwind/src/bundler/css-compiler/compileTailwind.ts`) runs `@tailwindcss/node`'s `compile`
  plus the oxide `Scanner`, then `compileNativeCSS` converts the emitted CSS into an RN stylesheet.
  Everything M3 proved about `@theme`, the `initial` namespace resets, and `@utility` carries over
  verbatim.
- **Both type-role consumption shapes work.** `text-h1` compiles to
  `{fontSize: 28, lineHeight: 1.29, letterSpacing: em-scaled}` — the Tailwind
  `--text-h1--line-height` modifier is consumed. Standalone `leading-h1` / `tracking-h1` also
  compile. The unitless leading survives because uniwind's runtime multiplies any
  `lineHeight < 6` by the resolved `fontSize` (`uniwind/src/core/native/store.ts:179-180`); it
  multiplies against the *same node's* `fontSize`, so a `leading-*` never rides a node without a
  type role. The 001-01 carried question is settled: emit both shapes, native consumes both.
- **The shadow ladder works as `@utility`.** `shadow-1` compiles to a `boxShadow` string entry,
  parsed by the runtime's `parseBoxShadow`. The `--shadow-*` namespace reset plus `@utility`
  wrapping is the right emission, as the PRD assumed.
- **Theme switching is discovered from `@variant` blocks.** uniwind scans the entry CSS for
  `@variant <theme> { … }` blocks, collects the dashed idents inside, errors if the themes carry
  different variable sets, and registers each var as `unset` in its regenerated package artifact
  (`uniwind/src/bundler/artifacts/css/themes.ts`; regeneration at
  `uniwind/src/bundler/adapters/metro/transformer.ts:54`). The compiled stylesheet resolves
  per-theme via `scopedVars` keyed `__uniwind-theme-light` / `__uniwind-theme-dark`; color
  utilities carry theme-change dependencies. The existing codegen shape —
  `@layer theme { :root { @variant light { … } @variant dark { … } } }` — is exactly right and
  stays.
- **Values verified end-to-end per theme**: `bg-canvas` → `#f1f4f8` light / `#0d1625` dark,
  `bg-accent` ↔ `text-ink-1` alias law holds, `bg-scrim` → `#0f1a2ecc` (alpha survives),
  `min-h-11` → 44, `rounded-control` → 14, `gap-stack` → 12, `p-card` → 16, `font-semibold` → 600.
  Off-contract utilities (`text-sm`, `text-base`, `rounded-lg`, `bg-primary`, `bg-red-500`,
  `text-white`, `shadow-md`) all absent from the compiled stylesheet.
- **Interaction variants map to RN flags**: `active:bg-surface-2` compiles with `active: true`,
  `disabled:opacity-50` with `disabled: true`, `dark:` scopes by theme. Web's `GROUND` table
  (`plugins/solid-ui/src/ui/components/button/index.tsx:34-47`) pairs every `hover:` ground with
  an `active:` ground — but the primary/danger cell's ink swap (`hover:text-danger`) has **no**
  `active:` counterpart; web gets away with it because a pressed pointer is also hovering. The
  `active:` flag rides the pressed node itself, so it can never restyle the separate label
  `Text` — press-conditional ink must go through `Pressable`'s `pressed` render state
  (decision 6).

The plugin today:

- Options: `themeTokens: ThemeSpec[]` — N named themes, each an open `Record<string, string>` of
  hex colors (`src/types.ts:11-22,52-62`). Defaults: two hex palettes + a static
  `DEFAULT_BASE_TOKENS` of off-contract `--radius-sm..xl` / `--text-xs..2xl`
  (`src/defaults.ts:14-64`).
- Codegen: `aggregateGlobalCss` (`src/node/codegen.ts:69-123`) renders imports → `@source` →
  `@theme` (base tokens + fonts + default theme colors) → `@layer theme` `@variant` blocks. It has
  no `@utility` mechanism, and no namespace resets. `ROLE_FALLBACKS` (`:29-33`) duplicates
  ui-core's `FONT_FALLBACKS` (`packages/ui-core/src/tokens.ts:321-325`) verbatim.
- Slot graph: `themeTokens` derived slot (`src/index.ts:55-62`), `extraThemes` plumbed into the
  Metro config for non-built-in theme names (`src/index.ts:28,237-252`).
- 24 component dirs (949 lines of sweep surface). `ui/app/index.tsx` is a 24-line provider shell
  with zero class attributes — nothing to sweep there. The colors already speak Marina
  (`bg-canvas`, `text-ink-1`, `border-edge`), but the type and radius classes die under the
  resets: measured occurrences — `text-xs` ×6, `text-base` ×5, `text-sm` ×4, `text-lg` ×4,
  `rounded-lg` ×1, `rounded-2xl` ×1, `rounded-t-2xl` ×1, `text-white` ×2, `bg-black/50` ×1.
  `rounded-md` (×5) and `rounded-full` (×15) are contract rungs and survive. `rounded-2xl` /
  `rounded-t-2xl` resolve **today** to Tailwind's default `--radius-2xl` = 1rem = 16px
  (`DEFAULT_BASE_TOKENS` defines no `2xl`), not 22. Of the fixed heights, only button's
  (`h-9/11/12`) and input's (`h-11`) are matrix-replaced; stepper's `h-9 w-9` and dialog's
  `h-12 w-12` squares are icon chrome with their own disposition (decision 12).
- No consumer anywhere passes `nativeUi()` (checked every `stack.config.ts` under `~/projects`),
  so the API breaks land at zero cost and no live app exists to boot.
- The slot catalog has **no `nativeUi.slots.*` section** (`.knowledge/architecture/slot-catalog.md`
  headings end at `auth`); the changed slots must register there in the same commit
  (`plugin-authoring.md` rule). `expo.slots.*` is missing too — pre-existing drift, flagged below,
  not this story's scope.

Reference implementation: `plugins/solid-ui/src/node/theme.ts` (emission),
`src/index.ts:120-124` (`resolvedTheme` slot), `scripts/verify.ts` (18-check harness),
`src/ui/components/{button,text,badge,card,field}` (matrix adoption + overlays).

## Approach

Two sequential dispatches against this one brief. Run A lands the node side (options, emission,
codegen, harness); Run B lands the ui side (matrix adoption, sweep, new components). B is gated on
A because B's components emit classes that only resolve once A's emission exists — sequencing, not
scope reduction.

**Run A — options, emission, codegen, harness:**

1. `types.ts`: replace `themeTokens` with `theme: themeSchema.optional()` from
   `@fcalell/ui-core/schema` (mirrors `plugins/solid-ui/src/types.ts:121`). Delete
   `themeSpecSchema` / `ThemeSpec`. Keep `nativeFontSchema` and the client-module schemas as they
   are.
2. `defaults.ts`: delete the file. Both hex palettes and `DEFAULT_BASE_TOKENS` are replaced by
   ui-core's derivation.
3. `index.ts`: replace the `themeTokens` slot with `resolvedTheme`
   (`derived<ResolvedTheme>`, `deriveTheme(ctx.options.theme)`), mirroring solid-ui. Delete
   `BUILTIN_THEMES` and the `extraThemes` computation — the Metro options become the static
   `{cssEntryFile, dtsFile}`. Add `'../node_modules/@fcalell/ui-core/src'` to `SOURCES` so the
   matrix cell strings inside ui-core are scanned (M3's lesson: a dependency package is never
   scanned unless named; `.stack/`-relative, one depth only, since `global.css` always lands in
   the consumer).
4. `node/codegen.ts` + a new `node/theme.ts`: emit through ui-core's records —
   `themeTokens(resolved)` into `@theme` (carries the namespace resets first, then scales, then
   invariant + default-mode colors), `shadowUtilities(resolved)` as three top-level `@utility`
   blocks, `modeTokens(resolved, mode)` into the existing `@layer theme { :root { @variant … } }`
   shape for exactly `light` and `dark`. Keep the per-key `cssVarName` / `cssTokenValue` /
   `cssIdent` validation at the render boundary (`codegen.ts:66-68` defense-in-depth holds).
   Replace `ROLE_FALLBACKS` with ui-core's `FONT_FALLBACKS`. Font tokens keep their current
   behavior (emitted only when the consumer registers fonts).
5. `package.json`: add `@fcalell/ui-core: workspace:*` to `dependencies`, and add it to the plugin
   `dependencies` map in `index.ts` so consumers install it (required for the `@source` path to
   resolve). Add the harness devDeps (`tailwindcss`, `@tailwindcss/cli`, `tsx` — same pins as
   solid-ui).
6. `ui/lib/cn.ts`: re-export ui-core's `cn` (the extended tailwind-merge config: type roles,
   leading, tracking, radius rungs, spacing rungs). Drop the direct `clsx` / `tailwind-merge`
   deps if nothing else imports them after the sweep.
7. Harness: `scripts/verify.ts` + a `verify` script. Shared core imported from
   `@fcalell/ui-core/harness` (decision 7). Checks in acceptance criteria A6-A9.
8. Slot catalog: add the `nativeUi.slots.*` section with the reshaped slots, same commit.
9. README (`plugins/native-ui/README.md`, 217 lines): update the theming section to the shared
   `theme` option; state the two-theme surface and the retirement of `extraThemes`.

**Run B — components:**

10. Adopt the shared matrices with native overlays (display/alignment stay in the overlay,
    press states per decision 6, no `hover:` on native):
    `button` (two-cva composition: `button()` fills on the `Pressable` + `buttonLabel()` inks on
    the label `Text`, `buttonMuted()` + `BUTTON_MUTED_LABEL` for disabled, `buttonContentTone`
    for spinner/icon tints), `pill` → `badge` (rename; `tone` axis via `badge()` +
    `badgeLabel()`, label on the `micro` type role as web's badge does; `badgeDot` is unused on
    web and stays unused here — no dot anatomy is invented), `card` (`card()` with `padding` /
    `ring` axes), `input` + `text-area` on `field()` (`state` × `layout`), and author `text`
    (`text()` / `textStrong()`, props `variant` / `tone` / `strong` / `mono`, mirroring web's
    `text/index.tsx` — **except the default tone**: web inherits `ink-1` from its base layer,
    RN inherits nothing, so native `Text` defaults `tone` to `ink-1` explicitly; `mono` with no
    registered mono font is an accepted degradation to the system face, stated in the README)
    and `field` (native anatomy: Root / Label / Description / Error; web's
    `Content` and `Value` are web-only form-layout parts and are deliberately not mirrored —
    the shared facts are the four names above and their type roles/inks).
11. Sweep all 24 components off retired utilities per the mapping table (decision 12).
    `ui/app/index.tsx` carries no classes (measured) — nothing to do there. Components outside
    the five families keep their own cvas, re-pointed at contract classes.
12. Update the plugin README's component list (`pill` → `badge`, new `text` / `field`).

**Probe technique (for the harness's pipeline check):** resolve uniwind via
`require.resolve("uniwind/package.json")`, import `dist/module/bundler/{config,css-compiler}` with
a `node:module` `registerHooks` resolver mapping the package's unresolved `@/` aliases into
`dist/module` (trying `<p>.js`, then `<p>/index.js`), run `generateArtifacts` (as
`transformer.ts:54` does) then `compileCSS` with platform `ios` over the emitted `global.css`, and
interrogate the returned stylesheet/vars/scopedVars object. This is the exact code path Metro
runs, minus a device.

## Settled decisions

1. **The N-theme option retires; the shared two-mode `theme` schema is the only surface.** The
   PRD's Out line "plugin-native-ui keeps uniwind's extra themes" (`ui-core.md:70-71`) predates
   M1's two-mode contract and loses to three stronger constraints: the non-goal "no new consumer
   surface beyond the one `theme` option shape shared by the two UI plugins" (`:342`), the
   theming-surface decision (one object, both plugins, `:96-99`), and uniwind's own rule that
   every theme must carry the identical variable set — an extra theme would need a full second
   26-color palette the schema cannot express. No consumer uses the option (measured). A future
   third theme waits for the consumer that needs it, same as web. `extraThemes` plumbing,
   `BUILTIN_THEMES`, and the N-theme codegen path all go; `light` / `dark` remain uniwind
   built-ins, keeping free `Appearance` sync and `setTheme` (`ui/lib/theme.ts`) unchanged.
   **Ratified at the board seat** (this story's card was explicitly assigned the reconciliation:
   "do not narrow one into the other without deciding that deliberately"). Docs stay a snapshot:
   Run A amends the PRD Out line to state the two-mode surface, same commit as the option change.
2. **`@theme` seeds `defaultMode`'s colors, and it does not matter at runtime.** On native every
   color utility resolves through `scopedVars` for the active theme; the `@theme` values only make
   the utilities generate. `themeTokens(resolved)` is used as-is — no web-style light-pinning
   (`plugins/solid-ui/src/node/theme.ts:28-32` exists because web lacks a `light` variant; native
   has both).
3. **Both `@variant` blocks emit all 26 per-mode colors from `modeTokens`**, so the variable sets
   are equal by construction and uniwind's equal-set check can never fire on our output.
4. **The dark block carries no `color-scheme` declaration.** Web's `darkLayer` sets it for UA
   controls; on native, `Appearance` sync is uniwind's job via `setTheme`, and a `color-scheme`
   property inside a `@variant` block would be discovered as a non-var declaration uniwind ignores.
5. **The shadow ladder emits as three top-level `@utility` blocks** (probe-verified), rendered by
   the codegen after `@theme`, before `@layer theme` — same shape web renders through
   `appCssBlocks`, but native needs no slot for it: `aggregateGlobalCss` is single-owner, so the
   blocks render inline.
6. **Press states: grounds ride `active:` classes on the `Pressable`; press-conditional ink rides
   the `pressed` render state.** Grounds are the `active:` half of web's table: `active:bg-ink-3`
   on primary/neutral, `active:bg-danger-soft` on every danger cell, `active:bg-surface-3` on
   secondary/tertiary neutral. The primary/danger cell must ALSO swap its label ink to
   `text-danger` while pressed (web does this via `hover:text-danger`, which covers the press;
   `danger-ink` is the canvas value, near-invisible on `danger-soft`). uniwind's `active:` flag
   cannot restyle the separate label `Text` node, so the button uses `Pressable`'s
   `children={({pressed}) => …}` render prop and composes `pressed && "text-danger"` onto the
   label for primary/danger only. Grounds stay hand-synced with web this milestone; the shared
   ground-table home is the carried M7 item, and this story is its second data point, not its
   settlement.
7. **The shared harness core moves to `@fcalell/ui-core/harness`.** The ~110 duplicated lines
   (check runner, summary/exit, Tailwind-CLI build driver, matrix-cell enumeration) become a
   subpath export used from `scripts/` by all three packages as devDependency-only tooling,
   README-marked internal. The file lives at `packages/ui-core/src/harness.ts` with an explicit
   `"./harness": "./src/harness.ts"` entry added to the exports map (the map is per-subpath
   explicit, not a wildcard); ui-core's own verify check pinning the exports map to exactly
   seven subpaths (`scripts/verify.ts` c02) updates to eight in the same commit. This settles the
   carried 001-03 item ("M4 adds a third copy and settles where the shared home belongs").
   ui-core's own `scripts/verify.ts` refactors onto it; solid-ui's refactor happens here too so
   the third copy never lands.
8. **`pill` renames to `badge`** with the matrix `tone` axis (PRD `:149-156`, break accepted; the
   old `solid` / `outline` axis dies — both map to `neutral` in the sweep, tones are the
   consumer's to pick).
9. **Button API**: `variant` retires for `emphasis` × `tone` × `size` (mapping: `solid` →
   `primary`, `outline` → `secondary`, `ghost` → `tertiary`, all `tone: neutral`). Fixed heights
   (`h-9/11/12`) retire for the matrix `min-h` cells.
10. **Card**: old `ring` (border+canvas) and `flat` (surface) variants retire for the matrix
    (`bg-surface shadow-1 rounded-xl` base, `padding` / `ring` axes). The bordered-on-canvas look
    is not a matrix cell and does not survive. There are **no Card call sites anywhere** in the
    plugin or templates (measured) — the retirement is cva-and-props only; do not invent demo
    call sites.
11. **Input/text-area placeholders land on `text-ink-3`** (M3's corrected decision: `ink-4` is
    reserved for disabled/inert chrome), via `placeholderTextColorClassName`.
12. **Sweep mapping table** (off-contract → contract): `text-xs` → `text-micro` or `text-caption`
    by role; `text-sm` → `text-caption` / `text-callout`; `text-base` → `text-body`; `text-lg` →
    `text-h3`; `rounded-lg` (16) → `rounded-xl` (16, exact); `rounded-2xl` / `rounded-t-2xl`
    (16 today — Tailwind's default `2xl`, since `DEFAULT_BASE_TOKENS` defines none) →
    `rounded-sheet` / `rounded-t-sheet` (24) **by role, not by value**: both sites are
    sheet/dialog corners, and web's dialog and sheet ride the `sheet` rung, so parity wins over
    the numeric; recorded here per the PRD's rounding rule; `text-white` has two sites with two
    dispositions — avatar's identity-tint initials (fixed-hex, dark-invariant grounds) →
    `text-oncover-fg`; checkbox's tick moves **with its fill** to web's pair: the checked ground
    leaves `bg-ok` for `bg-accent` and the tick becomes `text-accent-ink`
    (`solid-ui/.../checkbox/index.tsx:10` parity, and the contract's guaranteed contrast pair,
    where white-on-`ok` is ~2.4:1 in dark); `bg-black/50` → `bg-scrim`;
    button/input fixed heights → the matrix `min-h` cells. **Fixed square icon chrome keeps its
    numeric dimensions**: dialog's `h-12 w-12` circle is decorative and stays; stepper's
    `h-9 w-9` +/- `Pressable`s stay 36px visually and gain `hitSlop` to reach the 44pt floor
    without reshaping the circle. Other numeric dimensions on non-control chrome (`w-9`,
    `h-1.5`, `w-[22px]`…) stay: the numeric spacing base is live by design and these are not
    look classes.
13. **No arbitrary values in any matrix-adopted cell string** (PRD law `:114-117`); existing
    arbitrary *dimensions* in overlay/chrome positions are out of the ban's reach and stay.
14. **`uniwind-env.d.ts` and tsconfig wiring stay untouched**; the dts artifact now types exactly
    `light` / `dark` / `system`.

## Blast radius

`plugins/native-ui/src/**` (types, defaults deleted, index, node/codegen, new node/theme, all 24
components, lib/cn), `plugins/native-ui/package.json` (+ui-core dep, harness devDeps, verify
script), `plugins/native-ui/README.md`, `packages/ui-core/package.json` (+`./harness` export),
new `packages/ui-core/src/harness.ts`, `packages/ui-core/scripts/verify.ts` (refactor + c02
exports-pin update), `plugins/solid-ui/scripts/verify.ts` (refactor onto the shared harness),
`.knowledge/architecture/slot-catalog.md` (new section), `docs/prd/ui-core.md` (Out-line
amendment, decision 1), `pnpm-lock.yaml`. No `@fcalell/cli` change. No consumer exists to
migrate.

## Acceptance criteria

Run A (all `(command)` unless noted):

- A1. `pnpm check` passes from the repo root.
- A2. `pnpm --filter @fcalell/plugin-native-ui verify` passes; every check fails when its guard is
  mutated (spot-verified on at least two mutations at review).
- A3. The emitted `global.css` (rendered via `aggregateGlobalCss` with default options) contains:
  the four namespace resets as the first `@theme` entries; every `themeTokens` key; three
  `@utility shadow-*` blocks; `@variant light` and `@variant dark` blocks whose key sets are
  identical and equal to the 26 `PER_MODE_COLORS`; no `--color-scheme`/`color-scheme` in either
  variant block; exactly two `@variant` names. `(file)` shape asserted by the harness.
- A4. Schema rejection, as a harness check (no consumer project exists to run `stack generate`
  in): parsing `{ theme: { overrides: { colors: { light: { primary: "oklch(0.5 0.1 100)" } } } } }`
  through `nativeUiOptionsSchema` fails with a zod issue whose path/message names `primary`; an
  off-contract scale key fails naming that key. (The zod issues come straight from `themeSchema`'s
  `superRefine`; `parseTheme`'s formatted Error is the `deriveTheme` path, not this one.)
- A5. A knob move (`theme: { knobs: { brandHue: 30 } }`) changes only brand-family values in the
  emitted CSS, byte-identical elsewhere.
- A6. Harness check — Tailwind resolution: a Tailwind CLI build over the emitted `global.css`
  resolves the full matrix-cell inventory (via calling the cvas) plus the **target** (post-sweep)
  native overlay allowlist — not the current sources, which still carry retirees until Run B;
  B5 trues the allowlist up against the swept components — and emits nothing for the retired list
  (`text-sm`, `text-base`, `text-xs`, `text-lg`, `rounded-lg`, `rounded-2xl`, `text-white`,
  `bg-primary`, `bg-black/50`). Ordering: the harness runs the A7 pipeline check **first** — it
  re-stamps uniwind's mutable in-package `uniwind.css` artifact from our own emission (the
  artifact is machine-shared pnpm-store state another project may have stamped last) — so A6's
  build reads a deterministic artifact.
- A7. Harness check — uniwind pipeline: the probe technique compiles the emitted `global.css`
  through uniwind's own dist compiler; asserts `text-h1` carries fontSize+lineHeight(+letterSpacing),
  `shadow-1` carries `boxShadow`, `bg-canvas` resolves to different values under
  `__uniwind-theme-light` / `-dark`, `bg-accent`(light) equals `text-ink-1`(light) (alias law),
  and the retired list is absent from the compiled stylesheet.
- A8. Harness check — every `var(--color-*)` / contract-token reference in `src/` resolves to an
  emitted `@theme` key (M3's `b-resolves` equivalent).
- A9. `@fcalell/ui-core verify` and `@fcalell/plugin-solid-ui verify` still pass after the
  harness extraction (24/24 and 18/18, or renumbered equivalents).
- A10. Slot catalog carries the `nativeUi.slots.*` section matching `index.ts` (`(file)`).

Run B:

- B1. No retired utility remains in `plugins/native-ui/src`: grep for
  `text-(xs|sm|base|lg|xl|2xl)\b`, `rounded-(lg|2xl|t-2xl)\b`, `text-white`, `bg-black`,
  `font-extrabold` returns nothing (`font-extrabold` has no contract weight; cells peak at
  `font-bold`).
- B2. The families compose their cells from `@fcalell/ui-core/variants`: grep confirms the
  import in exactly these files — `button`, `badge`, `card`, `text`, `input`, `text-area`
  (mechanical; `components/field/` is anatomy-only and imports no variants, same as web's).
  That no local cva re-states a matrix cell is a review-judgment check on those files, not a
  grep — non-family components legitimately keep local cvas over contract classes.
- B3. `components/pill/` is gone; `components/badge/` exists with the `tone` axis;
  `components/text/` and `components/field/` exist with the shared prop names (`variant`, `tone`,
  `strong`, `mono`; field anatomy names matching web's shared facts).
- B4. Button renders the two-cva composition (fills + label inks + muted + content tone); press
  states use exactly the decision-6 `active:` grounds; no `hover:` prefix anywhere in
  `plugins/native-ui/src` (grep).
- B5. `pnpm --filter @fcalell/plugin-native-ui verify` green — A6/A7 now cover the adopted
  components' full class inventory.
- B6. `pnpm check` passes from the repo root.

Close-out (mine, at merge): re-run all three packages' verify + `pnpm check` from the real
checkout; run at least two guard mutations; run the uniwind-pipeline probe over the final
emission and record light/dark resolved values on the card; review B4's pressed-ink and B2's
no-restated-cells judgments by reading the five family components. **No on-device render
exists** — no native consumer project and no simulator in this environment; the live half of the
PRD's M4 Verify ("launch the app… same cells as the web app") is reduced to the uniwind-compiled
stylesheet. **This reduction is ratified at the board seat** (same seat that ratified M3's
no-browser-render reduction), and the on-device render is owed and carried forward to whenever a
native consumer first exists.

## Out of scope

- Closing `className` / `style` props (M5, both plugins at once).
- The geometry gate and `buildSteps` contributions (M6).
- The rhythm family (`Section` / `Stack` / `Row` / `Pair`) — M5.
- Descriptor-prop collapses (`RowItem` leading/trailing etc.) — M5.
- The shared hover/press ground table in ui-core (M7; decision 6 is its second data point).
- Migrating the remaining component families onto shared matrices (M7).
- A scratch native consumer app / simulator run.
- `expo.slots.*` catalog section (pre-existing drift, flagged, not this story).

## Open questions

None blocking; adversary rounds may add.

## Flags for the board

- The slot catalog is missing `expo.slots.*` entirely (consumed by native-ui's contributions at
  `src/index.ts:233-268`). Pre-existing drift; wants its own chore.
- uniwind's artifact regeneration mutates the installed package's `uniwind.css` in the pnpm
  store — shared across every project on the machine that resolves the same store entry. Observed
  during refinement (this store's copy carried another project's stale tokens). Upstream design,
  not ours to fix, but the harness's pipeline check inherits it: runs re-stamp the artifact.
