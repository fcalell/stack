---
id: 001-03
status: done
merged: b48ba43
depends: [001-01, 001-02]
gate: {rounds: 2, flags: 16 + 17, outcome: all fixed, none dismissed}
runs:
  - n: A
    scope: decisions 1-12, criteria A1-A10 + docs 1-3
    outcome: merged 4e5b3db
    review: {spec: 9 of 10 hold under mutation + A2 partial, standards: 2 must-fix, 8 worth noting}
    verify: {solid-ui: 10/10, ui-core: 24/24, check: 12/12 types + 258 files lint clean from the real checkout}
    live: stack generate in helm emits one @theme with the reset leading, three @utility shadow-N, .dark inside @layer base, 59 color declarations
    bug-found-and-fixed: >
      cssTokenValue admitted unbalanced parens. A single bad value fails the build loudly and so
      does an unterminated quote, but a PAIR of consumer overrides.scales values — one opening,
      a later one closing — built clean, exited 0, and emitted a stylesheet containing nothing
      but the Tailwind banner. I reproduced it before requesting the fix and confirmed the fix
      rejects both halves while nested oklch(), comma lists, var() fallbacks, cubic-bezier() and
      animation shorthand all still pass.
    contested-by-run-and-upheld: >
      A2's "every property name through cssVarName" is unimplementable: cssVarName requires a --
      prefix, and box-shadow and color-scheme are the two things A2's own sentence names. The
      cssProperty dispatcher (-- to cssVarName, otherwise cssIdent) stands.
    overruled-by-me: >
      A reviewer asked to narrow defaultMode out of solid-ui's schema since it is inert on web.
      The PRD requires a two-platform consumer to pass the same theme object to both plugins
      (:96-99), so per-plugin narrowing breaks that contract. It stays a recorded gap.
  - n: B
    scope: decisions 13-21, criteria B1-B6
    outcome: merged b48ba43
    review: {spec: all criteria hold under mutation + 1 must-fix, standards: 6 must-fix, 12 worth noting}
    verify: {solid-ui: 18/18, ui-core: 24/24, check: 12/12 types + 259 files lint clean from the real checkout}
    live: >
      stack generate in helm, then a real Tailwind build over the generated sheet: every matrix
      cell emits, every retired class is gone, and the amended overlays are present. I verified
      the CSS layer exhaustively but did NOT do a browser render, so the "renders correctly in
      light and dark" half of the criterion rests on the emitted stylesheet, not on eyes.
    found-by-run-not-by-the-gate: >
      Matrix cell strings live in @fcalell/ui-core, which Tailwind never scanned, and a cva
      composes them at runtime, so 31 of the 66 distinct cell classes emitted no CSS: every badge
      fill, the danger button, all the type roles' leading and tracking. Two adversary rounds
      missed this and the milestone would have shipped looking broken. Fixed with two @source
      lines in globals.css. I verified the install-depth path in a real non-symlinked node_modules
      tree with a control proving the lines are load-bearing.
    my-errors-corrected-mid-run: >
      Four of the six standards must-fixes traced to decision 15, which I wrote as a closed
      overlay vocabulary without checking it against the README's contrast contracts. Placeholders
      landed on ink-4, which the contract reserves for disabled and inert chrome only. Button hover
      as whole-node opacity faded the control instead of highlighting it, gave the secondary
      emphasis less contrast on hover, and composited the accent-ink-on-accent 4.5:1 pair away.
      The field error state came out as a one-pixel hue shift. Decision 18's badge default -> brand
      row was also wrong; the matrix's own neutral default is right and the code already had it.
    matrix-grew: >
      FIELD.layout.row gained min-h-11. The select trigger computed to ~38px against the 44px tap
      floor, and the README puts that floor in the matrix precisely so it is not derived twice per
      plugin. The "matrix grows" branch, not a plugin patch.
    signed-off-by-me: >
      bg-ink-2 / bg-ink-3 as primary hover grounds. Off-label against the README's tone table, but
      accent is already an alias of ink-1 used as a fill, so this is one rung down the same ladder,
      and the contract's own ink-2/ink-3 >= 4.5:1 on canvas guarantee plus contrast symmetry gives
      the hover pair. The danger cell steps lighter because no darker danger exists.
    overruled-by-me: >
      Kept the run's Inset variant->tone rename (strictly a decision to ask for, but leaving
      variant="destructive" preserves a retired vocabulary word in a public API). Deferred the
      @source inline(...) alternative to M4, where native-ui hits the same problem through Metro.
