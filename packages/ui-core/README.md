# @fcalell/ui-core

The design system both stack UI plugins render from: one closed token contract derived from a
few knobs, the words the molecules speak, the platform-invariant variant matrices, the roster
every component and its props are pinned to, and the laws that say which token to pick. The
contract subpaths export build-time data only, so each plugin renders its own CSS from the same
records and ui-core stays framework-free. Two subpaths are Node-only: `./harness` is internal
tooling for the packages' verify scripts, and `./gate` is the geometry scanner the UI plugins run
at build time.

Ten subpaths:

- `@fcalell/ui-core/tokens`: the contract as data, including the calibrated defaults and the
  English `words`.
- `@fcalell/ui-core/schema`: the zod `themeSchema` and `wordsSchema`, and the `Theme` input type.
- `@fcalell/ui-core/derive`: `deriveTheme(theme)` resolves knobs and overrides into final values.
- `@fcalell/ui-core/emit`: `themeTokens`, `modeTokens`, and `shadowUtilities` shape those values
  into the records a plugin renders.
- `@fcalell/ui-core/cn`: `cn()`, the class merger, taught the contract's six scales.
- `@fcalell/ui-core/variants`: the platform-invariant variant matrices, each a cva built from a
  table, and the single-cell constants beside them.
- `@fcalell/ui-core/descriptors`: `Act`, `IconAct`, `Part`, `Mark`, `Option`, `PlaceSpec`, `Hunk`
  and the other framework-free types a prop carries.
- `@fcalell/ui-core/roster`: the component roster as data (`ROSTER`, `CLOSED_PROPS`), the layer
  and prop names of every component both plugins ship.
- `@fcalell/ui-core/harness`: internal. The shared core of the packages' `scripts/verify.ts`.
- `@fcalell/ui-core/gate`: Node-only. The closed geometry vocabulary as data and `scanGeometry`,
  the scanner behind each UI plugin's pre-build geometry gate. Importing it loads ts-morph.

The contract has two modes, `light` and `dark`. `themeTokens` seeds the default mode's colors into
the `@theme` block as well, because Tailwind v4 generates no utility from a property declared only
inside a variant block.

## The knobs

Every scale derives from one base, so a theme sets a knob and never a token.

| Knob | Default | Derives |
| --- | --- | --- |
| `accentHue`, `neutralHue`, `neutralChroma`, `okHue`, `warnHue`, `dangerHue` | 261, 261, 1, 160, 75, 28 | every color role in OKLCH, light and dark, the lightness and chroma ladder fixed from the calibration; the two shadows, from `neutralHue` |
| `primary` | `ink` | what the primary act, a switch that is on and the selected place are filled with: `ink` aliases `accent` to the ink ladder and `accent-soft` to its neutral soft; `accent` binds both to `accentHue` |
| `space` | 4 | the rungs |
| `radius` | 14 | the radii |
| `text` | 16 | the type roles; each size rounds to the whole pixel, each line box to the even pixel |
| `fonts` | `sans` unset, `mono` "JetBrains Mono Variable" | the two families as `--font-sans` and `--font-mono`, each ahead of its platform fallback stack; the files are each plugin's `fonts` option |
| `widths` | `rail` 220, `list` 360, `column` 300, `sheet` 560, `reading` 720 | `--container-*`, so `w-rail` and `max-w-reading` |
| `breakpoints` | `tablet` 768, `desktop` 1024, `wide` 1440 | `--breakpoint-*`, so `tablet:` and `desktop:` are the only responsive variants |

Hues are in `[0, 360)`; `neutralChroma` in `[0, 2]` multiplies the declared chroma of every token
bound to `neutralHue` and nothing else. `space`, `radius`, `text`, every width and every
breakpoint are positive integers. Density is a theme, never a breakpoint: a product that wants
more rows lowers `text` and `space`, and no scale changes at a width. The touch floor is 44 px and
not a knob.

Anything the knobs do not reach goes through `overrides`. `overrides.colors` splits into `shared`
(`scrim` and `thumb`), `light`, and `dark` (the 25 per-mode roles); a value must be
`oklch(L C H)` or `oklch(L C H / A)` with unsigned decimal components. `overrides.scales` is keyed
by full custom-property name (`--spacing-inset`, `--leading-title`, `--shadow-float`,
`--container-sheet`, `--breakpoint-wide`); each type role has one leading key and one tracking
key, and both emitted shapes come from it. A value carrying `;`, `{`, `}`, a line break, a comment
delimiter, or an unbalanced paren is rejected, since any of them would break out of the
declaration it is rendered into. Every rejection names the offending key.

