# @fcalell/ui-core

The design system both stack UI plugins render from: one closed token contract, the approved
foundations sheet as data behind four knobs, the words the molecules speak, the platform-invariant
variant matrices, the roster every component and its props are pinned to, and the laws that say
which token to pick. The contract subpaths export build-time data only, so each plugin renders its
own CSS from the same records and ui-core stays framework-free. Two subpaths are Node-only:
`./harness`, internal tooling for the packages' verify scripts, and `./manifest`, the guide pages
the UI plugins index.

Eleven subpaths:

- `@fcalell/ui-core/tokens`: the contract as data, the sheet's every value, the knob defaults and
  the English `words`.
- `@fcalell/ui-core/schema`: the zod `themeSchema` and `wordsSchema`, and the `Theme` input type.
- `@fcalell/ui-core/derive`: `deriveTheme(theme)` resolves the knobs into final values, one string
  per token, plus the motion scale as numbers.
- `@fcalell/ui-core/emit`: the records a plugin renders. `themeTokens` is the `@theme` block: the
  eleven reset namespaces, the touch density set, tracking, radii, widths, breakpoints, the two
  font stacks, the durations and curves, and the light colors. `rootTokens` is what sits on the
  root outside `@theme`: the hairline, the focus ring's width and offset, the layers' order
  (`--layer-<layer>`) and the light shadows.
  `modeTokens` is one mode's colors and its two shadows. `densityTokens` is one density's type
  scale, spacing roles and sizes. `nativeMeasureTokens` is native's two measures in px over `themeTokens`' `ch`. `reducedMotionTokens` is every duration at 0ms. `shadowUtilities` is the declaration of each `shadow-*` utility, reading its mode's variable.
  `raisedGroundTokens` is what a raised ground (`RAISED_GROUNDS`: `group`, `raised`) declares for
  everything inside it, the hairline read through `edge-raised`.
- `@fcalell/ui-core/cn`: `cn()`, the class merger, taught the contract's six scales.
- `@fcalell/ui-core/variants`: the platform-invariant variant matrices, each a cva built from a
  table, the single-cell constants beside them, and `FAMILIES`, every matrix by name with its axes,
  which `matrixCells` enumerates into cells; the prop types a component shares across plugins
  with them (`ContentTone`, a glyph's ink; `IconFit`, the `ICON` matrix's `meta`, `body` or
  `control`, what an icon sits beside, which picks `icon-meta`, `icon` or `icon-control`;
  `ButtonFit`, `IconButtonFit` and `LinkFit`, what an act sits in, read off each matrix's `fit`
  axis; `ActionBarFit`, where an action bar stands, `end` or `full`, off `ACTION_BAR`'s;
  `TextRole`, the `body` and `meta` roles `Text` draws).
- `@fcalell/ui-core/descriptors`: `IconName`, `Act`, `IconAct`, `Part`, `StatusMark`, `ChipMark`, `Option`, `OptionGroup`,
  `PlaceSpec`, `Switcher`, `Hunk`, `FieldBinding`, `Confirmation`, `MenuItem`, `TableColumn`, `TableRowSlots`,
  `CellEdit` and the other framework-free types a prop carries.
- `@fcalell/ui-core/commit`: `commitMoment()`, when a typing control's value is final: on
  leaving the field or Enter, only when it changed since focus, Escape restoring the value at
  focus, and ending the edit. Both plugins' `Input` and `TextArea` drive their `onCommit` with it.
- `@fcalell/ui-core/reason`: `pressStands(blocked, pressedUnder)`, whether a blocked act's press
  still shows its reason: a press is kept as the reason it came under and stands while the act
  is blocked by that reason, so unblocking or a new reason forgets it in render.
- `@fcalell/ui-core/format`: `formatterFor(kind, lang, options)`, the platform's `Intl` number,
  date and relative-time formatters, built once per kind, language and options; every formatter
  both plugins use comes from it.
