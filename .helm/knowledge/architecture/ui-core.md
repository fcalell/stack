# ui-core, the design contract

`@fcalell/ui-core` is the design contract both UI plugins render from: the token contract with its
parametric derivation, the words the molecules speak, the shared `cn()` merge config, the
platform-invariant variant matrices, the component roster, and the shared descriptor types. It
is a preset library like `biome-config`: no `plugin()` factory, no slots, and no
framework dependency. The normative laws (the
canon, the sharing line, the `cn` ordering rule, the roster) live in the package README and are
pinned by the package's verify suite; this entry holds the architecture and its rationale.

## Tokens and theming

- The contract is the approved Stage 1 sheet, held as data in `tokens.ts` and diffed against
  `plugins/react-ui/design/foundations.css` by the verify script, so the emitted `app.css`
  carries exactly what was approved. Eleven namespaces are zeroed (`--color-*`, `--radius-*`,
  `--text-*`, `--leading-*`, `--tracking-*`, `--shadow-*`, `--font-*`, `--container-*`,
  `--breakpoint-*`, `--transition-duration-*`, `--ease-*`), so an off-contract utility compiles
  to nothing and `tablet:`, `desktop:` and `wide:` are the only responsive variants. The numeric
  `--spacing` base stays live because dimension utilities derive from it, so no build check can
  tell a role from a numeric; the matrices pin their cell strings verbatim and the closed props
  keep a numeric off a call site.
- Four knobs and nothing else: `accentHue` (264), `castHue` (the neutrals' hue, `accentHue`
  unless set), `fonts` (the two family names, IBM Plex Sans and IBM Plex Mono unless set) and
  `defaultMode`. Every other value is the sheet. The cast reaches every neutral (the grounds, the
  hairlines, the inks, the washes, `switch-off`, `fill-disabled`, `fill-neutral`, dark
  `on-danger`, the light shadow ink) through the `"cast"` hue marker, the way `"accent"` marks
  the accent's literals; it never reaches the accent, the status trio, the chip families or the
  avatars. Its chroma is a constant per role and mode, never a knob: hue at a neutral's chroma
  moves no contrast, while chroma decides whether a cast is a tint or a color and re-tunes the
  ladder. Density is no knob either: the pointer decides it. Rejected: a knob per scale
  (`space`, `radius`, `text`, `motion`, `elevation`, the status hues, the neutral chroma,
  `primary`, `density`) and per-token `overrides`; a consumer that moved one
  re-tuned a system it had not designed, and every pair the contract measures had to be re-checked
  by hand. A second primary fill is a theme decision, never a call-site value, so `Button.act`
  carries one primary.
