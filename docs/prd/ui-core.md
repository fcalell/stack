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

Tokens are one of three layers sailward's nine-pass convergence settled (roadmap findings,
2026-07-30). The other two ship here too, because they decide what the token layer is worth: the
**primitive API canon** (one name per concept, descriptors instead of `ReactNode` slots, presets
over private cores) and the **geometry gate** on class attributes at call sites. Today 23 of 36
`plugin-solid-ui` components forward `class` and 23 of 24 `plugin-native-ui` components forward
`className`, each alongside a `style` prop inherited from the host element type. The zeroed token
namespaces already stop an off-contract class from compiling to anything. What the gate adds is
stopping *on-contract* looks (`bg-canvas`, `p-4`, `text-h1`) from landing at a call site, which is
where a design system erodes.

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
  button, text, badge, card, field.
- Adoption by `plugin-solid-ui` and `plugin-native-ui`: both render their stylesheet from ui-core
  and accept one shared `theme` option schema.
- The design-laws doc (tone-to-meaning matrix, rung and role rules, the closed laws) as the
  package README, folded into `.knowledge/` at retirement.
- The primitive API canon: the shared descriptor types (`Action`, `BadgeSpec`, `FooterSpec`), the
  naming rules, and the slot registry, written as law in the README and applied to both plugins'
  component APIs.
- The rhythm family (`Section` > `Stack` > `Row` > `Pair`) in both plugins, since the gate bans the
  hand-rolled `flex-row gap-*` lockups that stand in for it today.
- The geometry gate: the closed class vocabulary, the scanner at `@fcalell/ui-core/gate`, and a
  pre-phase build step contributed by each UI plugin, so it runs on every consumer rather than only
  newly scaffolded ones.
- Closing the `class` and `className` props both plugins forward today, with nothing in their
  place. A look a primitive does not offer is a matrix gap or a consumer primitive.

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
- Sailward's primitive roster. Its nine passes restructured 69 primitives against one product's
  needs; what ports is the canon and the gate, not the component list. A stack primitive changes
  shape only where the canon or the gate forces it.

## Decisions

- **Vocabulary.** Marina's names generalize: `canvas` / `surface` / `surface-2` / `surface-3`,
  `edge` / `edge-2`, `ink-1..4`, `accent` / `accent-ink`, `brand` / `brand-soft`, `ok` / `warn` /
  `danger` with `-soft` pairs and `danger-ink`, `scrim`, `oncover-*`. Marina's `marine` (its
  interactive accent) takes a brand-neutral name; `interactive` is the working choice, settled in
  M1. The contract is a closed list: the `--color-*`, `--text-*`, `--radius-*`, and `--shadow-*`
  namespaces are zeroed, so an off-contract utility compiles to nothing. Numeric spacing stays
  live (dimension utilities like `min-h-11` derive from it), so rung usage for gaps and insets is
  law-enforced by the doc, not build-enforced.
- **Values.** The parametric derivation survives, over seven knobs: six hues (`neutralHue`,
  `brandHue`, `interactiveHue`, `okHue`, `warnHue`, `dangerHue`) and `neutralChroma`, which scales
  the chroma of every neutral-bound token. Lightness and per-token chroma are fixed from Marina's
  calibration. The AA contrast contracts hold at the default hues and are the consumer's to
  re-check after moving a knob, since chroma stays fixed while a hue roams and a value can leave
  sRGB. Dropped: `spacingBase`, `radiusBase`, and `shadowStrength`; the rungs (32/24/12/8/4/16/16),
  radii (10/14/16/24/9999), and hand-tuned shadow alphas derive from no base, so they are literals
  in the contract. The theme schema accepts per-token overrides in two maps: `colors` (`shared` /
  `light` / `dark`) and `scales` (full custom-property names), which covers a consumer needing
  different rungs, radii, type sizes, leading, tracking, or shadows.
- **Theming surface.** Each UI plugin accepts a `theme` option validated by ui-core's schema; a
  consumer with both platforms passes the same object to both plugins. Rejected: an `app.theme`
  field (`app` stays cross-cutting identity, theme is UI-domain) and hand-written CSS variable
  overrides as the documented surface (typed options over glue, per philosophy).