- `@fcalell/ui-core/clock`: what a clock-read part draws, as functions of its times and now:
  `timeLeft`, a `PendingRun` with `pendingRun` and `pendingShare` (a `PendingBar`'s clock and
  fill), and `ageWords` (an ISO moment's age). Both plugins tick `now` from one shared clock.
- `@fcalell/ui-core/roster`: the component roster as data (`ROSTER`, `STATES`, `CLOSED_PROPS`): the
  layer, prop names, drawn cells, states and owned tokens of every component both plugins ship.
- `@fcalell/ui-core/harness`: internal. The shared core of the packages' `scripts/verify.ts`.
- `@fcalell/ui-core/manifest`: `uiCoreGuide`, the package's `guide/` pages with their load
  triggers, which react-ui and native-ui contribute to `cliSlots.guide`.

The package's `guide/` is how to design on it: the screen recipe, the design critique, the
rubric, the judging questions, the references, and one page per pattern under `patterns/`.

The contract has two modes, `light` and `dark`. `themeTokens` seeds the light colors and the touch
density set into the `@theme` block as well, because Tailwind v4 generates no utility from a
property declared only inside a variant block; which mode and density seed it never shows, since
every utility reads its variable and the active scope sets it.

## DESIGN.md

The package's `DESIGN.md`, shipped in its `files` so a consumer reads it under
`node_modules/@fcalell/ui-core/`, is the contract in the [DESIGN.md format](https://github.com/google-labs-code/design.md):
the default theme's tokens as front matter, each matrix cell and single cell as a component (dark
values and their components suffixed `-dark`), and the roster with the cells each component draws,
its states and the tokens it owns.
`src/design-md.ts` emits it and `pnpm --filter @fcalell/ui-core design-md` writes it. The package's
`test` fails when the committed file differs from the emitter's output or when `design.md lint`
reports an error, so it is never edited by hand.

## The knobs

A theme sets a knob and never a token. Four knobs; everything else is the sheet and moves only
with it.

| Knob | Default | Moves |
| --- | --- | --- |
| `accentHue` | 264 | the accent-bound roles: `accent`, `accent-soft`, `accent-ink`, `ring`, `selected-outline`, `act-accent` with `act-accent-hover`, `act-accent-press` and `act-accent-pending`, `toggle-on` and `toggle-on-hover`. The three status hues, the hued chip families and the avatars are fixed |
| `castHue` | `accentHue` | the hue every neutral carries: `canvas`, `surface`, `group`, `raised`, the three hairlines, `scrim`, the three inks, the washes, `skeleton`, `switch-off`, `fill-disabled`, `fill-neutral` with the neutral chip's soft and ink, dark `on-danger` and the light shadows. Each neutral keeps the chroma the sheet declares for it, so the cast tints the chrome and moves no contrast. It never reaches the accent, the status trio, the hued chip families or the avatars |
| `fonts` | `sans` "IBM Plex Sans", `mono` "IBM Plex Mono" | the two families as `--font-sans` and `--font-mono`, each followed by its metric fallback face (`fallbackFace(family)`, the family name plus ` Fallback`) and then its platform fallback stack. The files are each plugin's `fonts` option |
| `defaultMode` | unset | the mode a viewer with no stored choice starts in, ahead of the system preference; unset, the system decides |

`accentHue` and `castHue` are in `[0, 360)`; an unset `castHue` is the accent's hue, so an
accent alone tints the chrome toward it. Chroma is never a knob: it decides whether a cast is a
tint or a color. A re-hued accent holds its chroma inside sRGB at its lightness, so
it loses saturation at a hue the gamut cannot carry and never clips to another color, and a role
that carries a contrast contract (`accent-ink` on `group` and on `accent-soft` at 4.5:1, the
dark `accent` on `group` at 3:1, `act-accent-pending` at 3:1 under `on-act-accent`) moves its
lightness from where it starts, a declared literal or a `mix`, until the contract holds; the
sheet carries the held value at its own hue. The contrast pairs then hold at every hue of either
knob: the verify script sweeps the accent at the default cast, the cast at the default accent and
the two together, all 360 hues each.

Density is not a knob. The web draws the desktop set where the primary pointer is fine and the
viewport is at least `tablet` wide, and the touch set everywhere else, so a desktop window
narrower than `tablet` draws the touch set; a `data-density` attribute on the root pins either,
which is how the showcase addresses a density. Native is touch-only. A molecule whose
structure (not a token) follows density reads it through the web's `touch:` variant, which
applies exactly where the touch set draws (a `data-density="touch"` pin, or no `desktop` pin
where the pointer is not fine or the viewport is narrower than `tablet`); native has no variant,
since it always draws the touch set and so the touch structure.

## Words

Every word a molecule draws or reads aloud on its own comes from `words`, a typed object passed
once beside `theme`: the seven `Status` words, `recommended`, `copy`, `copied`, `download`, `back`, `close`, `cancel`, `dismiss`,
`more`, `send`, `stop`, `attach`, `search`, `loading`, `checking`, `retry`, `saving`, `saved`, `notSaved`, `add`, `remove`, `details`, `places`, `notifications`, `code`, `added`, `removed`, `sort`, `ascending`, `descending`, `time`, `message`, `seen`, `unseen`, `copyFailed`, `latest`, `missing`, the counted `earlierLines`, and the slot words `meterValue`, `meterOver`, `meterMark`, `linesAdded`, `linesRemoved` and `changed`. A counted word is `{ one, other }`, each form spelling `{count}` where the number stands, drawn through `counted(word, count)` (`one` at a count of one, `other` at any other). A slot word spells each of its named slots as `{name}` where the value stands (`meterValue` `{value}` and `{max}`, `meterOver` `{amount}`, `meterMark` `{name}` and `{value}`, `linesAdded` and `linesRemoved` `{count}`, `changed` `{before}` and `{after}`), drawn through `filled(word, values)`; the schema rejects a translation that drops a slot. `Words` requires every key and
`wordsSchema` is closed, so a translation that misses a word fails `tsc` and the schema, never the
interface. `ENGLISH` is the default. A sentence that belongs to the consumer is a prop on the
molecule that draws it (`placeholder`, `notice`, every `sentence`, every label), never a key.

## Color roles

One accent hue, cast greys, three status hues, six hued chip families and a neutral one, eight avatars. Every value is
OKLCH. The neutrals wear the cast's hue, the accent's unless set, so by default the greys and the
accent read as one palette.

- Surfaces step in CIE L*. Light: `surface` 100 (a card, a field, a row), `canvas` 96.9 (the
  page), `group` 93.8 (a filled tile, a chip ground), `raised` white again (a popover, a dialog, a
  sheet, a toast). Dark: `canvas` 3.6, `surface` 8.1, `group` and `raised` 13.1, so a
  lifted layer sits one step above the content.
- `edge`: the hairline over `canvas` and `surface`. `edge-raised`: the hairline inside a group and
  on a lifted layer; the container re-points `edge` to it, so a row inside a group draws `edge`
  and gets the raised value. The web scopes the re-point on the raised grounds' fill
  classes (`bg-group`, `bg-raised`), after its mode scopes; native scopes it on each raised surface's content (uniwind's `ScopedVariables`), resolving each read in the mode. In light the two are one hairline; the dark ladder spans more than
  one hairline can straddle, so there they differ. `edge-strong`: a control's boundary, at 3:1
  against `surface` and `group`.
