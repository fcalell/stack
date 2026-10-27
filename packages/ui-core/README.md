# @fcalell/ui-core

The design system both stack UI plugins render from: one closed token contract, the approved
foundations sheet as data behind five knobs, the words the molecules speak, the platform-invariant
variant matrices, the roster every component and its props are pinned to, and the laws that say
which token to pick. The contract subpaths export build-time data only, so each plugin renders its
own CSS from the same records and ui-core stays framework-free. One subpath is Node-only:
`./manifest`, the guide pages the UI plugins index.

## Install

```bash
stack add react-ui   # or: stack add native-ui
```

Either plugin depends on `@fcalell/ui-core`; to import its subpaths directly, `pnpm add @fcalell/ui-core`.

The subpaths:

- `@fcalell/ui-core/tokens`: the contract as data, the sheet's every value, the knob defaults and
  the English `words`.
- `@fcalell/ui-core/schema`: the zod `themeSchema` and `wordsSchema`, and the `Theme` input type.
- `@fcalell/ui-core/derive`: `deriveTheme(theme)` resolves the knobs into final values, one string
  per token, plus the motion scale as numbers.
- `@fcalell/ui-core/emit`: the records a plugin renders. `themeTokens` is the `@theme` block: the
  eleven reset namespaces, the touch density set, tracking, radii, widths, breakpoints, the two font
  stacks, the durations and curves, and the light colors. `rootTokens` is what sits on the root
  outside `@theme`: the hairline, the focus ring's width and offset, the layers' order
  (`--layer-<layer>`) and the light shadows. `modeTokens` is one mode's colors and its two shadows.
  `densityTokens` is one density's type scale, spacing roles and sizes (the room's in canvas units);
  `roomTokens` and `roomScope` are the room set scaled. `nativeMeasureTokens` is native's short
  measure in px over `themeTokens`' `ch`. `reducedMotionTokens` is every duration at 0ms.
  `shadowUtilities` is the declaration of each `shadow-*` utility, reading its mode's variable.
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
- `@fcalell/ui-core/descriptors`: `IconName`, `Act`, `LinkAct`, `IconAct`, `Run`, `Runs`, `StatusMark`, `ChipMark`,
  `Option`, `OptionGroup`, `OptionPick`, `MultiPick`, `Row` (`RowItem`, `FileItem`), `Band`, `PlaceSpec`, `Hunk`, `FieldBinding`, `Confirmation`, `Decision`,
  `RowEntry`, `Lock`, `Answered`, `TableColumn`, `TableRowSlots`, `Stage`,
  `StageEnd` and the other framework-free types a prop carries.
- `@fcalell/ui-core/rules`: what the Rules editor and the Picker decide before they draw, free of
  any framework: `termSet`, `pairSet`, `termLabel`, `isTyped` and `marked` (with `PICKED_GLYPH`).
- `@fcalell/ui-core/streaming`: `closeOpenRuns`, a still-arriving reply's Markdown with the runs open at its end closed, free of any framework.
- `@fcalell/ui-core/read`: `readState`, a read's phase (idle, waiting, ready, failed, missing) and flags
  (busy, stale, more, streaming, paused) from the few fields of a query's result it names, free of any
  framework and of TanStack.
- `@fcalell/ui-core/paint`: what a part draws while its data is not here, free of any framework:
  `paintText` (deterministic filler of a role's length), `painting` (a slot over a painted item, a
  throw painting the slot), `WAIT_DELAY` and `PAINT_ROWS`, and `timings` (the live `waitDelay`,
  `actDelay` and `waitMin` a bench tunes, with `holdFor`, the minimum hold on a first load).
- `@fcalell/ui-core/arrive`: `arrivals`, the keys a collection did not hold when it first drew,
  which fade in on their own (`BLOCK_IN`, `blockIn`).
- `@fcalell/ui-core/list-state`: what a collection decides before it draws, free of any framework:
  a table's records,
  sort and tick logic (`tableRecords`, `sorted`, `tickable`), a tree's visible rows (`treeRows`),
  the states a meter, a step count and a rail draw (`levelOf`, `stepStateOf`, `stagesShown`) and
  the set a toggled value leaves (`toggled`), and a title's cut (`valueCut`, its stem and
  the last four characters it keeps).