- **Sharing line.** ui-core matrices hold the platform-invariant cells only: fills, borders, ink,
  padding, gap rungs, control minimum height, radius, type role, font weight. Display and alignment
  (`flex`, `flex-row`, `items-*`, `justify-*`), font families, and interaction and state classes
  (`hover:`, `focus-visible:`, `data-*` on web; `active:` press states on native) are platform
  overlays composed via `cn()`: RN is flex by default and web is not, so a shared `flex-row` would
  be wrong on one of them. A gap is not display — it is a spacing rung meaning the same thing on
  both platforms, and a matrix that keys two gaps off its own axis cannot exile them without making
  each plugin rebuild that mapping. RN does not inherit text color, so a matrix that tints content
  carries a per-slot label table; web consumes the label table too rather than diverging.
- **Rungs are rhythm; control interiors are not.** The seven rungs govern gaps between things and
  container insets. A control's interior padding is calibrated to its own type size, so it stays a
  literal numeric even where a rung happens to coincide: a button is `px-4 py-2`, not
  `px-gutter py-row`. Since the numeric `--spacing` base stays live, no build check can tell the two
  apart — the matrices pin their cell strings and assert them verbatim instead.
- **No arbitrary values in a matrix cell**, in either spelling (`[…]` or the `(--x)` shorthand). A
  matrix cell that reaches for one passes every build check for the same reason `bg-[var(--x)]`
  does, which would make the closed vocabulary the gate assumes negotiable. Where the calibrated
  value is unreachable the cell rounds to the nearest contract step and the change is recorded.
- **The boundary.** Primitives ship from `node_modules`, so the plugins' own primitives need no
  carve-out. A consumer still needs somewhere to author product-specific primitives, so the gate
  skips any path holding a `ui/` segment: `src/ui/**` on a single-platform consumer, `src/native/ui/**`
  and its siblings on a split one. Everywhere else in a consumer's app source is call-site code,
  where a class attribute is legal only on a raw host element and only from the closed geometry
  vocabulary. The carve-out is a fixed convention, never config, and it is the boundary sailward
  already draws, so ui-core's gate is a drop-in there.
- **The other hatches.** `style` closes alongside `class` and `className`. On React Native it is the
  primary way to restyle and the gate cannot see it, so leaving it open would make the boundary
  decorative. Kobalte's polymorphic `as` stays open, documented as a hole: it carries the
  accessibility composition 16 of 36 `plugin-solid-ui` components depend on, and a call site
  reaching for `as={Custom}` has taken over the render deliberately. Consumer CSS targeting a
  plugin's class names is a hole of the same kind.
- **No escape valve on the primitive.** A look the matrices do not cover has exactly two homes: the
  matrix grows, or the consumer authors its own primitive under `ui/`. There is no per-call-site
  hatch, because a hatch is the thing that gets reached for. Sailward's rule is the same one
  ("grow the owning primitive's variant table"), and its `ui/` directory is where a consumer-shaped
  look lives. Rejected: a renamed `unsafeClass` prop, which keeps the hole and only makes it
  countable; and exposing the variant matrices as slots, since slots resolve at generate time, the
  primitives are imported straight from `node_modules`, and nothing in either plugin's `src/ui/`
  reads generated data today. Bridging that needs a Vite virtual module on web plus a Metro
  resolver on native, a larger mechanism than the problem it solves.
- **Gate host.** `@fcalell/ui-core/gate` holds the scanner, and each UI plugin contributes a
  pre-phase `cliSlots.buildSteps` entry that runs it over the app directory that plugin owns, with
  the host list for its platform: lowercase intrinsics on web, `View` / `Pressable` / `ScrollView` /
  `Animated.View` on native. Every consumer picks it up on upgrade. A `check:ui` script in
  `packages/cli/src/templates/package-json.ts` would not, because `patchPackageJson` merges only
  absent keys, so a consumer that already has a `check` script never gains the call. Rejected: a
  `stack ui check` subcommand, which two UI plugins would both claim in a web plus native consumer;
  and a Biome GritQL rule, which cannot express the allowlist (roadmap decision, 2026-07-30, with
  the test evidence).
- **Component naming.** `plugin-solid-ui` already ships a `section` compound (Root, Header, Title,
  Content), so the rhythm family's outermost rung folds into it instead of colliding: `Section.Root`
  gains the rung and axis, and `Stack` / `Row` / `Pair` are new. `plugin-native-ui` has no page
  chrome, so its `Section` is the rung alone. The shared fact is the rung and the axis; the header
  anatomy stays web-only. `plugin-native-ui`'s `pill` renames to `badge`, matching the matrix and
  `plugin-solid-ui`'s existing component: the descriptor is already `BadgeSpec`, and under the
  canon's one-name-per-concept law the name carrying the concept wins over the one naming a shape.
  Both breaks are accepted.
