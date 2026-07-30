---
id: 001-02
status: done
depends: [001-01]
merged: ceec3aa
gate: {rounds: 2, flags: 23 + 16, outcome: all fixed, none dismissed}
runs:
  - {n: 1, outcome: changes-requested, spec-axis: 12 of 13 pass + 1 partial, all 60 pinned cells exact, standards-axis: 4 must-fix, 8 worth noting}
  - {n: 2, outcome: merged, verify: 24/24, check: pnpm check green from the real checkout, net: -337 lines}
amended-in-flight:
  - criterion 5's verbatim cell pin deleted after it had constrained the implementer; the config object is now the oracle
  - the padding rule reworded directional (interiors never a rung, whole-box p-<rung> legal) after the run contested my wording as unimplementable against the pinned p-card
  - testID dropped from FooterAction, overriding the brief's port-verbatim instruction
carried-forward:
  - c24 enforces a repo-wide no-JSDoc rule as a package script; it belongs in packages/biome-config where it would cover every package
  - a hand-rolled inline cva in variants.ts with no table would escape the registry check; it would also violate the Shape law and show as a raw cva import

# Shared cn, the first variant matrices, the API canon

## Goal

`@fcalell/ui-core` gains three public surfaces beyond M1's token layer: `cn()` with a
`tailwind-merge` config that understands the contract's custom scales, the platform-invariant CVA
matrices for the button, text, badge, card, and field families, and the framework-free descriptor
types (`Action`, `BadgeSpec`, `FooterSpec`). The primitive API canon lands in the README as law.

Nothing consumes any of it yet: M3/M4 wire the plugins, M5 applies the canon. The story is complete
when `pnpm check` passes, the canon is written, and `pnpm --filter @fcalell/ui-core verify` proves
every class every matrix can emit resolves against the M1 token contract — so a matrix cannot
silently reference a token that does not exist.

Driver: `docs/prd/ui-core.md` M2.

## Approach

**Measured facts**, verified against `beeebd7` (the whole tree, including `packages/ui-core`, is
committed and clean). The reference design system is sailward at `/home/fcalell/projects/sailward`
(`sw/` below, rooted at `apps/mobile/`).

### The merge config

- **Neither plugin has an extended merge config today.** `plugins/solid-ui/src/ui/lib/cn.ts:4-6`
  and `plugins/native-ui/src/ui/lib/cn.ts:7-9` are both bare `twMerge(clsx(inputs))`.
  `sw/src/ui/lib/cn.ts:9-31` extends via `classGroups`.
- Stack has **`tailwind-merge` 3.5.0** installed; `plugins/solid-ui/package.json:75` and
  `plugins/native-ui/package.json:51` pin `^3.5.0`. Sailward pins the same range but resolves to
  3.6.0, so it is not a proof of behaviour at 3.5.0 — the measurements below are.
- **Extend `theme`, not `classGroups`.** 3.5.0 reads custom scales through theme keys
  (`themeText`, `themeRadius`, `themeLeading`, `themeTracking`, `themeSpacing`), and
  `scaleRadius()` is consumed by **all sixteen** `rounded*` groups. Measured, both configs built
  over the same token lists:

  | input | `extend.theme` | `extend.classGroups` |
  | --- | --- | --- |
  | `text-h1 text-body` | `text-body` | `text-body` |
  | `leading-h1 leading-body` | `leading-body` | `leading-body` |
  | `tracking-h1 tracking-micro` | `tracking-micro` | `tracking-micro` |
  | `rounded-control rounded-sheet` | `rounded-sheet` | `rounded-sheet` |
  | `rounded-t-sheet rounded-t-control` | `rounded-t-control` | **both survive** |
  | `rounded-ss-control rounded-ss-sheet` | `rounded-ss-sheet` | **both survive** |
  | `text-h1 text-ink-2` | both (correct) | both (correct) |

  `extend.theme` is four lines, covers the side-specific radius groups the `classGroups` route
  cannot reach, and needs no group-id knowledge.