carried-forward:
  - >
    A hover/press ground table in ui-core (M7). The sharing line puts interaction states in the
    plugin, so what would move is the ground TOKENS as data, not the prefixed classes. M4 gives the
    second data point.
  - >
    The ~110 lines solid-ui's harness shares with ui-core's. M4 adds a third copy and settles where
    the shared home belongs.
  - >
    The same validator rule now lives in three spellings across two packages that cannot depend on
    each other (cli/src/css.ts, ui-core/src/schema.ts, ui-core/scripts/verify.ts). Cross-referenced,
    but hand-synced.
  - >
    M5 debt confirmed live: dialog/index.tsx:123 composes leading-none tracking-tight after
    text-h3, which per the compose-order law overrides h3's calibrated metrics. Same shape in
    menu.ts and field.
  - >
    Adding a plugin dependency breaks a link:-protocol consumer until it reinstalls. helm hit this
    on @fcalell/ui-core.
---

# plugin-solid-ui adoption

Driver: `docs/prd/ui-core.md` M3 (`:261-275`). ui-core ships the contract (`001-01`) and the
matrices (`001-02`); this story makes the web plugin the first renderer of both.

## Goal

`plugin-solid-ui` emits its stylesheet from ui-core through a new `theme` option, `globals.css`
shrinks to the parts only the web needs, every component speaks the contract vocabulary, and
button, text, badge, card, and the input surfaces rebuild on the shared matrices with web
overlays composed through `cn()`.

## What exists today, measured

**Emission.** `aggregateAppCss` (`plugins/solid-ui/src/node/codegen.ts:20-44`) renders exactly
three things into `.stack/app.css`: `@import` lines, one fixed `@source "../src"` (`:32`), and
`@layer <name> { … }` blocks. There is no route for a top-level block, so `@theme` and `@utility`
are unreachable. The two contributing slots are `appCssImports` and `appCssLayers`
(`plugins/solid-ui/src/index.ts:98-106`), consumed by the `appCssSource` derived slot (`:131-137`)
and emitted at `:270`.

**The sheet.** `plugins/solid-ui/src/ui/globals.css` is 293 lines carrying six separable things:
the Tailwind entry (`:1-8`), a shadcn `@theme` map (`:15-81`), the `--ui-*` knobs (`:96-122`), the
hand-derived light and dark semantic tokens (`:128-236`), the base layer (`:242-255`), and three
keyframe blocks (`:261-293`). Only the entry, the base layer, and the keyframes survive as web
concerns; the middle three are what ui-core replaces.

**Vocabulary debt**, counted across `plugins/solid-ui/src/ui`:

| what                                                            | count | dies because                       |
| --------------------------------------------------------------- | ----- | ---------------------------------- |
| shadcn color classes (`bg-primary`, `text-muted-foreground`, …)   | ~231  | the names leave the contract       |
| `text-xs` … `text-5xl`                                            | 82    | `--text-*: initial`                |
| `rounded-sm` / `rounded-xs` / `rounded-lg`                        | 7     | `--radius-*: initial`, no such rung |
| `shadow-xs` … `shadow-xl`                                         | 20    | `--shadow-*: initial`              |
| `bg-black/80` (`dialog/index.tsx:39`)                             | 1     | the contract carries `scrim`       |

The colour classes land in 32 files, led by `sidebar/index.tsx` (52), `button/index.tsx` (24),
`select/index.tsx` (15), `badge/index.tsx` (14). One is outside `components/`: `lib/menu.ts` (5).
The top-line count is approximate and deliberately not an acceptance number — criterion B1 keys on
an enumerated pattern, not on a total.

**`accent` is in both vocabularies and does not retire.** shadcn's `--color-accent` and the
contract's `accent` (an alias of `ink-1`, `packages/ui-core/src/tokens.ts:153`) spell the same
class. `bg-accent` is the PRD's stated sweep *target* (`docs/prd/ui-core.md:265`). Only
`accent-foreground` retires, for `accent-ink`. Any sweep pattern that matches bare `accent` is
wrong.

`rounded-md`, `rounded-full` and `rounded-none` survive unchanged: the first two name real rungs
(`packages/ui-core/src/tokens.ts:246-255`), the last is a static utility. So do `shadow-none`,
`bg-transparent`, `border-transparent` and `text-current`.

**Leading and tracking statics.** `tracking-widest` (7), `tracking-tight` (6), `leading-snug` (4),
`leading-none` (4), `leading-normal` (3), `leading-relaxed` (2) and four `leading-[…]` all
**resolve** — `--leading-*` and `--tracking-*` are deliberately not zeroed
(`packages/ui-core/src/tokens.ts:309-317`). No build check can see them. A type role already owns
its leading and tracking, so every one of these inside the seven rebuilt components is drift; the
rest is M5's sweep and is recorded, not swept, here.