- **The first matrix set.** Button, text, badge, card, and field: the cells that hold across
  platforms. Neither plugin has all five today. `plugin-native-ui`'s badge is today's `pill`, and it
  has neither a text nor a field component, so the missing ones are authored during adoption and
  parity is a deliverable rather than an assumption.
- **Allowlist, not denylist.** The vocabulary is a closed list and unknown classes fail. A denylist
  of look prefixes passes every utility it has not been taught, which is how the boundary rots.
- **Emission.** ui-core returns token records, never CSS text: `themeTokens` (the `@theme` record,
  keyed by full `--name`), `modeTokens` (one mode's colors, keyed bare), and `shadowUtilities` (one
  `box-shadow` value per level). A pre-rendered string cannot be validated per token, which would
  delete the per-key check at `plugins/native-ui/src/node/codegen.ts`, and records mean ui-core
  never renders a consumer-supplied string, so it needs no CSS escaping and no `@fcalell/cli`
  dependency. Each plugin wraps the records in its entry: `plugin-solid-ui` adds
  `@import "tailwindcss"`, `@custom-variant dark`, `@source`, keyframes, and the base layer;
  `plugin-native-ui` adds the `uniwind` import. Both wrap `shadowUtilities` in `@utility` rules,
  since the `--shadow-*` theme namespace does not resolve into RN's `boxShadow` (sailward's
  finding). `aggregateAppCss` hosts neither `@theme` nor `@utility`, so M3 adds a top-level-block
  slot for them.

## Surfaces touched