## Words

Every word a molecule draws or reads aloud on its own comes from `words`, a typed object passed
once beside `theme`: the six `Status` words, `recommended`, `copy`, `copied`, `back`, `close`,
`more`, `send`, `stop`, `attach`, `search`, `loading`, `retry`. `Words` requires every key and
`wordsSchema` is closed, so a translation that misses a word fails `tsc` and the schema, never the
interface. `ENGLISH` is the default. A sentence that belongs to the consumer is a prop on the
molecule that draws it (`placeholder`, `notice`, every `sentence`, every `label`), never a key.

## Color roles

One accent hue, near-achromatic greys, three state hues.

- `canvas`: the frame behind the content, the sidebar, the page around a group on the desktop.
- `surface`: the content column, a sheet, a picker's list.
- `group`: a group's fill, an input, a search field.
- `edge`: the hairline between columns and between a group's rows; a pressed row's fill.
- `ink`: titles and body. `ink-meta`: meta lines, section labels, descriptions. `ink-faint`:
  placeholders and disabled controls.
- `accent`: the primary act's fill, a switch that is on, the selected place; by `primary`.
  `accent-soft`: a selected row, following `primary` as `accent` does. `on-accent`: text on
  `accent`, an alias of `canvas`, which keeps AA in both modes by the ladder's symmetry.
- `tint`: focus, a link, a count, an `active` status: always the accent hue.
- `ok`, `warn`, `danger`, each with `-soft`: state marks, diff lines, the banner; `danger` is also
  a destructive act's text.
- `avatar-1` to `avatar-8`: an `Avatar`'s fill, stepped 45° from `accentHue` at one lightness and
  chroma, picked by a hash of the name, so a fill per name is a token and never a computed hue.
- `scrim`: behind a sheet. `thumb`: the switch's knob, white in both modes, the one literal.

Status colors: `active` → `tint`, `waiting` → `ink-meta`, `done` → `ok`, `attention` → `warn`,
`failed` → `danger`, `idle` → `ink-faint`.

## Type roles

Seven roles named by use, each a ratio of `text`, one scale at every width. Weight and ink belong
to the role; a molecule may set a role's weight in its own cell (a row's title is `body` at
medium), never a consumer.

| Role | Ratio, at 16 | Leading | Weight | Used for |
| --- | --- | --- | --- | --- |
| `display` | 2.125, 34 | 1.18 | bold | one line on a screen with nothing else to read |
| `title` | 1.75, 28 | 1.29 | bold | a place's large title, an item's title |
| `heading` | 1.125, 18 | 1.33 | semibold | a sheet's title, the compact title, a heading inside an item |
| `body` | 1, 16 | 1.5 | regular | prose, a row's title, an input's text |
| `meta` | 0.875, 14 | 1.43 | regular, `ink-meta` | a row's second lines, a description, an age |
| `label` | 0.8125, 13 | 1.23 | medium, `ink-meta` | the header over a list or a group |
| `mono` | 0.875, 14 | 1.43 | regular, mono family | code, a commit, a key, the diff |

Nothing is smaller than `label`. `body` at 16 keeps an input's text at the size iOS Safari does
not zoom on focus. `display`, `title` and `heading` carry tracking.

## Rungs, radii, elevation

