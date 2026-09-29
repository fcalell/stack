# @fcalell/ui-core

The design system both stack UI plugins render from: one closed token contract, the approved
foundations sheet as data behind four knobs, the words the molecules speak, the platform-invariant
variant matrices, the roster every component and its props are pinned to, and the laws that say
which token to pick. The contract subpaths export build-time data only, so each plugin renders its
own CSS from the same records and ui-core stays framework-free. One subpath is Node-only:
`./harness`, internal tooling for the packages' verify scripts.

Ten subpaths:

- `@fcalell/ui-core/tokens`: the contract as data, the sheet's every value, the knob defaults and
  the English `words`.
- `@fcalell/ui-core/schema`: the zod `themeSchema` and `wordsSchema`, and the `Theme` input type.
- `@fcalell/ui-core/derive`: `deriveTheme(theme)` resolves the knobs into final values, one string
  per token, plus the motion scale as numbers.
- `@fcalell/ui-core/emit`: the records a plugin renders. `themeTokens` is the `@theme` block: the
  eleven reset namespaces, the touch density set, tracking, radii, widths, breakpoints, the two
  font stacks, the durations and curves, and the light colors. `rootTokens` is what sits on the
  root outside `@theme`: the hairline, the focus ring's width and offset, and the light shadows.
  `modeTokens` is one mode's colors and its two shadows. `densityTokens` is one density's type
  scale, spacing roles and sizes, whatever the knob says. `finePointerTokens` is the desktop set
  under `density: "desktop"` and empty under `touch`. `reducedMotionTokens` is every duration at
  0ms. `shadowUtilities` is the declaration of each `shadow-*` utility, reading its mode's variable.
- `@fcalell/ui-core/cn`: `cn()`, the class merger, taught the contract's six scales.
- `@fcalell/ui-core/variants`: the platform-invariant variant matrices, each a cva built from a
  table, the single-cell constants beside them, and `FAMILIES`, every matrix by name with its axes,
  which `matrixCells` enumerates into cells.
- `@fcalell/ui-core/descriptors`: `Act`, `IconAct`, `Part`, `Mark`, `Option`, `OptionGroup`,
  `PlaceSpec`, `Hunk`, `FieldBinding`, `Confirmation`, `MenuItem`, `TableColumn`, `TableRow`,
  `CellEdit` and the other framework-free types a prop carries.
- `@fcalell/ui-core/commit`: `commitMoment()`, when a typing control's value is final: on
  leaving the field or Enter, only when it changed since focus, Escape restoring the value at
  focus. Both plugins' `Input` and `TextArea` drive their `onCommit` with it.
- `@fcalell/ui-core/roster`: the component roster as data (`ROSTER`, `STATES`, `CLOSED_PROPS`): the
  layer, prop names, drawn families and states of every component both plugins ship.
- `@fcalell/ui-core/harness`: internal. The shared core of the packages' `scripts/verify.ts`.

The contract has two modes, `light` and `dark`. `themeTokens` seeds the light colors and the touch
density set into the `@theme` block as well, because Tailwind v4 generates no utility from a
property declared only inside a variant block; which mode and density seed it never shows, since
every utility reads its variable and the active scope sets it.

## DESIGN.md

The repo root's `DESIGN.md` is the contract in the [DESIGN.md format](https://github.com/google-labs-code/design.md):
the default theme's tokens as front matter, each matrix cell and single cell as a component (dark
values and their components suffixed `-dark`), and the roster with its drawn families and states.
`src/design-md.ts` emits it and `pnpm --filter @fcalell/ui-core design-md` writes it. The package's
`test` fails when the committed file differs from the emitter's output or when `design.md lint`
reports an error, so it is never edited by hand.

## The knobs

A theme sets a knob and never a token. Four knobs; everything else is the sheet and moves only
with it.

| Knob | Default | Moves |
| --- | --- | --- |
| `accentHue` | 264 | the accent-bound roles and nothing else: `accent`, `accent-soft`, `accent-ink`, `ring`, `selected-outline`, `act-accent` with `act-accent-hover`, `act-accent-press` and `act-accent-pending`, `switch-on` and `switch-on-hover`. The neutrals, the three status hues, the chip families and the avatars are fixed |
| `density` | `desktop` | which set the type scale, the spacing roles and the sizes draw where the primary pointer is fine; `touch` is the 44 px world on every device |
| `fonts` | `sans` unset, `mono` "JetBrains Mono Variable" | the two families as `--font-sans` and `--font-mono`, each followed by its metric fallback face (`fallbackFace(family)`, the family name plus ` Fallback`) and then its platform fallback stack; an unset `sans` is the platform's stack alone. The files are each plugin's `fonts` option |
| `defaultMode` | unset | the mode a viewer with no stored choice starts in, ahead of the system preference; unset, the system decides |

