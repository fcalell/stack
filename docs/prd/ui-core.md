# PRD: ui-core, one design system rendered per platform

Source: comparison of sailward's Marina design system (`apps/mobile/global.css`, `src/ui`,
`.knowledge/design/design-system.md`) against `plugin-solid-ui` and `plugin-native-ui`.

Stack's two UI plugins theme in different languages today. `plugin-solid-ui` ships a static
shadcn-vocabulary sheet (`--ui-*` knobs deriving `primary` / `muted` / `destructive`), themed by
hand-written CSS variable overrides. `plugin-native-ui` generates a Marina-vocabulary sheet
(`canvas` / `ink-1` / `ok` / `warn` / `danger`) from a `themeTokens` hex-record option. A consumer
building web plus native themes the same brand twice, through two mechanisms. Marina is the
most-worked version of the design language and carries guardrails neither plugin has: zeroed token
namespaces so an off-token class compiles to nothing, named spacing rungs with picking rules,
role-based type tokens, use-case variant axes (emphasis × tone), and contrast contracts documented
at the token definitions.

`@fcalell/ui-core` extracts the design decisions into one package both UI plugins render from: the
token contract with parametric defaults, the type and spacing role systems, the invariant component
variant matrices, the shared `cn()` merge config, and the written design laws. Platform plugins
keep everything behavioral: primitives, interaction states, accessibility, font loading, and their
CSS entry wrappers.

## Scope

**In:**

- `packages/ui-core`: a preset library like `biome-config`. No `plugin()` factory, no slots, no
  framework dependency; it exports typed data, zod schemas, CSS-emit helpers, and class strings.
- The token contract: surface and ink ladders, edges, the accent pair, interactive and brand
  accents, status colors with `-soft` fills, scrim and `oncover-*` tokens, type roles with leading
  and tracking, spacing rungs, radius and shadow ladders, font roles with fallback stacks.
- Parametric OKLCH value derivation with per-token overrides, so the framework default stays
  knob-driven and a hand-tuned brand (Marina) is expressible through the same schema.
- Shared `cn()` (extended `tailwind-merge`) and invariant CVA matrices for the first component set:
  button, text, pill, card, field.
- Adoption by `plugin-solid-ui` and `plugin-native-ui`: both render their stylesheet from ui-core
  and accept one shared `theme` option schema.
- The design-laws doc (tone-to-meaning matrix, rung and role rules, the closed laws) as the
  package README, folded into `.knowledge/` at retirement.

**Out:**

- Shared primitives, behavior, or accessibility. Kobalte stays `plugin-solid-ui`'s, the RN wiring
  stays `plugin-native-ui`'s. ui-core ships class strings and data only.
- A React web target. ui-core keeps zero framework dependencies so a future `plugin-react-ui` can
  adopt it, but none ships here.
- Sailward's migration. Dogfood signal only, per the roadmap model.
- Marina's product-specific laws (persona-by-fill, the nautical palette). The generic laws port;
  the brand does not.
- Icon-set unification (`lucide-solid` and `lucide-react-native` share glyph names). Parked.
- Named themes beyond light and dark on web. `plugin-native-ui` keeps uniwind's extra themes; web
  emission for named themes waits for a consumer that needs it.

## Decisions

- **Vocabulary.** Marina's names generalize: `canvas` / `surface` / `surface-2` / `surface-3`,
  `edge` / `edge-2`, `ink-1..4`, `accent` / `accent-ink`, `brand` / `brand-soft`, `ok` / `warn` /
  `danger` with `-soft` pairs and `danger-ink`, `scrim`, `oncover-*`. Marina's `marine` (its
  interactive accent) takes a brand-neutral name; `interactive` is the working choice, settled in
  M1. The contract is a closed list: the `--color-*`, `--text-*`, `--radius-*`, and `--shadow-*`
  namespaces are zeroed, so an off-contract utility compiles to nothing. Numeric spacing stays
  live (dimension utilities like `min-h-11` derive from it), so rung usage for gaps and insets is
  law-enforced by the doc, not build-enforced.
- **Values.** The parametric derivation survives: knobs (primary hue and chroma, gray tint, status
  hues, spacing base, radius base, shadow strength) derive every OKLCH value, and the lightness
  ladder is fixed from Marina's calibration so the documented AA contrast contracts hold for any
  hue a consumer picks. The theme schema accepts per-token overrides for hand-tuned brands.
- **Theming surface.** Each UI plugin accepts a `theme` option validated by ui-core's schema; a
  consumer with both platforms passes the same object to both plugins. Rejected: an `app.theme`
  field (`app` stays cross-cutting identity, theme is UI-domain) and hand-written CSS variable
  overrides as the documented surface (typed options over glue, per philosophy).
- **Sharing line.** ui-core matrices hold the platform-invariant cells only: fills, borders, ink,
  padding rungs, radius, type role. Interaction and state classes (`hover:`, `focus-visible:`,
  `data-*` on web; `active:` press states on native) are platform overlays composed via `cn()`. RN
  does not inherit text color, so a matrix that tints content carries a per-slot label table; web
  consumes the label table too rather than diverging.