**Bracket classes are not debt.** Class strings in the plugin carry `[` in the hundreds. Almost all
are variant selectors and arbitrary *properties* — `[&_svg]:size-4`, `data-[invalid=true]:…`,
`has-[>[data-slot=field]]:…` — not arbitrary values. ui-core's no-`[`/no-`(` law binds **matrix
cells** (`packages/ui-core/README.md:268-271`), not plugin overlays. Do not sweep them.

**The components this story rebuilds.**

- `button/index.tsx:8-37` — one cva, `variant` × `size`, six variant values and four sizes.
- `text/index.tsx:152` — a ten-member namespace (`H1`…`H4`, `P`, `Lead`, `Large`, `Small`,
  `Muted`, `Code`), each a hand-written class string, no cva, each member `Polymorphic`. 30 call
  sites across `src` and `docs`.
- `badge/index.tsx:7-24` — one cva, `variant` of six, plus a `round` boolean. Single element: the
  container and its label are the same node.
- `card/index.tsx:60-66` — `Object.assign(Root, { Header, Title, Description, Content, Footer })`,
  so the public name is `<Card>`, not `Card.Root`. Padding sits on the sections (`p-6`,
  `p-6 pt-0`), not the root.
- `input/index.tsx` and `textarea/index.tsx` — each an exported cva (`inputClasses` declared `:6`
  exported `:42`; `textareaClasses` declared `:6` exported `:41`) with an identical
  `sm`/`default`/`lg` size axis pinning `h-8`/`h-10`/`h-12` (`:10-14` in both), and each declaring
  props as `Omit<ComponentProps<…>, "size">` (`:24` in both).
- `select/index.tsx` — `selectTriggerVariants` declared `:51`, exported `:226`, used `:82`.

**`field/index.tsx:109-115` is not the FIELD matrix's subject.** It is the form-field anatomy
(`fieldset`, label, description, value, error). The FIELD matrix
(`packages/ui-core/src/variant-tables.ts:212-223`) describes an *input surface*:
`rounded-control border bg-surface px-3.5`, `state` × `layout`. Its subjects are `input`,
`textarea`, and the `select` trigger.

**Escape helpers.** `plugins/solid-ui/src/node/css-escape.ts` re-exports the shared boundary from
`@fcalell/cli/css` with a plugin label. The two validators this story needs — `cssVarName` and
`cssTokenValue` — exist only in `plugins/native-ui/src/node/css.ts:23` and `:40`, whose own header
says they are kept there because they have "NO web counterpart". This story is that counterpart.

**Consumers.** `helm` (`/home/fcalell/projects/helm`) is workspace-linked to this repo and imports
`components/button` 17×, `components/badge` 9×, `components/card` 1×. Its call sites use
`variant="outline"` 23×, `variant="secondary"` 11×, `variant="ghost"` 9×, `variant="destructive"`
6×, `variant="warning"` 4×, `variant="success"` 1×, `size="sm"` 60×, `size="icon"` 1×.

## Settled decisions

### Run A — the emission spine

1. **One new slot, `appCssBlocks`, carrying two block kinds.**
   `{ kind: "theme", declarations }` → `@theme { … }`;
   `{ kind: "utility", name, declarations }` → `@utility <name> { … }`.
   Rendered after the imports and `@source`, before the `@layer` blocks. This is exactly the pair
   the PRD names (`docs/prd/ui-core.md:172-173`) and nothing is added speculatively.

2. **The dark block rides `appCssLayers`, not the new slot.** `@theme` compiles *into* `@layer
   theme`, and Tailwind emits `@layer theme, base, components, utilities;`, so
   `@layer base { .dark { … } }` wins over the seeded values. A third block kind is unnecessary.
   That block carries `color-scheme: dark` alongside the colours, and the base layer keeps
   `color-scheme: light` on `:root` — today's `globals.css:129` and `:186` are inside the deleted
   token blocks and would otherwise vanish, leaving UA controls light inside dark mode.
   `appCssLayers` validates only the layer *name* (`plugins/solid-ui/src/types.ts:36-41`) and
   passes `content` through untouched, so **the dark block's declarations render through the same
   `cssVarName` / `cssTokenValue` pair criterion A2 requires of `appCssBlocks`** — the render
   boundary is the boundary regardless of which slot carries the payload.

3. **The `@theme` block always seeds the light palette**, as `{ ...themeTokens(resolved),
   ...modeTokens(resolved, "light"), ...WEB_ONLY }` with each `modeTokens` key prefixed
   `--color-`. `themeTokens` seeds whichever mode `defaultMode` names
   (`packages/ui-core/src/emit.ts:53`), and web has a `dark` custom variant but no `light` one, so
   a `defaultMode: "dark"` theme would otherwise emit a sheet with no reachable light mode.