- The derivation is internal structure, kept so the numbers stay explainable: one base per scale
  (the body size per density, the 4 px space base, the accent hue) and each token a ratio or a
  rule of it. Colors are declared as a light and a dark OKLCH value, an alias of another role, a
  `veil` (a role at an alpha: the washes are the body ink at 5 to 15 %) or a `mix` (a role
  blended toward another in OKLab, one target for both modes or one per mode: the act fills'
  hover, press and pending states, the switch's hover), so what the sheet wrote as `color-mix()` is emitted as a literal both platforms parse.
  A literal or a `mix` may carry `holds` per mode, a contrast contract against named grounds, a
  ground optionally under a veil (`under`, composited in gamma sRGB as a browser draws it): the
  derivation moves its lightness from the declared or mixed one until each holds at the knob's hue, and clamps every accent
  value's chroma inside sRGB at its lightness, so a re-hued accent keeps its luminance and its
  contrasts (the verify sweeps all 360 hues of the accent, of the cast, and of the two together) and loses saturation rather than clipping. The
  sheet carries the held value at its own hue: `accent-ink` holds 4.5:1 on `group` and
  `accent-soft`, the dark `accent` 3:1 on `group` (a checked box, an on switch), the light
  `danger` 4.5:1 under `wash-press` on `group` (a destructive act's pressed label) and 4.5:1
  under `on-danger` in both modes (the filled danger act), each filled act's pending fill 3:1
  under its label (the spinner on a pending act). Hover and press move a filled act away from its
  label: the accent toward black in both modes, the danger toward black in light and toward
  `ink-body` in dark, where its label is near-black; its pending fill is inert and recedes toward its
  label in light and toward the page in dark. A labelled act's fill takes no 3:1 ground floor in
  any state, since its label names it; a toggle on (`toggle-on`, drawn by the switch, the
  checkbox and the slider) has no label, so it and its hover are measured at 3:1 on every ground
  and its hover lightens in dark, away from the near-black ground.
- Color roles name the place they draw: surfaces (`canvas`, `surface`, `group`, `raised`,
  `edge`, `edge-raised`, `edge-strong`, `scrim`), three inks (`ink-body`, `ink-meta`,
  `ink-faint` for disabled text only), the accent (`accent`, `on-accent`, `accent-soft`,
  `accent-ink` for a link and the ring), three status families with `-soft` and `on-danger`,
  six chip families by hue name each with a mark, a `-soft` ground and an `-ink`, eight avatar
  steps each with an `-ink`, seven washes (`fill-neutral` the resting neutral ground among them), six place aliases (`ring`, `selected-outline`,
  `edge-hover`, `edge-error`, `ink-error`, `ink-disabled`), the two act fills (`act-accent`,
  `act-danger`) with their states, and the switch's five with the shared `toggle-on`. `COLOR_GROUPS` holds the roles by those groups and `COLOR_NAMES`
  is its flattening. The dark hairline is two tokens because the dark ladder spans more
  than one hairline can straddle: a group or a lifted layer re-points `--color-edge` to
  `edge-raised` for everything inside it, so a part never picks between them. The grounds are
  `RAISED_GROUNDS` and the re-point `raisedGroundTokens`; the web scopes it on `.bg-group` and
  `.bg-raised` in `@layer base` after the mode scopes. Native cannot: uniwind resolves a
  class's custom property on that element alone, so no class re-points a subtree there. Rejected: a hue
  computed per avatar name (neither a token nor a cell); chip hues stepped off the accent (a
  family must never wear the accent, so the six are fixed and the accent's band is left out);
  `Status` with a family mode (a state and a data value are two concepts, so two names).
- Density is a theme, never a breakpoint, and it moves three scales: the type roles (body 13 on
  the desktop set, 16 on touch, each role a ratio rounded to the pixel, its line box to the even
  pixel), the nine spacing roles (multiples of 4, one rung looser on touch except the float
  and page insets) and the twenty-four sizes (control 32/44, field 38/48, target 24/44, the switch and
  its derived thumb travel, the avatar, three icon sizes by the text beside them, the check,
  the slider track, the one-time-code box). `themeTokens` seeds the touch set on both platforms; the web
  overrides it with the desktop set in a `(pointer: fine)` `:root` rule in `@layer base`, the
  cascade the dark layer rides, so no cell and no component carries a density
  class: a non-inline `@theme` utility reads its variable, so `text-body` and
  `min-h-control` follow. `data-density` on the web root pins either set on any device, the showcase's and the
  boards' pin, never a consumer option. Native is touch-only. Rejected: a `fine:` variant in the cells (an interaction
  condition in a shared cell, meaningless on native) and one type scale at every density (13 on
  a phone is unreadable and 16 on a desktop row wastes the row).
- Emission returns token records, never CSS text (`themeTokens`, `rootTokens`, `modeTokens`,
  `densityTokens`, `reducedMotionTokens`, `shadowUtilities`): records
  validate per key, need no escaping, and keep ui-core free of `@fcalell/cli`. `modeTokens`
  carries every color and the two shadows by full custom-property name; both plugins wrap the two
  shadows in `@utility` rules reading `var(--shadow-<level>)`, because the `--shadow-*` theme
  namespace does not resolve into RN's `boxShadow` and a shadow is per mode. The web keys each
  mode on a class scope, `.dark` on the root and `.light` below it restoring the light set, so a
  light subtree renders light under a dark page; `rootTokens` puts the hairline, the ring and the
  light shadows on `:root` outside `@theme`, since no utility reads them.
- Fonts split by fact: the theme names the families (`--font-sans`, `--font-mono`, each ahead of
  its platform fallback), each plugin's `fonts` option carries the files (a woff2 with fallback
  metrics on web, an expo-font source on native). The metric fallback face's name is one rule,
  `fallbackFace(family)` in `./tokens`, which the family stack names second and the web plugin
  declares its `@font-face` under, so the two cannot disagree. Rejected: a `role` on the file entry, which
  put the same fact in two places and let the two disagree.

## Words

Every word a molecule draws or reads aloud on its own (the six `Status` words, `recommended`,
`copy`, `copied`, `back`, `close`, `more`, `send`, `stop`, `attach`, `search`, `loading`, `checking`, `retry`, `add`, `remove`) comes
from `words`, a closed typed object with English defaults. The `Words` type requires every key
and `wordsSchema` is strict, so a translation missing a word fails `tsc` and the schema. It is a
plugin option beside `theme`; each plugin contributes a `WordsProvider` into the generated entry
through its platform's `providers` slot, so the value reaches the components with no consumer
glue, and the context defaults to English when no provider is mounted. A consumer's sentence is a
prop on the molecule that draws it, never a key.

## Matrices and the sharing line

- `FAMILIES` (`./variants`) registers every matrix by its table's name with its axes read off the
  table, and `matrixCells` enumerates them into cells (`BUTTON.act.primary`): the verify suites and
  react-ui's showcase read the same list.
- The emitted `app.css` carries every contract utility whether or not a source spells it:
  react-ui contributes one `@source inline()` pattern per utility family over the token lists
  (colours as fill, ink, border and outline; spacing roles as paddings, gaps and widths; sizes as
  heights, widths, minimums, paddings and an x translation; widths; type roles; tracking; radii;
  shadows; durations; easings). Tailwind reads source text, and a Stage 2 artboard is drawn on the emitted sheet in
  contract classes before any component spells them; the showcase's foundations page builds its
  classes from the token names for the same reason. The cost is the whole contract in every
  consumer's sheet, about 7.5 kB gzipped.
- Matrices hold the platform-invariant cells only: fills, borders, ink, spacing roles, radius,
  type role, weight, family, and a control's size. Display, alignment, and every interaction state
  are platform overlays composed through `cn()` (RN is flex by default and web is not, so a
  shared `flex-row` would be wrong on one). What a component is given (an act, a family, a
  checked value, an error) is an axis; where the pointer or focus is on it (hover, press, focus,
  disabled, pending) is an overlay. A type role's cell carries its ink and, for `mono`,
  its family, since RN Text inherits nothing and both platforms bind `--font-mono`; `display`
  carries `tabular-nums`, a stat's figures at one width (uniwind maps it to `fontVariant`). A
  labelled act's fill (`BUTTON`, `CHIP`) carries the ink as well, since the web glyph and
  spinner inside it draw in the current colour.
- An atom's matrices are its approved artboard's class strings, split on this line. The board's
  display, alignment and state classes, per cell and state, are recorded for the plugins in
  `.helm/research/design-system/atoms-overlays.md`.
- No arbitrary values in a cell, in either spelling. A control pads across on `control-x`, stands
  on a size (`min-h-control`, `min-h-field`) and insets on a spacing role; density moves all
  three through the variables.
- No behavior in ui-core, ever. A cell that needs a platform conditional belongs in the overlay;
  the spinner's ink is the recorded example (native colours a prop, not a class, so its cells
  carry its geometry alone, its ink is its place's, and `ContentTone` is the shared contract). So is a line diff: `Diff`'s `before` and
  `after` are diffed in each plugin with the `diff` package both already carry, never here.
- A table cell is the field's box (`TABLE_CELL`: `min-h-field` and `px-control-x` behind a
  transparent side border), so a cell and the `Input` that edits it in place put their text in
  one place and the row keeps its height at either density. The row (`TABLE_ROW`) is a hairline
  and the open row's selection wash; the wash is the body ink at an alpha, so every ink the sheet
  measures on the surface keeps its ratio on it.