- **Five lists register, not four.** `text` ← `TYPE_ROLES` (`packages/ui-core/src/tokens.ts:257-266`),
  `leading` ← `TYPE_ROLES`, `tracking` ← `TRACKED_ROLES` (`:271`, five roles — `tracking-body`
  emits nothing, so registering eight would register three classes that do not exist),
  `radius` ← `RADIUS_RUNGS` (`:246`), and **`spacing` ← `SPACING_RUNGS`** (`:225-233`). Measured
  without the spacing registration: `cn("p-card","p-room")` returns **both**, and
  `cn("gap-row","gap-stack")` returns **both**. With it: `p-room`, `gap-stack`, and `p-card p-4`
  correctly collapses to `p-4`. The card matrix ships `p-card` and the field matrix ships two
  different gap rungs, so this one is load-bearing, not hygiene.
- **The extension introduces a destructive interaction that did not exist before.** 3.5.0 declares
  `conflictingClassGroups: { 'font-size': ['leading'] }`. Measured: unextended,
  `cn("leading-h1","text-body")` keeps both; extended it returns `text-body` — the role's line
  height is silently deleted. `cn("text-body","leading-h1")` keeps both. So a type role must be
  composed **before** any later size class, never after. This belongs in the README as a rule and
  in the checks as a pinned case.

### The matrices

- **Button**: `sw/src/ui/primitives/button.tsx:13-40` is the box — line 14 the base string (where
  `rounded-control` and `gap-row` live), `:16-30` the `variants` block, `:31-37` the
  `compoundVariants` (**four** rows at `:32-35`; `:36` is a comment saying tertiary stays
  transparent in both tones). `:42-57` is the label table, which already carries **six** compound
  rows (`:48-55`). `:63-67` is `contentTone`, `:70-74` `MUTED_SURFACE`, and `:132` adds
  `text-ink-4` for the muted label.
- **Text**: `sw/src/ui/primitives/text.tsx:12-40` is `textClass` (nine `variant`s, twelve `tone`s),
  `:44-54` the `STRONG` weight-lift table. `rowtitle` is a composite of the `body` size at a heavier
  weight, not a ninth type token — `TYPE_ROLES` has eight.
- **Badge**: `sw/src/ui/primitives/badge.tsx:12-25` the tone fill, `:28-39` the label ink table,
  `:42-50` the glyph table, `:54-67` the status-dot mark fill (`:61` `warn` rides `warn-mark`, the
  3:1 non-text floor, while the label at `:36` keeps AA `warn`). **The glyph table and the label ink
  table are byte-identical across all seven tones.**
- **Card**: `sw/src/ui/primitives/card.tsx:49-55` is a `cn()` call, not a cva. `:50` is
  `"overflow-hidden rounded-xl bg-surface shadow-1"`; `:51` `padded && "p-card"`; `:52`
  `padded && chevron && "pr-9"`; `:53` the `ring === "warn"` case (`border-[1.5px] border-warn-mark`).
- **Field**: `sw/src/ui/primitives/field.tsx:10-26` is `fieldBox`. `:11` the base
  `"flex-row items-center gap-row rounded-control border bg-surface px-3.5"`; `:19-22` the `layout`
  axis (`input: "min-h-12"`, `row: "gap-3 py-2"`). The two layouts want **different** gaps — 8px
  and 12px.
- **`marine` is not in the contract.** `text.tsx:31` `marine: "text-marine"`, `badge.tsx:16`
  `marine: "bg-marine-soft"`, `badge.tsx:59` `marine: "bg-marine"`. `tokens.ts:56-57` names them
  `interactive` / `interactive-soft`. These three classes emit **nothing** under the M1 `@theme`
  record; every other class across the five families emits. `scripts/verify.ts:48-52` already holds
  the `RENAMES` map.