- `scrim`: the veil behind a dialog or a sheet.
- Three inks. `ink-body`: the primary line of anything. `ink-meta`: a secondary line, a
  placeholder, a table header. `ink-faint`: disabled text only, at about 3:1, which WCAG exempts.
- The accent trio. `accent`: the filled act, a blue on the neutrals' hue; in dark it holds 3:1
  on `group`, where a checked box or an on switch is a control's boundary. `on-accent`: text on
  `accent`, white in both modes. `accent-soft`: a tinted tile. `accent-ink`: a link, the focus
  ring, a selection outline; the accent itself in light, lighter in dark so it reads on the
  near-black ground.
- The status trio, each with a `-soft` ground: `ok` the `done` mark and an added line's ink,
  `ok-soft` the ground under it; `warn` the `attention` mark, `warn-soft` its ground; `danger` the
  `failed` mark, a destructive act's label (in light held at 4.5:1 under `wash-press` on
  `group`), an error ring, `danger-soft` its ground and a removed
  line. `on-danger`: text on a `danger` fill, the one saturated state fill, which `danger`
  holds at 4.5:1 in both modes. The dark tones are
  capped at L 0.75 and spread in lightness so they separate under protanopia and deuteranopia.
- Six chip families in hue order, the accent's band left out so no family wears it: `red`,
  `amber`, `green`, `teal`, `violet`, `pink`. Each is three roles: `chip-red` the mark (a dot, a
  chart series), `chip-red-soft` the soft ground, `chip-red-ink` the ink on the soft; the other
  five follow. A `Chip` draws its family's soft under the family's ink, so the family is
  learnable across screens and never mistaken for a status. The marks alternate in lightness
  between neighbours so the set separates by lightness as well as hue.
