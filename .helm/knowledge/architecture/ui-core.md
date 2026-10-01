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
  to nothing and `tablet:`, `desktop:` and `wide:` are the only viewport variants (the web's
  `page-*` container variants read the same values). The numeric
  `--spacing` base stays live because dimension utilities derive from it, so no build check can
  tell a role from a numeric; the matrices pin their cell strings verbatim and the closed props
  keep a numeric off a call site.
- Four knobs and nothing else: `accentHue` (264), `castHue` (the neutrals' hue, `accentHue`
  unless set), `fonts` (the two family names, IBM Plex Sans and IBM Plex Mono unless set) and
  `defaultMode`. Every other value is the sheet. The cast reaches every neutral (the grounds, the
  hairlines, the inks, the washes, `switch-off`, `fill-disabled`, `fill-neutral`, dark
  `on-danger`, the light shadow ink) through the `"cast"` hue marker, the way `"accent"` marks
  the accent's literals; it never reaches the accent, the status trio, the hued chip families or the
  avatars. Its chroma is a constant per role and mode, never a knob: hue at a neutral's chroma
  moves no contrast, while chroma decides whether a cast is a tint or a color and re-tunes the
  ladder. Density is no knob either: the pointer and the width decide it. Rejected: a knob per scale
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
  six chip families by hue name each with a mark, a `-soft` ground and an `-ink` and a `neutral`
  family whose soft and ink alias `fill-neutral` and `ink-body` (no mark), eight avatar
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
- Density is a theme, and it moves three scales: the type roles (body 13 on
  the desktop set, 16 on touch, each role a ratio rounded to the pixel, its line box to the even
  pixel), the eleven spacing roles (multiples of 4, one rung looser on touch except the float
  and page insets and the acts gap; a list bleeds by `control-x`, so its rows' leading meets
  the title over it at either density) and the twenty-four sizes (control 32/44, field 38/48, target 24/44, the switch and
  its derived thumb travel, the avatar, three icon sizes by the text beside them, the check,
  the slider track, the one-time-code box). `themeTokens` seeds the touch set on both platforms; the web
  overrides it with the desktop set in a `:root` rule in `@layer base` under a fine pointer at
  `tablet` width and wider (so a desktop window narrower than `tablet` draws the touch set and
  structure), the cascade the dark layer rides, so no cell carries a density
  class: a non-inline `@theme` utility reads its variable, so `text-body` and
  `min-h-control` follow. `data-density` on the web root pins either set on any device, the showcase's and the
  boards' pin, never a consumer option. Native is touch-only. A molecule whose structure follows
  density (an action bar at natural width on the desktop, full width on touch) reads it through
  the web's `touch:` custom variant, emitted over the density layer's own condition (the touch
  pin, or no desktop pin where the pointer is not fine or the viewport is narrower than `tablet`),
  and `useTouch` reads the same one query, so a structural class, a tree and the token set cannot
  disagree; native always draws the touch set, so it draws the touch structure with no
  variant; the variant sits in a web molecule's overlay, never a cell. A value that flips by density is the same overlay over the desktop cell, never a matrix value. Structure is decided by CSS wherever CSS can, a runtime check (`useTouch`) only where the tree differs (the Shell, Place and Screen). Rejected: a `fine:` variant in the cells (an interaction
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
`copy`, `copied`, `back`, `close`, `more`, `send`, `stop`, `attach`, `search`, `loading`, `checking`, `retry`, `add`, `remove`, `details`) comes
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
  (colours as fill, ink, border, outline and divider; spacing roles as paddings, gaps and widths; sizes as
  heights, widths, minimums, paddings and an x translation; widths; type roles; tracking; radii;
  shadows; durations; easings). Tailwind reads source text, and a Stage 2 artboard is drawn on the emitted sheet in
  contract classes before any component spells them; the showcase's foundations page builds its
  classes from the token names for the same reason. The cost is the whole contract in every
  consumer's sheet, about 7.5 kB gzipped.
- Matrices hold the platform-invariant cells only: fills, borders (a container's `divide-`
  hairline among them), ink, spacing roles, radius, type role, weight, family, sizes and widths.
  Display, alignment, flex sizing, truncation, positioning, overflow, a negative margin that
  bleeds a region (`-mx-page`), a fraction width and every interaction state are platform
  overlays composed through `cn()` (RN is flex by default and web is not, so a
  shared `flex-row` would be wrong on one). What a component is given (an act, a family, a
  checked value, an error) is an axis; where the pointer or focus is on it (hover, press, focus,
  disabled, pending) is an overlay. A type role's cell carries its ink and, for `mono`,
  its family, since RN Text inherits nothing and both platforms bind `--font-mono`; `display`
  carries `tabular-nums`, a stat's figures at one width (uniwind maps it to `fontVariant`). A
  labelled act's fill (`BUTTON`, `CHIP`) carries the ink as well, since the web glyph and
  spinner inside it draw in the current colour.