- **Every class-bearing table must become a cva**, not a bare `Record`, or the enumerator cannot
  reach it: `STRONG` (`font-bold`, `font-semibold`), `MUTED_SURFACE` (`bg-surface-3`,
  `border-edge`, plus the muted label's `text-ink-4`), and the badge's `statusDotFill` (seven `bg-*`
  classes) all carry contract classes and all sit outside a cva in the source.
- Only two tables are **token-name** tables — `button.tsx:63-67` `contentTone` and `badge.tsx:42-50`
  `badgeGlyph` return bare token names (`"accent-ink"`, `"ink-1"`) for the plugin to hand to its own
  icon/spinner component. They are not classes and must never reach the fixture build.

### The contract they must land on

- Spacing rungs: `room section stack row pair gutter card` = 32/24/12/8/4/16/16 px
  (`tokens.ts:225-244`). Shadow levels `1 2 3` (`:300-301`), shipped as `@utility` via
  `shadowUtilities`.
- `tokens.ts:312-317` zeroes four namespaces. **`--font-*` and `--font-weight-*` are not among
  them** — `font-sans` and `font-bold` both emit. `:319-320` states font families stay with the
  platform plugins.
- **The numeric `--spacing` base stays live** (`docs/prd/ui-core.md:84-85`), so `px-3.5`, `py-1.5`,
  `px-2.5`, `min-h-11` and `gap-3` all emit. A build check therefore cannot tell an on-rung class
  from an off-rung one — only the pinned cell strings below can.
- **Tailwind v4's `bg-(--x)` shorthand emits a real rule** and contains no `[`. Any check meant to
  close the arbitrary-value hole must ban `(` as well as `[`.

### The harness

- `packages/ui-core/scripts/verify.ts:692-756` is `c14`: it writes `fixture/generated.css` from
  `themeTokens` + `shadowUtilities`, runs the Tailwind CLI with `@source "./classes.html"`, and
  asserts named selectors emit or stay empty. `:735-744` requires `bg-canvas` and `gap-stack` among
  others; **`bg-canvas` appears in no matrix cell**, so `classes.html` cannot simply be replaced by
  the enumerated set without breaking `c14`.
- **`c14`'s `rule()` helper cannot match escaped selectors.** `verify.ts:726-729` regex-escapes the
  selector but not the CSS escaping Tailwind emits: the output carries `.px-3\.5 {`, `.py-1\.5 {`,
  `.py-2\.5 {`. `rule("px-3.5")` returns `undefined` for a class that *did* compile. It needs a
  CSS-escaping step (`.`, `[`, `]`, `(`, `)`, `/`, `%`, `:` → backslash-prefixed) before the regex
  escape.
- **`cva()` exposes no config at runtime.** The returned function's own properties are
  `['length','name']`. `cva(CONFIG.base, CONFIG)` works — the implementation destructures only
  `variants`, `defaultVariants`, `compoundVariants`, so an extra `base` key is inert.
- **cva compares compound-row values with `===` after `falsyToString`.** A compound row written with
  a boolean literal (`{padded: true}`) never matches an enumerator passing `Object.keys` strings.
  Every axis in this story therefore uses string keys, never booleans.
- `c15` (`verify.ts:758-793`) asserts the README contains none of
  `["marine","Marina","Notturno","WeNauti","navy","azure","sea","SpecCard","FilterChip","Sheet"]`,
  **by substring** — so new prose must avoid "seam", "search", "season", and any word containing
  "sea". The current README has zero hits.
- `packages/ui-core/package.json` has **no `dependencies` block** — `zod` is a peer. Four subpaths,
  no `"."`, `"imports": {"#*": "./src/*.ts"}`.
- `class-variance-authority` `^0.7.1` is already a dependency of both plugins
  (`plugins/solid-ui/package.json:71`, `plugins/native-ui/package.json:49`).
- **Every sailward descriptor and prop is JSDoc-annotated.** `.claude/playbooks/conventions.md:82`
  forbids JSDoc here. The port strips it; only non-obvious cells keep a `//` comment.
- `sw/src/ui/primitives/action.ts` is four fields — `label`, `onPress`, `disabled?`, `loading?` —
  and **no `icon`**. `sw/src/ui/primitives/footer.tsx:9-53` defines `FooterAction` (`label`,
  `onPress`, `loading?`, `disabled?`, `icon?`, `iconPosition?`, `testID?`) and `FooterDestructive`
  (`label`, `icon?`, `tone?`, `confirmTitle`, `confirmBody`, `confirmLabel?`, `loading?`,
  `disabled?`, `onConfirm`, `option?`), both composed into `FooterSpec` at `:67-71`.
- `sw/src/ui/primitives/badge.tsx:81-84` types `BadgeSpec.tone` as `BadgeProps["tone"]` — the badge
  cva's tone union. In ui-core that union lives in the badge config, so `descriptors.ts` needs a
  **type-only** import from `variants.ts` or it must restate a matrix axis.
- Neither plugin's components are on the contract today. Neither is touched by this story.

### Decisions settled in refinement

Each is a PRD amendment; the orchestrator applies them to `docs/prd/ui-core.md` in the main
checkout, not this run.

1. **The family is `badge`, not `pill`.** The PRD names the matrix `pill` in M2 but the descriptor
   `BadgeSpec` in Scope, and the canon this story writes says one name per concept. `badge` wins:
   the descriptor name is already fixed and four sailward primitives consume it, while `pill` names
   a shape rather than a concept. **This also reverses the PRD's Component naming decision at
   `docs/prd/ui-core.md:140-141`**, which has `plugin-solid-ui`'s `badge` renaming to `pill`: the
   break runs the other way, so `plugin-native-ui`'s `pill` renames to `badge` at M5 and
   `plugin-solid-ui`'s `badge` stays put.
2. **The sharing line gains two entries.** It also takes **control minimum height** — a tap-target
   floor is the strictest of the platform floors (Apple HIG 44pt, Material 48dp, WCAG 2.2 AA 24px)
   and leaving it per plugin means deriving the same number twice — and **font weight**, which is
   part of a type role; the whole `STRONG` table is nothing else. `min-h`, never `h`, so the label
   can grow the control under OS font scaling.
3. **A control's interior padding is always a literal numeric, even where a rung coincides.** The
   calibration is to the control's type size, not to rhythm, so button `md` is `px-4 py-2` and not
   `px-gutter py-row` although 16 and 8 are rungs. Rungs govern rhythm gaps and container insets:
   the card's inset is `p-card`, the field's two layouts gap at `gap-row` and `gap-stack`. Since no
   build check can tell the two apart (the numeric `--spacing` base stays live), the cell strings
   are pinned in the table below and asserted verbatim.
4. **Display and alignment stay platform overlays; rhythm does not.** `flex`, `inline-flex`,
   `flex-row`, `items-*` and `justify-*` stay out — RN is flex by default and web is not, so a
   shared `flex-row` would be wrong on one of them. `font-sans` stays out (families are the
   plugins'). Every interaction state stays out (`active:`, `hover:`, `focus-visible:`, `data-*`,
   `dark:`, `group-*`, `peer-*`, `disabled:`). **`gap-<rung>` stays in**, against the first draft:
   a gap is a spacing rung that means the same on both platforms, and the field's two layouts carry
   *different* gaps keyed by the matrix's own axis — exiling it would force each plugin to
   reconstruct that mapping from data ui-core does not export, which is the drift decision 2 exists
   to prevent.
5. **Arbitrary values are illegal in a matrix cell**, in both spellings: no `[` and no `(`. The
   card's warn ring ports as `border-2 border-warn-mark`, not `border-[1.5px]` — a deliberate 0.5px
   change, because an arbitrary value in the first shipped matrix would make the closed vocabulary
   the M6 gate assumes negotiable, and `border-[1.5px]` passes a build check for the same reason
   `bg-[var(--x)]` does. Tailwind v4 has no `--border-width-*` theme namespace, so `border-2` is the
   only non-arbitrary option.
6. **Card's axes are `padding` and `ring`,** both string-keyed, four cells. `chevron`'s `pr-9` stays
   in the plugin: it is an inset sized to that plugin's own chevron glyph, so it is platform
   geometry. `overflow-hidden` stays in the card base — a clip, load-bearing against the shadow
   layer (`sw/src/ui/primitives/card.tsx:32-33`), and neither display nor alignment.
7. **`Action.onSelect`, not `onPress`,** per the PRD. Target:
   `Action<TIcon = never> { label: string; onSelect: () => void; disabled?: boolean;
   loading?: boolean; icon?: TIcon }` — a new design, since the source has no icon field.
   `FooterAction` and `FooterDestructive` port verbatim minus JSDoc, with `onPress` → `onSelect` and
   `IconName` → `TIcon`; all three and `FooterSpec` are generic in the same `TIcon`.
8. **The text `tone` axis stays a cva variant** with its twelve keys spelled out, `marine` renamed
   to `interactive`. A table keyed by the full color contract would admit tones the design does not
   sanction; the closed twelve is the point.
9. **The badge's status-dot fill ports as a third badge cva.** Fills are invariant per the PRD
   sharing line, and it is the one place `warn-mark` is used. Sailward's `StatusDot` *primitive*
   stays out (see Out of scope) — the fill table it shares with `Badge` does not.

### Shape

Three new modules, three new subpath exports, one module per subpath:

- `src/cn.ts` → `./cn`. One `extendTailwindMerge({ extend: { theme: … } })` built from
  `TYPE_ROLES`, `TRACKED_ROLES`, `RADIUS_RUNGS` and `SPACING_RUNGS`, never restating any of them.
- `src/variants.ts` → `./variants`. The families, their cvas, and the two token-name tables.
- `src/descriptors.ts` → `./descriptors`. Types only; its only permitted import is `import type`
  from `./variants`.

**Every class-bearing table is a cva, and every cva's config is exported alongside it.** `cva()`
hides its config at runtime, so an enumerator has no other way to walk a matrix's axes — and a
hand-written enumeration list beside the cva is exactly the drift this story prevents. One source:

```ts
export const BUTTON = { base: "…", variants: {…}, compoundVariants: […], defaultVariants: {…} };
export const button = cva(BUTTON.base, BUTTON);
```

The verification enumerates the cartesian product of `Object.keys(CONFIG.variants[axis])` and
**calls the cva** on each combination, so the class set under test is produced by the matrix rather
than listed next to it. Every axis key is a string; no axis is boolean-keyed.

`class-variance-authority`, `clsx` and `tailwind-merge` become real `dependencies` of ui-core, not
peers: they are pure functions with no shared identity or context, so a duplicated copy is harmless,
and a peer would force every consumer to restate them. The plugins drop their own copies at M3/M4.

### The cells

Pinned verbatim, because no build check can distinguish a rung from a numeric. Empty string means
the cell carries no class and is still spelled out.

**`BUTTON`** — base `gap-row rounded-control`

| axis | keys → cells |
| --- | --- |
| `emphasis` | `primary: ""` · `secondary: "border bg-transparent"` · `tertiary: "bg-transparent"` |
| `tone` | `neutral: ""` · `danger: ""` |
| `size` | `sm: "min-h-11 px-3.5 py-1.5"` · `md: "min-h-11 px-4 py-2"` · `lg: "min-h-12 px-6 py-2.5"` |

compound, six rows: `primary/neutral: "bg-accent"` · `primary/danger: "bg-danger"` ·
`secondary/neutral: "border-edge-2"` · `secondary/danger: "border-danger"` ·
`tertiary/neutral: ""` · `tertiary/danger: ""`

**`BUTTON_LABEL`** — base `font-semibold`; axes `emphasis` × `tone` (all cells `""`) × `size`
(`sm: "text-caption"` · `md: "text-callout"` · `lg: "text-body"`); compound, six rows:
`primary/neutral: "text-accent-ink"` · `primary/danger: "text-danger-ink"` ·
`secondary/neutral: "text-ink-1"` · `secondary/danger: "text-danger"` ·
`tertiary/neutral: "text-ink-1"` · `tertiary/danger: "text-danger"`

**`BUTTON_MUTED`** — axis `emphasis`: `primary: "bg-surface-3"` · `secondary: "border-edge"` ·
`tertiary: ""`. **`BUTTON_MUTED_LABEL`** is the single class `text-ink-4`.

**`buttonContentTone(emphasis, tone)`** — token names, not classes: `danger` tone gives
`"danger-ink"` on primary and `"danger"` elsewhere; `neutral` gives `"accent-ink"` on primary and
`"ink-1"` elsewhere.

**`TEXT`** — base `""`

| axis | keys → cells |
| --- | --- |
| `variant` (9) | `display: "text-display font-bold tracking-display leading-display"` · `h1: "text-h1 font-bold tracking-h1 leading-h1"` · `h2: "text-h2 font-semibold tracking-h2 leading-h2"` · `h3: "text-h3 font-semibold tracking-h3 leading-h3"` · `body: "text-body font-medium leading-body"` · `callout: "text-callout font-bold leading-callout"` · `caption: "text-caption font-medium leading-caption"` · `micro: "text-micro font-medium leading-micro tracking-micro"` · `rowtitle: "text-body font-semibold leading-body"` |
| `tone` (12) | `ink-1..ink-4`, `brand`, `interactive`, `ok`, `warn`, `danger`, `accent-ink`, `oncover-fg`, `oncover-ink` → `text-<key>` |

**`TEXT_STRONG`** — axis `variant`, nine keys: `display: ""` · `h1: ""` · `h2: "font-bold"` ·
`h3: "font-bold"` · `body: "font-semibold"` · `callout: ""` · `caption: "font-semibold"` ·
`micro: "font-semibold"` · `rowtitle: "font-bold"`

**`BADGE`** — base `rounded-full px-2.5 py-1`; axis `tone` (7): `neutral: "bg-surface-2"` ·
`brand: "bg-brand-soft"` · `interactive: "bg-interactive-soft"` · `ok: "bg-ok-soft"` ·
`warn: "bg-warn-soft"` · `danger: "bg-danger-soft"` · `oncover: "bg-oncover-surface"`

**`BADGE_LABEL`** — axis `tone` (7) → `text-ink-1` · `text-brand` · `text-interactive` · `text-ok` ·
`text-warn` · `text-danger` · `text-oncover-ink`

**`BADGE_DOT`** — axis `tone` (7) → `bg-ink-1` · `bg-brand` · `bg-interactive` · `bg-ok` ·
**`bg-warn-mark`** · `bg-danger` · `bg-oncover-ink`

**`badgeContentTone(tone)`** — token names: `ink-1` · `brand` · `interactive` · `ok` · `warn` ·
`danger` · `oncover-ink`

**`CARD`** — base `overflow-hidden rounded-xl bg-surface shadow-1`; `padding`:
`card: "p-card"` · `none: ""`; `ring`: `none: ""` · `warn: "border-2 border-warn-mark"`

**`FIELD`** — base `rounded-control border bg-surface px-3.5`; `state`:
`default: "border-edge"` · `focused: "border-ink-1"` · `error: "border-danger"`; `layout`:
`input: "gap-row min-h-12"` · `row: "gap-stack py-2"`

### Verification

Extend `scripts/verify.ts`; do not add a second harness. Three adaptations are mandatory:

1. Fix `rule()`'s CSS escaping, or every class carrying a `.` reports a false failure.
2. Keep `scripts/fixture/classes.html` committed and unchanged as `c14`'s own fixture — it holds
   the negative controls (`bg-red-500`, `text-sm`) and the on-contract selectors `c14` asserts,
   two of which (`bg-canvas`, `gap-stack`) no matrix cell produces. Write the enumerated set to a
   second, gitignored `scripts/fixture/enumerated.html` and list **both** under `@source`.
3. The enumerated set is produced by calling each cva, never listed beside it.

## Blast radius

- `packages/ui-core/src/cn.ts`, `src/variants.ts`, `src/descriptors.ts` — new.
- `packages/ui-core/package.json` — three new exports, a new `dependencies` block.
- `packages/ui-core/scripts/verify.ts` — new checks; `c14` gains the escaping fix and a second
  `@source`.
- `packages/ui-core/scripts/fixture/.gitignore` — gains `enumerated.html`.
- `packages/ui-core/README.md` — new canon and sharing-line sections, plus the compose-order rule.
- `pnpm-lock.yaml` — three added dependencies.
- Untouched: `scripts/fixture/classes.html`, both UI plugins, the CLI, every other package.

## Acceptance criteria

1. `pnpm check` passes from the repository root. **(command)**
2. `pnpm --filter @fcalell/ui-core verify` passes with no arguments, exit 0. The 14 checks green
   today are still green. **(command)**
3. `cn()` dedupes within each of the five registered scales and never across them. A check asserts,
   for **every** member of the driving token list: two type roles collapse to the last
   (`TYPE_ROLES`), two `leading-` roles collapse (`TYPE_ROLES`), two `tracking-` roles collapse
   (`TRACKED_ROLES`), two `rounded-` rungs collapse **and** two `rounded-t-` rungs collapse
   (`RADIUS_RUNGS`), two `p-`/`gap-` rungs collapse (`SPACING_RUNGS`), and a type role beside a
   color leaves both standing. Driving it from the token lists is what makes it non-tautological.
   **(command)**
4. A check pins the `font-size`/`leading` interaction as intended semantics:
   `cn("leading-h1","text-body") === "text-body"` and `cn("text-body","leading-h1")` keeps both.
   A second check asserts the unextended `twMerge` fails at least one case from criterion 3, so the
   extension is proven to do work rather than assumed to. **(command)**
5. Every cell in **The cells** table is reproduced verbatim. A check asserts, per exported config:
   the axis names, each axis's key list, each key's cell string, the base string, and the
   `compoundVariants` row count — six for `BUTTON` and `BUTTON_LABEL`, zero for the other families,
   whose axes are orthogonal. **(command)**
6. Enumerating **every exported cva** in `src/variants.ts` by calling it over the cartesian product
   of its config's axes yields a class set in which every class resolves to a non-empty Tailwind
   rule under the M1 `@theme` record. A check asserts the enumerator covers every exported cva, so
   a table cannot be smuggled past it. **(command)**
7. That same enumerated set contains no `flex`, `inline-flex`, `flex-row`, `items-`, `justify-`,
   `font-sans` class, no class containing `:` (which covers every interaction state, `dark:`,
   `group-`, `peer-` and `aria-`), and no class containing `[` or `(`. Every `gap-` class in the
   set is `gap-<member of SPACING_RUNGS>`. **(command)**
8. The two token-name tables are excluded from criteria 6 and 7 and carry their own check: every
   value is a member of `PER_MODE_COLORS ∪ INVARIANT_COLORS`, **and** each agrees with its label
   cva — `BADGE_LABEL`'s cell for tone `T` equals `"text-" + badgeContentTone(T)`, and
   `BUTTON_LABEL`'s compound cell for `(e, t)` equals `"text-" + buttonContentTone(e, t)`. This is
   an assertion, not runtime interpolation: the cells stay static strings. **(command)**
9. `Action`, `BadgeSpec`, `FooterSpec`, `FooterAction` and `FooterDestructive` are exported from
   `./descriptors`. `src/descriptors.ts` contains no value import and no runtime code — a check
   transpiles it and asserts the emitted JavaScript is empty. Every `icon?:` in the file is typed
   exactly `TIcon`, and the file's `<TIcon` count equals its interface/type-alias count, so no local
   alias or `string` stand-in can pass. **(command)**
10. No JSDoc block (`/**`) appears anywhere under `packages/ui-core/src`. **(command)**
11. The README carries a `## The canon` section stating all five laws from `docs/prd/ui-core.md`
    M2, ending with the no-`class`/`className`/`style` law; a `## The sharing line` section naming
    what the matrices hold (including the two entries decision 2 adds) and what stays a platform
    overlay; and a rule that a type role must be composed before any later size class, never after.
    A check asserts all three. **(file)** + **(command)**
12. `c15`'s existing word blacklist still passes over the new prose. **(command)**
13. `packages/ui-core/package.json` exports `./cn`, `./variants` and `./descriptors`, and declares
    `class-variance-authority`, `clsx` and `tailwind-merge` under `dependencies`. **(command)**

## Out of scope

- Any change to `plugins/solid-ui` or `plugins/native-ui`. Adoption is M3/M4, the canon sweep and
  the `pill` → `badge` rename are M5. Do not touch either plugin's `cn.ts`, components, or
  package.json.
- Any change to `docs/prd/ui-core.md` or `docs/roadmap.md`. The nine amendments in Decisions are the
  orchestrator's to apply in the main checkout; edits made here will be discarded.
- **The closed slot registry.** The canon's second law names it, but its contents are decided by
  applying the canon to real components, which is M5. This story writes the law, not the registry.
- The remaining families (checkbox, toggle, dialog chrome, skeleton, spinner) — M7.
- The geometry gate and its scanner — M6.
- The rhythm family (`Section` > `Stack` > `Row` > `Pair`) — it ships in the plugins at M5.
- Icon sets and icon-name unions. The content-tone tables return color token names, which ui-core
  already owns; they introduce no icon vocabulary.
- Closing the `--leading-*` / `--tracking-*` reset hole — a documented limit, not this story's work.
- Sailward's `StatusDot`, `PulseHalo`, `TextLink`, `FieldLabel` and the `FooterBar` renderer: they
  are primitives, not matrices. Only `FooterSpec`'s type and the dot *fill table* port.

## Open questions

None. Both carried from the first draft are settled: the merge config extends `theme` over five
token lists (measured), and the text `tone` axis stays a cva variant (decision 8).