## The canon, the roster and the closed props

- The canon binds every component either UI plugin ships: one name per concept (`label`,
  `loading`, `onChange`, `onAct`, `act`, `blocked`, `sentence`), composed regions as typed
  descriptors (`Act`, `Mark`, `PlaceSpec`, `Option`, `OptionGroup`, `Part`, `FieldBinding`,
  `Confirmation`, `MenuItem`, `TableColumn`, `TableRow`) instead of node slots, and no
  `class` / `className` / `classList` / `style` prop. Laws live in the README under `## The
  canon`. An icon is an `IconName`, a closed type over Lucide's PascalCase
  names read off the `lucide` package ui-core depends on: the set is baked in, never a consumer
  map, and each plugin draws a name from one table built over its platform package's exports
  (`lucide-react`, `lucide-react-native`), which fails the build if the package lacks a name. A
  descriptor is generic only, for a field binding, in the value its field holds, which is data: `FieldBinding<V>` is how a bound
  `FormField` types its control by the field, and `useApiForm(...).bind(name)` produces it on the
  web from TanStack Form's store, one binding per name under the form's owner. Rejected: optional
  `value` and `onChange` on every control read from the field's context, which would compile a
  control with no value anywhere and could not type a boolean field against an `Input`.
- The roster is data: `ROSTER` in `packages/ui-core/src/roster.ts` names 54 components in four
  layers (atoms, layout molecules, shared molecules, content molecules) with their prop names,
  the cells each draws (a whole matrix family, one family cell as `FAMILY.axis.value`, or a single
  cell) and the states it has a form for, the same in both plugins; the showcase draws exactly those matrix cells and states. Each plugin's verify suite reads every component's exported props type
  against it with ts-morph, so a prop added on one platform, renamed, or a style channel reopened
  fails by name. A component's directory is `componentDir(name)` (`ListRow` → `list-row`).
  A component draws another's place by composing its cells, never by redrawing them: `Select`,
  the single-choice field over `options`, is the field box (`FIELD`) whose open list is a
  popover (`POPOVER`) of rows (`ROW`); on native it opens the same option sheet as `Picker`.