- `@fcalell/ui-core/file`: `accepts(file, accept)`, whether a picked file matches a control's
  `accept` list, and `pickerTypes(accept)`, the MIME types a platform's picker filters by.
- `@fcalell/ui-core/commit`: `commitMoment()`, when a typing control's value is final: on
  leaving the field or Enter, only when it changed since focus, Escape restoring the value at
  focus, and ending the edit. Both plugins' `Input` drive their `onCommit` with it.
- `@fcalell/ui-core/reason`: `pressStands(blocked, pressedUnder)`, whether a blocked act's press
  still shows its reason: a press is kept as the reason it came under and stands while the act
  is blocked by that reason, so unblocking or a new reason forgets it in render.
- `@fcalell/ui-core/leave`: `createLeave()`, whether leaving a form asks: a field's input edits it, the
  filled act's press clears the edit while the act runs (a rejection puts it back), and a leave
  attempt asks once while the form stands edited. Both plugins' forms drive it.
- `@fcalell/ui-core/form`: what a `Form` is made of on both platforms: the `FieldSpec`, `FormFields`,
  `FormGroupOf` and `Can` types, and the derivation of a field from a procedure's input JSON Schema
  (`derive`: its control, whether it is required, its values; `toHeld`, `isEmpty` and `toInput`:
  what the control shows, whether it is empty and the value the input takes; `readPicked`: a picked
  file as the text or base64 a `file` field sends). No React.