- The seventh chip family, `neutral`, has no hue and no mark: `chip-neutral-soft` is `fill-neutral`
  and `chip-neutral-ink` is `ink-body`, the applied filter and any tag without a category.
- A chart's series take the chip marks in `CHART_SERIES` order: `teal`, `violet`, `amber`,
  `pink`, `green`, `red`; one series takes the first. A meter at or above `METER_NEAR` (0.9) of its
  max is near, and above its max is over.
- Eight avatars at 40 to 50° spacing: `avatar-1` the fill and `avatar-1-ink` the initial on it,
  through `avatar-8` and `avatar-8-ink`; a pastel fill under a hue-darkened initial in light, a
  deep fill under a hue-lightened initial in dark, one step per name by a hash.
- The washes are `ink-body` at an alpha, so they follow the mode and sit on any surface as one
  more step: `wash-hover` a transparent part under the pointer, `wash-press` pressed,
  `wash-selected` a selected row or chip, `wash-selected-hover` a selected row under the pointer,
  `skeleton` a loading bar, `fill-disabled` a disabled act's or chip's box, `fill-neutral` a
  resting neutral ground (a count's pill, a grey chip).
- The places, each an alias of the tone that draws it: `ring` the focus ring and
  `selected-outline` a selected tile's outline, both `accent-ink`; `edge-hover` a field's boundary
  under the pointer, `edge-strong`; `edge-error` a field's boundary in error and `ink-error` an
  error message, both `danger`; `ink-disabled` a disabled part's label, `ink-faint`.
- Two act fills. `act-accent` is `accent` under `on-act-accent`, the primary act; `act-danger`
  is `danger` under `on-act-danger` (`on-danger`), a confirm's destructive primary (rows and
  menus keep the hairline destructive act). Hover and press move the fill away from the label, 12 %
  and 22 % in OKLab toward a second color a `mix` may name per mode, so the label only gains
  contrast: `act-accent-hover` and `-press` toward black in both modes (a white label), and
  `act-danger-hover` and `-press` toward black in light (a white label) and toward `ink-body` in
  dark (a near-black label).
  Pending is inert and recedes 30 %: a filled act's `-pending` toward its label in light and
  toward `canvas` in dark, held at 3:1 under its label where the spinner draws. A labelled act's
  fill takes no 3:1 floor on its ground in any state: its label names it.
- The toggles. `toggle-on` is `accent`, the on fill of a switch's track, a checked box and a
  slider's fill; it has no label to carry it, so it and `toggle-on-hover` hold 3:1 on
  `canvas`, `surface` and `group` and under `switch-thumb`. `toggle-on-hover` mixes it 12 %
  away from the ground: toward black in light, toward `on-accent` in dark. `switch-off` is
  `edge-strong` and `switch-off-hover` mixes it 15 % toward `ink-body`; `switch-thumb` is
  `on-accent`. A switch has no label of its own, so it disables by opacity.

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
items are `body`. Weight, ink, family and, on `display`, tabular figures ride with the role; a molecule may set a role's weight in
its own cell, never a consumer.