- An atom's or a layout molecule's matrices are its approved artboard's class strings, split on
  this line: a part with an axis (a state, a ground, a fit, what it holds) is a matrix, a part
  with one shape a named constant (`POPOVER`, `PAGE_STRIP`). The board's display, alignment and
  state classes, per cell and state, are recorded for the plugins in
  `.helm/research/design-system/atoms-overlays.md` and `layout-overlays.md`.
- A molecule whose structure follows density keeps one constant per structure, never a density
  axis: the page's desktop strip (`PAGE_STRIP`, title and acts in one row under a hairline) and
  its touch head (`PAGE_HEAD` over `PAGE_TOP_BAR`, the title under the bar), the sidebar
  (`SHELL_SIDEBAR`, `PLACE_ROW`) and the tab bar (`SHELL_TAB_BAR`, `PLACE_TAB`), the split's
  list inside its hairline and the list alone. The web picks the structure under `touch:` or,
  for a Split, by its page's width: a Place or Screen is the `page` size container and the
  web's `page-<breakpoint>:` / `page-max-<breakpoint>:` variants, emitted from the breakpoint
  values, query it, so the Split's regions and the Details and back acts it lends follow the room
  the page has beside a sidebar rather than the viewport; native draws the touch one. A bleeding
  body draws no inset, and whatever stands first in it (a Toolbar, the record, the list alone)
  carries its own top inset.
- A loading form stands in for what it replaces at that part's size: `SKELETON` by the part
  (`line`, `avatar`, `switch`, `count`, `field`) and `SKELETON_ROW` by the row it replaces
  (`two-line`, `setting`, `field`), so the loading frame keeps the loaded frame's height.
- No arbitrary values in a cell, in either spelling. A control pads across on `control-x`, stands
  on a size (`min-h-control`, `min-h-field`) and insets on a spacing role; density moves all
  three through the variables.
- No behavior in ui-core, ever. A cell that needs a platform conditional belongs in the overlay;
  the spinner's ink is the recorded example (native colours a prop, not a class, so its cells
  carry its geometry alone, its ink is its place's, and `ContentTone` is the shared contract). So is a line diff: `Diff`'s `before` and
  `after` are diffed in each plugin with the `diff` package both already carry, never here.
- Navigation keeps the accent out: a place is two cells by where it sits. `PLACE_ROW`, the
  sidebar row, carries its states as washes (`rest`, `hover`, `active`, `selected` on
  `wash-selected`, `selected-hover`), its focus the web's inset-ring overlay, its label `TEXT.body` in
  every state and its glyph a part cell of its own (`PLACE_ROW_GLYPH`: `ink-meta`, `ink-body`
  once selected). `PLACE_TAB` with `PLACE_TAB_LABEL`, the tab bar tab, is selected by ink alone
  (`ink-meta` idle, `ink-body` selected, the selected label at 500); its box carries the ink for the glyph inside it, as a
  labelled act's fill does, and the label repeats it because a native Text inherits none.
- A row names what holds it: `ROW`'s `ground` axis is `list` (a list or a popover, the row
  inset as a rounded wash) or `group` (edge to edge at the card's inset), and its `lines` what
  it stands for (`one`, `two` a title over its meta, `setting` a label over its description).
  A list row is square on touch, where the list's inset is none and the wash would meet the
  screen's edge: a density flip, so an overlay over `list`, never a cell. A group draws the
  hairline between its rows once (`GROUP`: `divide-y divide-edge`), so no row carries one. That is
  web-only: `divide-*` is a child selector, which uniwind's compiler drops, so native has no
  divider utility yet and draws the hairline per row.
- A row's leading is one slot at the avatar's size (`ROW_LEADING`), the dot or glyph centred
  in it, so the titles of a list share one x whatever leads them; its meta line (`ROW_META_LINE`,
  a gap on the inline axis only) keeps the meta's room and wraps the marks under it. A short
  label (a chip's, a status word, a skeleton label's lane) is bounded by the one width `measure-short` (18ch, the short sibling of `measure`).
- A minimum height is the floor of something pressed (a control, a field, a target, a chip, a
  row), the set height of a bar (`strip` 40 / 44: the page's desktop strip and its touch top
  bar), an intrinsic size, or the height of what a part swaps with: `PENDING_BAR` an action
  bar's (`min-h-control`), `TABLE_CELL` the `Input` that edits it in place (`min-h-field`).
  Any other container takes its height from its content and padding through flex, its parts
  centred on the tallest, never from a height copied from another component to line things up:
  a section head or a sheet head is its act's height, a banner its line (or its act) inside
  `py-pair`. Rejected: a `header` size, a minimum that made a title-only head as tall as one
  with an act.
- A touch Place draws its one floating act; in a Split it centres on the list by CSS alone: a
  bleeding Place is the `group/page` whose layer, from `tablet` of the page and with a
  `data-split` inside, narrows to `w-list` at the body's start (below `tablet` it spans whichever
  region stands alone). The Place hands the act's room (its height over `pb-page`,
  `FLOATING_ACT_FOOT`, since a region in a bleeding body keeps no page inset) to the Split, which
  keeps it under the list and, where the record stands alone, under the record. Two mounted
  copies of the act would each keep their own state, so the act is never duplicated.
