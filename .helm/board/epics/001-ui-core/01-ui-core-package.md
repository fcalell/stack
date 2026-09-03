---
id: 001-01
status: done
depends: []
branch: worktree-agent-abc6f71183a65582d
gate:
  rounds: 2
  flags: 19 + 16
  outcome: all fixed, none dismissed
runs:
  - n: 1
    outcome: changes-requested
    spec-axis: 15/15 pass, 12 of 14 orchestrator mutations caught
    standards-axis: 5 must-fix, 8 worth noting
    holes-the-harness-missed:
      - type-role modifier values unasserted
      - overrides.scales let the two type shapes disagree
  - n: 2
    outcome: merged
    verify: 14/14, runs with no argument against a committed reference
    recheck: all three previously-blind mutations now fail correctly
    check: pnpm check green from the real checkout, so criterion 1 holds
merge:
  took: packages/ui-core only
  note: >
    The worktree branched from 967af58, not master's bca325a, so its copy of
    docs/prd/ui-core.md was the older 189-line version and its PRD commit was
    unmergeable. The three corrections were ported to the live file by hand.
    Files are in the working tree, uncommitted, alongside the repo's existing
    uncommitted changeset.
carried-forward:
  - >
    plugins/native-ui/src/node/css.ts:38 has the same /* validator hole in
    shipped code, on the path every native token value passes through.
  - >
    plugins/native-ui/src/node/css.ts:21 rejects the four --*-* zeroing keys,
    so M4 must widen it before feeding themeTokens down the baseTokens path.
---
# ui-core package: token contract, derivation, laws

## Goal

`packages/ui-core` exists as `@fcalell/ui-core`, a zero-framework preset library exporting the
closed token contract, the zod theme schema, the parametric derivation (hue knobs plus per-token
overrides, light and dark), and the token records that M3 and M4 will render into CSS. The design
laws ship as the package README. Nothing consumes it yet: the story is complete when `pnpm check`
passes and a committed verification script reproduces every value in the reference design system
exactly and proves the emitted tokens generate the utilities they claim to.

## Approach

**Measured facts** (verified against `bca325a`). The reference design system is
`/home/fcalell/projects/sailward/apps/mobile/global.css` (`global.css` below) with its rationale in
`/home/fcalell/projects/sailward/.helm/knowledge/design/design-system.md` (`design-system.md` below).

- `packages/biome-config/package.json` and `packages/typescript-config/package.json` are the
  preset-library precedent: `private: true`, `sideEffects: false`, subpath-only exports, a `clear`
  script, no build step. ui-core departs on `private`, because `plugins/solid-ui/package.json`
  carries no `private` field and depends on `@fcalell/cli` with `workspace:*`, so a published plugin
  will depend on ui-core.
- `packages/cli/package.json:6-10` is the `imports` block and `:11-23` the `exports` block, one
  subpath per module, `.ts` source referenced directly, no build step.
  `.helm/agents/conventions.md:10-11` reads "never a barrel index **that re-exports
  everything**"; ui-core ships no `"."` export because it has no single entry worth naming, a design
  choice here rather than the rule.
- `packages/cli/package.json` declares `zod` as a **peerDependency** (`^4.0.0`), not a dependency,
  and carries `@types/node` in devDependencies. ui-core follows both.
- `packages/cli/tsconfig.json` extends `@fcalell/typescript-config/node-tsx.json` and sets
  `"include": ["src"]`. ui-core has no JSX and does the same, which also keeps the verification
  script below out of `tsc --noEmit`.
- Exact ranges in `global.css`: the `@theme` block is **24-126**, `@variant light` **130-157**,
  `@variant dark` **158-185**, the three `@utility shadow-*` rules **195-205**. Zeroing is at
  **25-28** across all four namespaces (`--color-*`, `--radius-*`, `--text-*`, `--shadow-*`);
  `plugins/solid-ui/src/ui/globals.css:16-18` zeroes only three and omits `--text-*`.
- **The 26 per-mode colors are declared twice on purpose**: inside `@theme` at `global.css:87-112`
  and again in `@variant light` at `:131-156`. In Tailwind v4 a custom property declared only inside
  `@layer theme { :root { @variant … } }` generates **no utility**, so the `@theme` copy is what
  makes `bg-canvas` exist at all. `plugins/native-ui/src/types.ts:7-8` states the same rule: "The
  default theme's tokens also seed the `@theme` block, so the `bg-*` / `text-*` utilities exist".
- Three tokens carry alpha, and **all three are mode-invariant**: `global.css:113`
  `--color-scrim: oklch(0.22 0.043 261 / 0.8)`, `:124` `--color-oncover-glass: oklch(1 0 0 / 0.149)`,
  `:125` `--color-oncover-navy: oklch(0.2 0.036 261 / 0.549)`. Neither `@variant` block contains a
  `/` anywhere, so no per-mode token carries alpha.
- `scrim` and the five `oncover-*` tokens appear in `@theme` only and in neither `@variant` block.
  `global.css:115-120` states why: "Defined here only (no light/dark override) so they DON'T invert
  in Notturno."
- Hue is per mode. Light `--color-brand: oklch(0.22 0.043 261)` (`:142`) against dark
  `oklch(0.72 0.075 275)` (`:170`). `design-system.md:58` gives the law: "`brand` is navy in light;
  in Notturno it's a soft periwinkle (`#96a1d4`, hue 275 — off marine's axis so the two azures stay
  two at night)."
- Siblings differ within a mode: light `warn` 75, `warn-soft` 80, `warn-mark` 78 (`:147-149`); dark
  collapses all three to 75 (`:175-177`).
- `accent` is not an independent color. `design-system.md:60`: "**`accent`/`accent-ink`** =
  primary-fill pair (navy `ink-1` / `canvas`)". The values confirm it: light `--color-accent`
  (`:155`) is byte-identical to light `--color-ink-1` (`:138`), and light `--color-accent-ink`
  (`:156`) to light `--color-canvas` (`:131`); the same holds in dark (`:183-184` against `:170`
  region and `:159`).
- `danger-ink` is neutral-hued, not danger-hued: `oklch(0.966 0.006 261)` light (`:152`) and
  `oklch(0.2 0.034 261)` dark (`:180`), the canvas value in each mode.
- Light `--color-surface` and `--color-thumb` are `oklch(1 0 0)` (`:132`, `:135`), hue literal 0 at
  zero chroma, while dark `surface` is `oklch(0.285 0.044 261)` (`:160`) and carries the neutral hue.
- The two consumers are **not** symmetric, and their two paths take **different key shapes**.
  `plugins/native-ui/src/node/codegen.ts:93` iterates `payload.baseTokens` and emits the key
  verbatim through `cssVarName`, so `@theme` entries are keyed by full `--name`. Its per-theme color
  path at `:115` emits `--color-${cssIdent(key)}`, so those are keyed **without** the `--color-`
  prefix; `plugins/native-ui/src/types.ts:19-21` says so ("keyed WITHOUT the `--color-` prefix").
  `packages/cli/src/css.ts:60`'s ident regex allows at most one leading `-`, so passing
  `--color-canvas` down that path throws rather than double-prefixing.
- `plugins/solid-ui/src/node/codegen.ts:20-44` (`aggregateAppCss`) emits `@import` statements, a
  fixed `@source "../src";` at `:32`, and `@layer <ident> { }` blocks. Its payload type
  (`plugins/solid-ui/src/types.ts`, `CodegenAppCssPayload`) is `{imports, layers}`. It has no
  `@theme` and no `@utility` path, and Tailwind v4 requires both at top level, so M3 needs a new
  slot for them whatever shape ui-core returns.
- `plugins/native-ui/src/node/codegen.ts:29-33` already owns the font fallback stacks
  (`ROLE_FALLBACKS`) and emits `--font-<role>` at `:96-98`.
  `plugins/solid-ui/src/ui/globals.css:25-26` emits `--font-sans` / `--font-mono` bound to
  `--ui-font-*`, rebound by `themeFontsPlugin`. Marina defines no fallbacks and no serif
  (`global.css:84-85`).
- `plugins/solid-ui/src/ui/globals.css:21-22` and `:73-80` define eight tokens outside this
  contract: `--color-white`, `--color-black`, `--ease-ui`, `--duration-fast`, `--duration-base`, and
  three `--animate-*`. `--color-*: initial` would kill the first two.
- Tailwind v4 binds leading and tracking to a size only through the modifier form
  (`--text-h1--line-height`, `--text-h1--letter-spacing`). Marina's separate `--leading-*` /
  `--tracking-*` namespaces (`global.css:70-82`) generate independent `leading-h1` / `tracking-h1`
  utilities instead, and it chose that split for the **native** runtime: `global.css:66-69` says a
  unitless leading is "a multiplier, so it scales with OS font-scaling — never a fixed px box".
  Nothing establishes that uniwind honours the modifier form, so this story emits **both** shapes.
  Marina defines tracking for five of eight roles (display, h1, h2, h3, micro).
- The zeroing set is four namespaces, so `--leading-*` and `--tracking-*` stay live: `leading-tight`
  and `tracking-wide` remain compilable. That is a real hole in "off-contract compiles to nothing"
  and the README names it.
- No Tailwind toolchain exists at the workspace root. `node_modules/.bin` holds `biome jiti terser
  tsx turbo vite yaml` and `@tailwindcss/cli` appears in no `package.json`. `.npmrc` sets only
  `auto-install-peers = true` with pnpm's default isolated `node_modules`, and Tailwind v4 resolves
  `@import "tailwindcss"` relative to the input CSS file, so a fixture under `packages/ui-core`
  needs **both** `@tailwindcss/cli` and `tailwindcss` as direct devDependencies there.
  `plugins/solid-ui/package.json` carries `tailwindcss` directly for the same reason.
- The repo has zero test files (`git ls-files | grep -c '\.test\.ts'` is 0) and no testing playbook,
  so every criterion below is `(command)` or `(file)`.

**Package shape.** `packages/ui-core`, name `@fcalell/ui-core`, `"type": "module"`,
`"sideEffects": false`, no `private` field, `files: ["src", "README.md"]`, the four standard scripts
from `packages/cli/package.json` plus `verify` (below). `zod` is a peerDependency plus
devDependency; `@tailwindcss/cli`, `tailwindcss`, `@types/node`, `@fcalell/typescript-config`, and
`typescript` are devDependencies. No `@fcalell/cli` dependency, for the reason two paragraphs down.

Public subpaths, one module each, no `"."`:

- `./tokens` (`src/tokens.ts`) — the contract as data, including the calibrated default values.
- `./schema` (`src/schema.ts`) — the zod theme schema and the `Theme` input type.
- `./derive` (`src/derive.ts`) — `deriveTheme(theme: Theme): ResolvedTheme`.
- `./emit` (`src/emit.ts`) — the record-shaping helpers.

**The seam between them is explicit.** `deriveTheme` resolves knobs, offsets, and overrides into a
`ResolvedTheme` holding final value strings. Both emit helpers take that `ResolvedTheme`, never the
raw `Theme`, and never call `deriveTheme` themselves. `mode` is the type `"light" | "dark"`.

**ui-core returns records, never CSS text.** This is the load-bearing change from the PRD's original
"emits CSS bodies" decision, and the PRD is updated alongside this story. Two measured reasons: a
pre-rendered string is unvalidatable per token, which would delete the per-key defense in depth at
`plugins/native-ui/src/node/codegen.ts:93-102` that `:66-68` calls deliberate; and records mean
ui-core never renders a consumer-supplied string, so it needs no escaping and no `@fcalell/cli`
dependency, while each plugin keeps escaping at its own emit with the helpers it already has. (M3
needs a new top-level-block slot on solid-ui either way, since `aggregateAppCss` hosts neither
`@theme` nor `@utility`. That is M3's work, noted here so it is not a surprise.)

`./emit` exports three helpers, and their key shapes differ because their consumers' do:

- `themeTokens(resolved)` — the `@theme` record, keyed by **full `--name`**, matching the
  `baseTokens` path at `plugins/native-ui/src/node/codegen.ts:93`. It holds the four zeroing
  entries, the spacing rungs, the radius rungs, the type-role entries in both shapes below, the six
  mode-invariant colors, **and the default mode's 26 colors**, because without that last group no
  color utility exists at all.
- `modeTokens(resolved, mode)` — one mode's 26 colors keyed by **bare token name** (`canvas`,
  `ink-1`), matching `plugins/native-ui/src/types.ts:19-21` and the emit at `codegen.ts:115`. Never
  the mode-invariant six.
- `shadowUtilities(resolved)` — `Record<"shadow-1" | "shadow-2" | "shadow-3", string>` mapping each
  level to its `box-shadow` value, because the `--shadow-*` theme namespace does not resolve into
  React Native's `boxShadow` (`global.css:189-194`). `shadow-1` is two stacked shadows in one value,
  so each level is one string. Each consumer wraps these in `@utility` itself.

Every returned value is a plain value string: no trailing `;`, no wrapping block.

**The default mode is `light`**, declared as a `defaultMode` field on the schema so the choice is
data rather than a convention. `themeTokens` reads it.

**The contract, and its defaults are the calibration.** The default token values *are* the
reference system's, so reproduction is exact with zero overrides and the reproduction criterion
means something. A consumer re-hues through the knobs. Colors, 26 per-mode: `canvas`, `surface`,
`surface-2`, `surface-3`, `thumb`, `edge`, `edge-2`, `ink-1..4`, `accent`, `accent-ink`, `brand`,
`brand-soft`, `brand-deep`, `interactive`, `interactive-soft`, `ok`, `ok-soft`, `warn`, `warn-soft`,
`warn-mark`, `danger`, `danger-soft`, `danger-ink`. Six mode-invariant: `scrim`, `oncover-fg`,
`oncover-ink`, `oncover-surface`, `oncover-glass`, `oncover-shade`. Marina's `marine` /
`marine-soft` become `interactive` / `interactive-soft` and its `oncover-navy` becomes
`oncover-shade`, since those are brand words and the PRD puts the nautical palette out of scope.
Type roles: `display`, `h1`, `h2`, `h3`, `body`, `callout`, `caption`, `micro`. Spacing rungs:
`room`, `section`, `stack`, `row`, `pair` for rhythm plus `gutter` and `card` for insets. Radius:
`md`, `control`, `xl`, `sheet`, `full`. Shadows: `1`, `2`, `3`. Font roles are not emitted tokens.

Every name list is exported `as const` so downstream code derives union types rather than restating
the list.

**Token declaration shapes.** Two, because the facts are two:

- A per-mode color declares, per mode, `{ l, c, hue }`, where `hue` is a literal number or
  `{ knob, offset }`. No alpha: no per-mode reference value carries one.
- A mode-invariant color declares one `{ l, c, hue, alpha? }`.

One rule handles zero chroma: when the resolved chroma is 0 the emitted hue is 0, which reproduces
light `surface` and `thumb` as `oklch(1 0 0)` while dark `surface` keeps the neutral hue.

**`accent` and `accent-ink` are aliases, not colors.** `accent` resolves to `ink-1` and `accent-ink`
to `canvas`, per mode. That is the law at `design-system.md:60`, and encoding it as an alias keeps
the law true under every knob setting instead of holding only at the defaults.

**Knobs, stated once.** Six hues, `number` in `[0, 360)`: `neutralHue` (default 261), `brandHue`
(261), `interactiveHue` (261), `okHue` (160), `warnHue` (75), `dangerHue` (28). One scalar,
`neutralChroma` (default 1, range `[0, 2]`), which multiplies the declared chroma of **every token
whose hue binds to `neutralHue`** and nothing else. That set is well defined by the binding table
below, and it includes `danger-ink` and `scrim` despite their names.

The binding table is data in `src/tokens.ts`, and these are the entries an implementer would
otherwise guess wrong:

- `danger-ink` binds to `neutralHue` in both modes (it is the canvas value, `global.css:152`, `:180`).
- `scrim`, `oncover-ink`, `oncover-shade` bind to `neutralHue`; `oncover-fg` and `oncover-surface`
  are achromatic (`oklch(1 0 0)`); `oncover-glass` is achromatic with alpha.
- `warn-mark` binds to `{ knob: warnHue, offset: 3 }` in light and `{ knob: warnHue, offset: 0 }` in
  dark. `warn-soft` binds to offset 5 in light and 0 in dark.
- Dark `brand` binds to `{ knob: brandHue, offset: 14 }`, which reproduces 275 at the default and
  keeps `design-system.md:58`'s "two azures stay two" law true when both azure knobs move together.
  Binding it to `interactiveHue` instead would make `brand` stop responding to `brandHue` in dark,
  which is worse.
- `accent` and `accent-ink` bind to nothing; they alias.

Chroma is otherwise a fixed per-token number, never a knob-scaled ladder, because chroma ceilings
are hue-dependent: `danger` sits at 0.18 and `ok` at 0.105 at the same lightness (`global.css:106`,
`:101`), and one multiplier over one ladder would push a hue out of gamut. Lightness is never
derived, because the calibrated contrast contracts hold only at those values.

**Free hues do not preserve the contrast contracts, and the README says so.** Holding chroma fixed
while a hue knob roams can push a value out of sRGB, which `design-system.md:276` notes gets "mapped
down", changing the rendered contrast. The contracts hold at the default hues and are the
consumer's to re-check after a knob change. The PRD currently claims the opposite at
`docs/prd/ui-core.md:88-89` ("so the documented AA contrast contracts hold for any hue a consumer
picks"); this story corrects that line.

**Overrides are two maps, because the values are two kinds.** The key shape is explicit:

```
overrides: {
  colors: { shared?: {token: value}, light?: {token: value}, dark?: {token: value} },
  scales: { "--spacing-room": "40px", ... }
}
```

`colors` values must match `/^oklch\(\s*\d+(\.\d+)?(\s+\d+(\.\d+)?){2}\s*(\/\s*\d+(\.\d+)?\s*)?\)$/`
(digits required, so `oklch(. . .)` is rejected; `global.css:17` warns that a malformed oklch
"silently compiles to black, not a build error"). Unknown token names are rejected by name, and a
`shared` key naming a per-mode token, or a `light`/`dark` key naming a mode-invariant one, is
rejected too. `scales` values are full `--name` keys from the contract with a value rejecting `;`,
`{`, `}`, and newlines, the same class of check as
`plugins/native-ui/src/node/css.ts:40-50`. `scales` is what covers a consumer who needs different
rungs, radii, type sizes, leading, tracking, or shadow values, since none of those is knob-derived.

**`spacingBase`, `radiusBase`, and `shadowStrength` are dropped from the knob set.** The reference
rungs are 32/24/12/8/4/16/16 and the radii 10/14/16/24/9999, neither a clean multiple of a base, and
the shadow ladder is four hand-tuned sRGB alphas across three levels with no OKLCH derivation. A
knob that derives nothing is a surface with no behavior, which philosophy puts last. Those values
are literals in the contract and `overrides.scales` covers changing them.

**Type roles emit both shapes.** For each role: `--text-<role>` plus `--text-<role>--line-height`
and, for the five roles that define it, `--text-<role>--letter-spacing` (so `text-h1` carries its
leading on web), **and** `--leading-<role>` / `--tracking-<role>` (so the unitless multiplier
semantics uniwind relies on stay available on native). One source of truth in the contract, two
emitted shapes.

**Font roles stay with the plugins.** ui-core exports the three fallback stacks as `FONT_FALLBACKS`,
lifted verbatim from `plugins/native-ui/src/node/codegen.ts:29-33` so there is one source of truth,
but emits no `--font-*` token. Both plugins already declare those from their own font options, and
emitting here would put two writers on one key.

**Values are emitted at three decimal places, trailing zeros stripped**, which reproduces every
reference value exactly (every numeric literal in both variant blocks is at most three decimals) and
makes a regenerate byte-stable.

**The verification script is committed, not scratch.** `packages/ui-core/scripts/verify.ts`, run by
a `verify` script through `tsx`, outside the tsconfig `include` so `tsc --noEmit` ignores it. It
parses `global.css` from the path in its one argument, derives with default knobs, diffs, drives the
Tailwind fixture under `packages/ui-core/scripts/fixture/`, and exits non-zero on any mismatch.
Every `(command)` criterion below is one assertion inside it, so a reviewer re-runs the whole set
with `pnpm --filter @fcalell/ui-core verify <path-to-global.css>`.

**The README is the design-laws doc** and a deliverable. Its source is `design-system.md`: the
surface rules at `:45-51` and `:56`, the color roles at `:55-62`, the tone-to-meaning table at
`:63`, the type-role rules at `:98-103`, and the contrast contracts at `:276-278`. It carries those
generalized off the brand, plus the rung picking rules (rhythm steps down one rung per nesting
level; an inset is at least the same-axis gap it contains), the contrast contract stated at each
token it constrains with the free-hue caveat above, and a section on what the zeroing does not catch
(`--leading-*` and `--tracking-*` stay live, and utilities built from a variable are invisible to
it). It follows `.helm/agents/writing-style.md`.

## Blast radius

- `packages/ui-core/` (new): `package.json`, `tsconfig.json`, `README.md`, `src/tokens.ts`,
  `src/schema.ts`, `src/derive.ts`, `src/emit.ts`, `scripts/verify.ts`, `scripts/fixture/`.
- `docs/prd/ui-core.md`: three corrections, no other change. The **Emission** decision becomes token
  records with the measured reasons; the **Values** decision drops the three non-derived knobs and
  the "hold for any hue a consumer picks" claim at `:88-89`; M1's **Verify** block is rewritten,
  since it currently says "Run `stack generate` and read `.stack/app.css`" and nothing imports
  ui-core until M3.
- Root `pnpm-lock.yaml`.
- Untouched: `packages/cli`, both UI plugins, every other plugin, `.helm/knowledge/`.

## Acceptance criteria

- [ ] `pnpm check` passes from the repo root with `packages/ui-core` in the workspace. (command)
- [ ] `packages/ui-core/package.json` has no `private` field, `"sideEffects": false`, exactly the
      four subpaths `./tokens`, `./schema`, `./derive`, `./emit`, no `"."` entry, `zod` as a
      peerDependency, both `tailwindcss` and `@tailwindcss/cli` as devDependencies, and no
      `@fcalell/cli` in any dependency field. (file)
- [ ] `packages/ui-core/src/tokens.ts` declares all 26 per-mode colors, all 6 mode-invariant colors,
      8 type roles, 7 spacing rungs, 5 radius rungs, and 3 shadow levels named in this brief,
      exports each name list `as const`, carries the knob binding for every color token, and
      contains neither `marine` nor `navy`. (file)
- [ ] `pnpm --filter @fcalell/ui-core verify <global.css>` exits 0, and every criterion below is one
      of its assertions. (command)
- [ ] Default knobs with **no overrides** reproduce `@variant light` (`global.css:130-157`) and
      `@variant dark` (`:158-185`) token for token, after renaming `marine` to `interactive` and
      `marine-soft` to `interactive-soft`. The printed diff is empty. (command)
- [ ] The same run reproduces every non-color value in `@theme` (`:24-126`) exactly: the 7 spacing
      rungs, 5 radii, 8 `--text-*`, 8 `--leading-*`, 5 `--tracking-*`, and the six mode-invariant
      colors including `scrim` as `oklch(0.22 0.043 261 / 0.8)`, `oncover-glass` as
      `oklch(1 0 0 / 0.149)`, and `oncover-shade` as `oklch(0.2 0.036 261 / 0.549)`. (command)
- [ ] `shadowUtilities` returns the three `box-shadow` values byte-identical to `global.css:195-205`,
      including `shadow-1`'s two comma-separated layers. (command)
- [ ] `themeTokens` returns the 4 zeroing entries, every non-color scale, the 6 mode-invariant
      colors, **and** the default mode's 26 colors, all keyed by full `--name`.
      `modeTokens(resolved, "light")` returns exactly 26 entries keyed by bare token name, and none
      of the mode-invariant six. Every returned value has no trailing `;` and no wrapping block.
      (command)
- [ ] Every `modeTokens` key passes `packages/cli/src/css.ts`'s `isCssIdent`, so it survives the
      `--color-${cssIdent(key)}` path at `plugins/native-ui/src/node/codegen.ts:115`. (command)
- [ ] Light `surface` and `thumb` emit `oklch(1 0 0)` with hue 0, not the neutral hue, while dark
      `surface` emits the neutral hue. (command)
- [ ] Setting `brandHue` alone changes only `brand`, `brand-soft`, and `brand-deep`; every other
      token string is byte-identical to the default run. `accent` and `accent-ink` stay equal to
      `ink-1` and `canvas` under every knob setting exercised. (command)
- [ ] Setting `neutralChroma` to 0 zeroes the chroma of every neutral-bound token including
      `danger-ink` and `scrim`, and leaves `ok`, `warn`, and `danger` untouched. (command)
- [ ] Each of these is rejected with an error naming the offending key: an override for an unknown
      token, a knob outside its stated range, a `colors` value containing `;` or `}`, the value
      `oklch(. . .)`, a `shared` override naming a per-mode token, and a `scales` value containing a
      newline. A valid override in each of `colors.shared`, `colors.dark`, and `scales` reaches the
      emitted record unchanged. (command)
- [ ] The Tailwind fixture builds with `themeTokens`' output wrapped verbatim in `@theme { }`. In
      that output `text-h1` emits a rule carrying both `font-size` and `line-height`; `leading-h1`,
      `tracking-h1`, `bg-canvas`, `bg-accent`, `gap-stack`, and `rounded-control` each emit a rule;
      `bg-red-500` and `text-sm` emit nothing; and wrapping `shadowUtilities`' values in `@utility`
      makes `shadow-1` emit its two-layer value. (command)
- [ ] `packages/ui-core/README.md` carries the tone-to-meaning table, the surface rules, the rung
      picking rules, the type-role rules, the per-token contrast contracts with the free-hue caveat,
      and a section on what the zeroing does not catch. Grepping it for `marine`, `Marina`,
      `Notturno`, `WeNauti`, `navy`, `azure`, `sea`, `SpecCard`, `FilterChip`, and `Sheet` returns
      nothing. (file)

## Out of scope

- `cn()`, the `tailwind-merge` config, and every variant matrix. → 001-02.
- Any change to either UI plugin: schemas, defaults, codegen, or CSS. → 001-03 / 001-04. Nothing
  imports ui-core when this story lands.
- The new top-level-block slot solid-ui needs to host `@theme` and `@utility`. → 001-03.
- The `./gate` subpath, the geometry vocabulary, and `ts-morph`. → 001-06.
- The descriptor types (`Action`, `BadgeSpec`, `FooterSpec`) and the API canon prose. → 001-02.
- Emitting `--font-*`. ui-core exports the fallback stacks as data; both plugins keep declaring the
  tokens from their own font options.
- The eight web-only tokens at `plugins/solid-ui/src/ui/globals.css:21-22` and `:73-80`
  (`--color-white`, `--color-black`, `--ease-ui`, two `--duration-*`, three `--animate-*`). Outside
  the contract on purpose, they stay in solid-ui's wrapper, and M3 must keep declaring them after
  `--color-*: initial` or white and black disappear.
- **Themes beyond light and dark.** ui-core describes two modes. `plugins/native-ui/src/types.ts:11-22`
  accepts an arbitrary array of named themes today and `docs/prd/ui-core.md:70-71` says native keeps
  uniwind's extra themes, so M4 has to reconcile a two-mode contract with an N-theme option rather
  than narrowing one into the other. Recorded here as a known M4 problem, not solved here.
- Verifying the type-role tokens under uniwind. This story emits both the modifier form and the
  `--leading-*` / `--tracking-*` namespaces precisely because uniwind's handling of the modifier
  form is unestablished; which one native actually consumes is settled in M4 against a running app.
- Folding the README into `.helm/knowledge/`. That happens when the PRD retires.

## Open questions

None open. Settled across two gate rounds and folded into Approach: the interactive accent is named
`interactive`; the emit surface is records, with `@theme` keyed by full name and mode records keyed
bare; the contract's defaults are the reference calibration, so reproduction is zero-override;
`themeTokens` carries the default mode's colors because Tailwind v4 generates no utility from a
variant-only declaration; `accent` / `accent-ink` are aliases of `ink-1` / `canvas` so the
primary-fill law survives re-hueing; hue is per mode with a knob-plus-offset form and a published
binding table; alpha exists only on mode-invariant tokens; overrides split into `colors` and
`scales`; `spacingBase` / `radiusBase` / `shadowStrength` are dropped as knobs with nothing behind
them; type roles emit both the v4 modifier shape and the standalone namespaces; and font tokens stay
with the plugins.