The body size is the one base, per density: 13 on desktop, 16 on touch, the input size below
which iOS Safari zooms on focus. Each size rounds to the whole pixel and each line box to the even
pixel, a tie rounding up.

| Role | Desktop, size / line | Touch, size / line | Weight | Ink | Used for |
| --- | --- | --- | --- | --- | --- |
| `display` | 36 / 40 | 44 / 48 | 500 | `ink-body` | a display number, one per screen, in tabular figures |
| `title` | 18 / 24 | 22 / 28 | 600 | `ink-body` | the page's name, once per screen |
| `heading` | 15 / 20 | 18 / 24 | 600 | `ink-body` | a section's or a card's name, never inside a row |
| `body` | 13 / 20 | 16 / 24 | 400 | `ink-body` | the primary line of anything: prose, a row, a field, a menu item |
| `meta` | 12 / 18 | 15 / 22 | 400 | `ink-meta` | a secondary line, a description, a table header at 500 |
| `caption` | 11 / 16 | 14 / 22 | 400 | `ink-meta` | text inside a small component, never a sentence |
| `code` | 12 / 18 | 15 / 22 | 400, mono family | `ink-body` | what a machine reads |

`strong` is 500; `display`, `title` and `heading` already sit at or above it. Tracking is in em
and density-invariant: `display` -0.02, `title` -0.01, `heading` -0.005, `caption` 0.01; the rest
carry none.

## Space, sizes, radii, elevation