Rungs are multiples of `space`, internal to the molecules; the names say what they separate:
`pair` 1 (a label from its value), `row` 2 (atoms side by side), `stack` 3 (fields of a form, a
row's vertical padding), `inset` 4 (the screen's side inset, a group's interior), `section` 6
(sections of a screen), `room` 8 (the item header from its body on the desktop). Radii come from
`radius`: `group` at 1× for groups, inputs, code, pickers and menus; `sheet` at 1.75× rounded down
for a sheet's corners; `full` for buttons, chips, a search field, a count. Elevation is two
shadows by use: `float` for a picker's list, a menu and a toast; `sheet` for a sheet. Groups,
rows and cards are flat. Each shadow's color is the light ink at `neutralHue`, converted to sRGB
because React Native's `boxShadow` takes no oklch.

## Contrast contracts

At the default knobs, in both modes and under either primary, each pair clears 4.5:1: `ink` and
`ink-meta` on `canvas`, `surface` and `group`; `ok`, `warn` and `danger` on `surface`, on `group`
and on `ok-soft`, `warn-soft` and `danger-soft` in turn; `tint` on `surface` and `group`; `on-accent` on `accent`; `ink` on every
`avatar-n`. The verify script measures every pair. The dark `tint`, `ok`, `warn` and `danger` sit
lighter than the calibration so that a status, an act or a destructive label inside a group
keeps the ratio. Moving a knob puts the re-check on the consumer.

## What the reset does not catch

Nine namespaces reset to `initial`: `--color-*`, `--radius-*`, `--text-*`, `--leading-*`,
`--tracking-*`, `--shadow-*`, `--font-*`, `--container-*`, `--breakpoint-*`. The numeric
`--spacing` base stays live because dimension utilities derive from it, so no build check can tell
a rung from a numeric; the matrices pin their cell strings verbatim instead. `--font-weight-*`
stays live because the roles name their weights. The geometry gate is what keeps a numeric off a
call site.

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

`ROSTER` in `@fcalell/ui-core/roster` is the closed list: 48 components in four layers (atoms,
layout molecules, shared molecules, content molecules), each with its prop names, the same in both
plugins. A plugin's verify suite reads every component's exported props type against it, so a
prop added on one platform, a prop renamed, or a style channel reopened fails by name. The
directory of a component is its name in kebab case (`componentDir("ListRow")` is `list-row`).

## The sharing line

Matrices hold the platform-invariant cells only: fills, borders, ink, rungs, radius, type role,
font weight, font family, and a control minimum height or width. Display, alignment, and every
interaction state are platform overlays composed through `cn()` after the matrix (React Native is
flex by default and the web is not, so a shared `flex-row` would be wrong on one). No arbitrary
value in a cell, in either spelling. A control's interior padding stays a literal numeric; a row
and a surface inset on rungs. No behavior in ui-core, ever.

## Composing with cn

`cn()` merges class inputs and resolves Tailwind conflicts, last wins. Its `tailwind-merge` config
registers six contract scales under `theme`: the type roles as font sizes and again as leading,
the tracked roles as tracking, the radius rungs, the spacing rungs, and the widths as containers.
Two members of one scale then collapse to the last, and a type role beside a color leaves both
standing.

A role owns three properties, so the config also declares `font-size` as conflicting with both
`leading-` and `tracking-`: a later role clears the earlier role's line height and letter spacing
together. **Compose the type role before any later size class, never after.** That conflict runs
one way, so `cn("leading-title", "text-body")` returns `text-body` alone.

## The geometry gate

`@fcalell/ui-core/gate` closes the call-site boundary. Outside a `ui/` directory, consumer app
code may put a class only on a raw host element, and only from the closed geometry vocabulary
below; every look belongs to the matrices. Each UI plugin runs `scanGeometry` over the consumer's
`src/` tree as a pre-phase build step, skipping any path with a `ui/` segment, so a violation
fails `stack build` naming the file, the line, and the token.

The vocabulary, one closed list for both platforms: flex plumbing (`flex`, `flex-1`, `flex-row`,
`flex-col`, `flex-wrap`, `grow`, `shrink-0`), the zero offsets (`absolute`, `relative`, `inset-0`,
`inset-x-0`, `inset-y-0`, `top-0`, `bottom-0`, `left-0`, `right-0`), the non-numeric sizes
(`w-full`, `min-w-0`, `min-h-0`, `min-h-full`, `min-h-screen`, `max-w-full`, `max-w-none`),
`overflow-hidden`, the six `gap-<rung>` cells, and four prefixes: `items-`, `justify-`, `self-`,
`z-`. Three unconditional bans inside any token: `[`, `(`, and `:`.

The host rule: on web a bare lowercase tag; on native `View`, `Pressable`, `ScrollView`, and
`Animated.View`. The check fires only on elements carrying a class attribute. The scanner reads
literals only: a class assembled through a variable, a prop, a template literal, or an aliased
`cn` passes silently. The gate is a guardrail against drift, and the size of a consumer's `ui/`
directory is the number that says whether the matrices cover enough.