4. **`defaultMode` is inert on web in M3.** `src/ui/lib/theme.ts:5,12-16` hardcodes
   `createSignal<Theme>("light")` and resolves from `localStorage` then `prefers-color-scheme`. It
   reads no plugin option and cannot: it ships from `node_modules`, and the PRD rules out bridging
   generated data into `src/ui` (`docs/prd/ui-core.md:136-139`). Do not wire it. This is a recorded
   gap, not a task.

5. **WEB_ONLY is nine tokens**, appended after the contract tokens: `--ease-ui`,
   `--duration-fast`, `--duration-base`, the three `--animate-*`, plus `--font-sans`, `--font-mono`
   and `--font-serif`. The three font tokens are load-bearing and are in no ui-core emitter —
   `themeTokens` returns no font token, while `globals.css:25-26`, the only place they are
   declared, is inside the block decision 8 deletes. Drop them and the font tokens silently fall
   back to Tailwind's built-in stacks, killing the `fonts` option, `fontsToTokenCss`
   (`plugins/solid-ui/src/index.ts:71-94`) and every `font-mono` in the component set with no
   error. `--font-serif` joins them because `fontEntrySchema` accepts `role: "serif"`
   (`types.ts:68`) and nothing would bind it.

   **`--spacing` is not in the list.** Tailwind v4 supplies `--spacing: 0.25rem` by default and it
   survives all four namespace resets, so `globals.css:29`'s `--spacing: var(--ui-spacing)` simply
   goes with the knobs.

6. **The font tokens carry a CSS-level fallback**: `--font-sans: var(--ui-font-sans, <stack>)`,
   with each stack from ui-core's `FONT_FALLBACKS` (`packages/ui-core/src/tokens.ts:321-325`, which
   nothing emits today). `fontsToTokenCss` returns `null` for `fonts: []`
   (`plugins/solid-ui/src/index.ts:77`), and the `--ui-font-*` defaults it relies on today live at
   `globals.css:120-121`, inside the deleted knob block. Without the fallback a `fonts: []`
   consumer gets a font-family that resolves to nothing.

7. **`--color-white` and `--color-black` retire.** Neither has a consumer once
   `dialog/index.tsx:39`'s `bg-black/80` becomes `bg-scrim` — the contract's `scrim` is a
   neutral-bound ink at alpha 0.8 (`packages/ui-core/src/tokens.ts:215`), which is what that
   overlay is. Verified: that is the only white/black colour class in the plugin.

8. **`globals.css` keeps only what the web owns**: `@source "./"`, the `dark` custom variant, the
   base layer, and the three keyframe blocks. The `@theme` map, the `--ui-*` knobs, and both
   hand-derived token blocks go. **`@import "tailwindcss"` (`:1`) goes too** — `.stack/app.css`
   already imports it (`index.ts:251`) before importing this file, and the duplicate is *not*
   deduplicated: preflight emits twice. The base layer re-points at the contract:
   `var(--border)` → `var(--color-edge)`, `var(--background)` → `var(--color-canvas)`,
   `var(--foreground)` → `var(--color-ink-1)`.

9. **Shadows ship as `@utility`.** `--shadow-*` is zeroed, so `shadowUtilities(resolved)`
   (`packages/ui-core/src/emit.ts:75-83`) renders three `@utility shadow-1|2|3 { box-shadow: … }`
   blocks.

10. **`cssVarName` and `cssTokenValue` move to `packages/cli/src/css.ts`**, the shared boundary both
    plugins already import, with both plugins re-exporting them under their own label. Two changes
    land with the move: the name pattern widens to accept a namespace reset key (`--color-*`),
    which the current `VAR_NAME_RE` (`plugins/native-ui/src/node/css.ts:21`) rejects, while still
    accepting the Tailwind v4 modifier form `--text-h1--line-height`; and the value validator
    rejects `/*` and `*/`, which `TOKEN_VALUE_ILLEGAL_RE` (`:38`) lets through. The `/*` hole is
    **not** reachable from solid-ui's `theme` option — `packages/ui-core/src/schema.ts:23` already
    rejects those sequences in `overrides.scales`, and `OKLCH_RE` covers `overrides.colors` — so
    this is defense in depth at the render boundary, and it closes the hole on native-ui's open
    `themeTokens` hex record, which has no such guard. `plugins/native-ui/src/node/css.ts`
    re-exports from the shared module in this story rather than waiting for M4; leaving a second
    copy in place while adding a web one is the drift this move exists to stop.