One base, 4 px; every spacing role is a multiple of it, picked per density, so a density moves
the roles up and down one ladder. Twelve roles by use, desktop then touch: `inside` 6 / 8 (within
a control: icon to label, dot to text), `control-x` 12 / 16 (a control's inline padding), `pair`
6 / 8 (between paired elements: label over input, title over description), `acts` 8 / 8
(between the acts of a bar: a page header, a toolbar, an action bar), `rows` 2 / 4 (between
rows in a menu or a nav list; rows in a hairline list abut), `card` 16 / 16 (a card's
inset), `tile` 12 / 16 (a compact card's inset: a board card), `float` 4 / 4 (a floating surface's inset: a select's list, a menu, a picker popover), `fields` 16 / 24 (between fields), `sections` 32 / 40 (between sections of a
page), `page` 24 / 16 (the page inset). A list bleeds by `control-x`, so its rows' leading meets the title over it. Touch is the same roles one rung looser except the
float inset and the acts gap, which hold, and the page inset, which a phone narrows. Six are gap roles, what a container may put between its children:
`inside`, `pair`, `acts`, `rows`, `fields`, `sections`; the other five (`control-x`, `card`, `tile`,
`float`, `page`) are insets.

Thirty sizes per density sit in the same `--spacing-*` namespace, so a cell names them as it
names a role (`min-h-control`, `size-avatar`), and nothing is spaced by them. Desktop then touch:
`control` 32 / 44 (a button, a segmented control), `control-compact` 28 / 44 (a menu item, a
toolbar control), `field` 38 / 48 (a form input), `row` 32 / 48 (a one-line row), `row-2` 48 / 64
(a two-line row), `row-setting` 64 / 72 (a setting row), `strip` 40 / 44 (a page header bar: a Place's or Screen's title and acts), `target` 24 / 44 (the least hit area of any interactive part), `dot` 6 / 8, `chip` 20 /
24, `avatar` 24 / 32, `spinner` 14 / 18 (the `icon` rung), `switch-w` 28 / 40, `switch-h` 16 / 24, `thumb` 12 / 20,
`switch-inset` 2 / 2, `switch-travel` 12 / 16 (the thumb's travel, derived: `switch-w` less
`thumb` and both insets), `skeleton` 12 / 12, `icon-meta` 12 / 14 (an icon beside meta or
caption text), `icon` 14 / 18 (beside body text), `icon-control` 16 / 20 (inside a control),
`check` 16 / 20 (a checkbox's box), `track` 2 / 4 (a slider's track thickness), `otp` 44 / 48 (a
one-time-code box, square), `text-area` 60 / 72 (a text area's least value height, derived: three body line boxes), `meter` 6 / 8 (a meter's bar), `chart` 128 / 192 (a chart's plot, its gridlines four bands), `qr` 160 / 240 (a QR code's square, its quiet zone inside it), `figures` 29 / 36 (four tabular figures at the code size: a diff's number columns, a file row's count lanes; derived at `MONO_ADVANCE`, Plex Mono's 0.6 em, rounded up, since native has no `ch`), `message-input` 160 / 192 (a message input's tallest text, derived: eight body line boxes, the text scrolling past it). On touch every target is at least 44. A cell says `min-h`, never `h`: a label
must be able to grow its control under OS font scaling. A minimum height is the floor of something pressed (a control, a field, a target, a chip, a row), the set height of a bar (`strip`, a page's strip and its touch top bar), an intrinsic size, or the height of what a part swaps with (`PENDING_TRACK` an action bar's); any other container takes its height from its content and padding, its parts centred on its tallest, never from another component's size.

Seven radius roles, density-invariant, a radius naming the role and never the size: `chip` 4
(an outlined chip, a skeleton bar, a checkbox), `control` 6 (a button, a field, a segmented
control), `row` 6 (a menu item, a highlighted row), `card` 8 (a card, a toast), `popover` 8,
`sheet` 8 (a sheet's leading corners, a centred sheet), `full` (a dot, an avatar, the pill chip or
status, a switch). One hairline of 1 px draws region edges, row splits and field boundaries, as
`--hairline`. The focus ring is `ring`, 2 px at a 2 px offset outside the box, so it never covers
the control's own edge; inside a list it is drawn inward.

Widths are a short label's measure (a chip's label, a status word, a skeleton label's lane), the lifted layers' ranges, the one measure for running
text and the fixed regions of a frame, as `--container-*`: `measure-short` 18ch, `popover` 240, `toast` 360, `dialog` 520, `sheet` 640, `measure` 58ch (native has no `ch`, so `nativeMeasureTokens` declares the two measures in px at `SANS_ADVANCE`, Plex Sans's 0.6 em "0", of the touch body size, rounded up: 173 and 557; there a short label's cap is the body's 18 characters whatever its own size, and a consumer face with a wider "0" overflows them); a layer never stretches to
its container. The regions: `sidebar` 240 (the Shell's places), `list` 360 and `pane` 320 (a
split's list column and record pane), `column` 300 (a board column), `auth` 400 (the sign-in
column), `empty` 320 (an empty state's column). A width never takes a spacing role's or a size's name, since `w-*` reads `--spacing-*`
first. A skeleton bar alone may take a fraction width (`w-1/12`, `w-1/5`, `w-1/4`, `w-1/3`,
`w-1/2`, `w-2/3`, `w-3/4`) to stand at the length of the text it replaces: structural, never a token; a chart column's share of its slot (`w-2/3`) is structural the same way. Breakpoints are `--breakpoint-*`: `tablet` 768, `desktop` 1024, `wide` 1440, so
`tablet:` and `desktop:` are the only responsive variants.

Elevation is two levels spent on lifted layers only: `shadow-float` for a popover, a menu, a
picker, a toast; `shadow-modal` for a dialog, a sheet, a command palette. Groups, rows and cards
are flat. Each is a tight contact shadow plus a soft ambient one, tinted with the cast in
light; in dark the lift is carried by the raised step and the hairline, so the shadow is pure
black at a higher opacity. Each mode has its own pair, and each utility reads `var(--shadow-*)`,
so a shadow follows the mode; the values are sRGB because React Native's `boxShadow` takes no
oklch.

The layers over the page stand in the order of `STACK_ORDER`, each one step above the one
before: `sheet` 1 (the scrim and the sheet), `popover` 2 (a popover over the sheet it opens
from), `toasts` 3, over the page's 0, so a toast raised while a sheet or a confirm is open is seen and its dismiss pressed. Each is
`--layer-<layer>` on the root, read on the web as `z-(--layer-<layer>)`, since Tailwind's `z-*`
reads no theme namespace. A stacking order inside one component (a frozen table column) is its
own structural class inside `isolate`, never a layer.

Density is emitted as sets. `themeTokens` seeds the touch set on every platform;
`densityTokens` is either set, which the web renders as the desktop set under a fine pointer at
`tablet` width and wider, and as either set under a `data-density` attribute on the root, so a screenshot pins a density;
the web's `touch:` variant is emitted over the same condition. Native is touch-only.

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
`act-accent-press`; `danger` on `canvas`, `surface` and `group` under `wash-hover` and `wash-press`,
a destructive act's label under the act's own wash; `on-danger` on `danger`; `on-act-danger` on
`act-danger`, `act-danger-hover` and `act-danger-press`; every `chip-red-ink` on its `chip-red-soft`; every `avatar-1-ink` on its
`avatar-1`. Each graphic pair clears 3:1: `edge-strong` on `surface` and `group`, and on `surface` under
`wash-press` and `wash-selected` (a held boundary, so a checkbox reads on a pressed or selected row), `accent` on
`canvas`, `surface` and `group`, `on-act-accent` on `act-accent-pending`, `on-act-danger` on
`act-danger-pending`, `toggle-on` and `toggle-on-hover` on `canvas`, `surface` and `group`,
`switch-thumb` on both, every chip mark on `surface`. No act fill is measured against its
ground: a labelled act is named by its label, and a pending one is inert. A hold sits on a literal or a `mix`, per mode, and may name a veil over its ground
(`under`), composited as a browser draws a translucent fill over an opaque one, an alpha blend in
gamma sRGB. `ink-faint` on `surface` is the one
exemption, held at about 3:1 so it reads as off. The verify script measures every pair and every
hold, and sweeps the hues: `accentHue` over all 360 values at the default cast, `castHue` over all
360 at the default accent, and the two together. At each hue every value stays inside sRGB and
every pair and hold above keeps its floor. A warm cast (70) keeps the dark canvas inside
`#000`–`#191a1f`, and a cast at the accent's complement keeps every accent hold.

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
   for a disabled control's reason, `sentence` for a consumer's line, `fit` for what a component
   sits in. `fit` is a closed enum off its matrix's `fit` axis, defaulting to the matrix's default:
   an `Icon` sits beside meta, body or a control; a `Button` in a body, a bar or under a field; an
   `IconButton` in a body or a bar; a `Link` inline or standalone; an `ActionBar` at its
   container's end or across it (`full`, its acts at the field's height). The composing molecule
   sets it (a `Place` passes `bar` to its strip's acts, a field's trailing act `field`, a `Form`
   under an auth column `full`), and a call site may.
6. `Text` draws `body` and `meta`, with `strong`; every other type role is drawn by the molecule
   that owns its place (`title` by `Page` and `Screen`, `heading` by `Section` and `Card`,
   `caption` by `Chip` and `Kbd`, `code` by `Code`, `display` by `Stat`). `TEXT` keeps all seven
   roles as the table those owners draw from.
2. A composed region is data: an act is an `Act`, a row's marks a `StatusMark` and a `ChipMark`, a place is a `PlaceSpec`, what the
   shell switches between is a `Switcher` (a pick: options carrying their avatars, the current
   value, and `act`, the act that makes a new one), never a node;
   the owning molecule renders it. An `Act` says what it does, never how it looks: `destructive`
   marks one that removes or ends something, and an `ActionBar` draws it as `danger` when it is
   the bar's one filled act and as `destructive`, the hairline form, otherwise. An `Act` names
   no glyph (a `Place`'s act is the page's create act and the `Place` draws it with `Plus`);
   an `IconAct` is an icon-only act whose label is read aloud, never drawn. A `Form` has no
   submit handler: its `ActionBar`'s filled act submits it (on the web Enter in a field runs
   it), that act's `onAct` is the one handler, and while the promise it returns pends the act
   is pending, the bar's other acts ignore the press and the form is busy. A `confirm()` is
   the same shape: its `Confirmation`'s act runs the work, pending while its promise pends
   (the sheet's other acts inert), the sheet closing when it resolves and staying open to retry
   when it rejects; `confirm()` returns nothing, and dismissing the sheet runs nothing. An icon is an `IconName`, a Lucide glyph by its PascalCase
   name (`Check`, `ChevronDown`), typed off the `lucide` package: the set is fixed, not
   configured, and each plugin draws the name from its platform's Lucide package. `children` is the one open slot, on the molecules the roster
   gives it to.
3. Molecules compose molecules; a product's `ui/` composes stack molecules and never a host.
4. No `class`, `className`, `classList` or `style` prop, on any component, in either plugin: each
   is declared `?: never`, and `CLOSED_PROPS` is the list both verify suites read. A look the
   matrices do not cover is a matrix cell or a consumer primitive under `ui/`, in that order.
5. Every word a component draws on its own comes from `words`; every sentence is a prop.

## The roster

`ROSTER` in `@fcalell/ui-core/roster` is the closed list: 55 components in four layers (atoms,
layout molecules, shared molecules, content molecules), each with its prop names, the cells it
draws (`draws`: a `FAMILIES` name for every cell of that family, `FAMILY.axis.value` for one of
its cells, as `Text` draws `TEXT.role.body`, or a single-cell constant of `./variants`) and the states it
has a form for (`states`, from `STATES`: `rest`, `hover`, `focus`, `active`, `disabled`,
`loading`, `error`, `selected`, `empty`), the same in both plugins. Every family is drawn by at
least one component, and a component that takes `loading` or `empty` lists that state.

A component also declares what it owns (`owns`): the type roles, the
colours, the radii, the spacing roles, the sizes and widths, and the shadow levels it may draw. A
colour is a name or a family prefix ending in `-` (`chip-` covers every chip role); the other
namespaces name their tokens, and a namespace left out owns nothing. The verify suite reads every
class of every cell the component draws (a family at every axis product, a named family cell as
the table's base and that cell alone), and a class spelling a token its
entry does not own fails by name. A molecule that picks a composed atom's `fit` or `act` draws
those atom cells too (a `Place` draws `BUTTON.fit.bar`), so it owns what they spell, so a type role, a colour or a size reaches a cell only through
the component that owns it. It also declares what it holds (`holds`): the families and constants of its own box,
which only it spells, so every other component draws them by composing it; a cell no entry holds (a type
role, the field box, the row and its title and meta lines, the line box, the popover, the scrim, the
skeleton) is shared, spelled by each component that draws it. A plugin's verify suite reads every component's exported props type against it, so a
prop added on one platform, a prop renamed, or a style channel reopened fails by name. The
directory of a component is its name in kebab case (`componentDir("ListRow")` is `list-row`).

## The sharing line

Matrices hold the platform-invariant cells only: fills, borders (and a container's `divide-`
hairline between its children), ink, spacing roles, radius, type role, font weight, font family,
sizes and widths. Display, alignment, flex sizing, truncation, positioning, overflow, a negative
margin that bleeds a region, a fraction width and every interaction state are platform overlays composed through `cn()` after the matrix (React Native is flex by
default and the web is not, so a shared `flex-row` would be wrong on one). What a component is
given (an act, a family, a checked value, an error) is an axis; where the pointer or the focus is
on it is an overlay. A label's cell carries its ink, since React Native text inherits no colour;
an act's fill carries it too, for the web glyph and spinner drawn in the current colour. No
arbitrary value in a cell, in either spelling. A control's horizontal padding is the `control-x` spacing role; its
minimum height is a size; a row and a surface inset on spacing roles. No framework code in
ui-core: logic both platforms run, free of React and React Native (a derivation, a collection's
state decisions in `list-state`), lives here once instead of as a twin in each plugin.

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
