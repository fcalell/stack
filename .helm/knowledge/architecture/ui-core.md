# ui-core, the design contract

`@fcalell/ui-core` is the design contract both UI plugins render from: the token contract with its
parametric derivation, the words the molecules speak, the shared `cn()` merge config, the
platform-invariant variant matrices, the component roster, and the shared descriptor types. It
is a preset library like `biome-config`: no `plugin()` factory, no slots, and no
framework dependency. The normative laws (the
canon, the sharing line, the `cn` ordering rule, the roster) live in the package README and are
pinned by the package's verify suite; this entry holds the architecture and its rationale.

## Tokens and theming

- The contract is the foundations sheet, held as data in `tokens.ts`; the emitted `app.css`
  carries exactly those values. Eleven namespaces are zeroed (`--color-*`, `--radius-*`,
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
  `accent-soft`, the dark `accent` 3:1 on `group` (a checked box, an on switch), `edge-strong` 3:1 on `surface`
  under `wash-press` and `wash-selected` in both modes (an unticked box on a pressed or selected row), the light
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
  is its flattening. A chart's series take the chip marks in `CHART_SERIES` order and a meter's
  level turns on `METER_NEAR`, contract data the cells are keyed by (`CHART_FILL {series}`,
  `METER_FILL {level}`), so both platforms draw the same series colour and the same level for a
  value. The dark hairline is two tokens because the dark ladder spans more
  than one hairline can straddle: a group or a lifted layer re-points `--color-edge` to
  `edge-raised` for everything inside it, so a part never picks between them. The grounds are
  `RAISED_GROUNDS` and the re-point `raisedGroundTokens`; the web scopes it on `.bg-group` and
  `.bg-raised` in `@layer base` after the mode scopes. Native has no selector to hang it on, so
  a raised surface wraps its content in `RaisedGround` (native-ui `lib/raised`), uniwind's
  `ScopedVariables` holding each re-pointed variable at the value its read resolves to in the
  mode (a scoped variable takes a value, never a `var()`); a sheet's three trees and a toast
  wrap, and no native `group` ground holds a part that draws `edge`. Rejected: a hue
  computed per avatar name (neither a token nor a cell); chip hues stepped off the accent (a
  family must never wear the accent, so the six are fixed and the accent's band is left out);
  `Status` with a family mode (a state and a data value are two concepts, so two names).
- Density is a theme, and it moves three scales: the type roles (body 13 on
  the desktop set, 16 on touch, each role a ratio rounded to the pixel, its line box to the even
  pixel), the eleven spacing roles (multiples of 4, one rung looser on touch except the float
  and page insets and the acts gap; a list bleeds by `control-x`, so its rows' leading meets
  the title over it at either density) and the thirty sizes (control 32/44, field 38/48, target 24/44, the switch and
  its derived thumb travel, the avatar, three icon sizes by the text beside them, the check,
  the slider track, the one-time-code box, the meter's bar, the chart's plot, the QR square, and
  three derived from the type: the text area's three body lines, the message input's eight, and
  `figures`, four tabular figures at the code size, held by a diff's number columns and a
  file row's count lanes). A size counted in figures is px at
  `MONO_ADVANCE` (Plex Mono's 0.6 em), never a `ch` width, because uniwind has no `ch` unit and
  native draws the figures too; a named mono with a wider advance overflows it. The two measures are `ch` on the web (`measure-short` 18ch, `measure` 58ch), so each label keeps 18 characters of its own font; native has no `ch`, so `nativeMeasureTokens` declares them in px at `SANS_ADVANCE` (Plex Sans's "0", 0.6 em) of the touch body size, rounded up (173 and 557). That is a native limit: there every short label's cap is the body's 18 characters whatever its role (a chip's caption included, and `SKELETON_LANE`'s role axis draws one width), and a named sans with a wider "0" overflows them. `themeTokens` seeds the touch set on both platforms; the web
  overrides it with the desktop set in a `:root` rule in `@layer base` under a fine pointer at
  `tablet` width and wider (so a desktop window narrower than `tablet` draws the touch set and
  structure), the cascade the dark layer rides, so no cell carries a density
  class: a non-inline `@theme` utility reads its variable, so `text-body` and
  `min-h-control` follow. `data-density` on the web root pins either set on any device, the showcase's
  pin, never a consumer option. Native is touch-only. A molecule whose structure follows
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
  light subtree renders light under a dark page; `rootTokens` puts the hairline, the ring, the
  layers' order and the light shadows on `:root` outside `@theme`: no theme utility reads them,
  and a layer is read by the arbitrary `z-(--layer-<layer>)`, since `z-*` reads no theme namespace.
- Fonts split by fact: the theme names the families (`--font-sans`, `--font-mono`, each ahead of
  its platform fallback), each plugin's `fonts` option carries the files (a woff2 with fallback
  metrics on web, an expo-font source on native). The metric fallback face's name is one rule,
  `fallbackFace(family)` in `./tokens`, which the family stack names second and the web plugin
  declares its `@font-face` under, so the two cannot disagree. Rejected: a `role` on the file entry, which
  put the same fact in two places and let the two disagree.

## Words

Every word a molecule draws or reads aloud on its own (the seven `Status` words, `recommended`,
`copy`, `copied`, `back`, `close`, `cancel`, `dismiss`, `more`, `send`, `stop`, `attach`, `search`, `loading`, `checking`, `retry`, `add`, `remove`, `details`, `places`, `notifications`, `code`, `added`, `removed`, `sort`, `ascending`, `descending`, `time`, `message`, `seen`, `unseen`, `copyFailed`, `latest`, `missing`, the counted `earlierLines`, and the slot words `meterValue`, `meterOver`, `linesAdded` and `linesRemoved`) comes
from `words`, a closed typed object with English defaults. The `Words` type requires every key
and `wordsSchema` is strict, so a translation missing a word fails `tsc` and the schema. It is a
plugin option beside `theme`; each plugin contributes a `WordsProvider` into the generated entry
through its platform's `providers` slot, so the value reaches the components with no consumer
glue, and the context defaults to English when no provider is mounted. A consumer's sentence is a
prop on the molecule that draws it, never a key. A word drawn with a number is data, `{ one,
other }` each spelling `{count}`, drawn through `counted(word, count)`, never a function: the
words cross into the generated entry as a literal. Two forms are English's; a language with more
plural categories needs a locale the words do not carry. A word drawn with values (a meter's "8.4 of 10") is one whole phrase spelling
named slots (`{value} of {max}`), drawn through `filled(word, values)`, the figures localized by
the component; the schema rejects a translation that drops a slot. Rejected: a bare connective
(`of`) composed around the figures, a sentence fragment a language cannot reorder. A moment drawn as its age (a table's `age`
cell, an ISO moment so the table sorts by it) is no word either: each plugin formats it with the
platform's `Intl.RelativeTimeFormat` (`numeric: "auto"`) in the document's language, in one helper
over ui-core's `ageWords` (`./clock`). Every `Intl` formatter either plugin uses (an age, a
moment, a meter's figures, a chart's ticks, a slider's value, the phone's `compact`) comes from
ui-core's `formatterFor(kind, lang, options)` (`./format`), built once per kind, language and
options at module scope, since building one costs far more than formatting (Hermes most of all)
and ages and moments format per row per render; each plugin's tests hold no `new Intl.` in its
`src`.

Ages and pending bars read one coarse clock per plugin (`lib/clock`, `useClock(read, until)`): an
external store read with `useSyncExternalStore`, ticking once a second while a reader holds it.
A reader renders again only when what its `read` returns changes (an age cell its words, a touch
list its rows' words joined), leaves once now passes its `until`, and the interval stops when no
reader is left, so a bar past its `until` ticks nothing. What they draw is pure in ui-core's
`./clock`: `timeLeft(end, now)`, and a `PendingRun` (`start`, `end`, `from`) whose
`pendingShare(run, now)` is the fill; a moved `until` starts a new run from the share reached, so
the fill never jumps back. The fill moves on its own from that share to full at `end` (a Web
Animations width animation on the web, started before first paint; a linear Reanimated timing on
the phone), and the tick redraws only the time left. Under reduced motion (the web's
`prefers-reduced-motion: reduce`, read live; the phone's system setting as Reanimated's
`useReducedMotion` read it at launch) the fill steps with the clock instead: its share is set once
a tick with no animation, never jumped to full.

## Matrices and the sharing line

- `FAMILIES` (`./variants`) registers every matrix by its table's name with its axes read off the
  table, and `matrixCells` enumerates them into cells (`BUTTON.act.primary`): the verify suites and
  react-ui's showcase read the same list.
- The emitted `app.css` carries every contract utility whether or not a source spells it:
  react-ui contributes one `@source inline()` pattern per utility family over the token lists
  (colours as fill, ink, border, outline and divider; spacing roles as paddings, gaps and widths; sizes as
  heights, widths, minimums, paddings and an x translation; widths; type roles; tracking; radii;
  shadows; durations; easings). Tailwind reads source text, and the showcase's foundations page builds its
  classes from the token names. The cost is the whole contract in every
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
  carries `tabular-nums`, a stat's figures at one width (uniwind maps it to `fontVariant`; native redeclares the utility plain, since Tailwind composes it from unset `--tw-*` variables that uniwind from 1.11 resolves to empty tokens React Native logs as unsupported). A
  labelled act's fill (`BUTTON`, `CHIP`) carries the ink as well, since the web glyph and
  spinner inside it draw in the current colour.
- An atom's or a molecule's (layout, shared, content) class strings are split on this line: a part with an axis (a state, a ground, a fit, what it holds)
  is a matrix, a part with one shape a named constant (`POPOVER`, `PAGE_HEAD`). Its
  display, alignment and state classes, per cell and state, are recorded for the plugins in
  `.helm/research/design-system/atoms-overlays.md`, `layout-overlays.md`,
  `shared-overlays.md` and `content-overlays.md`. A molecule draws an atom by composing it, so an
  atom's string inside a molecule is the atom's cell at the fit the molecule passes, never a
  cell of the molecule's own; a molecule it composes (a `Code` in a `Prose`, a `Prose` in a
  `Message`, the `Group` around a `Comparison`) draws its own cells and the composer owns none
  of them.
- A part that stands beside a line of text, or in for one while loading, is that line's box
  (`LINE_BOX` by type role): a checkbox on its label's first line in a FormField or an
  OptionList, an ItemHeader's loading bar in the line its text fills, so the loading frame and the
  loaded one share a height. A loading label's bar runs in `SKELETON_LANE`, a short label's
  measure in the ch of the role it stands in for.
- A chosen option is ticked (`Picker`), checked or its radio dotted (`OptionList`), never washed: an option row
  draws `ROW {state}` for the pointer alone, where a list's or a group's chosen row draws
  `selected`. A destructive menu act's label draws `MENU_LABEL {kind: destructive}`
  (`text-danger`), an axis because the act is given, not pointed at.
- The Picker's trigger takes `PICKER {fit}`: `field`, the field box at the bar fit, or `row`,
  a list row's trailing pick, its value (`PICKER_VALUE`) and chevron in a `PILL_ACT` that
  pulls back by its own padding at the row's end (`-me-inside`). The Picker's `fit` prop picks it,
  and a `ListRow`'s trailing pick (`RowTrailing`'s `pick`) passes `row`. The Picker holds `PILL_ACT`.
- A status is a mark: a status that moves is a `Picker` whose options carry states
  (`Option.status`), its options and its value drawn as the `Status`, as an ItemHeader's moving
  status fact (`{ pick }`) is. Rejected: `Status` with `onOpen`, an act that opened a menu of
  states the mark could not show as the current one.
- `running` is work under way and `active` a steady state (a watch that stands, a service that is
  up): both wear the accent, and `running` draws a `Spinner` where every other state draws its
  dot, wherever a status draws one (a `Status`, a list row's `{ status }` leading, an
  ItemHeader's status, a status pick's option), so running and steady rows mix in one List under
  one leading kind. `STATUS_DOT` carries no `running` cell; the spinner's slot is
  `STATUS_SPINNER`, its accent ink the web's currentColor and native's `Ink` tone
  (`statusContentTone`). The spinner keeps its own size (the `icon` rung) and keeps turning
  under reduced motion: it is a progress indicator, the one motion that says work is under way,
  and a still arc reads as a stalled one; reduced motion stills the transitions around it. Rejected:
  spinning `active`, which would turn a row that stands for days.
- The Shell's switcher is a pick: a `Switcher` is an `OptionPick` whose options carry their
  avatars (`Option.avatar`, leading the option row as a status's dot does) plus `act`, the act
  that makes a new one, which the Picker draws under a hairline (`HAIRLINE`) after the options as
  a `ROW` (the Picker's `act` prop). The Shell draws its own trigger (a place row, `SWITCHER` on
  touch) over the Picker's list through its internal base. Rejected: a switcher menu of its own,
  a second list of the same rows. A Picker stands outside a form; a form's pick is `Select`.
- On touch the places past the tab bar are a page, not a menu: the More tab opens a `Place` of
  `ListRow`s (each place's glyph leading, its count trailing, its route), and while a Place's act
  floats the toasts stand above it by the act's room; while a foot docks (a Place's `foot`, a
  filling Thread's input) they stand above the foot by layout as the input grows, with no height
  reported to the Shell. On the web the docked foot names itself a CSS anchor
  (`anchor-name: --docked-foot`) and the toasts' layer sets its bottom to that anchor's top
  (`anchor(--docked-foot top, 0px)`, `main`'s foot without one), so the layer stays one
  viewport in the Shell's `main` and follows the foot in the frame it grows (anchor positioning
  is Baseline since January 2026: Chrome 125, Safari 26, Firefox 147). Rejected: the
  viewport moved into the page's column, since the page is a size container, whose layout
  containment makes a stacking context between the toasts and the root (below), and a
  Place and a filling Thread inside it would each draw one. A frame never tells
  the Shell what it is after paint; the Shell learns it before the first frame. On the web the
  page marks its tree and the Shell's column reads the marks by `group-has-*/column` variants:
  a pushed Screen's root carries `data-screen`, which hides the tab bar, and a floating act's
  layer `data-act-floats`, which shows the act's room under the toasts, so both hold from the
  first paint and across the density line. Native has no such selector, so the frame draws what
  the Shell would have had to learn: the Shell hands its tab bar to each Place (`ShellTabs`, as
  it hands the switcher), which draws it under its body, and a pushed Screen draws none and
  clears the home indicator itself; the region that stands over the page's docked foot draws the box
  the toasts stand in (`ToastRoom`): a Place's body over its act's room (above its `foot` and the
  tab bar by layout), a pushed Screen's body, or a filling Thread's log (above its input, and
  lifted with it over the keyboard), the Place leaving it to a Thread it holds, as its child or
  its Split's record; the box places the Shell's toasts' layer by measuring itself against the Shell's root
  (`ToastFrame`), the one measure left, since the layer stands outside the page's tree (below).
  Rejected: a registration the Shell reads in render from a host object, since a frame that
  mounts after the Shell's render (a route that waits first) leaves nothing that renders the
  Shell's tab bar again. A Split and its page work the same way on the web: the Place (or a
  pushed Screen) owns the handle of the Split's details sheet (`DetailsSheet`) and always draws
  the back act to its route and the Details act, and the Split marks its root `data-record`,
  `data-pane` and `data-beside`; `group-has-*/page` variants on the page's head show the back
  act below `tablet` with a record, the Details act below `wide` with a pane and at every width
  beside a record, and hide the head below `tablet` beside a record, while a Toolbar leaves with
  the list below `tablet` with a record, all from a deep link's first frame. Native has no such
  selector, so by contract a Split stands as its page's direct child (the page's frame region,
  stated in both rules pages): the Place or Screen reads the Split element's props among its
  children in render (`useSplitHead`, as a Toolbar sorts its children by type), so its head
  draws the back act with a record, the Details act with a pane and no head beside a record from
  the first frame, and holds the Details sheet's open state (`DetailsOpen`), which closes with
  the pane it opened on. A Split standing deeper draws as a plain region and no head draws its
  acts. Rejected: a registration the Place reads in render from a host object, since the Place's
  head renders before the Split in the same pass and a Split inside a component that re-renders
  alone (a selection in that component's state) would leave the head stale. Each region keeps
  its own keyed scroll, so a record opens at its top after a scrolled list.
- A molecule whose structure follows density keeps one constant per structure, never a density
  axis: the page's head (`PAGE_HEAD`, one hairline at both densities) holds the desktop strip
  (`PAGE_TOP_BAR` with the title and acts in one row) or the touch one (`PAGE_TOP_BAR` over the
  title, which keeps `PAGE_TITLE` above the hairline), the sidebar
  (`SHELL_SIDEBAR`, `PLACE_ROW`) and the tab bar (`SHELL_TAB_BAR`, `PLACE_TAB`), the split's
  list inside its hairline and the list alone. The web picks the structure under `touch:` or,
  for a Split, by its page's width: every Place and Screen is the `page` size container and the
  web's `page-<breakpoint>:` / `page-max-<breakpoint>:` variants, emitted from the breakpoint
  values, query it, so the Split's regions and the Details and back acts its marks show follow the room
  the page has beside a sidebar rather than the viewport; native draws the touch one. A bleeding
  body draws no inset, and whatever stands first in it (a Toolbar, the record, the list alone)
  carries its own top inset.
- A loading form stands in for what it replaces at that part's size: `SKELETON` by the part
  (`line`, `avatar`, `icon`, `dot`, `check`, `switch`, `count`, `field`, `meter`, `chart`) and
  `SKELETON_ROW` by the row it replaces (`setting`, `field`, `facts`, `one-line`,
  `one-line-group`); a ListRow waits in its own markup (below). The loading frame keeps the loaded
  frame's height.
- No arbitrary values in a cell, in either spelling. A control pads across on `control-x`, stands
  on a size (`min-h-control`, `min-h-field`) and insets on a spacing role; density moves all
  three through the variables.
- No framework code in ui-core. Framework-free logic both platforms run (the token derivations,
  a collection's state decisions in `list-state.ts`) lives here once, so the web and the phone
  share one source instead of keeping byte-identical twins; React and React Native code never
  does. A cell that needs a platform conditional belongs in the overlay; the spinner's ink is the
  recorded example (native colours a prop, not a class, so its cells carry its geometry alone,
  its ink is its place's, and `ContentTone` is the shared contract). A line diff stays in each
  plugin: `Diff`'s `before` and `after` are diffed with the `diff` package both plugins carry and
  ui-core does not.
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
- A row's leading is one slot at the avatar's size (`ROW_LEADING`), the dot, spinner or glyph centred
  in it, so the titles of a list share one x whatever leads them; its meta line (`ROW_META_LINE`)
  is one line that yields in order: the later parts truncate first, then the chip; the first part
  (naming the item) and the status keep their width, and past them the line clips at the row's
  edge rather than overprint. The parts' box is at least the first part's width because the later
  parts take no width of their own (`w-0`, growing into the room the marks leave). Every row keeps
  one height, so its waiting form matches it by construction. A short label (a chip's, a status
  word, a skeleton label's lane) is bounded by the one width `measure-short` (18ch, the short
  sibling of `measure`).
- A minimum height is the floor of something pressed (a control, a field, a target, a chip, a
  row), the set height of a bar (`strip` 40 / 44: the page's desktop strip and its touch top
  bar), an intrinsic size, or the height of what a part swaps with: `PENDING_TRACK` an action
  bar's (`min-h-control`).
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
  keeps it under the list and, where the record stands alone, under the record; a `beside`
  Screen keeps it under its sections where it stands alone. Two mounted
  copies of the act would each keep their own state, so the act is never duplicated. The act is
  lifted (`FLOATING_ACT_LIFT`, `shadow-float` at the control radius) as a Thread's Latest act is:
  an act floating over what scrolls is a lifted layer, the one shadow it carries.
- A field that stays in view while a Place's sections scroll (an ask box over a home) is the
  Place's `foot`, an explicit slot: it docks under the body at both densities on the shared `FOOT`
  cell (the page inset at the sides and foot, the cell a filling Thread's input docks on, held by
  no entry), the body scrolling past it, above the tab bar on touch and, on native, lifted over
  the keyboard (the body and the foot share one `KeyboardAvoidingView`, `Lifted`). The body
  ends a sections gap over it (`PAGE_BODY_OVER_FOOT`), as a filling Thread's log ends over its
  input, so the field reads apart from the last section; on the desktop the foot stands in the
  measure-wide column (`THREAD_COLUMN`) a Thread's input stands in. It reports
  the Shell's toasts' anchor as a filling Thread's input does. `act` and `foot` are exclusive in the props type:
  the foot's Send is the screen's one filled act, so a floating act beside it would be a second.
  A Place with a `foot` gives a Thread no room to fill (`ThreadRoom`), so a Thread in its body stands inline among the
  sections with no foot of its own, and no Latest act stands over the Place's foot. Rejected: a
  foot derived from a Thread's position (a Thread in the last Section docking its input), which
  hides the dock from the call site; a `MessageInput` docked variant, since docking is the
  frame's, never the field's.
- A record the main opened is the Split's `beside`: a `Screen`
  whose `back` is the main's route, given by the consumer because the route's depth differs by
  surface and no component can derive it. From `wide` of the page the list, the main and the
  beside record stand together, main and beside sharing what the list leaves half each
  (`SPLIT_BESIDE`, `grow basis-0`: a structural fraction, never a width token; the web parts
  them by the beside's start hairline, an overlay from `wide`). The main's inset sits on a box
  inside its scroll, never on the shared box, because a `basis-0` item still counts its own
  padding against its share; the Screen's back act draws as
  Close to the same route, and the pane leaves for the Details act at every width, which the
  Split's `data-beside` mark shows. Below `wide` the beside record stands in the main's place with
  its back act, a pushed page inside the Split. Below `tablet` (the web) and on the phone, where
  it stands alone, its head is the page's one: the Place reads the Split's `data-beside` mark (the web) or its `beside` prop (native), and
  draws no head, so one top bar holds one back act, to the main, and the list is reached by
  going back from the main; the Split hands the Details act to that head through `Beside`. The Split hands the Screen `Beside`: the Screen covers no tab bar, its title
  is a heading at the level where it stands, and where its head stands alone the page's top heading
  (native's header role has no level; the web draws the title twice, the `h1` below `tablet` of
  the page and the lower level from it, the other `hidden` out of the accessibility tree, since a
  container query swaps a pair but changes no tag; its body keeps the lower level, a body no pair
  can swap), and on the web its body's sections, not its root,
  are the `page` container, so its head's acts and the floating act's room read the outer
  page's width and what stands in its body reads its own. Rejected: the record in the pane (the pane is the open record's details, at
  forty-five characters), a `Sheet` (an overlay over the scrim with no back to the main), and a
  width token for the beside record.
- A bar at a phone's bottom edge clears the home indicator with the web emit's `pb-safe`
  (`padding-bottom: env(safe-area-inset-bottom)`, non-zero under the document's
  `viewport-fit=cover`), an overlay the tab bar spells beside `SHELL_TAB_BAR`; native pads the
  same inset from `react-native-safe-area-context`.
- A frame's fixed regions are widths (`sidebar`, `list`, `pane`, `column`, `auth`, `empty` an
  empty state's column), so a region
  keeps its measure at any viewport. A skeleton bar alone takes a fraction width (`w-1/12`,
  `w-1/5`, `w-1/4` to `w-3/4`) to stand at its text's length: structural, a closed list in the
  web verify's overlay acceptance, never a token; a chart column's share of its slot (`w-2/3`)
  is structural the same way. A size the data decides (a meter's fill width, a chart column's
  height) is the value's share, set by the component on both platforms, never a class.
- A class with no look is structural, an overlay the web's class sweep classifies: a stacking
  order inside one component (`z-1`, a frozen table column over the cells that scroll under it,
  inside `isolate`, the grid its own stacking context so the column never stands over a sheet),
  `sr-only` (a contract utility with no token), `invisible` (an absent act holding its slot's
  width), grid placement (`col-start-1 row-start-1`, two acts in one slot), `table-fixed`, a
  hanging indent (`-indent-control-x`, a wrapped diff line's first line pulled back over its
  hang) and `wrap-anywhere`.
- The stacking order between components is a token, `STACK_ORDER`, each layer one step above
  the one before (`sheet` 1, `popover` 2, `toasts` 3, over the page's 0), emitted on the root as
  `--layer-<layer>` and read on the web as `z-(--layer-<layer>)`, since Tailwind's `z-*` reads no theme namespace. A sheet's
  scrim and layer, each popover's positioner and the toasts' layer each draw theirs, so a toast
  raised while a sheet or a `confirm()` is open stands over the scrim and its dismiss takes the
  press. Base UI portals a sheet into `<body>` after the app root, so by DOM order alone a sheet
  stands over the toasts. The toasts' layer stays inside `main` for its geometry
  (above the tab bar, the floating act, the docked foot's anchor), so nothing between it and the root may
  make a stacking context. Base UI's modal leaves the toasts announced: it marks the outside
  `aria-hidden` but keeps every `[aria-live]` element and its ancestors, the toasts' viewport
  among them. Rejected: a literal `z-*` at the call site, and portalling the toasts after the
  sheets (a Base UI portal mounts in the order it opens, and the layer would lose `main`'s
  geometry). React Native's `zIndex` orders siblings only, so native reads the order by tree
  position: gorhom's `BottomSheetModalProvider` draws its sheets after its children, in its own
  host. The native Shell holds a provider around its column, inside a host view, and draws the
  toasts' layer after that view, so over every sheet; the layer stands over the box the page
  draws for it (`ToastRoom`), measured against the Shell's root, so the toasts keep the page's
  geometry. A sheet resolves the
  nearest provider, so every sheet opened under a Shell stands in the Shell's host and stacks
  against the others there; the entry's root provider hosts only the screens with no Shell, where
  no toast stands, so the two hosts never hold sheets that must stack together. The host view is
  never flattened: a sheet's layer is `accessibilityViewIsModal`, which hides its siblings from
  VoiceOver, and the toasts' layer is not among them. gorhom draws a sheet's content in its
  host, outside the screen that opened it, so the entry's words, Query and Auth providers wrap
  the root provider. Rejected: a toasts portal through gorhom's host (its name is internal, and
  an entry keeps its first mount's place, under every later sheet), react-native-screens'
  `FullWindowOverlay` (iOS only; a plain `View` on Android), and a layer wrapped around the root
  provider that the Shell hands its frame (a context, two effects and an export for what the
  Shell's own tree holds).
- A table cell stands at the row's floor behind a transparent side border (`TABLE_CELL`:
  `min-h-row` and `px-control-x`), and the `Input` that edits it in place stands inside it at
  the field's bar fit, so a cell and its edit put their text in one place and the row keeps its
  height at either density. The row (`TABLE_ROW`) is a hairline under the pointer's and the open
  record's washes; the wash is the body ink at an alpha, so every ink the sheet measures on the
  surface keeps its ratio on it. A sortable header is a cell-wide act (`TABLE_HEAD`), its label
  meta 500 in the meta ink and the body ink on the sorted column (`TABLE_HEAD_LABEL`). The grid
  draws from `tablet` of the page up; below it the Table is a `List` of `ListRow`s with its sort
  a `Picker` above them, its options the sortable columns, the sorted one led by its direction's
  glyph (`Option.icon`), the trigger named "Sort, {column}, {direction}" by the words `sort`,
  `ascending` and `descending`; its rows are the List's `items` through a `row` map whose slots
  the columns declare (an age column the trailing, the status and chip columns the marks), so its
  loading rows wait in the slots the loaded ones draw.
  A Table takes data as a List does: `query` (with `sentence`) or `items` (`loading` while a
  compound body waits), each `TableColumn<T>` reading its cell from the item by `cell`, and a
  `row` map (`TableRowSlots<T>`) for the row's own slots. Both forms draw one projection,
  `tableRecords` in `./list-state`, so the grid and the touch List read the same item. It decides
  its state by the List's `listState` and draws each at the leaf: pending, the header over
  skeleton rows (the touch List's waiting rows); failed, the failed EmptyState with `sentence`
  and Retry, and missing, the missing form, each under the header on the grid and alone on
  touch; empty, `empty`; then its rows. It
  registers with the Section around it once (waiter, count, rows) and mounts its touch List under
  an empty `SectionContext`, since on the web both forms are mounted and the List would count the
  same rows again.
  A row with `href` is its leading cell's link (`tabindex -1`, so a new tab opens it); a row's
  `locked` names the columns it draws read only (an owner's role). A chip
  column's pick draws its value and options as the column's chips (the Picker's internal base), and
  an Input, a Picker or a Checkbox inside a cell stands at the bar fit, named by the cell and out of
  the tab order, by the cell's context. An edit the keyboard or a tap starts mounts its cell's
  control afresh, a typed one focused and a pick open; Enter, Escape (which ends the field's
  `CommitMoment`, so the leave after it commits nothing) and the pick's close end it in their own
  handlers. Enter and Escape focus the cell at once; the pick's list names the cell as its
  `finalFocus`, so Base UI hands focus back there once the list unmounts, after an option's own
  press has focused it, unless a press outside the list moved focus on. A loading status cell is the Status's own loading form (its
  internal base: the dot's and the word's skeletons at its gap). An empty grid keeps its header and holds its
  `empty` a page inset under it, across the grid's width as a List's EmptyState fills its
  column (`TABLE_EMPTY`: no side inset; on touch the form stands alone, the List's width). A read-only check cell draws a tick, read aloud as
  its column's label. Where the grid scrolls sideways its leading column stays: the frozen cell
  on the surface (`TABLE_FROZEN`), its content carrying its end hairline and the row's wash
  (`TABLE_FROZEN_CELL`).
  A grid re-renders only the rows and cells whose state changed: rows and cells are memoised
  components fed per-cell values and one stable set of callbacks. On the web a cell holds the
  pointer's hover itself (an editable cell under the pointer shows its control), so a pointer
  crossing the grid renders the cells it leaves and enters; the cursor moves by focus, and a
  focus on the cursor's own cell sets nothing. On the phone a row's two halves (the frozen
  leading cell and the cells that scroll) wash together on a press, so both read one store of the
  pressed row's id, each only whether it is the pressed one; a sortable header washes through the
  Pressable's own pressed state. The web mounts both forms and CSS hides one, since the switch
  is the page's container width, which no store reads: a sort, a selection or a data change
  renders the rows twice until Place and Screen hand their page's width to one external store.
- A thread is a molecule (`Thread`), a collection: its Messages from `query` (with `sentence`)
  or `items` (waiting on `loading`) through the `message` map, one function per `Message` slot
  (`key`, `author`, `name`, `body`, `at`, `onOpen` returning a system line's handler or none,
  and `detail` returning a system line's `MessageDetail` or none), a sections gap apart (one rung above Prose's block gap), and its `MessageInput` its `foot`, the
  one authored part, drawn in every state. Pending, the log holds Message's own loading forms in a
  fixed order (`WAITING_MESSAGES`: another's reply, yours, another's reply), for each author is
  the item's and unknown before the data, each at its loaded height (yours its bubble over its
  time's bar, `figures` wide, as the loaded bubble stands over its time); failed, the failed EmptyState with `sentence` and
  Retry; no message, `empty`; each in the log's column. On the desktop both stand in
  a measure-wide column centred in the page (`THREAD_COLUMN`, held by no entry: a Place's `foot`
  and a record's `ItemHeader` over a filling Thread stand in it too), on touch in the screen's. A
  Thread in a Place's body fills the page at every width, decided by where it stands, from its first render:
  the frame hands it `ThreadRoom`, and the body draws no inset and leaves scrolling to it, its log scrolls at the page inset (`THREAD_LOG`),
  opening at the newest message and following each that arrives while the reader is at the end,
  the input docked at the foot (`FOOT`); a Section takes the room back. The phone log's origin is
  its end: the ScrollView and each message turn upside down (as React Native's `VirtualizedList`
  inverts a list), the messages newest first, so its first frame shows the newest message and a
  keyboard's resize keeps the bottom anchored; `maintainVisibleContentPosition` keeps a
  scrolled-up reader's place as a message arrives at the origin, and follows from the end. Its
  insets swap (`THREAD_LOG`'s top inset at its layout end) and a short log stands at its layout
  end, the top of the screen. Rejected: scrolling to the end from `onContentSizeChange` and
  `onLayout`, which showed the oldest messages for a frame and jumped on each keyboard resize. The web Thread marks
  its filling root `data-fill` and the region reads the mark with an arbitrary
  `[&:has(>[data-fill])]` variant (Tailwind 4's `has-[...]` takes no child combinator), so the
  body's form follows the Thread from its first paint with no state in the frame. The marked
  forms restate contract cells in the web overlay (`thread/fill.ts`), since Tailwind reads
  literal classes only and the contract holds no platform overlay (ui-core's c21): the body's
  `PAGE_BODY` inset zeroed, the Split main's `rest` cell turned into its `fills` one, and
  `THREAD_COLUMN` under the main's mark. react-ui's `fill.test.ts` holds each to its cell by
  resolving the insets side by side, so a cell that changes without its marked form fails
  `pnpm check`. Native has no
  such selector: by contract the Thread stands as the body's direct child (as `main`, or in a
  fragment under the record's `ItemHeader`, in a Split), and the Place or Split reads it among
  its children in render (`holdsThread`, as a sheet reads a TextArea). The native body keeps one
  element type in every form, its keyboard-aware scroll stilled (`scrollEnabled` and `enabled`
  off) with its content held to its height, so a Thread arriving late remounts nothing beside it.
  Rejected: a Thread telling its frame in a layout effect, which commits the frame twice and, on
  native, swapped the body's scroll for a view and remounted every sibling. A filled Place's
  floating act would stand over the docked input: accepted while no Place has both. A Split's
  main gives it room too, so a Thread under a record's `ItemHeader` fills the main the same
  way: the main stops scrolling, keeping the page inset
  around the head alone (`SPLIT_MAIN {state: fills}`; the web spells it as the `rest` cell less
  its gap and foot under the fill mark), and the Thread bleeds through the sides
  (`-mx-page`, an overlay by `ThreadBleeds`), its log and foot carrying the inset themselves,
  a page inset under the head over a hairline (`THREAD_UNDER_HEAD`) the scrolling messages meet;
  the Split hands its main `OverThread` and the `ItemHeader` stands in the Thread's column on the
  desktop under the main's fill mark (`group/main`). The input docks at the main's foot and names the toasts' anchor as in a Place. The bleeding Place's act
  still floats over the list, and where the record stands alone its room stands under the input.
  While a filling Thread's reader is scrolled up (the log's `atEnd` false), a secondary `Button`
  (`ArrowDown`, the word `latest`) floats centred at the foot of the log's region, a pair above
  the foot, on a lifted ground at its radius (`THREAD_LATEST`: `bg-raised`, `shadow-float`, since
  the secondary act draws no fill); pressing it scrolls to the end and resumes following (the web
  log takes the focus the act held). It takes no prop: the Thread hands its way back through
  `ToLatest` (the handler, `null` at the end), and the internal `Latest` draws from that context
  in whatever region stands over a docked foot. The layer is anchored inside that region, never
  hung above the foot by `bottom-full`, because Android does not hit-test a child outside its
  parent's bounds.
- A content molecule derives once per input: `Prose` lexes and folds its markdown, `Diff` runs
  its patch, `ProseDiff` its word diff and runs, and `QrCode` its encoding and module path, each
  memoised on its text and skipped while it waits (a waiting QR tile draws a version 2 code's 25
  modules and encodes nothing). `Message` is memoised on its props, so a thread's re-render
  skips each reply and bubble whose author, body and time are unchanged; a system line whose
  `onOpen` or `detail` the thread builds afresh renders again. The showcase compiles the
  workspace's plugin source with the React Compiler, which memoises on its own; a consumer's
  `node_modules` copy is not compiled, so these memos are explicit.
- A `MessageInput` sends while an answer streams: `working` sets Stop before Send and leaves
  Send live, so Send and Enter send whenever the text is non-empty. Stop is the secondary bar
  Button on the desktop and an icon act at the bar fit (`ICON_BUTTON.fit.bar`, `CircleStop`) on
  touch, so the touch field gives up only a compact square. Lucide draws no filled stop square,
  and a bare `Square` beside the field reads as an unchecked box. What becomes of a message sent while
  an answer runs is the consumer's sentence in `notice`; the input takes no prop for it.
  On native, Send and Stop never touch focus: the keyboard stays up because no tap takes it, the
  Place and Screen scroll (`Scroll` in `lib/hosts`) keeping taps on its acts
  (`keyboardShouldPersistTaps="handled"`) and a docked foot standing outside any scroll. The web
  input refocuses its text after Send and Stop, which is keyboard focus management there. A
  removed chip hands the screen reader's focus on (`sendAccessibilityEvent`), never the keyboard.
- Focus at mount is declarative on native: a typing control (`Input`, `InputOtp`) takes
  `autoFocus` from `FieldFocus`, which the caller that knows no other field holds focus sets (a
  confirm's typed name), never a mount effect reading the focused input.
- What an agent made or did stands in a thread as a system Message's `detail` (`MessageDetail`,
  exactly one of three, the others typed `?: never`): `row`, one `ListRow` on the group ground in
  a hairline card on the surface (`MESSAGE_CARD`), its slots the row's (the kind leads as the
  icon or the first meta part), opening its record; `code`, a free act's arguments in the code role under the line, its verb,
  in the meta ink since they rank under it (`MESSAGE_CODE`);
  `fold`, meta lines (`MESSAGE_FOLD`) the line opens in place under it, its
  chevron turning down, read whole without a sheet. The code and the fold stand start-aligned
  across the message column at the pill's inset, wrapping at a space and breaking a token only
  when it outruns the line. The line stays the centred meta line; a fold's
  line is its toggle, so it opens nothing else. A thread holds one item kind, so a row or a `Code`
  between messages is a detail, never a second item map or children.
- A collection takes data and draws its states at the leaf. A `List` takes `query` (or
  `items`, waiting on `loading`) and one item map: `row`, one function per `ListRow` slot,
  `file`, one per `FileRow` slot, or `meter`, one per `Meter` slot. Its waiting rows are the row's
  own markup (`list-row/wait.tsx`, `file-row/wait.tsx`, `meter/wait.tsx`), a ListRow's with bars in
  the slots `row` declares, a FileRow's chip bar only when `file` declares `chip` (`fileShape`)
  and a Meter's meta bar only when `meter` declares `meta`, read before any item exists. The `leading` slot names its kind by its one key (`{ avatar }`, `{ icon }` or
  `{ status }`, each a function of the item), so a list's rows share one kind or have none, and
  the waiting row draws that kind's mark at its size (`SKELETON` `avatar`, `icon` or `dot`). A
  trailing waits `figures` wide; a declared `status` or `chip` draws the marks' bar at the meta
  line's end, half its own short-label lane (`RowShape.marks`), as the loaded marks end that line; a declared `more` keeps the act's room empty. A collection of
  unknown length waits as four rows, and its height change on load is accepted. A failed query
  draws the failed EmptyState with `sentence` and Retry; no item draws `empty` (an EmptyState's
  props, its act the one that fills the list). Its decisions (which state, the waiting shape, the
  count, Retry) and the Section's total (`sectionCount`) are ui-core's `./list-state`, which both
  platforms import, tested without rendering.
- A read that answers not found is `missing`, a state of its own beside `failed`: every read
  ends in content, "does not exist" with a way back, or Retry, and Retry cannot bring back what
  was removed. `missing(query)` in `./list-state` reads the query's `error` by shape, true for
  `code === "NOT_FOUND"` (what stack's procedures throw as `ORPCError("NOT_FOUND")`) or
  `status === 404`, so ui-core imports no client library; `QueryLike` carries the optional
  `error` a `useQuery` result already has, and no prop is added. `listState` returns `missing`
  for such a query, and `boundaryState` makes a `QueryBoundary` draw it when every failed query
  answers not found (one that failed otherwise keeps Retry). Every collection that takes `query`
  (List, Table, Thread, Comparison, BarChart) and the boundary draw the missing form
  (`empty-state/missing.tsx`): the EmptyState at rest ink with no mark, the word `missing`
  ("This no longer exists.") and Back, the hairline act with no plus (a Back is no create act,
  as Retry is not; the base's internal `missing` tone carries it), never Retry. An OptionList
  draws it as its card's line, `missing` beside a secondary Back, as its failed line stands.
  Back goes to `BackRoute`, the enclosing `Screen`'s `back`, else to the Shell's `PlaceRoute`;
  with neither it draws no act. Going to a route is navigation, so on the web Back is an anchor
  in the hairline act's look (the internal `ButtonLink`), as a Place's and a Screen's back and
  Close acts are anchors in the icon act's (`IconButtonLink`); native presses through
  `navigate`. A missing list gives the Section no count.
- A `Comparison` is a collection of facts with the List's source (`query` with `sentence` and
  `empty`, or `items` waiting on `loading`) and a `row` map over a fact's slots: `key`, `label`,
  `values` (one per column, in order) and `chips`. Its column heads are its declared `columns`,
  known before the data, so its waiting form is the real head over four facts of bars: a value bar
  per column, and a chip's bar beside the label's when `row` declares `chips` (`factShape` in
  `./list-state`), each bar a share of its line's short-label lane (`SKELETON_LANE`), so it
  stands at a typical label's or value's length rather than the column's. It registers its wait with the Section around and reports no count: its facts
  are one record's, not items the Section counts.
- An `OptionList` is a collection with a static form. A static set takes `options` (an `Option`
  is already the projected row, waiting on `loading`); a set from a query takes `query`,
  `sentence`, `empty` and an `option` map over the check row's slots (`value`, `label`,
  `description`, `recommended`, and `group`, the label it stands under, groups in the order they
  first appear). Every state stands in its card, so the field keeps its place in the form:
  waiting, four check rows, two-line only when `description` is declared (a static set: when an
  option is described) under a group label's bar only when `group` is; failed, one row holding
  `sentence` and a secondary Retry at the bar fit; empty, one row holding the `empty` sentence.
  It registers with no Section. Its projection and waiting shape (`optionsOf`, `optionShape`,
  `optionsShape`) are in `./list-state`.
- An `OptionList`'s `value` picks its form: a set is several choices, check rows each toggling
  the set; one value or null is one choice, radio rows read aloud as a radiogroup (the web's
  Base UI `RadioGroup`, native `radiogroup` around `radio` rows with their checked state). The
  radio is the box's size (`OPTION_RADIO {state}`, a `full` ring in `edge-strong`, `toggle-on`
  when chosen) around the `toggle-on` dot (`OPTION_RADIO_DOT`), both held by OptionList. The
  radio is the focused element, so the web's base focus ring draws on it; waiting, radio rows
  lead with the ring's skeleton (`SKELETON {kind: radio}`), check rows with the box's. The
  description line, the recommended mark and the children under the chosen option are the same
  in both forms. The form is the component's two call signatures (`OneChoice`, `SetChoice` in
  `./list-state`), so an inline `onChange` takes its parameter from `value`: TypeScript does
  not narrow a props union by `value: V | null` against `value: readonly V[]`, neither member
  being a literal type. Rejected: a `ChoiceList` beside it, the same rows under a second name.
- A `BarChart` is a collection on the same decisions: `query` (or `items`, waiting on `loading`)
  and a `bar` map (`key`, `label`, `value`, `parts` by `keys`, `at`, each a function of the
  item). Its `keys` are declared, so its pending form is its loaded boxes in skeleton with the
  legend standing. Its failed and empty EmptyStates stand at its loaded height: the loaded boxes
  are held unseen under them in one cell (the web's grid placement and `invisible`; native lays
  the EmptyState absolutely over the boxes at `opacity-0`), so the Section does not move, and the
  EmptyState's frame fills that box with its content centred in it (`EmptyStateBase`'s internal
  `fill`), so nothing floats above or below it.
- A pending collection or `QueryBoundary` registers with the Section around it through
  `SectionContext`, released when it settles or unmounts; the Section stays busy, its count
  waiting, until every waiter settles. A List also reports its item count there once its items
  answer, and a Section with no `count` of its own shows its lists' total once every list has
  answered (a failed or missing one gives none); an empty collection shows no count beside its empty state. A `Group` or a `List` anywhere in the body registers as rows
  through the same context; a loading Section renders its body once, and when nothing registered
  rows its layout effect swaps the body for field skeletons in a synchronous re-render before
  paint, one skeleton per `FormField` that registered the same way (three when none did), so
  the swap is never painted; a registration or a release while loading checks again, so the only
  Group or List unmounting leaves fields. A loading Section's field children mount and unmount
  once before paint, so their passive effects run: nothing may rely on them staying unmounted.
  Every registration runs in a layout effect, so head and body land in one paint.
  A compound body sits in a `QueryBoundary`, which requires its `loading`. A `QueryBoundary` over
  a List in a Section draws no count placeholder while pending, for the List is not mounted to
  report one (unless the loading form is itself a List); a List taking its own query reports from
  its first render.
- `Group` is composition: its children are static rows. A set of rows from data is a `List`
  placed in the Group, which registers with it through `GroupContext` (however deep) and draws
  on the card: its rows and waiting rows at the group ground (`listGround`), the Group's hairline
  once between them (web: the rows stand in the card directly, under `GROUP`'s `divide-*`;
  phone: each row after the first draws it on its wrapper, as the Group does its children), its
  failed and empty EmptyStates in the card at `EMPTY_CARD` (the card their frame, in place of
  `EMPTY_FRAME`). A busy List makes the Group busy, for the card is its box. A waiting Group
  (its `loading`, or a loading Section's) renders its body once and, when no List registered,
  swaps it for setting skeletons before paint (`groupWait`), the Section's mechanism. A waiting
  setting row stands in the loaded DefinitionRow's boxes (the label's body line box beside the
  switch's target-sized hit box on the title line, the description's meta line box under it), so
  its height and its bars' centres are a one-line setting row's at either density.
- A Meter in a Group stands as its item at the card's inset (`METER_ITEM`, by `GroundContext`),
  the Group's hairline between; a set of them from data is a `List` taking `meter`, in the Group. A FileRow is selected at its `href`, as a ListRow is.
- On the web every route reader shares the page's one `popstate` listener (`useRoute` in
  `lib/navigate`). A List reads the route once and hands it to its rows through `ListedRoute`,
  internal: a row's `useRoute` takes it from there and subscribes to nothing, and a ListRow or
  FileRow standing alone subscribes itself. Rows are not memoised: a route change redraws the
  List's rows, cheaper and plainer than serializing each row's props to skip it. On the phone a
  Group keys each row's wrapper by the row's own key (`Children.toArray`'s, its place among the
  children as written), so a conditional row appearing shifts no later row's state.
- A FileRow carries at most one `ChipMark` (why the file is listed, or what its change is),
  standing between the path and the count lanes at its label's `measure-short` cap; the path
  takes the room the chip leaves, so the chip stays whole and the path yields: the chip is
  why the row is listed and reads in one glance, where a cut path gives up its directory first,
  keeping its file name, and its record opens in full a press away. The path fits by layout,
  never by measure, so it draws cut in its first frame and never re-cuts when the mono face
  loads: the name takes its width up to the whole box (`max-w-full`, no shrink) and the
  directory the room it leaves, ellipsized at its end down to nothing; past the box the name is
  cut in its middle, its end kept (the web: a truncating stem before an unshrinking tail of the
  extension and the three characters before it; the phone: `ellipsizeMode="middle"`). The chip's
  cells and size are FileRow's own in the roster, composed from `Chip`, with no token of its own.
- Code, Diff and ProseDiff stand in one frame on the surface inside a hairline (`CONTENT_FRAME`),
  so a diff's soft grounds always sit on the surface; a diff's number columns and a file row's
  count lanes are `figures` wide. A waiting Diff is a collection of unknown length: its hunk
  header and eight lines wait at the loaded rows' heights and code start, and its height changes on
  load by the line count, and on touch by the lines that wrap, which no waiting form can know.
- A copy act (`Code`'s, `DefinitionRow`'s) reads Copied for two seconds from the last copy: each
  copy is a counted moment and the reset is keyed on it, so a copy inside the window restarts it.
  Unfolding a `Code` moves focus to its already-mounted text in the press, before the fold act
  unmounts, so focus never drops to the page.

## The canon, the roster and the closed props

- The canon binds every component either UI plugin ships: one name per concept (`label`,
  `loading`, `onChange`, `onAct`, `act`, `blocked`, `sentence`), composed regions as typed
  descriptors (`Act`, `StatusMark`, `ChipMark`, `RowLeading`, `RowTrailing`, `PlaceSpec`, `Switcher`, `Option`, `OptionGroup`, `Part`, `FieldBinding`, `MessageDetail`,
  `Confirmation`, `MenuItem`, `TableColumn`, `TableRowSlots`) instead of node slots, and no
  `class` / `className` / `classList` / `style` prop. Laws live in the README under `## The
  canon`. An icon is an `IconName`, a closed type over Lucide's PascalCase
  names read off the `lucide` package ui-core depends on: the set is baked in, never a consumer
  map, and each plugin draws a name from one table built over its platform package's exports
  (`lucide-react`, `lucide-react-native`), which fails the build if the package lacks a name. A
  descriptor is generic only in a value, which is data: an option and a row's trailing pick (`OptionPick<V>`) in
  the string they pick, a field binding in the value its field holds, a table column
  (`TableColumn<T>`, bare a column over any item) and its row map (`TableRowSlots<T>`) in the item
  they read. `FieldBinding<V>` is how a bound
  `FormField` types its control by the field, and `useApiForm(...).bind(name)` produces it on the
  web from TanStack Form's store, one binding per name under the form's owner. Rejected: optional
  `value` and `onChange` on every control read from the field's context, which would compile a
  control with no value anywhere and could not type a boolean field against an `Input`.
- The roster is data: `ROSTER` in `packages/ui-core/src/roster.ts` names 55 components in four
  layers (atoms, layout molecules, shared molecules, content molecules) with their prop names,
  the cells each draws (a whole matrix family, one family cell as `FAMILY.axis.value`, or a single
  cell) and the states it has a form for, the same in both plugins; the showcase draws exactly those matrix cells and states. Each plugin's verify suite reads every component's exported props type
  against it with ts-morph, so a prop added on one platform, renamed, or a style channel reopened
  fails by name. A component's directory is `componentDir(name)` (`ListRow` → `list-row`).
  A component draws another's place by composing that component, never by spelling its cells,
  so a change to the component (its hit box, its ring, its press, its label) reaches every place
  it stands. An entry declares `holds`, the families and constants of its own box, and
  each plugin's verify fails a component that imports a held cell outside its holder's
  directory. A popup trigger renders the icon act's base (`icon-button/base.tsx`, which the
  `./components/*` export does not reach), taking the trigger's props through Base UI's
  `render`; on native a trigger is a press, and renders `IconButton` itself. A cell no entry
  holds is shared, spelled by each component that draws it: the type roles, the field box
  (`Input`, `Select`, `TextArea`, the Picker's field fit, the touch `MessageInput`), the row with
  its leading slot and its title and meta lines (`ListRow`, `FileRow`), the content frame,
  `FIGURES`, the option group and its label (`SELECT_GROUP`, `OPTION_GROUP_LABEL`: `Select`,
  `Picker`, `OptionList`), the line box, the popover, the skeleton, the page cells `Place` and `Screen` share, and the toasts'
  layer (`TOASTS`, which the Shell stands over its page). A Split's details sheet is the
  `Sheet` at the `pane` fit, composed through the sheet's internal base. `Select`, the
  single-choice field over `options`, is the field box (`FIELD`) whose open list is a popover
  (`POPOVER`) of rows (`ROW`); on native it opens the same option sheet as `Picker`.
- A component that sits in more than one container takes `fit`, a closed enum read off its
  matrix's `fit` axis (`IconFit`, `ButtonFit`, `IconButtonFit`, `LinkFit`, `ActionBarFit`,
  `FieldFit`, `SheetFit`, `PickerFit`),
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
- A confirm's act runs the work, as a Form's submit does: `ConfirmAct.onAct` returns a promise,
  the act is pending and the sheet's other acts inert while it pends, and the sheet closes when it
  resolves and stays open to retry when it rejects (the caller says why, a toast). `confirm()`
  returns nothing: a caller that awaited a boolean and then did the work left the sheet closed
  with nothing pending while the work ran, and lost the retry.
- A sheet knows what it holds before it presents. A phone sheet stands full height when it holds
  a `TextArea` (which grows with its value), read in render off the elements it is given, a
  `FormField`'s control included, so its snap point and dynamic sizing are set before
  `present()` and follow a wizard's page; a TextArea an app component draws inside itself is out
  of its sight. Rejected: the TextArea asking the sheet from a mount effect (gorhom mounts the
  content only once presented, so the sheet opened content-tall and re-snapped after paint, and
  never shrank back), and a public height prop.
- A sheet keeps its content until it has left. State that belongs to one opening resets as the
  next arrives, during render, never as the sheet starts closing: a sheet's touched and pressed
  marks reset as it opens or turns to a new page (a wizard's, or the next queued decision's), and
  a confirm's typed name and pending act reset when its decision's id changes. `Confirmations`
  draws the queue's first decision in the render that hears it, else the last one while its
  sheet leaves, and `ConfirmSheet` stays unkeyed, so a decision queued behind an open one takes
  the open sheet in place. Rejected: an effect mirroring the queue (the first `confirm()` drew a
  commit late, and a dismissed decision's content stood a frame in the next one's sheet), and a
  reset on close (the name emptied and the act turned blocked while the sheet left).
  A pick's sheet holds the same rule. On the web its rows, the search with them, are a component
  inside the sheet's popup, which Base UI removes once the leave has played, so the search dies
  with the sheet however it closes (a pick, the act, the scrim, Escape). The options' one tab stop
  starts on the chosen option, which the sheet hands Base UI's `initialFocus` by ref, and follows
  focus in the DOM, so an arrow key re-renders no option. On the phone the search stands in the
  sheet's head, apart from the rows, so it clears as the sheet opens; the options' groups derive
  once per options identity, shared by the trigger and its sheet, and the filter runs once per
  search. A cell's pick ends its edit once its list has left, never in the handler that closes
  it: on the web from Base UI's `onOpenChangeComplete(false)` (the sheet, the desktop list and its search
  alike), on the phone from gorhom's `onDismiss`. A Picker latches its form (the desktop list or
  its search, the sheet's search field) while open: the options' count picks it only while the
  list is closed, so data crossing six never tears down an open list and its focus. Rejected:
  clearing the search in the close handler (a pick or the act closed another way, and on the
  phone the rows re-expanded while the sheet left), and focusing the stop after two animation
  frames (a guess against Base UI's own focus).
- `Text` draws `body` and `meta` (plus `strong`) and names those roles' cells of `TEXT` and
  `TEXT_STRONG`, not either family; every other type role is drawn by the molecule that owns
  its place, and `TEXT` keeps all seven roles as the one table those owners draw from.
- Tokens are enforced by ownership: a token names a place, and the component that owns the place
  draws it. A component declares `owns` on its entry, the type roles,
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

## The guide

ui-core's `guide/` holds what is shared by both platforms: the screen recipe, the design critique
procedure, the rubric with its judging questions, and one page per pattern under `patterns/`
holding its measured range and the references behind it (`references.md` says how to read
them). The rubric is the standard every render is judged by, and the critique is run by a
session that played no part in composing the unit. ui-core is no plugin, so it contributes nothing itself: `@fcalell/ui-core/manifest` lists its pages, and
react-ui and native-ui each contribute them to `cliSlots.guide`, where the index lists a page
once. Each UI plugin depends on `@fcalell/ui-core` in the consumer's own `dependencies`, so the
index's `node_modules/@fcalell/ui-core/guide/` paths resolve. A platform's rules for every
`.tsx` are its plugin's own page (react-ui's `guide/rules.md`).

## Enforcement

Three verify suites (ui-core, native-ui and react-ui) are the design system's enforcement layer:
the derivation's scales and colour mixes checked against their rules and swept over every accent and cast hue,
matrices asserted verbatim over their full axis products, every class a cell or a web overlay draws
checked against the tokens its roster entry owns, the roster compared against every
component's props type, closure fixtures that compile every component's `?: never` props, word
and product-noun scans over the sources, class-literal set-equality against each plugin's overlay
allowlist, and every class a web component spells emitted by the built `app.css`. The web builds
the roster one component at a time, so react-ui holds each component directory present to its
entry and reports how many of the roster are built. A new
matrix that skips a registry, a component the roster does not name, a literal that duplicates a
cell, an off-contract utility, or a drawn word outside `words` each fails a named check.

## Limits

- Native has no render harness: its verify reads the components against the matrix strings and the roster, and no check draws a native screen.
- A native QR tile inside a dark raised ground draws its edge at the dark raised value: uniwind 1.12's `ScopedTheme` keeps the parent's scoped variables and cannot clear one. No screen does this today.
- A native Button's `count` is not read aloud: the pressable's accessible name is its `label` alone.
- A failed toast's announcement is Base UI's visually hidden `role="alert"` wrapper beside the toasts' viewport, which exists only while a failed toast stands and the viewport is unfocused, and carries no `aria-live`. When a sheet opens while a failed toast stands, the modal marks that wrapper `aria-hidden`, so a failed toast raised while one has stood continuously since before the sheet opened is not announced. Once no failed toast stands the wrapper is gone, and the next is announced.
- The native toasts' layer stands over a box measured against the Shell's root (`ToastRoom`, `ToastFrame`): the layer must stand after the sheets' host, outside the page's tree, so no layout places it, and it follows a growing input a layout late.
- A product cannot draw in the platform font: `fonts.sans` unset is IBM Plex Sans, and the platform stack only stands behind the named family and its metric fallback face.
- Comparison's `hyphens-auto` is unverified: the Nix Playwright browsers ship no hyphenation dictionaries, so a value wider than its column breaks mid-letter there.
- Native Diff and Comparison name a `list`-role container (React Native has no table role); whether VoiceOver and TalkBack announce that name is unverified.