11. **`theme` on the options schema.** `solidUiOptionsSchema` (`plugins/solid-ui/src/types.ts:88`)
    gains `theme: themeSchema.optional()`, and a derived slot resolves it through `deriveTheme`
    (`packages/ui-core/src/derive.ts:85`) exactly once, so every block contribution reads one
    resolved value.

12. **`lib/cn.ts` becomes a re-export** of `@fcalell/ui-core/cn`. The plugin gains
    `@fcalell/ui-core: workspace:*`.

### Run B — the sweep and the matrices

13. **Every family that tints its own content composes two cvas on one node.** The fill matrices
    carry no ink: `BUTTON` (`variant-tables.ts:31-57`) is fills and borders, `BUTTON_LABEL`
    (`:59-75`) is the ink. `accent` aliases `ink-1` and `accent-ink` aliases `canvas`
    (`tokens.ts:153-154`), so a primary button built from `button()` alone renders ink-1 text on an
    ink-1 fill — invisible. Every single-node family therefore composes both:

    - Button: `cn(button({ emphasis, tone, size }), buttonLabel({ emphasis, tone, size }), …)`
    - Badge: `cn(badge({ tone }), badgeLabel({ tone }), …)`

    `buttonContentTone` and `badgeContentTone` (`packages/ui-core/src/variants.ts:62,74`) exist for
    a plugin that must hand a tint to a separate icon component; web icons inherit `currentColor`
    from the label cell on the same node, so neither is needed here.

14. **Button axes.** `variant` retires for `emphasis` × `tone`; `size` renames `default` → `md`.

    | today         | becomes                               |
    | ------------- | ------------------------------------- |
    | `default`     | `emphasis="primary" tone="neutral"`   |
    | `destructive` | `emphasis="primary" tone="danger"`    |
    | `outline`     | `emphasis="secondary" tone="neutral"` |
    | `ghost`       | `emphasis="tertiary" tone="neutral"`  |
    | `secondary`   | `emphasis="secondary"` — the grey fill has no cell |
    | `link`        | retires; zero call sites, one docs snippet (`docs/button.md:68`) |

15. **The web interaction overlays are these, and no others are invented.** They compose after the
    matrix cells, per the README's compose-order law (`packages/ui-core/README.md:278-292`):

    - **Disabled** is a prop, not a prefix. Kobalte exposes `disabled`, so Button branches in JS:
      `props.disabled ? cn(buttonMuted({ emphasis }), BUTTON_MUTED_LABEL) : buttonLabel({…})`
      (`packages/ui-core/src/variants.ts:31,40`). No `disabled:opacity-50`.
    - **Hover / active**: the ground moves, never the alpha — opacity fades the control instead of
      highlighting it and composites the label out of its contrast contract. One ground per
      emphasis × tone.
    - **Focus ring**: `focus-visible:outline-2 focus-visible:outline-offset-2
      focus-visible:outline-interactive`. The contract has no `ring` token; `interactive` is its
      interactive accent.
    - **Hover surface** on tertiary buttons and menu rows: `hover:bg-surface-2`.
    - **Placeholder**: `placeholder:text-ink-3`. (`ink-4` is contract-reserved for disabled and
      inert chrome; a placeholder is live content.)
    - **Invalid**: `aria-invalid:border-danger`.

16. **`size="icon"` is not a matrix value.** Growing a shared axis with a web-only value is the
    drift the sharing line forbids. Its six sites — `sidebar/index.tsx:260`, `docs/button.md:91`
    and `:112`, `docs/tooltip.md:31`, `docs/dropdown-menu.md:81`, `docs/item.md:67` — take
    `size="md"` plus an `aspect-square` overlay. **`sidebar/index.tsx:261`'s `size-7` goes**: it
    pins a 28px trigger, and `min-h-11` is the contract's 44px tap floor asserting itself
    (`packages/ui-core/README.md:249-252`). The visible size change is intended.

17. **Every exported cva retires**: `buttonVariants`, `badgeVariants`, `inputClasses`,
    `textareaClasses` and `selectTriggerVariants`. Each lets a call site paint a primitive's look
    onto an arbitrary element — the call-site look M6's gate exists to stop, and one it cannot see,
    since it reads literals and these are call expressions. The axis rename breaks the published
    signatures regardless. The documented case (`docs/button.md:118-123`, `docs/badge.md:80-85`,
    `docs/textarea.md:45-48`) — an anchor that looks like a button — is Kobalte's `as`, which the
    PRD keeps open as a deliberate hole (`docs/prd/ui-core.md:125-130`).