`accentHue` is in `[0, 360)`. A re-hued accent holds its chroma inside sRGB at its lightness, so
it loses saturation at a hue the gamut cannot carry and never clips to another color, and a role
that carries a contrast contract (`accent-ink` on `group` and on `accent-soft`, at 4.5:1)
moves its lightness from the declared one until the contract holds; at the sheet's own hue
nothing moves. The contrast pairs then hold at every hue, and the verify script sweeps all 360. Density is a theme, never a breakpoint: no scale changes at a width. Native is
touch-only and draws `touch` whatever the knob says.

## Words

Every word a molecule draws or reads aloud on its own comes from `words`, a typed object passed
once beside `theme`: the six `Status` words, `recommended`, `copy`, `copied`, `back`, `close`,
`more`, `send`, `stop`, `attach`, `search`, `loading`, `retry`, `add`, `remove`, `duplicate`
(an `EnumInput`'s refusal of a value already listed). `Words` requires every key and
`wordsSchema` is closed, so a translation that misses a word fails `tsc` and the schema, never the
interface. `ENGLISH` is the default. A sentence that belongs to the consumer is a prop on the
molecule that draws it (`placeholder`, `notice`, every `sentence`, every label), never a key.

## Color roles

One accent hue, cool greys, three status hues, six chip families, eight avatars. Every value is
OKLCH. The neutrals sit at hue 270, the accent's own family, so the greys and the accent read as
one palette.

- Surfaces step in CIE L*. Light: `surface` 100 (a card, a field, a row), `canvas` 96.9 (the
  page), `group` 93.8 (a filled tile, a chip ground), `raised` white again (a popover, a dialog, a
  sheet, a toast). Dark: `canvas` 3.6, `surface` 8.1, `group` and `raised` 12.3, so a lifted
  layer sits one step above the content.
- `edge`: the hairline over `canvas` and `surface`. `edge-raised`: the hairline inside a group and
  on a lifted layer; the container re-points `edge` to it, so a row inside a group draws `edge`
  and gets the raised value. In light the two are one hairline; the dark ladder spans more than
  one hairline can straddle, so there they differ. `edge-strong`: a control's boundary, at 3:1
  against `surface` and `group`.
- `scrim`: the veil behind a dialog or a sheet.
- Three inks. `ink-body`: the primary line of anything. `ink-meta`: a secondary line, a
  placeholder, a table header. `ink-faint`: disabled text only, at about 3:1, which WCAG exempts.
- The accent trio. `accent`: the filled act, a blue on the neutrals' hue. `on-accent`: text on
  `accent`, white in both modes. `accent-soft`: a tinted tile. `accent-ink`: a link, the focus
  ring, a selection outline; the accent itself in light, lighter in dark so it reads on the
  near-black ground.
- The status trio, each with a `-soft` ground: `ok` the `done` mark and an added line's ink,
  `ok-soft` the ground under it; `warn` the `attention` mark, `warn-soft` its ground; `danger` the
  `failed` mark, a destructive act's label, an error ring, `danger-soft` its ground and a removed
  line. `on-danger`: text on a `danger` fill, the one saturated state fill. The dark tones are
  capped at L 0.75 and spread in lightness so they separate under protanopia and deuteranopia.
- Six chip families in hue order, the accent's band left out so no family wears it: `red`,
  `amber`, `green`, `teal`, `violet`, `pink`. Each is three roles: `chip-red` the mark (a dot, a
  chart series), `chip-red-soft` the soft ground, `chip-red-ink` the ink on the soft; the other
  five follow. A `Chip` draws its family's soft under the family's ink, so the family is
  learnable across screens and never mistaken for a status. The marks alternate in lightness
  between neighbours so the set separates by lightness as well as hue.
- Eight avatars at 40 to 50° spacing: `avatar-1` the fill and `avatar-1-ink` the initial on it,
  through `avatar-8` and `avatar-8-ink`; a pastel fill under a hue-darkened initial in light, a
  deep fill under a hue-lightened initial in dark, one step per name by a hash.
- The washes are `ink-body` at an alpha, so they follow the mode and sit on any surface as one
  more step: `wash-hover` a transparent part under the pointer, `wash-press` pressed,
  `wash-selected` a selected row or chip, `wash-selected-hover` a selected row under the pointer,
  `skeleton` a loading bar, `fill-disabled` a disabled act's or chip's box.
- The places, each an alias of the tone that draws it: `ring` the focus ring and
  `selected-outline` a selected tile's outline, both `accent-ink`; `edge-hover` a field's boundary
  under the pointer, `edge-strong`; `edge-error` a field's boundary in error and `ink-error` an
  error message, both `danger`; `ink-disabled` a disabled part's label, `ink-faint`.
- Two act fills. `act-accent` is `accent` under `on-act-accent`, the primary act; `act-ink` is
  `ink-body` under `on-act-ink` (`canvas`), a screen's dark primary. Hover and press mix the fill
  12 % and 22 % toward a second color in OKLab: `act-accent-hover` and `act-accent-press` toward
  black, so the label only gains contrast; `act-ink-hover` and `act-ink-press` toward `canvas`,
  which lightens the fill in light and darkens it in dark. Pending recedes 30 %:
  `act-accent-pending` toward `on-accent`, `act-ink-pending` toward `canvas`.
- The switch. `switch-off` is `edge-strong` and `switch-off-hover` mixes it 15 % toward
  `ink-body`; `switch-on` is `accent` and `switch-on-hover` mixes it 12 % toward black;
  `switch-thumb` is `on-accent`. A switch has no label of its own, so it disables by opacity.

Status colors: `active` → `accent-ink`, `waiting` → `ink-meta`, `done` → `ok`, `attention` →
`warn`, `failed` → `danger`, `idle` → `ink-meta`.

## Type roles

Seven roles named by use, each a ratio of the body size. Two rules decide which one a piece of
text takes. Size follows structure, never emphasis: the primary line of anything is `body`, a
secondary line is `meta`, and emphasis inside a line is weight 500 (`strong`), never a size
change. A size role names a place, once: `title` is the page's name, once per screen; `heading` a
section's or a card's name, never inside a row; `caption` text inside a small component (a chip, a
key hint), never a sentence; `code` what a machine reads. So there is no label role: a field label
and a row's leading cell are `body` at 500, a table header is `meta` at 500, menu and picker
items are `body`. Weight, ink and family ride with the role; a molecule may set a role's weight in
its own cell, never a consumer.

The body size is the one base, per density: 13 on desktop, 16 on touch, the input size below
which iOS Safari zooms on focus. Each size rounds to the whole pixel and each line box to the even
pixel, a tie rounding up.

| Role | Desktop, size / line | Touch, size / line | Weight | Ink | Used for |
| --- | --- | --- | --- | --- | --- |
| `display` | 36 / 40 | 44 / 48 | 500 | `ink-body` | a display number, one per screen |
| `title` | 18 / 24 | 22 / 28 | 600 | `ink-body` | the page's name, once per screen |
| `heading` | 15 / 20 | 18 / 24 | 600 | `ink-body` | a section's or a card's name, never inside a row |
| `body` | 13 / 20 | 16 / 24 | 400 | `ink-body` | the primary line of anything: prose, a row, a field, a menu item |
| `meta` | 12 / 18 | 15 / 22 | 400 | `ink-meta` | a secondary line, a description, a table header at 500 |
| `caption` | 11 / 16 | 14 / 22 | 400 | `ink-meta` | text inside a small component, never a sentence |
| `code` | 12 / 18 | 15 / 22 | 400, mono family | `ink-body` | what a machine reads |

`strong` is 500; `display`, `title` and `heading` already sit at or above it. Tracking is in em
and density-invariant: `display` -0.02, `title` -0.01, `heading` -0.005, `caption` 0.01; the rest
carry none. Code reads character for character, so the mono family's ligatures and contextual
alternates stay off.

## Space, sizes, radii, elevation

One base, 4 px; every spacing role is a multiple of it, picked per density, so a density moves
the roles up and down one ladder. Eight roles by use, desktop then touch: `inside` 6 / 8 (within
a control: icon to label, dot to text), `control-x` 12 / 16 (a control's inline padding), `pair`
6 / 8 (between paired elements: label over input, title over description), `rows` 2 / 4 (between
rows in a menu or a nav list; rows in a hairline list abut), `card` 16 / 16 (a card's or a
popover's inset), `fields` 16 / 24 (between fields), `sections` 32 / 40 (between sections of a
page), `page` 24 / 16 (the page inset). Touch is the same roles one rung looser except the page
inset, which a phone narrows. Five are gap roles, what a container may put between its children:
`inside`, `pair`, `rows`, `fields`, `sections`; the other three (`control-x`, `card`, `page`)
are insets.

Sixteen sizes per density sit in the same `--spacing-*` namespace, so a cell names them as it
names a role (`min-h-control`, `size-avatar`), and nothing is spaced by them. Desktop then touch:
`control` 32 / 44 (a button, a segmented control), `control-compact` 28 / 44 (a menu item, a
toolbar control), `field` 38 / 48 (a form input), `row` 32 / 48 (a one-line row), `row-2` 48 / 64
(a two-line row), `row-setting` 64 / 72 (a setting row), `header` 32 / 44 (a table or strip
header), `target` 24 / 44 (the least hit area of any interactive part), `dot` 6 / 8, `chip` 20 /
24, `avatar` 24 / 32, `spinner` 14 / 16, `switch-w` 28 / 40, `switch-h` 16 / 24, `thumb` 12 / 20,
`skeleton` 12 / 12. On touch every target is at least 44. A cell says `min-h`, never `h`: a label
must be able to grow its control under OS font scaling.

Eight radius roles, density-invariant, a radius naming the role and never the size: `chip` 4
(an outlined chip, a skeleton bar, a checkbox), `control` 6 (a button, a field, a segmented
control), `row` 6 (a menu item, a highlighted row), `card` 8 (a card, a toast), `popover` 8,
`sheet` 8 (a sheet's leading corners), `dialog` 12, `full` (a dot, an avatar, the pill chip or
status, a switch). One hairline of 1 px draws region edges, row splits and field boundaries, as
`--hairline`. The focus ring is `ring`, 2 px at a 2 px offset outside the box, so it never covers
the control's own edge; inside a list it is drawn inward.

Widths are the lifted layers' ranges and the one measure for running text, as `--container-*`:
`popover` 240, `toast` 360, `dialog` 440, `sheet` 640, `measure` 66ch; a layer never stretches to
its container. Breakpoints are `--breakpoint-*`: `tablet` 768, `desktop` 1024, `wide` 1440, so
`tablet:` and `desktop:` are the only responsive variants.

Elevation is two levels spent on lifted layers only: `shadow-float` for a popover, a menu, a
picker, a toast; `shadow-modal` for a dialog, a sheet, a command palette. Groups, rows and cards
are flat. Each is a tight contact shadow plus a soft ambient one, tinted with the neutral hue in
light; in dark the lift is carried by the raised step and the hairline, so the shadow is pure
black at a higher opacity. Each mode has its own pair, and each utility reads `var(--shadow-*)`,
so a shadow follows the mode; the values are sRGB because React Native's `boxShadow` takes no
oklch.

Density is emitted as sets. `themeTokens` seeds the touch set on every platform;
`finePointerTokens` is the desktop set under `density: "desktop"`, which the web renders under
`(pointer: fine)`, and empty under `touch`; `densityTokens` is either set whatever the knob, which
the web renders under a `data-density` attribute on the root, so a screenshot pins a density.
Native is touch-only.

## Motion

One duration scale and one curve family. The durations are `instant` 100 (press feedback only),
`fast` 150, `base` 200, `slow` 300, the 150 to 300 band a micro-interaction lives in, emitted as
`--transition-duration-*`, the namespace Tailwind's `duration-*` reads, so `duration-fast` is a
rung. The loop is 800 ms, outside the scale and kept under reduced motion, because the spin is
the only sign a wait is live. The curves are emitted as `--ease-*`: `out` `cubic-bezier(0.16, 1,
0.3, 1)` for what enters or answers a touch, `in` `cubic-bezier(0.7, 0, 0.84, 0)` for what
leaves, `in-out` `cubic-bezier(0.65, 0, 0.35, 1)` for what moves between two places; none
overshoots. Only transform and opacity animate: a state switches its color, fill and boundary at
once, and motion is spent on what enters and leaves and on the switch thumb. A bare `transition`
takes `base` and `out` through the variables. `reducedMotionTokens` sets every rung to 0ms, which
the web renders under `prefers-reduced-motion: reduce`; the loop stays. Motion lives in the
matrices, never at a call site: no cell carries a duration that is not a rung. `deriveTheme` also
returns the scale as numbers (`motion.durations` and `motion.loop` in milliseconds,
`motion.easings` as the four control values), for a platform that times an animation outside CSS.

## Contrast contracts

At the default knobs, in both modes, each text pair clears 4.5:1: `ink-body` on `canvas`,
`surface`, `group`, `raised`, `accent-soft`, `ok-soft`, `warn-soft` and `danger-soft`; `ink-meta`
and `accent-ink` on the four grounds and on `accent-soft`; `ok`, `warn` and `danger` on the four
grounds and each on its own soft; `on-accent` on `accent`, `act-accent-hover` and
`act-accent-press`; `on-danger` on `danger`; `on-act-ink` on `act-ink`, `act-ink-hover` and
`act-ink-press`; every `chip-red-ink` on its `chip-red-soft`; every `avatar-1-ink` on its
`avatar-1`. Each graphic pair clears 3:1: `edge-strong` on `surface` and `group`, `accent` on
`surface` and `canvas`, every chip mark on `surface`. `ink-faint` on `surface` is the one
exemption, held at about 3:1 so it reads as off. The verify script measures every pair, and
sweeps `accentHue` over all 360 values: at each hue every accent-bound role stays inside sRGB and
the accent-derived pairs keep their floor (`on-accent` on `accent`, `on-act-accent` on the hover
and press fills, `accent-ink` on the four grounds and `accent-soft`, `ink-body` and `ink-meta` on
`accent-soft`, `accent` on `surface` and `canvas` at 3:1).

## What the reset does not catch

Eleven namespaces reset to `initial`: `--color-*`, `--radius-*`, `--text-*`, `--leading-*`,
`--tracking-*`, `--shadow-*`, `--font-*`, `--container-*`, `--breakpoint-*`,
`--transition-duration-*`, `--ease-*`. The numeric
`--spacing` base stays live because dimension utilities derive from it, so no build check can tell
a role from a numeric; the matrices pin their cell strings verbatim instead. `--font-weight-*`
stays live because the roles name their weights. A bare `duration-150` stays live because
Tailwind turns a number into milliseconds without reading the theme. The ownership rule and the
closed props keep a numeric off a call site: a look the matrices do not cover is a matrix cell or
a consumer primitive under `ui/`, never a class on a call site.

## The canon

The canon binds every component either UI plugin ships:

1. One name per concept: `label` for the visible word, `loading` for a busy control, `onChange`
   for a value's change, `onAct` for an act, `act` for a labelled act or a button's kind, `blocked`
   for a disabled control's reason, `sentence` for a consumer's line.
2. A composed region is data: an act is an `Act`, a mark is a `Mark`, a place is a `PlaceSpec`;
   the owning molecule renders it. `children` is the one open slot, on the molecules the roster
   gives it to.
3. Molecules compose molecules; a product's `ui/` composes stack molecules and never a host.
4. No `class`, `className`, `classList` or `style` prop, on any component, in either plugin: each
   is declared `?: never`, and `CLOSED_PROPS` is the list both verify suites read. A look the
   matrices do not cover is a matrix cell or a consumer primitive under `ui/`, in that order.
5. Every word a component draws on its own comes from `words`; every sentence is a prop.

## The roster

`ROSTER` in `@fcalell/ui-core/roster` is the closed list: 54 components in four layers (atoms,
layout molecules, shared molecules, content molecules), each with its prop names, the matrix
families it draws (`draws`, each a `FAMILIES` name) and the states it has a form for (`states`, from
`STATES`: `rest`, `hover`, `focus`, `active`, `disabled`, `loading`, `error`, `selected`, `empty`),
the same in both plugins. Every family is drawn by at least one component, and a component that
takes `loading` or `empty` lists that state. A plugin's verify suite reads every component's exported props type against it, so a
prop added on one platform, a prop renamed, or a style channel reopened fails by name. The
directory of a component is its name in kebab case (`componentDir("ListRow")` is `list-row`).

## The sharing line

Matrices hold the platform-invariant cells only: fills, borders, ink, spacing roles, radius, type
role, font weight, font family, and a control's size. Display, alignment, and every interaction
state are platform overlays composed through `cn()` after the matrix (React Native is flex by
default and the web is not, so a shared `flex-row` would be wrong on one). No arbitrary value in a
cell, in either spelling. A control's horizontal padding is the `control-x` spacing role; its
minimum height is a size; a row and a surface inset on spacing roles. No behavior in ui-core,
ever.

## Composing with cn

`cn()` merges class inputs and resolves Tailwind conflicts, last wins. Its `tailwind-merge` config
registers six contract scales under `theme`: the type roles as font sizes and again as leading,
the tracked roles as tracking, the radius roles, the spacing roles plus the sizes, and the widths
as containers. Two members of one scale then collapse to the last, so `min-h-control` and
`min-h-field` collapse, and a type role beside a color leaves both standing.

A role owns three properties, so the config also declares `font-size` as conflicting with both
`leading-` and `tracking-`: a later role clears the earlier role's line height and letter spacing
together. **Compose the type role before any later size class, never after.** That conflict runs
one way, so `cn("leading-title", "text-body")` returns `text-body` alone.