- `@fcalell/ui-core/route`: where an address stands among a shell's places, by plain string
  parsing (React Native's `URL` is partial): `isCurrent(route, at)`, whether a row's route is
  current (a route is current below it, the root `/` only at itself, a query narrows it to the
  addresses carrying each parameter, a hash to the address carrying it), and `placeAt(places, at)`,
  the route of the place that owns the address: of the places that hold it, the longest pathname,
  then the most query parameters, the root `/` holding every address so it owns what no other
  place claims. Both Shells select by `placeAt`; the rows use `isCurrent`.
- `@fcalell/ui-core/format`: `formatterFor(kind, lang, options)`, the platform's `Intl` number,
  date and relative-time formatters, built once per kind, language and options; every formatter
  both plugins use comes from it.
- `@fcalell/ui-core/chart`: what a `BarChart` decides before it draws: `chartScale(peaks, figures)`,
  its axis step, band count and top over a floor of zero (four even bands, or a step of 1 over the
  peak rounded up for a small whole-number chart), `levelScale(figures)`, a level's axis around its
  readings (four bands, the floor a step under the lowest and the top over the highest), and
  `chartShare(value, scale)` where a value stands on it, `timeRoom(index, count)`, the room in slots
  a time between the ends stands in (it draws where that holds `TIME_ROOM` times the longest time),
  `chartHead(series, keys, level)`, the figures its head draws (the sum, or with `level` the bars'
  span, lowest to highest), `spanText` and `spanUnit`, a head figure's text and the unit's word
  after it, `levelUnit(unit)`, whether a unit never sums (`%`, `°C`) so its chart is a level, and
  `unitOf(unit, count)`, a unit's word at the figure it follows (a word, or `{ one, other }`).
- `@fcalell/ui-core/clock`: what a clock-read part draws, as functions of its times and now:
  `timeLeft`, a `PendingRun` with `pendingRun` and `pendingShare` (a `Banner` with `until`'s clock
  and fill), and an ISO moment's age: `ageOf` (its value and unit), `ageWords` (long) and `ageShort`
  (a row's "2 min"). Both plugins tick `now` from one shared clock.
- `@fcalell/ui-core/roster`: the component roster as data (`ROSTER`, `STATES`,
  `PLATFORMS`, `rosterEntries(platform?)`): the layer, prop names, drawn cells, moves, states and
  platforms of every component the plugins ship.
- `@fcalell/ui-core/canvas`: what a `Canvas` and its consumers decide from a graph, free of any
  framework: `pathOrder(nodes, edges)`, every node id once, depth first from the roots with a node
  of several predecessors placed after its last and a cycle cut at its back edge; `backEdges(order,
  edges)`, the ids of the edges whose target is at or before its source; and `HANDOFF_GLYPH`.
- `@fcalell/ui-core/manifest`: `uiCoreGuide`, the package's `guide/` pages with their load
  triggers, which react-ui and native-ui contribute to `cliSlots.guide`.

The package's `guide/` is how to design on it: the screen recipe (`screen.md`), the voice (`voice.md`:
the anchor, its pinned screens, the decisions and the floors), the structure rules for building a
component (`structure.md`) and the critique a review of a screen runs (`critique.md`).

The contract has two modes, `light` and `dark`. `themeTokens` seeds the light colors and the touch
density set into the `@theme` block as well, because Tailwind v4 generates no utility from a
property declared only inside a variant block; which mode and density seed it never shows, since
every utility reads its variable and the active scope sets it.

## DESIGN.md

The package's `DESIGN.md`, shipped in its `files` so a consumer reads it under
`node_modules/@fcalell/ui-core/`, is the contract in the [DESIGN.md
format](https://github.com/google-labs-code/design.md): the default theme's tokens as front matter,
each matrix cell and single cell as a component (dark values and their components suffixed `-dark`),
and the roster with the cells each component draws, its states and the tokens it owns.
`src/design-md.ts` emits it and `pnpm --filter @fcalell/ui-core design-md` writes it, then fails
when `design.md lint` reports an error. The committed file is the emitter's output, never edited by hand.

## The knobs

A theme sets a knob and never a token. Five knobs; everything else is the sheet and moves only
with it.

| Knob | Default | Moves |
| --- | --- | --- |
| `hue.accent` | 264 | the accent-bound roles: `accent`, `accent-soft`, `accent-ink`, `accent-edge`, `ring`, `selected-outline`, `act-accent` with `act-accent-hover`, `act-accent-press` and `act-accent-pending`, `toggle-on` and `toggle-on-hover`. The three status hues, the hued chip families and the avatars are fixed |
| `hue.cast` | `hue.accent` | the hue every neutral carries: `canvas`, `surface`, `group`, `band`, `raised`, the three hairlines, `scrim`, the three inks, the washes, `skeleton`, `switch-off`, `fill-disabled`, `fill-neutral` with the neutral chip's soft and ink and the light shadows. Each neutral keeps the chroma the sheet declares for it, so the cast tints the chrome and moves no contrast. It never reaches the accent, the status trio, the hued chip families or the avatars |
| `radius` | 3 | the control's corner radius in px, 0 to 12; a chip and a row take it, and a card, a popover and a sheet take a third more, rounded up (3 → 4, 6 → 8, 9 → 12), so a layer stays rounder than what stands on it. `full` stays round |
| `fonts` | `sans` "IBM Plex Sans", `mono` "IBM Plex Mono" | the two families as `--font-sans` and `--font-mono`, each followed by its metric fallback face (`fallbackFace(family)`, the family name plus ` Fallback`) and then its platform fallback stack. The files are each plugin's `fonts` option |
| `defaultMode` | unset | the mode a viewer with no stored choice starts in, ahead of the system preference; unset, the system decides |

`hue.accent` and `hue.cast` are in `[0, 360)`; an unset cast is the accent's hue, so an
accent alone tints the chrome toward it. Chroma is never a knob: it decides whether a cast is a
tint or a color. A re-hued accent holds its chroma inside sRGB at its lightness, so
it loses saturation at a hue the gamut cannot carry and never clips to another color, and a role
that carries a contrast contract (`accent-ink` on `group` and on `accent-soft` at 4.5:1, the
dark `accent` on `group` at 3:1, `act-accent-pending` at 3:1 under `on-act-accent`) moves its
lightness from where it starts, a declared literal or a `mix`, until the contract holds; the
sheet carries the held value at its own hue. The contrast pairs then hold at every hue of either
knob, whatever the accent and the cast.

Density is not a knob. The web draws the desktop set where the primary pointer is fine and the
viewport is at least `tablet` wide, and the touch set everywhere else, so a desktop window narrower
than `tablet` draws the touch set; a `data-density` attribute on the root pins any set, which is how
the showcase addresses a density. Native is touch-only outside a room place. The `room` set is the
one a screen declares (the place's `distance`), since no query detects how far a screen is read from:
the touch set drawn on a 960 × 540 canvas and multiplied by the room unit `u = max(1px, min(100vw /
960, 100dvh / 540))` (native: from the window's size), so at 1920 × 1080 `u` is 2 and the body is
32, the title 44, a control 88 and a row 96. In the room only, `display` is 5 times the body and
`page` is 48 canvas units all round; the radii, the fixed widths, the hairline and the ring scale by
`u` too, and a room page holds one column and never splits, because breakpoints stay px. A molecule
whose structure (not a token) follows density reads it through the web's `touch:` variant, which
applies exactly where the touch set draws (a `data-density="touch"` pin, or no `desktop` pin where
the pointer is not fine or the viewport is narrower than `tablet`); native has no variant, since it
always draws the touch set and so the touch structure.

## Words

Every word a molecule draws on its own comes from `words`, a typed object passed once beside
`theme`; the keys are `WORD_KEYS`, `COUNTED_WORD_KEYS` and `SLOT_WORD_KEYS` in `./tokens`. A
counted word is `{ one, other }`, each form spelling `{count}` where the number stands, drawn
through `counted(word, count)` (`one` at a count of one, `other` at any other). A slot word spells
each of its named slots as `{name}` where the value stands, drawn through `filled(word, values)`;
a tab bar's count past `TAB_COUNT_MAX` reads as `countOver` through `tabCount(words, count)`; the
schema rejects a translation that drops a slot. `Words` requires every key and `wordsSchema` is
closed, so a translation that misses a word fails `tsc` and the schema, never the interface.
`ENGLISH` is the default. A sentence that belongs to the consumer is a prop on the molecule that
draws it (`placeholder`, `notice`, every `sentence`, every label), never a key.

## The sheet

Every token's roles and values (colors, type, space, sizes, radii, widths, elevation, motion) and
the contrast each pair holds are `DESIGN.md`'s, emitted from `tokens.ts`; the reasons behind the
shape of the sheet are in `docs/architecture/ui-core.md`. Neither is repeated here.

## What the reset does not catch

Eleven namespaces reset to `initial`: `--color-*`, `--radius-*`, `--text-*`, `--leading-*`,
`--tracking-*`, `--shadow-*`, `--font-*`, `--container-*`, `--breakpoint-*`,
`--transition-duration-*`, `--ease-*`. The numeric `--spacing` base stays live because dimension
utilities derive from it, so no build check can tell a role from a numeric; the matrices pin their
cell strings verbatim instead. `--font-weight-*` stays live because the roles name their weights. A
bare `duration-150` stays live because Tailwind turns a number into milliseconds without reading the
theme. The ownership rule and the closed props keep a numeric off a call site: a look the matrices
do not cover is a matrix cell or a consumer primitive under `ui/`, never a class on a call site.

## The canon, the roster and the sharing line

The rules every component of either plugin is built under (one name per concept, composed
regions as descriptors, no class or style prop, the roster as data, the platform-invariant cells
and the overlays) are architecture: `docs/architecture/ui-core.md`. The roster itself is
`ROSTER` in `@fcalell/ui-core/roster`.

## Composing with cn

`cn()` merges class inputs and resolves Tailwind conflicts, last wins. Its `tailwind-merge` config
registers six contract scales under `theme`: the type roles as font sizes and again as leading,
the tracked roles as tracking, the radius roles, the spacing roles plus the sizes, and the widths
as containers. Two members of one scale then collapse to the last, so `min-h-control` and
`min-h-control` collapse, and a type role beside a color leaves both standing.

A role owns three properties, so the config also declares `font-size` as conflicting with both
`leading-` and `tracking-`: a later role clears the earlier role's line height and letter spacing
together. **Compose the type role before any later size class, never after.** That conflict runs
one way, so `cn("leading-title", "text-body")` returns `text-body` alone.