18. **Badge axes.** `variant` retires for `tone`. The `round` boolean retires: `BADGE`'s base is
    already `rounded-full` (`variant-tables.ts:146`).

    | today         | becomes            |
    | ------------- | ------------------ |
    | `default`     | `tone="neutral"` — the matrix default |
    | `secondary`   | `tone="neutral"`   |
    | `outline`     | `tone="neutral"`   |
    | `destructive` | `tone="danger"`    |
    | `success`     | `tone="ok"`        |
    | `warning`     | `tone="warn"`      |

    Neither badge table carries a type role, so today's `text-xs font-semibold` (`:8`) has a named
    successor rather than being dropped: the badge also composes
    `text({ variant: "micro" })` and `textStrong({ variant: "micro" })` — 12px, semibold, matching
    today. **`BADGE_DOT` is not adopted**: no web component has a status dot and adding one is new
    surface M3 was not asked for. `interactive` and `oncover` reach no legacy value and stay
    available; a matrix may offer more cells than a plugin uses.

19. **`Text` collapses to one `Polymorphic` component** with `variant` (the nine roles), `tone`
    (the twelve), a `strong` boolean over `TEXT_STRONG`, and a `mono` web overlay. `as` stays, as
    every member is polymorphic today.

    | today   | becomes                            |
    | ------- | ---------------------------------- |
    | `H1`    | `variant="h1"` (28px; was 36px)    |
    | `H2`    | `variant="h2"` (22px; was 30px)    |
    | `H3`    | `variant="h3"` (18px; was 24px)    |
    | `H4`    | `variant="rowtitle"` (16px semibold; was 20px) |
    | `P`     | `variant="body"`                   |
    | `Lead`  | `variant="h3" tone="ink-2"`        |
    | `Large` | `variant="rowtitle"`               |
    | `Small` | `variant="caption"`                |
    | `Muted` | `variant="caption" tone="ink-3"`   |
    | `Code`  | `as="code" variant="callout" mono` |

    The ramp steps down deliberately: the contract's roles are the calibrated ones and the old
    sizes were shadcn's. `display` reaches no legacy member and stays available. `Code`'s chip
    (`text/index.tsx:144`) is not dropped — it becomes the overlay
    `bg-surface-2 rounded-md px-1 py-0.5`, the arbitrary `px-[0.4em]` rounding to the nearest
    contract step as the PRD's no-arbitrary rule prescribes (`docs/prd/ui-core.md:114-117`).