- A component that sits in more than one container takes `fit`, a closed enum read off its
  matrix's `fit` axis (`IconFit`, `ButtonFit`, `IconButtonFit`, `LinkFit`), defaulting to the
  matrix's default; the composing molecule sets it (a `Toolbar` passes `bar`, a field's trailing
  act `field`) and a call site may.
- `Text` draws `body` and `meta` (plus `strong`) and names those roles' cells of `TEXT` and
  `TEXT_STRONG`, not either family; every other type role is drawn by the molecule that owns
  its place, and `TEXT` keeps all seven roles as the one table those owners draw from.
- Tokens are enforced by ownership: a token names a place, and the component that owns the place
  draws it. A component whose artboard is approved declares `owns` on its entry, the type roles,
  colours (a name, or a family prefix ending in `-`), radii, spacing roles, sizes and widths, and
  shadow levels it may draw. The least data that makes the check exact: a class is classified by
  its utility prefix into one namespace and looked up by name, so `rounded-chip`, `min-h-chip`
  and `bg-chip-red-soft` land in three namespaces and cannot be confused. Rejected: one flat
  prefix list (`chip` is a radius, a size and a colour family) and a declaration per cell (the
  matrices already say which cell a component draws).
- Closure mechanics: every closed prop is declared `?: never` on a plain object type, never on a
  host's props type, so the key set is closed and a call site gets a readable error. The closed
  props are the guardrail: a look the matrices do not cover is a matrix cell or a consumer
  primitive under `ui/`, never a class on a call site. The named holes stay open on purpose:
  consumer CSS targeting plugin class names, and any class built from a variable; the size of a
  consumer's `ui/` directory is the number that says whether the matrices cover enough.
- The boundary: a molecule lives in stack when its prop names and enum words are product-free. A
  molecule whose props are a product's nouns lives in that product's `ui/`, composing stack
  molecules and never a host element. Every plugin suite fails on a product noun in source.

## Enforcement

Three verify suites (ui-core, native-ui and react-ui) are the design system's enforcement layer:
the derivation diffed against the approved foundations sheet and swept over every accent and cast hue,
matrices asserted verbatim over their full axis products, every class a cell or a web overlay draws
checked against the tokens its roster entry owns, the roster compared against every
component's props type, closure fixtures that compile every component's `?: never` props, word
and product-noun scans over the sources, class-literal set-equality against each plugin's overlay
allowlist, and every class a web component spells emitted by the built `app.css`. The web builds
the roster one component at a time, so react-ui holds each component directory present to its
entry and reports how many of the roster are built. A new
matrix that skips a registry, a component the roster does not name, a literal that duplicates a
cell, an off-contract utility, or a drawn word outside `words` each fails a named check.