- New `packages/ui-core` (`@fcalell/ui-core`): `tokens` (contract, derivation, schema), `emit`
  (CSS bodies), `variants` (CVA matrices), `cn`, and the shared descriptor types. The scanner sits
  behind a separate `./gate` export with `ts-morph` (already the repo's AST tool) as its dependency,
  imported only from plugin `node/` code, so nothing on the app's import path grows.
- Both UI plugins gain a `cliSlots.buildSteps` contribution (phase `pre`) that runs the gate. Names
  are plugin-scoped, since `buildSteps` is `uniqueBy` name and a web plus native consumer carries
  both.
- `plugins/solid-ui`: token emission moves into the existing app-CSS codegen
  (`solidUi.slots.appCssSource`), driven by the new `theme` option; `globals.css` shrinks to the
  web wrapper; every component re-points at the new vocabulary; the first component set adopts the
  shared matrices. Component APIs break: the shadcn `variant` axis retires for `emphasis` and
  `tone`.
- `plugins/native-ui`: `defaults.ts` and `DEFAULT_BASE_TOKENS` replaced by ui-core defaults;
  `themeTokens` narrows from an open hex record to the shared schema; `codegen.ts` consumes
  ui-core's emit helpers; `ui/lib/cn.ts` re-exports ui-core's; the first component set adopts the
  shared matrices.
- Every component's props type in both plugins. Closing `class` / `className` / `style` is not a
  deletion: the props come in through the host element type (`ComponentProps<"section">`,
  `Omit<PressableProps, "children">`), and on the 16 web components using Kobalte's `Polymorphic`,
  dropping `class` from the own-props type *re-admits* it, since `PolymorphicProps<T, P>` resolves
  to `P & Omit<ComponentProps<T>, keyof P>`. Each closed prop is declared `?: never` on the
  own-props type, which both blocks it and gives the call site a readable error. The runtime
  `splitProps` / destructure and the trailing `cn(..., local.class)` go with it.
- No `@fcalell/cli` change. ui-core is imported by plugins, never orchestrated; removing it
  touches no core, so philosophy's quick test holds.

## Milestones

Ordered by dependency. Each is independently shippable and verifiable. Each **Verify** block is a
manual procedure against a scratch consumer project: run the commands, read the emitted CSS or look
at the rendered screen, confirm the stated result.

### M1: token contract, derivation, and laws

Create `packages/ui-core` with the vocabulary, the zod theme schema, the parametric derivation
(knobs to per-theme OKLCH values, light and dark), the font role tokens with fallback stacks
(loading machinery stays per plugin: fontsource and preload on web, expo-font on native), and the
emit helpers returning `@theme` and variant-block bodies. Write the design-laws doc as the package
README: the tone-to-meaning matrix, surface rules (card against canvas), rung picking rules
(rhythm steps down one rung per nesting level; an inset is at least the same-axis gap it
contains), type-role rules (roles only, mono for measured data), and the closed laws adapted from
Marina. Settle the interactive-accent name here.

**Verify.** Nothing imports ui-core until M3, so verification is a committed script rather than a
generate run: `pnpm --filter @fcalell/ui-core verify <path-to-reference-global.css>`. It derives
with default knobs and no overrides, diffs every emitted value against the reference stylesheet's
`@variant light` and `@variant dark` blocks plus its non-color `@theme` entries, checks the knob
behaviors (`brandHue` moves only the brand family, `neutralChroma` only the neutral-bound tokens,
the `accent` / `accent-ink` aliases hold), checks that every bad override is rejected by key, and
drives a Tailwind build over `themeTokens`' output wrapped in `@theme { }`: every contract utility
resolves (`bg-canvas`, `text-h1`, `leading-h1`, `gap-stack`, `rounded-control`, `shadow-1`) and
off-contract utilities (`bg-red-500`, `text-sm`) emit nothing.

### M2: shared cn, the first variant matrices, and the API canon

Port `cn()` with the extended `tailwind-merge` config. Extend `theme`, not `classGroups`: five
token lists register (type roles as `text` and `leading`, tracked roles as `tracking`, radius rungs,
spacing rungs), and the theme route reaches all sixteen `rounded*` groups where the class-group
route reaches only the base one. Registering the type roles makes `font-size` conflict with
`leading`, so a type role composes before any later size class, never after. Author the invariant
matrices for button (emphasis × tone × size, plus the label table), text roles, badge, card, and
field, spelling every legal cell in `compoundVariants` so the matrix cannot drift.

Export the shared descriptor types (`Action`, `BadgeSpec`, `FooterSpec`) and write the API canon
into the README as law: one name per concept across primitives (`label`, `loading`, `onChange`,
`icon`); a composed region is data, not a `ReactNode` prop, and the surviving named slots are a
closed registry; primitives compose primitives, and two primitives sharing an anatomy become
presets over a private core; a prop that changes which other props are legal is a sibling
component, not a variant; a primitive takes no `class`, `className`, or `style` prop.
Nothing is enforced yet, so the canon lands before the sweeps that apply it.

Each descriptor type stays framework-free. `Action` carries `label`, `onSelect`, and an `icon` slot
typed as a parameter, since the icon is a `lucide-solid` component on web and a
`lucide-react-native` one on native, and ui-core depends on neither.

**Verify.** No DOM is needed: a matrix is a pure function, so the M1 script grows the checks. Each
family exports its config beside its cva, since `cva()` hides its config at runtime and an
enumerator has no other way to walk the axes. Enumerate every cva over the product of its axes,
calling the cva so the class set is produced by the matrix rather than listed next to it, and drive
the M1 Tailwind build over the result: every class resolves, so no cell is off-contract. Assert each
cell string verbatim, because the numeric spacing base stays live and no build check can tell a rung
from a numeric. Pass a type-role class and a color class to `cn()` together and confirm neither
clobbers the other.

### M3: plugin-solid-ui adoption

Render the token bodies into `.stack/app.css` through the existing codegen, driven by the new
`theme` option; shrink `globals.css` to the web wrapper. Sweep all components onto the new
vocabulary (`bg-primary` to `bg-accent`, `text-muted-foreground` to `text-ink-3`, `border-border`
to `border-edge`, and so on); rebuild button, text, badge, card, and field on the
shared matrices with web interaction overlays; retire the shadcn axis names.

The class props stay open through this milestone. M5 closes them across both plugins at once.

**Verify.** Set a `theme` option, run `stack generate`, and confirm `.stack/app.css` carries the
themed token bodies. Boot `stack dev` and open the scaffold home: it renders correctly in light and
in dark. Search the plugin source for the retired names (`bg-primary`, `text-muted-foreground`,
`border-border`) and get no hits. Run the M1 Tailwind build over the plugin source and confirm no
off-contract utility appears.

### M4: plugin-native-ui adoption

Replace the neutral defaults with ui-core's derived defaults, narrow `themeTokens` to the shared
schema, emit through ui-core's helpers (shadow ladder as `@utility`), re-export ui-core's `cn`,
and adopt the shared matrices for button, badge, card, and field. Its components already speak the
Marina vocabulary, so the token sweep is small. Author the two components the matrix set names and
the plugin lacks: text and field.

**Verify.** Run `stack generate` in a native-ui consumer and confirm the emitted tokens match
ui-core's derived defaults, with the shadow ladder emitted as `@utility`. Launch the app and confirm
button, badge, card, and field render the same cells as the web app for the same props. Put an
off-contract key in the `theme` option and confirm `stack generate` fails with a schema error
naming it.

### M5: the canon sweep, both plugins

One pass across all 60 components, both plugins together, because the canon's whole claim is that
the same fact carries the same name on both platforms and two separate milestones would drift.
Declare `class`, `className`, and `style` as `?: never` on every own-props type, removing the
matching `splitProps` / destructure and the trailing `cn(..., local.class)`. Nothing replaces them:
where a plugin component was relying on a forwarded class to lay itself out, the geometry moves
into the component or into the rhythm family below it. Collapse the `ReactNode` props the canon turns into descriptors, including
`RowItem`'s `leading` and `trailing`. Add the rhythm family: `Stack`, `Row`, and `Pair` are new on
both plugins, `Section.Root` gains the rung and axis on web, and `Section` is the rung alone on
native.

**Verify.** Grep both plugins for `class?:`, `className?:`, and `style?:` outside a `never`
declaration and get no hits. In a scratch consumer, pass `class` to a plugin component and confirm
the type error names the prop; pass `style` and confirm the same. Diff the two plugins' prop names
across the shared component set: every shared fact matches. Boot both apps and confirm nothing
regressed visually from M3 and M4.

### M6: the geometry gate

Land the gate once the class props are closed, because it is unenforceable while primitives forward
them. Ship the closed geometry vocabulary (flex plumbing, alignment, positioning, and the
`gap`/`min-h`/`max-w`/`w-full` sizing facts, with no numeric dimension, no padding, and no look) as
ui-core data, and the scanner behind `@fcalell/ui-core/gate`. It reads every class literal in a
class attribute, including the string arguments of `cn(...)` and the candidates of a ternary, and
skips any path holding a `ui/` segment. Both plugins contribute the pre-phase build step that runs
it over the app directory they own. Document the vocabulary and the escape route in the README: a
look a call site needs is either a matrix cell or a consumer primitive under `ui/`, in that order.

State the coverage plainly in the README. The scanner reads literals, so a class assembled through
a variable, a prop, or a template literal passes silently. That is a guardrail against drift, not a
sandbox, and the size of a consumer's `ui/` directory is the number that says whether the matrices
are covering enough.

**Verify.** In a scratch consumer, write a page with `class="flex-1 items-center"` on a raw host
element and confirm `stack build` passes. Change it to `class="flex-1 bg-canvas"` and confirm the
build fails naming the file, the line, and `bg-canvas`. Put the same class inside `src/ui/` and
confirm it passes. Run `stack build` in helm, which was scaffolded before this PRD, and confirm the
gate runs there without any edit to its `package.json`.

### M7 (follow-up): remaining matrices

Migrate further component families (checkbox, toggle, dialog chrome, skeleton, spinner) onto
shared matrices as their invariant cells prove out. Recorded so the sharing line stays deliberate;
not part of this PRD's acceptance.

## Non-goals

- No behavior in ui-core, ever. A matrix cell that needs a platform conditional is the signal that
  class belongs in the platform overlay.
- No runtime cost. Everything ui-core exports is build-time data and strings.
- No new consumer surface beyond the one `theme` option shape shared by the two UI plugins.
- No per-file skip list on the gate, and no configuration of it. The only exemption is the `ui/`
  carve-out, which is a fixed convention. Adding anything else is a stop-and-ask.
- No claim of total closure. `as` on the polymorphic web components, consumer CSS targeting plugin
  class names, and any class built from a variable are open, named in the README, and out of the
  gate's reach.

## Acceptance

Per milestone: the implementation lands, the milestone's **Verify** steps run green against a
scratch consumer project with the transcript and screenshots recorded in the PR, and `pnpm check`
passes. The
dogfood signal for the PRD as a whole: sailward could replace `global.css`, `src/ui/lib/cn.ts`,
its button and badge matrices, and `scripts/check-classnames.mjs` with ui-core exports, keeping its
`src/ui/**` boundary unchanged and expressing its hand-tuned Marina values through the theme
schema. A stack consumer building web plus native themes the brand once, and every look that lands
outside the matrices is a primitive under `ui/`.