20. **Card padding moves to the root.** `<Card>` takes the CARD matrix, defaulting to
    `padding="card"`; `Header`, `Content`, and `Footer` drop their `p-6` / `p-6 pt-0` and become
    pure rhythm — `Header` gaps at `gap-pair` (4px, from today's 6px `gap-1.5`, the nearest rung).
    The root composes `flex flex-col gap-stack` as its web overlay so the sections still separate.
    `Card.Title` and `Card.Description` compose the text matrix — `text({ variant: "h3" })` and
    `text({ variant: "caption", tone: "ink-3" })` — rather than keeping hand-written type classes.

21. **The FIELD matrix lands on `input`, `textarea`, and the `select` trigger.**
    `Input` and `Textarea` take `layout="input"`, the select trigger takes `layout="row"`.
    `field/index.tsx` and `enum-input/index.tsx` get the vocabulary sweep only — the latter is a
    chip container (`:63-70`: `flex min-h-10 flex-wrap items-center gap-1 … px-3 py-2`), not an
    input surface, and `layout="row"`'s 12px gap would be wrong for a 4px chip lockup. Three
    consequences, all settled:

    - **The `size` axis retires from all three** (`input/index.tsx:10-14`,
      `textarea/index.tsx:10-14`, and the select trigger), which pinned `h-8`/`h-10`/`h-12`. FIELD
      has no size axis and `layout="input"` is `min-h-12`; a pinned `h-8` fights it and is below
      the tap floor. Each props type drops its `Omit<ComponentProps<…>, "size">` (`:24` in both
      input and textarea) so the native `size` attribute stops being wrongly excluded. A consumer
      needing a short input is a matrix gap for M7.
    - **`state` stays reached by variant prefix, and the prefixed class is read against the
      matrix.** These components have no invalid or focus *prop*, only `aria-invalid:` and
      `focus-visible:` selectors, and cva cannot prefix a cell. So the plugin writes
      `focus-visible:border-ink-1` and `aria-invalid:border-danger` literally, `field()` is called
      with `state: "default"`, and criterion B4 checks that each prefixed literal's suffix equals
      the matrix cell it mirrors. Binding `state` to a real prop needs the prop closure M5 does;
      that is a recorded gap, not a task here.
    - **`gap-row` is inert on a bare `<input>`** and stays. An inert class costs nothing and
      forking the matrix to avoid one costs the sharing line.

22. **Class props stay open.** M5 closes `class`, `className`, and `style` across both plugins at
    once, and every `cn(…, local.class)` tail survives this story untouched.

## Approach

Two dispatches against this one brief. **Run B is dispatched only after Run A merges**: B's
components emit `text-h1`, `bg-accent` and `gap-row`, which resolve only once A's `@theme` lands,
and B's merge behaviour depends on A's decision 12 re-exporting ui-core's extended
`tailwind-merge`. The story is not done until both merge.

**Run A** ships decisions 1–12 and must pass criteria A1–A10. It ends with `.stack/app.css`
carrying themed token bodies and `globals.css` shrunk, while every component still speaks the old
vocabulary and is therefore visually broken. That is expected, is why A does not ship alone, and is
why no B criterion is in A's green state.

**Run B** ships decisions 13–21 and must pass criteria A1–A10 (still) plus B1–B6.

### Verification

M1 and M2 verify through a committed script, and M3 keeps that shape: `pnpm --filter
@fcalell/plugin-solid-ui verify`. The package has no such script today and no `tsx` or
`@tailwindcss/cli` devDependency; Run A adds all three, mirroring `packages/ui-core`.

A headless run cannot use `helm` as its target — helm's `node_modules/@fcalell/plugin-solid-ui`
symlinks to the real checkout, not to the run's worktree, so a generate there would exercise
unmodified code. The live check against helm is mine at merge.

The script resolves `.stack/app.css` **through the real plugin graph**, never by calling
`aggregateAppCss` with a hand-built payload — the contribution wiring is a thing that can break.
Both candidate routes need an export-map addition, which is in scope: `buildGraph`
(`packages/cli/src/lib/graph.ts:53`) is exported at `@fcalell/cli/graph` but takes
`(plugins, ctxFactory)`, so using it means rebuilding by hand what `buildGraphFromConfig`
(`packages/cli/src/lib/build-graph.ts:35`) already does — and neither that nor `generateFromConfig`
(`packages/cli/src/commands/generate.ts:17`) is in the map. Add the one subpath whichever route
needs. The mechanism is the run's call; the outcome is not.

## Acceptance criteria

### A — the emission spine

1. `pnpm check` passes from the real checkout. (command)
2. `aggregateAppCss` renders both `appCssBlocks` kinds, and the dark `@layer base` block, with
   every property name through `cssVarName` and every value through `cssTokenValue`, in the order
   imports → `@source` → blocks → layers. A block with a malformed property name, a malformed
   value, or a malformed utility name throws and the error names solid-ui. (command)
3. A config carrying `solidUi({ theme: { knobs: { brandHue: 120 } } })` resolves to an
   `.stack/app.css` whose `@theme` block contains every key `themeTokens` returns, every
   `PER_MODE_COLORS` key at its **light** value, and the nine WEB_ONLY tokens, with
   `--color-*: initial` preceding every `--color-<contract>` entry, and whose values match
   `deriveTheme` for the same input. The block is byte-identical under
   `defaultMode: "dark"`. (command)
4. The emission carries `@layer base { .dark { … } }` with every `PER_MODE_COLORS` key from
   `modeTokens(resolved, "dark")` plus `color-scheme: dark`, and a `:root` carrying
   `color-scheme: light`. (command)
5. Three `@utility shadow-1|2|3` blocks are emitted, and a Tailwind build over the emitted sheet
   resolves `shadow-1`, `shadow-2`, and `shadow-3` to a `box-shadow` declaration. (command)
6. A Tailwind build over the emitted sheet emits nothing for this enumerated probe set —
   `bg-primary`, `text-muted-foreground`, `text-accent-foreground`, `border-border`, `bg-popover`,
   `text-sm`, `text-4xl`, `rounded-lg`, `rounded-sm`, `shadow-md`, `bg-red-500` — and emits a
   declaration for this one: `bg-canvas`, `bg-surface-2`, `bg-accent`, `text-accent-ink`,
   `text-ink-3`, `border-edge`, `bg-scrim`, `text-h1`, `leading-h1`, `tracking-h1`, `text-micro`,
   `gap-row`, `gap-stack`, `p-card`, `min-h-11`, `rounded-control`, `rounded-full`,
   `rounded-none`, `shadow-1`, `font-mono`, `p-4`. Both sets are fixed lists, not a classifier over
   the source: no build can tell contract from off-contract until M6's gate, and criterion B1
   carries the drift this cannot see. (command)
7. The emitted sheet carries exactly one Tailwind preflight. (command)
8. `globals.css` declares no `--ui-*` knob, no `--color-<shadcn-name>`, no hand-derived semantic
   token and no `@import "tailwindcss"`; it retains `@source`, the `dark` variant, the base layer,
   and the three keyframe blocks. Its base layer references `--color-edge`, `--color-canvas` and
   `--color-ink-1`, and no `--border` / `--background` / `--foreground`. (file)
9. `--font-sans`, `--font-mono` and `--font-serif` resolve to a real stack under `fonts: []` in the
   built sheet, and `p-4` resolves. (command)
10. `cssVarName` and `cssTokenValue` are exported from `@fcalell/cli/css`;
    `cssVarName("--color-*")` and `cssVarName("--text-h1--line-height")` return rather than throw;
    `cssTokenValue("red /* x")` throws; and neither plugin declares its own copy. (command)

### B — the sweep and the matrices

1. Across `plugins/solid-ui/src` **and `plugins/solid-ui/templates`**: zero matches for the retired
   colour pattern
   `(bg|text|border|border-[lrtbxy]|ring|fill|stroke|from|to|via|outline|divide|placeholder|caret|shadow|decoration)-(primary|secondary|muted|destructive|success|warning|border|input|ring|background|foreground|card|popover)(-foreground)?`,
   for `accent-foreground`, for `text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)`, for
   `rounded-(xs|sm|lg)`, for `shadow-(xs|sm|md|lg|xl)`, and for `bg-black`. The pattern must not
   match bare `accent`, which is a contract token. (command)
2. Inside the seven rebuilt files — `button`, `text`, `badge`, `card`, `input`, `textarea`,
   `select` — zero matches for `leading-` or `tracking-` other than a contract role name. (command)
3. Those seven each build their classes by calling the ui-core cvas for their family, Button and
   Badge each composing their fill and label tables on one node, and no class string in them equals
   a matrix cell string in full. (command)
4. Every variant-prefixed class in those seven whose suffix looks like a matrix cell *is* that
   cell: `focus-visible:border-ink-1` matches `FIELD.variants.state.focused` and
   `aria-invalid:border-danger` matches `.error`, read from the matrix rather than asserted as a
   literal. (command)
5. `buttonVariants`, `badgeVariants`, `inputClasses`, `textareaClasses` and
   `selectTriggerVariants` are not exported, and no file in the plugin or its docs references
   them. (command)
6. Every docs page whose component's API changed is updated, and no docs page shows a retired axis
   value, a retired size, a retired export, or a retired class. (command)

### Documentation (Run A for the slots, Run B for the components)

1. `.helm/knowledge/architecture/slot-catalog.md`'s solid-ui table (`:123-131`) lists `appCssBlocks` and
   the resolved-theme slot, and its spec-type section registers the block payload type, per
   `.helm/agents/plugin-authoring.md:212-213`. (file)
2. `plugins/solid-ui/README.md` documents the `theme` option in its options table (`:71`), and its
   `globals.css` description (`:125`) matches what the file now holds. (file)
3. `.helm/knowledge/architecture/consumer-project.md`'s annotated `stack.config.ts` (`:55-88`) carries
   the `theme` option, since that doc is CLAUDE.md's named trigger for the `stack.config.ts`
   surface. (file)

### Mine at merge

1. `stack generate` in helm produces an `.stack/app.css` carrying the themed token bodies, and
   `stack dev` renders the scaffold home correctly in light and in dark. (live)

## Out of scope

- Closing `class` / `className` / `style`. M5.
- The rhythm family (`Stack`, `Row`, `Pair`, `Section` rungs). M5.
- The geometry gate and its build step. M6.
- Wiring `defaultMode` into the runtime theme toggle, and binding FIELD's `state` axis to a real
  prop. Both need the prop closure M5 does; both are recorded gaps.
- Sweeping `leading-*` / `tracking-*` statics outside the seven rebuilt components. M5.
- Sweeping bracket classes. They are variant selectors and arbitrary properties, and the no-`[` law
  binds matrix cells only.
- Applying the FIELD matrix to `field/index.tsx` or `enum-input/index.tsx`. Neither is an input
  surface; both get the vocabulary sweep only.
- Adopting `BADGE_DOT`.
- `plugin-native-ui`'s adoption. M4. Only its re-export of the moved validators lands here.
- Editing `helm`. It is the live-verification target and a dogfood signal; its call sites break on
  the axis rename and that break is the signal, not a task.
- The remaining matrices (M7) and any component outside the ones named here.

## Open questions

None. Two gate rounds closed thirty-three flags, none dismissed. Five changed the design: the dark
block's layer (decision 2 — my cascade reasoning was inverted), the orphaned font tokens
(decisions 5 and 6), the circular off-contract check (criterion A6), Button rendering ink-1 on
ink-1 without its label table (decision 13), and a sweep pattern that would have forbidden the
contract's own `accent`.