- A bar at a phone's bottom edge clears the home indicator with the web emit's `pb-safe`
  (`padding-bottom: env(safe-area-inset-bottom)`, non-zero under the document's
  `viewport-fit=cover`), an overlay the tab bar spells beside `SHELL_TAB_BAR`; native pads the
  same inset from `react-native-safe-area-context`.
- A frame's fixed regions are widths (`sidebar`, `list`, `pane`, `column`, `auth`, `empty` an
  empty state's column), so a region
  keeps its measure at any viewport. A skeleton bar alone takes a fraction width (`w-1/4` to
  `w-3/4`) to stand at its text's length: structural, a closed list in the web verify's overlay
  acceptance, never a token.
- A table cell is the field's box (`TABLE_CELL`: `min-h-field` and `px-control-x` behind a
  transparent side border), so a cell and the `Input` that edits it in place put their text in
  one place and the row keeps its height at either density. The row (`TABLE_ROW`) is a hairline
  and the open row's selection wash; the wash is the body ink at an alpha, so every ink the sheet
  measures on the surface keeps its ratio on it.

## The canon, the roster and the closed props

- The canon binds every component either UI plugin ships: one name per concept (`label`,
  `loading`, `onChange`, `onAct`, `act`, `blocked`, `sentence`), composed regions as typed
  descriptors (`Act`, `StatusMark`, `ChipMark`, `PlaceSpec`, `Switcher`, `Option`, `OptionGroup`, `Part`, `FieldBinding`,
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
  A component draws another's place by composing that component, never by spelling its cells,
  so a change to the component (its hit box, its ring, its press, its label) reaches every place
  it stands. An approved entry declares `holds`, the families and constants of its own box, and
  each plugin's verify fails a component that imports a held cell outside its holder's
  directory. A popup trigger renders the icon act's base (`icon-button/base.tsx`, which the
  `./components/*` export does not reach), taking the trigger's props through Base UI's
  `render`; on native a trigger is a press, and renders `IconButton` itself. A cell no entry
  holds is shared, spelled by each component that draws it: the type roles, the field box
  (`Input`, `Select`, `TextArea`), the row, the skeleton, the page cells `Place` and `Screen`
  share, and the column ground (`SHELL_COLUMN`) a Split's pane sheet stands on. `Select`, the
  single-choice field over `options`, is the field box (`FIELD`) whose open list is a popover
  (`POPOVER`) of rows (`ROW`); on native it opens the same option sheet as `Picker`.
- A component that sits in more than one container takes `fit`, a closed enum read off its
  matrix's `fit` axis (`IconFit`, `ButtonFit`, `IconButtonFit`, `LinkFit`, `ActionBarFit`,
  `FieldFit`, `SheetFit`),
  defaulting to the matrix's default; the composing molecule sets it (a `Place` passes `bar` to
  its strip's acts, a field's trailing act `field`, a `Form` under an auth column `full`, a
  `Split` its details sheet `pane`) and a
  call site may. `ACTION_BAR`'s two fits carry no cell: `end` and `full` differ in structure
  (an overlay) and in the `Button` fit the bar passes (`body`, `field`), and the matrix exists
  so the closed type is read off an axis like every other fit.
- An `Act` says what it does, never how it looks: `destructive` marks an act that removes or
  ends something, and the `ActionBar` draws it as `danger` when it is the bar's one filled act
  and as `destructive` (the hairline form) otherwise, so a confirm's filled act needs no kind of
  its own.
- `Text` draws `body` and `meta` (plus `strong`) and names those roles' cells of `TEXT` and
  `TEXT_STRONG`, not either family; every other type role is drawn by the molecule that owns
  its place, and `TEXT` keeps all seven roles as the one table those owners draw from.
- Tokens are enforced by ownership: a token names a place, and the component that owns the place
  draws it. A component whose artboard is approved declares `owns` on its entry, the type roles,
  colours (a name, or a family prefix ending in `-`), radii, spacing roles, sizes and widths, and
  shadow levels it may draw. A molecule that picks a composed atom's `fit` or `act` (a
  `Place` its strip act's `BUTTON.fit.bar`, a `Split` its Details act's `ICON_BUTTON.fit.bar`)
  draws those cells and owns what they spell; a slot the consumer fills (`children`, a
  `ReactNode`) draws nothing of its content. The least data that makes the check exact: a class is classified by
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