- **Emission.** ui-core emits CSS bodies (the `@theme` block, per-theme variant blocks), never a
  full stylesheet. Each plugin wraps them in its entry: `plugin-solid-ui` adds
  `@import "tailwindcss"`, `@custom-variant dark`, `@source`, keyframes, and the base layer;
  `plugin-native-ui` adds the `uniwind` import and emits the shadow ladder as `@utility` rules,
  since the `--shadow-*` theme namespace does not resolve into RN's `boxShadow` (sailward's
  finding).

## Surfaces touched

- New `packages/ui-core` (`@fcalell/ui-core`): `tokens` (contract, derivation, schema), `emit`
  (CSS bodies), `variants` (CVA matrices), `cn`.
- `plugins/solid-ui`: token emission moves into the existing app-CSS codegen
  (`solidUi.slots.appCssSource`), driven by the new `theme` option; `globals.css` shrinks to the
  web wrapper; every component re-points at the new vocabulary; the first component set adopts the
  shared matrices. Component APIs break: the shadcn `variant` axis retires for `emphasis` and
  `tone`.
- `plugins/native-ui`: `defaults.ts` and `DEFAULT_BASE_TOKENS` replaced by ui-core defaults;
  `themeTokens` narrows from an open hex record to the shared schema; `codegen.ts` consumes
  ui-core's emit helpers; `ui/lib/cn.ts` re-exports ui-core's; the first component set adopts the
  shared matrices.
- No `@fcalell/cli` change. ui-core is imported by plugins, never orchestrated; removing it
  touches no core, so philosophy's quick test holds.

## Milestones

Ordered by dependency. Each is independently shippable and verifiable.

### M1: token contract, derivation, and laws

Create `packages/ui-core` with the vocabulary, the zod theme schema, the parametric derivation
(knobs to per-theme OKLCH values, light and dark), the font role tokens with fallback stacks
(loading machinery stays per plugin: fontsource and preload on web, expo-font on native), and the
emit helpers returning `@theme` and variant-block bodies. Write the design-laws doc as the package
README: the tone-to-meaning matrix, surface rules (card against canvas), rung picking rules
(rhythm steps down one rung per nesting level; an inset is at least the same-axis gap it
contains), type-role rules (roles only, mono for measured data), and the closed laws adapted from
Marina. Settle the interactive-accent name here.

**Test.** Unit: derivation snapshots for default knobs and for a hand-tuned override set. Compile
fixture: a Tailwind build over a fixture file asserts every contract utility resolves
(`bg-canvas`, `text-h1`, `gap-stack`, `rounded-control`, web-side `shadow-1`) and off-contract
utilities (`bg-red-500`, `text-sm`) emit no CSS.

### M2: shared cn and the first variant matrices

Port `cn()` with the extended `tailwind-merge` config (type-role classes registered as the
font-size group, `rounded-control` in the radius group). Author the invariant matrices for button
(emphasis × tone × size, plus the label table), text roles, pill, card, and field, spelling every
legal cell in `compoundVariants` so the matrix cannot drift.

**Test.** Unit: each matrix cell produces the expected classes; `cn()` keeps a type-role class and
a color class from clobbering each other. The M1 compile fixture ingests every class every matrix
can emit, proving the matrices on-contract.

### M3: plugin-solid-ui adoption

Render the token bodies into `.stack/app.css` through the existing codegen, driven by the new
`theme` option; shrink `globals.css` to the web wrapper. Sweep all components onto the new
vocabulary (`bg-primary` to `bg-accent`, `text-muted-foreground` to `text-ink-3`, `border-border`
to `border-edge`, and so on); rebuild button, text, pill (today's badge), card, and field on the
shared matrices with web interaction overlays; retire the shadcn axis names.

**Test.** Component tests updated to the new APIs; a codegen test asserts the emitted app.css
carries the themed token bodies; the compile fixture runs over the plugin source, so the scaffold
home renders on tokens only.

### M4: plugin-native-ui adoption

Replace the neutral defaults with ui-core's derived defaults, narrow `themeTokens` to the shared
schema, emit through ui-core's helpers (shadow ladder as `@utility`), re-export ui-core's `cn`,
and adopt the shared matrices for button, pill, card, and field. Its components already speak the
Marina vocabulary, so the sweep is small.

**Test.** Codegen snapshot updated; matrix-consuming components render the expected classes; the
option schema rejects an off-contract token key.

### M5 (follow-up): remaining matrices

Migrate further component families (checkbox, toggle, dialog chrome, skeleton, spinner) onto
shared matrices as their invariant cells prove out. Recorded so the sharing line stays deliberate;
not part of this PRD's acceptance.

## Non-goals

- No behavior in ui-core, ever. A matrix cell that needs a platform conditional is the signal that
  class belongs in the platform overlay.
- No runtime cost. Everything ui-core exports is build-time data and strings.
- No new consumer surface beyond the one `theme` option shape shared by the two UI plugins.

## Acceptance

Per milestone: implementation plus co-located tests land, `pnpm check` and `pnpm test` pass. The
dogfood signal for the PRD as a whole: sailward could replace `global.css`, `src/ui/lib/cn.ts`,
and its button and pill matrices with ui-core exports, expressing its hand-tuned Marina values
through the theme schema; a stack consumer building web plus native themes the brand once.
