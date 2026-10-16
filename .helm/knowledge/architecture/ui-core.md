# ui-core, the design contract

`@fcalell/ui-core` is the design contract both UI plugins render from: the token contract with its
parametric derivation, the words the molecules speak, the shared `cn()` merge config, the
platform-invariant variant matrices, the component roster, and the shared descriptor types. It is a
preset library like `biome-config`: no `plugin()` factory, no slots, and no framework dependency.
The normative laws (the canon, the sharing line, the `cn` ordering rule, the roster) live in the
package README and are pinned by the package's verify suite; this entry holds the architecture and
its rationale.

## Tokens and theming

- The contract is the foundations sheet, held as data in `tokens.ts`; the emitted `app.css` carries
  exactly those values. Eleven namespaces are zeroed (`--color-*`, `--radius-*`, `--text-*`,
  `--leading-*`, `--tracking-*`, `--shadow-*`, `--font-*`, `--container-*`, `--breakpoint-*`,
  `--transition-duration-*`, `--ease-*`), so an off-contract utility compiles to nothing and
  `tablet:`, `desktop:` and `wide:` are the only viewport variants (the web's `page-*` container
  variants read the same values). The numeric `--spacing` base stays live because dimension
  utilities derive from it, so no build check can tell a role from a numeric; the matrices pin their
  cell strings verbatim and the closed props keep a numeric off a call site.
- Four knobs and nothing else: `accentHue` (264), `castHue` (the neutrals' hue, `accentHue`
  unless set), `fonts` (the two family names, IBM Plex Sans and IBM Plex Mono unless set) and
  `defaultMode`. Every other value is the sheet. The cast reaches every neutral (the grounds, the
  hairlines, the inks, the washes, `switch-off`, `fill-disabled`, `fill-neutral`, the light shadow ink) through the `"cast"` hue marker, the way `"accent"` marks
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
  (the body size per density, the 4 px space base, the accent hue) and each token a ratio or a rule
  of it. Colors are declared as a light and a dark OKLCH value, an alias of another role, a `veil`
  (a role at an alpha: the washes are the body ink at 5 to 15 %) or a `mix` (a role blended toward
  another in OKLab, one target for both modes or one per mode: the act fills' hover, press and
  pending states, the switch's hover), so what the sheet wrote as `color-mix()` is emitted as a
  literal both platforms parse. A literal or a `mix` may carry `holds` per mode, a contrast contract
  against named grounds, a ground optionally under a veil (`under`, composited in gamma sRGB as a
  browser draws it): the derivation moves its lightness from the declared or mixed one until each
  holds at the knob's hue, and clamps every accent value's chroma inside sRGB at its lightness, so a
  re-hued accent keeps its luminance and its contrasts (the verify sweeps all 360 hues of the
  accent, of the cast, and of the two together) and loses saturation rather than clipping. The sheet
  carries the held value at its own hue: `accent-ink` holds 4.5:1 on `group` and on `accent-soft` under `wash-press` (a banner act's pressed label), the
  dark `accent` 3:1 on `group` (a checked box, an on switch), `edge-strong` 3:1 on `surface` under
  `wash-press` and `wash-selected` in both modes (an unticked box on a pressed or selected row), the
  light `danger` 4.5:1 under `wash-press` on `group` (a destructive act's pressed label), the dark `act-danger` 4.5:1 under `on-act-danger` (the filled danger act: in
  dark a deep red of its own, since the danger ink holds no light label), each filled act's pending fill 3:1 under
  its label (the spinner on a pending act). Hover and press move a filled act away from its label:
  the accent and the danger toward black in both modes; its pending fill is inert and recedes toward its label in
  light and toward the page in dark. A labelled act's fill takes no 3:1 ground floor in any state,
  since its label names it; a toggle on (`toggle-on`, drawn by the switch, the checkbox and the
  slider) has no label, so it and its hover are measured at 3:1 on every ground and its hover
  lightens in dark, away from the near-black ground. The slider's unfilled rail is `edge-strong`, the
  thumb's own boundary ink, so a 2 px rail reads as part of the control and not as the hairline of the
  group beside it; a disabled slider's rail returns to `edge`.
- Color roles name the place they draw: surfaces (`canvas`, `surface`, `group`, `raised`, `edge`,
  `edge-raised`, `edge-strong`, `grid` the canvas's dot grid at 1.5:1 on `canvas`, `scrim`), three inks (`ink-body`, `ink-meta`, `ink-faint` for
  disabled text only), the accent (`accent`, `on-accent`, `accent-soft`, `accent-ink` for a link and
  the ring), three status families with `-soft`, six chip families by hue name each
  with a mark, a `-soft` ground and an `-ink` and a `neutral` family whose soft and ink alias
  `fill-neutral` and `ink-body` (no mark), eight avatar steps each with an `-ink`, seven washes
  (`fill-neutral` the resting neutral ground among them), six place aliases (`ring`,
  `selected-outline`, `edge-hover`, `edge-error`, `ink-error`, `ink-disabled`), the two act fills
  (`act-accent`, `act-danger`) with their states, and the switch's five with the shared `toggle-on`.
  `COLOR_GROUPS` holds the roles by those groups and `COLOR_NAMES` is its flattening. A chart's
  series take the `chart-<hue>` fills in `CHART_SERIES` order (the six chip hues at about 60 % of the mark's chroma, then `neutral`, a grey in the cast hue: no seventh hue stands outside the accent's 215 to 290 band the six leave free, 003-328; each holding 3:1 on `surface` and `group`, so a bar reads as data and a chip mark stays the chip's) and a meter's level turns on `METER_NEAR`,
  contract data the cells are keyed by (`CHART_FILL {series}`, `METER_FILL {level}`; `levelOf` in
  `./list-state` reads it, a meter's `mark` standing in for `METER_NEAR`), so both platforms draw
  the same series colour and the same level for a value. The dark hairline is two tokens because the
  dark ladder spans more than one hairline can straddle: a group or a lifted layer re-points
  `--color-edge` to `edge-raised` for everything inside it, so a part never picks between them. The
  grounds are `RAISED_GROUNDS` and the re-point `raisedGroundTokens`; the web scopes it on
  `.bg-group` and `.bg-raised` in `@layer base` after the mode scopes. Native has no selector to
  hang it on, so a raised surface wraps its content in `RaisedGround` (native-ui `lib/raised`),
  uniwind's `ScopedVariables` holding each re-pointed variable at the value its read resolves to in
  the mode (a scoped variable takes a value, never a `var()`); a sheet's three trees and a toast
  wrap, and no native `group` ground holds a part that draws `edge`. Rejected: a hue computed per
  avatar name (neither a token nor a cell); chip hues stepped off the accent (a family must never
  wear the accent, so the six are fixed and the accent's band is left out); `Status` with a family
  mode (a state and a data value are two concepts, so two names).
- Density is a theme, and it moves three scales (the room set, below, scales the radii, the fixed
  widths, the hairline and the ring too): the type roles (body 14 on the desktop set, 16 on touch,
  each role a ratio rounded to the pixel, its line box to the even pixel), the eleven spacing roles
  (multiples of 4, one rung looser on touch except the float and page insets and the acts gap; a
  list bleeds by `card`, so its rows' text meets the title over it at either density) and
  the thirty-seven sizes (control 32/44, field 38/48, target 28/44, `indent` 16/20 (a tree row's step
  in), `port` 8/8 (a canvas port's drawn size, over the 6/8 dot), the switch and its derived thumb travel, the avatar, three icon sizes by the text beside
  them, the check, the slider track, the one-time-code box, the meter's bar, the chart's plot, the
  QR square, and six derived from the type: the text area's three body lines, the message input's
  eight, an image thumbnail's four (`image-tile`, 88/96, the lines of provenance it stands beside),
  an image's height cap of twenty (`image-cap`, 440/480), one body line's box (`line-body`, 22/24:
  the height a part standing on a wrapped title's first line is pinned to, so a taller part
  overflows it centred, a height set where a `min-h` would grow with its tallest part) and
  `figures`, four tabular figures at the code size, held by a diff's number columns and a file row's
  count lanes), `hairline` (1/1, a field box's border: an act inside a bar-fit box reaches across it
  with `-my-hairline`, so the box stays at the compact control's height, border included) and one
  derived from two sizes: `chips-inset`, what the compact control has over a chip, halved, less the
  border (2/9, a pick of several's vertical inset). The thumbnail's name is not `thumb`,
  which the switch's knob holds: `size-*` and `max-w-*` read one `--spacing-*` namespace. A size
  counted in figures is px at `MONO_ADVANCE` (Plex Mono's 0.6 em), never a `ch` width, because
  uniwind has no `ch` unit and native draws the figures too; a named mono with a wider advance
  overflows it. The short measure is `ch` on the web (`measure-short`, 18ch), so each label keeps 18
  characters of its own font; native has no `ch`, so `nativeMeasureTokens` declares it in px at
  `SANS_ADVANCE` (Plex Sans's "0", 0.6 em) of the touch body size, rounded up (173). That is a native
  limit: there every short label's cap is the body's 18 characters whatever its role (a chip's caption included), and a named sans with a wider
  "0" overflows it. The running-text measure is a derived size, never a `ch` width: `measure` is 58
  characters at `SANS_ADVANCE` of the density's body size, rounded up (488 on the desktop, 557 on
  touch and in the room), so a meta line, a body paragraph and a form stand at one width where `ch`
  resolves in the element's own font and gave a meta line a narrower column than the body
  beside it. `measure-inset` is that width plus the page inset on both sides, the width a padded
  column stands at so its content is the measure. An
  icon's stroke is `ICON_STROKE`, a constant beside the
  sizes rather than a class or an `ICON` axis cell: the web's Lucide and native's Lucide and
  `react-native-svg` all take `strokeWidth` as a number prop, so one value in `tokens` reaches
  both platforms the same way and no class has to resolve to a stroke. `line` (2) is an icon's own weight, `mark` (3.5) the weight
  of a mark that carries meaning at the meta size, where `line`'s 1.17 px at 14 px straddles two pixel
  rows and a mark's hue drops under the 3:1 floor. The checkbox and the change mark (through each
  plugin's internal `IconBase`, whose public `Icon` stays at `line`) read `mark`; each plugin's
  verify fails any other stroke weight literal in `src/ui`. `themeTokens` seeds the touch set on both platforms; the web
  overrides it with the desktop set in a `:root` rule in `@layer base` under a fine pointer at
  `tablet` width and wider (so a desktop window narrower than `tablet` draws the touch set and
  structure), the cascade the dark layer rides, so no cell carries a density class: a non-inline
  `@theme` utility reads its variable, so `text-body` and `min-h-control` follow. `data-density` on
  the web root pins any set on any device, the showcase's pin, never a consumer option. Native is
  touch-only outside a room Place. A molecule whose structure follows density (an action bar at
  natural width on the desktop, full width on touch) reads it through the web's `touch:` custom
  variant, emitted over the density layer's own condition (the touch pin, or no desktop pin where
  the pointer is not fine or the viewport is narrower than `tablet`), and `useTouch` reads the same
  one query, so a structural class, a tree and the token set cannot disagree; native always draws
  the touch set, so it draws the touch structure with no variant; the variant sits in a web
  molecule's overlay, never a cell. A value that flips by density is the same overlay over the
  desktop cell, never a matrix value. Structure is decided by CSS wherever CSS can, a runtime check
  (`useTouch`) only where the tree differs (the Shell, Picker, Menu, Sheet, MessageInput, Rules and
  the Pane) or for behaviour (the ActionBar's reversed DOM order, a tooltip off on touch);
  a read that only picked classes is the `touch:` variant. Still read in JavaScript are the cell picks
  a plugin cannot prefix (an act's `fit`, `backGlyph`, the Table's frozen cells, the Sheet's cell
  picks). Rejected: a `fine:`
  variant in the cells (an interaction condition in a shared cell, meaningless on native) and one
  type scale at every density (13 on a phone is unreadable and 16 on a desktop row wastes the row).
- The `room` density is the third set, the one tier a screen declares (`Place.distance: "room"`),
  because no media query detects viewing distance; desktop and touch stay automatic. Both platforms'
  ten-foot guidance designs on one 960 × 540 canvas scaled to the screen (Microsoft at 200 % for
  XAML and 150 % for HTML, Android TV at mdpi), and on that canvas the body is 15–16, controls at
  least 32 and the information a phone's: stack's touch set. So the room set is the touch set drawn
  on `ROOM_CANVAS` and multiplied by the room unit `u = max(1px, min(100vw / 960, 100dvh / 540))`,
  never a third hand-tuned ladder. The canvas settles why the set scales instead of holding px: the
  CSS width a TV browser reports varies (1280, 960, 1920), so a fixed set is right on one screen and
  half or double on the next. The unit takes the tighter axis, so a portrait or ultrawide screen
  stays inside the canvas, and never falls under 1 px, so a small window keeps the touch set at
  least. At 1280 × 720 `u` is 1.33, at 1920 × 1080 it is 2 (body 32, title 44, control and target
  88, row 96) and at 3840 × 2160 it is 4. Two values differ from touch: `display` takes ratio 5 in
  room only (`ROOM_TYPE_SIZE`, 80 canvas units, so a glanceable figure stands 5.3× its meta label
  where the references run 5–9×; 2.77 stays right for a stat inside a page), and `page` is 12 rungs,
  48 canvas units all round (one role serves both axes, so it costs the height 42 units over the 27
  the guidance allows top and bottom; the Pane's head stands that inset from the top too,
  `PAGE_HEAD_ROOM`, since `PAGE_HEAD` pads the sides alone). The radii, the fixed widths (every
  width but the short `ch` measure, which follows the type), the hairline and the ring scale by `u`
  too: a 1 px hairline vanishes at three metres, a 6 px radius on an 88 px control reads square, and
  a pane must hold the characters it holds on a phone. Motion is unchanged, and focus is the
  existing ring, scaled (no scale transform: the roster draws focus as a ring everywhere, and a
  scaled element blurs its text on most TV compositors). The structure is touch's: the `touch:`
  variant and `useTouch` match inside a room Place, so nothing depends on hover. A room Place keeps
  the app's mode (it scopes no colours), and the ten-foot guidance runs dark, so an app that draws a
  room screen runs dark (`defaultMode: "dark"`). Emission: `roomTokens(scale)` is one record whose
  values are canvas units, `scale` turning them into the platform's value, so both platforms share
  one derivation. The web's `roomScope` renders each as `calc(N * var(--room-unit))` under
  `[data-density="room"]`, which the Place sets on its root (a root `data-density="room"` pins it
  page-wide) and which holds `--room-unit` itself, so the unit resolves at the element that reads
  it. The scales (`scales.ts`) take no theme, so native imports them without the colour machinery:
  it computes `roomUnitFor(width, height)` from `useWindowDimensions` and scopes the numbers with
  uniwind's `ScopedVariables` (`RoomScope`, the `RaisedGround` mechanism), a scoped variable taking
  a value and never a `calc`. The hairline reaches every border through `--default-border-width:
  var(--hairline)` in `@theme`: Tailwind inlines a theme value into the utility, so only a variable
  reference lets a bare `border` and a `divide` follow the room. A room Place holds one structure
  and never splits, since breakpoints (px literals, and the `place` and `page` container queries
  that read them) stay px while its widths scale: at 1920 a Place's container is wide enough to
  stand every Pane, with its widths doubled, so a second Pane would overflow; a room Place draws
  its last Pane alone. That Pane holds one column of `Columns`, `Stats` and `Stat`, with no `more`
  or `foot` (their layers portal outside the scope and would draw at the page's density): the rules
  pages state it, since a Place cannot type its Panes' props. Two limits stay named: a `vw` size ignores
  browser zoom (the screen is read from across a room, never zoomed, and the floor keeps it at the
  touch set at least), and `calc` sizes are fractional, so room line boxes leave the even-pixel rule
  (a TV scales the frame anyway). Rejected: a consumer density option or a viewing-distance media
  query (none detects distance), a hand-tuned third ladder (right on one screen, wrong on the next),
  breakpoints that scale with `u` (every container query rewritten, relative units in `@container`
  conditions unverified) and a `page-y` role used only by room.
- Emission returns token records, never CSS text (`themeTokens`, `rootTokens`, `modeTokens`,
  `densityTokens`, `roomTokens`, `reducedMotionTokens`, `shadowUtilities`): records
  validate per key, need no escaping, and keep ui-core free of `@fcalell/cli`. `modeTokens`
  carries every color and the two shadows by full custom-property name; both plugins wrap the two
  shadows in `@utility` rules reading `var(--shadow-<level>)`, because the `--shadow-*` theme
  namespace does not resolve into RN's `boxShadow` and a shadow is per mode. The web keys each
  mode on a class scope, `.dark` on the root and `.light` below it restoring the light set, so a
  light subtree renders light under a dark page; `rootTokens` puts the hairline, the ring (its offset, and `--focus-ring-edge-offset`, -1 px, for a field box that rings on its edge), the
  layers' order and the light shadows on `:root` outside `@theme`: no theme utility reads them,
  and a layer is read by the arbitrary `z-(--layer-<layer>)`, since `z-*` reads no theme namespace.
- What may animate is a matter of cost, not taste. `transform` and `opacity` run on the
  compositor; colour, `clip-path` and `filter` repaint one element and may transition too; a
  box's size or place never animates through layout (`width`, `height`, an inset, a margin, a
  padding, a gap, a grid track, `font-size`), since that runs layout every frame: it moves by a
  transform, a view transition on the web or a layout transition on the phone, which move the
  drawn box while layout lands at once. `structure.ts`'s `layoutMotion` and `cssLayoutMotion` hold
  it in each plugin's verify (`b-motion`: class tokens, a Web Animations keyframe, a Reanimated
  animated style, the web's `globals.css`) and `transitionedLayout` over every cell (ui-core's
  `c39`). There is no cap on motions a screen: each explains a change (where a thing came from or
  went, that a press landed, that a wait is live), which the judging page asks, and the settle is
  the page's one large motion that what enters inside it rides. Rejected: the earlier taste rules,
  only `transform` and `opacity` and one authored moment a screen, which stopped a state's fill
  easing in and a reveal that cost nothing the performance rule guards.
- Fonts split by fact: the theme names the families (`--font-sans`, `--font-mono`, each ahead of its
  platform fallback), each plugin's `fonts` option carries the files (a woff2 with fallback metrics
  on web, an expo-font source on native). The metric fallback face's name is one rule,
  `fallbackFace(family)` in `./tokens`, which the family stack names second and the web plugin
  declares its `@font-face` under, so the two cannot disagree. Rejected: a `role` on the file entry,
  which put the same fact in two places and let the two disagree.

## Words

Every word a molecule draws on its own (the seven `Status` words, `recommended`,
`copy`, `copied`, `download`, `back`, `close`, `cancel`, `dismiss`, `more`, `send`, `stop`,
`attach`, `search`, `checking`, `retry`, `add`, `remove`,
`edit`, `details`, `places`, `notifications`, `code`, `added`, `removed`, `sort`,
`message`, `copyFailed`, `downloadFailed`, `latest`,
`missing`, `readFailed`, `readEmpty`, `chooseFile`, `typeValue`, `pickValue`, `locked`, `photos`, `files`,
`changed`, `unchanged`, `stale`, `chooseAll`, `chooseNone`, `noMatches`, `imageFiles`, `audioFiles`, `videoFiles`, `textFiles`, `expand`, `collapse`, `zoomIn`, `zoomOut`, `fit`, `arrange`, `off`, `notFound`, `nowhere`, `discardEdit`, `keepEditing`, `discard`, `editUnsaved`, the counted
`earlierLines`, and the slot words `wrongType`, `stepOf`, `chosenOf` and `countOver`) comes from `words`, a closed
typed object with English defaults. The `Words` type requires every key and `wordsSchema` is strict,
so a translation missing a word fails `tsc` and the schema. It is a plugin option beside `theme`;
each plugin contributes a `WordsProvider` into the generated entry through its platform's
`providers` slot, so the value reaches the components with no consumer glue, and the context
defaults to English when no provider is mounted. A consumer's sentence is a prop on the molecule
that draws it, never a key. A word drawn with a number is data, `{ one, other }` each spelling
`{count}`, drawn through `counted(word, count)`, never a function: the words cross into the
generated entry as a literal. Two forms are English's; a language with more plural categories needs
a locale the words do not carry. A word drawn with values (a meter's "8.4 of 10") is one whole
phrase spelling named slots (`{value} of {max}`), drawn through `filled(word, values)`, the figures
localized by the component; the schema rejects a translation that drops a slot. Rejected: a bare
connective (`of`) composed around the figures, a sentence fragment a language cannot reorder. A
moment drawn as its age (a table's `age` cell, an ISO moment so the table sorts by it) is no word
either: each plugin formats it with the platform's `Intl.RelativeTimeFormat` (`numeric: "auto"`) in
the document's language, in one helper over ui-core's `ageWords` (`./clock`, its `ageOf` the one
walk from a moment to a value and unit). A row's trailing age is that moment too (`RowTrailing`'s
`age`): the `ListRow` words it short ("2 min", `Intl.NumberFormat` `unitDisplay: "short"` through
`ageShort`) and ticks it from the clock, so a caller and a Table pass the moment and run no
clock plumbing (the `age` form's optional `beside` is a static short value, a spend, drawn after the
age in the one trailing, so only the age node redraws on a tick); a moment after now keeps the long form, since a short "2 min" cannot say "in". Every `Intl` formatter
either plugin uses (an age, a moment, a meter's figures, a chart's ticks, a slider's value, the
phone's `compact`) comes from ui-core's `formatterFor(kind, lang, options)` (`./format`), built once
per kind, language and options at module scope, since building one costs far more than formatting
(Hermes most of all) and ages and moments format per row per render; each plugin's tests hold no
`new Intl.` in its `src`.

Ages and pending bars read one coarse clock per plugin (`lib/clock`, `useClock(read, until)`): an
external store read with `useSyncExternalStore`, ticking once a second while a reader holds it.
A reader renders again only when what its `read` returns changes (an age cell or a row's trailing age its words),
leaves once now passes its `until`, and the interval stops when no
reader is left, so a bar past its `until` ticks nothing. What they draw is pure in ui-core's
`./clock`: `timeLeft(end, now)`, and a `PendingRun` (`start`, `end`, `from`) whose
`pendingShare(run, now)` is the fill; a moved `until` starts a new run from the share reached, so
the fill never jumps back. The fill moves on its own from that share to full at `end` (the
track's full width scaled from its start, `scaleX` by a Web Animations animation on the web,
started before first paint, and by a linear Reanimated timing on the phone, so it never lays out), and the tick redraws only the time left. Under reduced motion (the web's
`prefers-reduced-motion: reduce`, read live; the phone's system setting as Reanimated's
`useReducedMotion` read it at launch) the fill steps with the clock instead: its share is set once
a tick with no animation, never jumped to full.

## Matrices and the sharing line

- `FAMILIES` (`./variants`) registers every matrix by its table's name with its axes read off the
  table, and `matrixCells` enumerates them into cells (`BUTTON.act.primary`): the verify suites and
  react-ui's showcase read the same list.
- The emitted `app.css` carries every contract utility whether or not a source spells it: react-ui
  contributes one `@source inline()` pattern per utility family over the token lists (colours as
  fill, ink, border, outline and divider; spacing roles as paddings, gaps and widths; sizes as
  heights, widths, minimums, maximum widths, paddings and an x translation; widths; type roles; tracking; radii;
  shadows; durations; easings). Tailwind reads source text, and the showcase's foundations page
  builds its classes from the token names. The cost is the whole contract in every consumer's sheet,
  about 7.5 kB gzipped.
- Matrices hold the platform-invariant cells only: fills, borders (a container's `divide-` hairline
  among them), ink, spacing roles, radius, type role, weight, family, sizes and widths. Display,
  alignment, flex sizing, truncation, positioning, overflow, a negative margin that bleeds a region
  (`-mx-page`), a fraction width and every interaction state are platform overlays composed through
  `cn()` (RN is flex by default and web is not, so a shared `flex-row` would be wrong on one). What
  a component is given (an act, a family, a checked value, an error) is an axis; where the pointer
  or focus is on it (hover, press, focus, disabled, pending) is an overlay. A type role's cell
  carries its ink and, for `mono`, its family, since RN Text inherits nothing and both platforms
  bind `--font-mono`; `display` and `figure` carry `tabular-nums`, a stat's figures at one width
  (uniwind maps it to `fontVariant`; native redeclares the utility plain, since Tailwind composes it
  from unset `--tw-*` variables that uniwind from 1.11 resolves to empty tokens React Native logs as
  unsupported). A labelled act's fill (`BUTTON`, `CHIP`) carries the ink as well, since the web
  glyph and spinner inside it draw in the current colour.
- An atom's or a molecule's (layout, shared, content) class strings are split on this line: a part
  with an axis (a state, a ground, a fit, what it holds) is a matrix, a part with one shape a named
  constant (`POPOVER`, `PAGE_HEAD`). Its display, alignment and state classes, per cell and state,
  are recorded for the plugins in `.helm/research/design-system/atoms-overlays.md`,
  `layout-overlays.md`, `shared-overlays.md` and `content-overlays.md`. A molecule draws an atom by
  composing it, so an atom's string inside a molecule is the atom's cell at the fit the molecule
  passes, never a cell of the molecule's own; a molecule it composes (a `Code` in a `Prose`, a
  `Prose` in a `Message`, the `Group` around a `Comparison`) draws its own cells and the composer
  owns none of them.
- A part that stands beside a line of text is that line's box (`LINE_BOX` by type role): a
  checkbox on its label's first line in a FormField or an OptionList. Painted text is the filler's
  own line boxes, so a painted part and a loaded one share a height.
- A chosen option is ticked (`Picker`), checked or its radio dotted (`OptionList`), never washed: an
  option row draws `ROW {state}` for the pointer alone, where a list's or a group's chosen row draws
  `selected`. A destructive menu act's label draws `MENU_LABEL {kind: destructive}` (`text-danger`),
  an axis because the act is given, not pointed at.
- The Picker's trigger takes `PICKER {fit}`: `field`, the field box at the bar fit; `bar`, the same
  box filling the column a `Rules` row gives it; or `row`, a list row's trailing pick, its value
  (`PICKER_VALUE`) and chevron in a `WORD_ACT` that pulls back by its own padding at the row's end
  (`-me-inside`). A field or bar trigger yields only past its line (a Toolbar's acts row yields
  inside the strip), so a value wider than the line truncates before the chevron. The Picker's `fit` prop picks it, and a `ListRow`'s trailing pick (`RowTrailing`'s
  `pick`) passes `row`. `WORD_ACT` is shared: the Picker's row-fit trigger and the `ItemHeader`'s
  opening fact draw it.
- A pick of several is the Picker given an array `value` (`MultiPick`), never a second component:
  the list's rows tick, it stays open while the viewer picks (Base UI's `multiple` on the select
  and the combobox, a toggle in the touch sheet), and the box holds one removable neutral `Chip`
  per value in a wrapping run, so it grows past the bar height only when the chips wrap, the
  run inset above and below by what centres one in the bar height, border included (`CHIPS_RUN`,
  the derived size `chips-inset`; the trigger reaches across the inset and the border,
  `CHIPS_TRIGGER`, so its hit is the box's height). A chip's remove act hears the set with its
  value toggled out (`toggled`) and hands focus to the next chip's remove, else the previous
  one's, else the trigger. The chips hold their own remove acts, so the box is no button: the
  trigger that opens the list is a button beside the run, filling what the run leaves with its
  chevron at the box's end (the run wraps, so the chevron never takes a line), and the box is a
  `div` on the field cells. A search that matches nothing draws `noMatches` on a row of the
  list. The
  rows tick as a single pick's do (`Check`), not a `CHECKBOX` per row, since an option row is
  the one interactive element and a checkbox inside it would nest a second. The types are two
  overloads on `value` (`PickOneProps`, `PickSeveralProps`), each handler's parameter typed by
  the value beside it; a props union alone leaves a lambda's parameter untyped.
- `Rules` is the one molecule for the inline-term rows a mapping and a filter are made of, each
  `Rule` a pair (`from`, an arrow, `to`) or a condition (`field`, fixed `operator` words, a `value`)
  with a remove act, and `add` ending the list. A `RuleValue` is one of three terms, each a bar-fit
  `Picker` or an `Input`: `pick` (`OptionPick`), `picks` (`MultiPick`, the chips) or `either`
  (`EitherPick`): a picked option or a typed value, `EitherValue` `{ picked?: V } | { typed: string
  }`. The picked form is a Picker whose options lead with their own glyph, or `Braces` when they
  carry no leading form (`marked`, with the other Rules and pick logic in `./rules`), and whose list
  ends with the act `typeValue`; the typed form is an `Input` at the bar fit (an internal
  `inline` prop on its base, which names it by the term and focuses it after the viewer's own act)
  whose trailing act `pickValue` (`ListFilter`) returns to the pick. The mark of which form it is is
  that leading glyph (a typed value has none and keeps the `text` kind), never Value/Field tabs,
  which would be a second control row over the 28 px row. The arrow is `ArrowRight` at `icon-meta`,
  faded (`RULE_ARROW {state: unset}`, `ink-disabled`) until both sides hold a value (`pairSet`).
  From `tablet` the list is one grid of four columns (the terms share what the arrow or operator and
  the remove act leave) with each row a subgrid, so the columns align across rows whichever shape a
  row has; the rows sit at the bar fit (`control-compact`) with the `inside` gap (`RULES`,
  `RULE_ROW`). On touch the tree differs (`useTouch`): each rule is a card of stacked terms
  (`RULE_CARD`, the arrow `ArrowDown`) in a `Group`, the columns no longer aligning, and native
  always draws that form. Rejected: a `Table` picker-cell kind with an arrow column (the Table's
  edit needs `onOpen`, its touch form is a `ListRow` list, and a mapping is a part of a form, not
  records), an open `terms: Term[]` list (it cannot keep the columns aligned or typed), and two
  components for pairs and conditions.
- A status is a mark: a status that moves is a `Picker` whose options carry states
  (`Option.status`), its options and its value drawn as the `Status`, as an ItemHeader's moving
  status fact (`{ pick }`) is. Rejected: `Status` with `onOpen`, an act that opened a menu of
  states the mark could not show as the current one.
- A pick's kind (Draft, Ready) is `Option.chip`, the `ChipMark` a `ListRow` carries: the chip draws
  after the option's label in the list and on the trigger, and `Option.status` keeps meaning a work
  state that moves. Rejected: Draft and Ready as a `status` (they are a kind, not a state the pick
  moves), and a context pick on the Pane (no screen used one). The Picker holds `CHIP` and
  `CHIP_LABEL`; a chip column's option (the Picker's `chip` family) draws its own chip alone and
  ignores `Option.chip`.
- A record's name and acts stand in its Pane's bar: `title` is a `Datum<Part>` (the record's name,
  given as a selection of the record's read: it paints while the record loads, as a paragraph in
  the heading's look and no `h1` until the name lands, so a page never names itself with filler)
  and the record's acts are the Pane's `actions`/`more`, each a constant or a selection that paints
  inert beside the title, so each act has one place on both platforms.
  `ItemHeader` takes the record's place (`overline`) and its `facts` under the bar and draws no
  heading and no acts.
- A header fact in words that opens a sheet is `{ label: Part; onOpen }` on `ItemHeader`: the words
  in the meta ink and a trailing `ChevronRight` at the meta fit in a `WORD_ACT`, pulled back at its
  start as a pick fact is, a button named by the fact (`aria-haspopup="dialog"` on the web); the consumer's `onOpen` opens its own
  `Sheet`. A fact that goes to another route is `{ label: Part; href: Route }`, one or the other
  per fact: the same words, chevron and box, drawn as an anchor (the router's navigation on the web,
  a link `Pressable` on the phone) with no `aria-haspopup`, so it is announced as a link. The chevron stays because on touch there is no hover and an unmarked opening fact cannot
  be found; it is the form a system `Message` line takes with `onOpen`. Rejected: `Status` with
  `onOpen` (a status carries a hue, a fact in words none), a `Button` beside the facts (a second
  control for one fact) and a `Link` (the accent hue).
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
- An option that cannot be chosen now is `Option.blocked`, a reason named as `Act.blocked` and
  `RowLeading.check.blocked` are. One predicate, `optionBlocked(option, chosen)` in `list-state.ts`,
  both platforms read: an option is blocked only while it is not in the value, so a chosen blocked
  option draws and acts as any chosen one (chip remove, unticking, the trigger) with no second code
  path. The reason replaces the description in `ink-disabled`, the label goes `ink-disabled`, the row
  is a two-line row and keeps its place (the app orders its list); on the web Base UI's `disabled`
  gives the pointer block and the disabled semantics, and its select list lets the arrows reach a
  disabled row as a menu's does, where Enter and a press pick nothing; a blocked row (a `Menu`'s blocked item too) never draws the highlight wash, from the pointer or a key landing on it, and the keyboard ring still shows (the callbacks pass `highlighted` only when not blocked). Rejected: `disabled` (a bare boolean leaves the
  viewer to guess), a `description` or `chip` standing in for the reason (neither stops a pick), and
  filtering the option out (the viewer loses the sight of it). `SegmentedControl`'s options are not
  `Option`.
- The Shell's switcher is a pick: a `Switcher` is an `OptionPick` whose options carry their avatars
  (`Option.avatar`, leading the option row as a status's dot does) plus `act`, the act that makes a
  new one, which the Picker draws under a hairline (`HAIRLINE`) after the options as a `ROW` (the
  Picker's `act` prop). The Shell draws its own trigger (a place row, `SWITCHER` on touch) over the
  Picker's list through its internal base. Rejected: a switcher menu of its own, a second list of
  the same rows. The Shell hands its `Switcher` descriptor down (`ShellSwitcher`), and each Pane
  draws the touch trigger from it, so the context changes only when the switcher does and a Shell
  state change re-renders no Pane. A Picker is the one pick, bare or in a form: a `FormField`'s `picker` descriptor draws it at the form's field height, in the field's error and disabled states, titled by the field's label.
- The app's mark is a config, not a prop (`react({ icon })`, 003-310). The react plugin derives the
  `icon` slot (`{ light, dark? }`, null with no icon) and react-ui contributes `MarkProvider`
  (`lib/mark.tsx`, order 1, beside the words) carrying `{ src, dark?, name: app.name }`; a `Shell`
  and a `Gate` read it (`useMark`), so no screen passes a logo. A string icon is the logo in both
  modes; `{ light, dark }` is two, each drawn under the theme's own scope (web overlays in
  `lib/mark.tsx`, `[.dark_&]:hidden` and `hidden [.dark_&]:block`, not `<img>` media, so the mode
  toggle moves the logo with the theme; the selector is any `.dark` ancestor, so a `.light` frame inside a
  dark page still draws the dark form). The lockup is the logo at the
  avatar's size and the name at `TEXT.body` 500, truncating, `alt=""` since the name stands beside
  it; a failed logo leaves the name, an app with no icon draws neither. The desktop sidebar heads
  with it (`SHELL_MARK` the sidebar's float, `SHELL_MARK_ROW` a place row's inset and height, so
  the logo stands over the places' glyphs; a row, not a link), above the switcher; touch is
  unchanged. The phone's app icon stays `expo()`'s concern, so `GateMark` and the Gate's `mark` prop
  are gone from both platforms and native's Gate draws no mark.
  An app with a drawn wordmark gives `react({ logo })` (003-317), a string or `{ light, dark }` that
  rides the `icon` slot as `logo` and the provider as `logo`/`logoDark`. The lockup then draws that
  one image in place of the icon and the name text, in the same row: `GATE_LOGO` in the Gate, `gate-mark`
  (40 px at every density) tall, and `SHELL_LOGO` in the sidebar, the avatar's height, each
  with `w-auto` (its own proportion) and `max-w-full` (held to the row, `object-left` on the web), its
  `alt` the app's name and the dark form under the same `.dark` scope. A logo that fails to load
  leaves the icon and the name.
- On touch the places past the tab bar are a page, not a menu: the More tab opens a `Place` of
  `ListRow`s (each place's glyph leading, its count trailing, its route), and while a foot docks (a
  Pane's `foot`, a filling Thread's input) the toasts stand above the foot by layout as the input
  grows, with no height reported to the Shell. On the web the docked foot names itself a CSS anchor
  (`anchor-name: --docked-foot`) and the toasts' layer sets its bottom to that anchor's top
  (`anchor(--docked-foot top, 0px)`, `main`'s foot without one), so the layer stays one viewport in
  the Shell's `main` and follows the foot in the frame it grows (anchor positioning is Baseline since
  January 2026: Chrome 125, Safari 26, Firefox 147). Rejected: the viewport moved into the page's
  column, since a Pane is a size container, whose layout containment makes a stacking context between
  the toasts and the root (below), and a Pane and a filling Thread inside it would each draw one. A
  frame never tells the Shell what it is: the web's tab bar always stands and the Shell reads no mark
  of the page, and on the phone an expo-router push covers the tab bar natively. Native has no CSS
  anchor, so the region that stands over the page's docked foot draws the box the toasts stand in
  (`ToastRoom`): a Pane's body above its foot, or a filling Thread's log above its input, lifted with
  it over the keyboard; the box places the Shell's toasts' layer by measuring itself against its
  frame's root (the Shell's or the Gate's `FrameHost`) (`ToastFrame`), the one measure left, since the
  layer stands outside the page's tree (below). Rejected: a registration the Shell reads in render
  from a host object, since a frame that mounts after the Shell's render (a route that waits first)
  leaves nothing that renders the Shell's tab bar again, and a mark the page sets for the Shell's
  column to read (`data-screen`, a floating act's `data-act-floats`), which made the Shell's layout a
  function of what a page held.
- A page is a `Place` of `Pane`s, and the frame reads nothing of what stands in it. `Place` is a
  flex row (props `distance` and `children`) that draws no bar; `Pane` is a flex column: a bar (the
  back act, the title, `actions`, `more`), a body, and an optional `foot`. Each Pane says what it is
  through its own props, never a mark, a context or a walk of its children for a parent to read; the
  one place a parent's CSS honours a child's intent is a covering Pane, below. Each Pane but the last
  holds `list` (`w-list`, 360) and shrinks to its floor `region-min` (240), never sized by what it
  holds; the last takes the rest (`grow basis-0`), and a hairline parts each from the next. A record
  is the Pane after its list, a record the open record links to one more Pane after it, and with
  nothing open the list's Pane is the last and takes the room. Rejected: a grid, which cannot size
  its last track without counting the Panes, and `auto` tracks, which reflow as rows land and collapse
  under size containment (a size container in an `auto` track draws 0 px wide, its content not
  counted: measured in Chromium 1194, 300 px of content drew 0 with `container-type: inline-size`
  and 300 without).
- The frame replaces `Split` and `Screen` because each chose its layout from something other than its
  own props. `Split`'s main had no head, so a list's title was an `ItemHeader` in the body while its
  record's `Screen` drew a bar and the section's acts vanished when a record opened; a wrapper paired a
  header with whichever sibling followed it, so an app component drawing every group put them all
  inside the pair, six px apart in place of a sections gap; two halves each capped at the measure
  left a fifth of a 2000 px page empty between the columns. The causes were general (a component
  reading its children, a mark or a context; one sizing itself or others; one with more behaviours
  than its uses need), and the rules that answer them hold for the whole roster (the guide's
  `structure.md`): a parent lays out with flex or grid and a child says only how it flexes. So
  `Screen`, `Split`, the paired header and the Details act are not roster parts; a page is Panes in
  order, a pushed page a covering Pane with `back`.
- Narrow widths and covering are one mechanism, in the Pane's CSS. The Place is a `place` size
  container (`@container/place`), and below `tablet` of its width (`place-max-tablet:`) every Pane but
  the last is `display: none`. A Pane marks itself `data-cover` for `cover`, and the Panes before it
  hide with `:has(~ [data-cover])`: the Pane declares its intent in a prop and the CSS honours it,
  with no JavaScript. A hidden Pane stays mounted, so its scroll and typed text survive, and stands
  out of the tab order. A Pane opened from a press in another takes the keyboard on its first
  control (`usePaneFocus`), so the next Tab is not the list's next row and a Pane the opening hid
  keeps no focus. A page pushed over the current one (a form, a step) is a covering Pane with `back`.
- A Pane's back act is `back`, a route: Back where the Pane stands alone (below `tablet` of its
  Place, first in it, or covering it) and Close, at the bar's end, where a Pane stands before it. The
  Pane draws both and CSS shows one (`place-max-tablet:`, `group-first/pane`, `group-data-cover/pane`),
  so a deep link's first frame is right with no JavaScript. A list at a deeper route names the route
  above it as `back` on its first Pane, which no component can derive (the list and its record share
  one layout component, and the place's route can redirect to a lead). A Pane provides `PageTitle`
  (the id its `section` is labelled by), `BackRoute` (its `back`, where a read inside it that answers
  not found leads) and `HeadingContext` 2, so its title is the `h1` and its sections start at `h2`
  at every width. It is the `page` size container (`@container/page`) and marks itself `data-page`,
  which a `Table` finds its page by (`usePageTablet`), so what stands in a Pane reads the Pane's
  width, not the viewport's. Each Pane's body keeps its own scroll, so a record opens at its top
  after a scrolled list.
- There is no filled act and no Details act. A create act is one of a Pane's `actions` at both
  densities, an `IconAct` with the `Plus` icon. Rejected: the touch floating act, which asked the
  frame for a room under what scrolls (handed to each region and under the toasts), a layer centred
  on the list by CSS, and an exclusion against `foot` since both held the screen's filled act; and
  the Details act with its side sheet, which a Pane after the record replaces (a sheet had no way
  back to the record, and an `open`/`onClose` pair for the app to keep in step with it).
- Native draws the same frame with one Pane per route. A phone route renders one Pane, pushed in
  expo-router's stack, which animates the push and covers the tab bar. The native Place is the place's
  container: it holds the route's Pane and draws the tab bar under it (the Shell hands the tab bar to
  the Place as it hands the switcher, `ShellTabs`), with the web's props and no reading of its
  children. `cover` and `wide` change nothing there, a route being one Pane at the phone's width. A
  deeper Pane is a route pushed deeper.
- The Shell's selected place is a function of the place list, not of one spec: `placeAt(places,
  at)` (ui-core's `./route`, string parsing with no `URL`, which React Native only partly has) is
  the place holding the address with the longest pathname, then the most query parameters, and
  the root `/` holds every address, so a record under the root place (`/items/x` under Now)
  selects the root and hands its Place a route to lead back to (`PlaceRoute`), and nested places
  (`/work` beside `/work/code`) select the deeper one; an address no place claims selects the root. A
  row's `isCurrent` keeps its own rule (a row linking to `/` is not current everywhere). Rejected: a
  `PlaceSpec` prefix list (a consumer option for a derivable fact), and the router's layout match
  (exact, but a second mechanism per platform for one rule).
- A molecule whose structure follows density keeps one constant per structure, never a density axis:
  the Pane's head (`PAGE_HEAD`, one hairline at both densities) holds the desktop bar (`PAGE_TOP_BAR`
  with the back act, the title and the acts in one row) or the touch one (the same row, wrapping),
  the sidebar (`SHELL_SIDEBAR`, `PLACE_ROW`) and the tab bar (`SHELL_TAB_BAR`, `PLACE_TAB`). The web
  picks the structure under `touch:` or, for which Panes stand and what a Pane's content draws, by
  container width: a Place is the `place` size container and a Pane the `page` one, and the web's
  `place-<breakpoint>:` / `place-max-<breakpoint>:` and `page-<breakpoint>:` /
  `page-max-<breakpoint>:` variants, emitted from the breakpoint values (`pageVariants()`), query
  them, so the page follows the room it has beside a sidebar rather than the viewport; native draws
  the touch one. On touch the bar is always one 44 px row: the leading act (the back act, else the
  shell's switcher), the title, then one acts span (`actions`, `more`, the Close act), with no bar
  over the title. `PAGE_TOP_BAR_START` and `PAGE_TOP_BAR_END` reach the leading act and the acts span
  across the page inset by `icon-inset`, half of what the control has over its icon, so its first and
  last icon glyphs stand at the title's start and the inset's end; the switcher's trigger keeps the
  same inset as its padding, so its avatar stands there too. The row wraps: the title keeps
  `PAGE_TITLE_FLOOR` (two fifths of the row, `basis-0` so it wraps beside the leading act and the
  acts rather than pushing them down); the title carries a step of block padding above and below its
  lines (`PAGE_TITLE_BLOCK`, so a single line still fills the 44 px strip), the head takes a step more
  over the row (`PAGE_HEAD_TOUCH`, always on touch: the web spells it `touch:py-inside`), and the row
  hangs its items from the top so a 44 px act centres on the title's first line and the acts span,
  `shrink-0 ms-auto`, drops whole to a second line at the row's end at 44 px when it does not fit
  beside the leading act, the floor and the gaps (at 320 with three acts it wraps, at 390 it fits).
  A Pane's title is a bar over a hairline and the body starts a page inset under it, where a
  Section's title is a line of the body a pair over its content; the two rhythms are not one, and the
  first Pane's title is the section's name at every density (the app never forks it by density).
  `tablet` is read against the Place, which in the Shell is the viewport less the 240 px sidebar: the
  Panes stand together from a Place 768 wide (a 1008 viewport), where the last Pane would otherwise
  be 168 px at a 768 viewport. `wide` is read only through a container (no viewport `wide:` is drawn).
- A part that waits is its loaded form painted, never a second tree (structure rule 15). A part
  takes a `Datum` (a constant, or a selection of a read) and, given a selection whose read has not
  landed, draws the tree it draws loaded with filler in each text slot and each mark or control
  as its own box, all in the one `PAINT` family (`bg-skeleton`; `glyphs` for text, whose line boxes
  are the bars, `box` for a mark or a block, `control` for a control whose content is unseen). Each
  component paints its own box, so the family is held by no entry. The filler is `paintText(role,
  at)` (`@fcalell/ui-core/paint`, framework-free): words of three to seven letters at the
  `PaintRole`'s length in characters (`title`, `name`, `word`, `phrase`, `sentence`, `paragraph`;
  `figure` and `id` are zeros, tabular or mono), the lengths cycling by the part's place so
  neighbours differ and a slot paints the same filler every load. The painted frame keeps the
  loaded frame's heights and text start by construction, where a separate waiting tree per part and per row (and shapes read before any item existed) each had to be kept equal to the loaded one by hand and drifted. A painted part is inert (no press, no focus, no
  link) and hidden from assistive tech. A collection of unknown length paints `PAINT_ROWS` (4)
  rows and a text block of unknown length that many lines, since the length is the data's and
  unknown: no count prop, no hash of the list's identity. A painted row, option, message or cell
  is wholly painted: none mixes a known title with painted values. A Section's `description`, a
  `Datum<string>`, paints where it will stand while its selection waits, and a loaded `""` draws no
  line, as an undefined one, because the app knows a description is coming and not its words.
- An ActionBar's `pending`
  (a PendingBar's props) keeps the bar's height through the swap: no count reproduces a bar whose acts
  wrap by their label widths, so the loaded bar is the measure. On the web it stays drawn in one grid
  cell with the PendingBar, `invisible`, `inert` and `aria-hidden`, its acts inert and none the
  form's submit; on the phone both stand in one row, each the row's width and the PendingBar
  pulled back over the bar by a `-100%` margin (a percentage margin resolves against the row's
  width), so Yoga sizes the row to the taller of the two with no measurement; the bar is at zero
  opacity, `pointerEvents="none"` and hidden from accessibility.
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
- Navigation keeps the accent out: a place is two cells by where it sits. `PLACE_ROW`, the sidebar
  row, carries its states as washes (`rest`, `hover`, `active`, `selected` on `wash-selected`,
  `selected-hover`), its focus the web's inset-ring overlay, its label `TEXT.body` in every state
  and its glyph a part cell of its own (`PLACE_ROW_GLYPH`: `ink-meta`, `ink-body` once selected).
  `PLACE_TAB` with `PLACE_TAB_LABEL`, the tab bar tab, is selected by ink alone (`ink-meta` idle,
  `ink-body` selected, the selected label at 500); its box carries the ink for the glyph inside it,
  as a labelled act's fill does, and the label repeats it because a native Text inherits none.
  A tab's count is the plain number as a badge at the glyph box's top-right corner, inside the bar:
  its line box starts a `pair` above the box's top (one px under the bar's inner top edge, so the
  hairline strikes no digit and nothing paints above the bar, which clips: `SHELL_TAB_BAR` is
  `overflow-hidden`) and its start is at the box's right edge, half a hairline in (the last tab's "99+" at 320
  asks more than 0.45 px to end inside the bar), so it paints nothing inside the whole pixels of the
  glyph's box, no ring or ground over the strokes, and the glyph's ink is the same with and without it
  (an absolute overlay, so the glyph's box and the label's centring do not move), and past `TAB_COUNT_MAX` (99) it reads `countOver` ("99+", `tabCount(words, n)`,
  handed to `Count` as its drawn form); the sidebar's `Count` draws the number whole. The badge
  stands inside the bar on the last of five tabs at 320, 390 and 768.
- A row has one form everywhere: `ROW` is square at the card's inset (`px-card`, no radius), and its `lines`
  say what it stands for (`one`, `two` a title over its meta, `setting` a label over its
  description). There is no `ground` axis: no context tells a row where it stands, so a row is the
  same in a Group and a List, and a standalone List bleeds the card's inset
  (`LIST`: `-mx-card`) so its rows' text meets the title over it. A Group draws the hairline between
  its entries once (`GROUP`: `divide-y divide-edge`), so no row carries one. That is
  web-only: `divide-*` is a child selector, which uniwind's compiler drops, so native has no
  divider utility yet and draws the hairline per entry. An option's row in a popover or a list of
  choices (`Menu`, `Picker`, `OptionList`) is its own form, `OPTION_ROW` (`px-control-x
  rounded-row`, a rounded wash at the control's inset), laid over the row's cells in place of its
  `px-card`: the component says it, no ground tells the row, and `OPTION_GROUP_LABEL` and
  `OPTION_CHILDREN` stand at the same `control-x` inset. A touch sheet's option rows (the
  `Picker`'s) stay the row's own form.
- A row's leading is one slot at the avatar's size (`ROW_LEADING`), the dot, spinner or glyph
  centred in it, so the titles of a list share one x whatever leads them; its meta line
  (`ROW_META_LINE`) is one line that yields in order: the later parts truncate first, then the chip,
  the lock's label, the warning's label and last the first part (naming the item, with an ellipsis);
  the status stays whole before all of them (on the web it takes no share of the overflow and is held to the line less the first part's floor, `figures`, so only a status wider than that is cut; the phone's still shares the first part's tier), the glyphs keep their width, and past them the line clips at the row's edge rather
  than overprint (the marks are described under `warning` below). The later parts take no width of
  their own (`w-0`, growing into the room the marks leave) and show at least `figures` of it or
  none, in the chip's wrapping slot, so a bare separator and an ellipsis never draw; the slot's
  text shrinks to nothing on its own line, so its box never passes the slot. The status stands at the line's end, so a list's statuses share one right edge; the room a dropped part leaves falls before it and is under `figures`, since a part that would leave more shows (`basis-figures`); the phone's later parts never drop, they truncate. A model-written later
  part (`Quoted`) stands in a span of its own that yields ahead of the plain parts, which is the
  one way a row says which part gives way: the age and spend that must read whole are its
  `trailing`. A `Coded` later part (`{ code }`) stands in a span of its own at the same tier and
  cuts in its middle like a definition value (`valueCut`, shared by both platforms). A row that opens (`href` or `onOpen`) ends in a chevron (`ROW_CHEVRON`, the square of an icon act) after
  its trailing value, unless its end holds an `act`, the more menu, a pick or a tree's fold. In a List
  whose row map declares `more`, a row with none (and no chevron) keeps the more act's square blank
  (`room`, an internal prop of `ListRowBase` the List sets from its loaded items, tree rows included), so every row's trailing value
  ends at one x; a List with no `more` is unchanged. A labelled `act` is not reserved: its width is its label's. A value
  trailing a one-line title is whole or gone the same way: the title's basis is half its line, so
  a value wider than what that leaves wraps under the line and is clipped away, and the title then
  takes the whole line (a 320 px table row shows its name, not its age). Both rules are the web's: the phone's later parts and values still truncate with an ellipsis. Every row keeps one height, so its waiting form matches it by
  construction. A short label (a chip's) is bounded by the
  one width `measure-short` (18ch, the short sibling of `measure`).
- A minimum height is the floor of something pressed (a control, a field, a target, a chip, a row),
  the set height of a bar (`strip` 40 / 44: the Pane's desktop bar and its touch bar), an
  intrinsic size, or the height of what a part swaps with: `PENDING_TRACK` an action bar's
  (`min-h-control`). Any other container takes its height from its content and padding through flex,
  its parts centred on the tallest, never from a height copied from another component to line things
  up: a section head is its act's height, a banner its line (or its act) inside `py-pair`. A desktop
  sheet head is the exception: a two-line row tall (`row-2`) with or without its description, so the
  body's first field never jumps between sheets. Rejected: a `header` size, a minimum that made a
  title-only section head as tall as one with an act.
- A field that stays in view while a Pane's sections scroll (an ask box over a home) is the Pane's
  `foot`, an explicit slot: it docks under the body at both densities on the `FOOT_DOCKED` cell (the
  page inset at the sides, an acts gap above and below, the raised step under a hairline and no
  shadow, since a foot is a region of the page and `float` lifts layers only, so the body that
  scrolls to its edge never cuts into what it holds and a selection bar
  stands in its 38–52 height range; held by no entry; a filling Thread's own input docks on the
  same cell, so one docked composer draws one foot), the body scrolling past it, above the tab bar on touch and, on native, lifted over the keyboard
  (the body and the foot share one `KeyboardAvoidingView`, `Lifted`). The body ends a sections gap
  over it (`PAGE_BODY_OVER_FOOT`), as a filling Thread's log ends over its input, so the field reads
  apart from the last section; the foot spans the body at every density, whatever it holds (the
  Pane never reads its element type), and a docked `MessageInput` keeps its own measure column
  (`THREAD_COLUMN`) inside it on the desktop, the column a Thread's input stands in. It names the
  Shell's toasts' anchor as a filling Thread's input does. A Thread in a Pane with a `foot` leaves
  its own `foot` empty. Rejected: a foot derived from a Thread's position (a Thread in the last Section
  docking its input), which hides the dock from the call site; a `MessageInput` docked variant,
  since docking is the frame's, never the field's (the column the field keeps is its own at every
  use, not a docked form).
- A Pane and a Thread take `sheet` (a Sheet's props) beside `foot` and draw the docked sheet
  themselves, in the foot's place while it is `open` (`SheetDocked`, with the foot's measured region
  as an internal prop); a `Sheet` placed anywhere is always the modal one. No new roster part: the
  docked sheet draws `SHEET_DOCKED_HEAD`,
  `SHEET_DOCKED_BODY` (the sections gap, the card inset above and a sections gap below, so the last row clears the submit by the gap rows keep) and `SHEET_DOCKED_FOOT`
  inside the foot's raised cell, so none carries a surface, radius, shadow, hairline or side inset and
  all three share the foot's edge. The head holds the back act before one column: the title
  over the description, so the two lines share a start whether the back act stands or not, the back and
  close acts each in a box one heading line tall at the title's first line (a taller act overflows it
  centred). The title wraps to its whole text (it is often the question the options answer) and is the
  `heading` role, the modal Sheet's, and a Section in its body names itself at the same size (a
  Section's title is one size everywhere); a counter ("Question 2 of 4") never outranks the question;
  the foot holds the `foot` line beside the `submit` bar (over it on touch); the
  head-end submit and Cancel of the modal form are gone, since the dock stands above the keyboard and
  the close act is in the head. The docked foot fits its content up to the region the log and the foot
  share (a filling Thread's own column; the web Pane's body and `foot` stand in one region under the
  head, so the head is never counted; the phone's `Lifted` is that region): `FOOT_DOCKED` carries
  `max-h-full min-h-0`, so the log gives way to the foot and the foot is never capped below the
  sheet's pinned parts. The Sheet bounds its own body instead: it scrolls between its pinned head and
  foot line past two fifths of the region (a structural fraction, never a size token), and its content
  keeps three `row` sizes (`docked-floor`) at least, a shorter body padding to that floor, each page
  opening at the body's top. The floor is on the content, not on the scroller, so the scroller yields
  to it by flex shrink where the region is short: the head, the foot line, the submit and the kept
  reason line never give, and the body scrolls below its three rows. The log keeps its own floor,
  `docked-log-floor` (two `row` sizes), and the body's cap is one formula (`dockedBodyMax`, with
  `region` the foot's region, `pinned` the dock's chrome plus the sheet's head and foot, `F` the body
  floor and `L` the log floor): `room = region - pinned`, `cap = max(F, 0.4 * region)`, `bodyMax =
  max(0, max(min(F, room), min(cap, room - L)))`. With room it is `cap`; short of room it falls to
  `room - L` (the log keeps `L`) down to `F`, then to `room` (the log goes first, then the body below
  `F`). The region owner hands the sheet its `region` (`FootRegionValue`: `height`, `chrome`, `logFloor`: a Thread's
  `logFloor` is `docked-log-floor`, a Pane's is 0, since its docked region has no log); the sheet
  measures what it pins. The contract's cells hold no arbitrary value, so each platform restates the
  bound in its overlay by measuring: the web reads the region's height with a `ResizeObserver`
  (`useFootRegion`, which stays because a footed Pane or Thread in an auto-height column has no definite
  height: the region measured 0 px and the sheet overflowed by 232 to 337 px) and the pinned parts as the sheet's height less its scroller's, the phone reads
  the `Lifted` region's height and the head and foot `View`s from `onLayout`. A Thread's log region
  clips its height (`overflow-y-clip`; native `overflow-hidden`), so where a docked foot leaves it
  little room nothing the log draws, nor the Latest act at its foot, paints over the foot's head or
  the header.
  Its states are its
  submit's: pending, blocked (the reason stands at rest under the act; over a read that ended it does
  not, since the body already says "This didn't load.", so the bar keeps its line unseen and the
  press draws the sentence in it), and failed (the act ready again, the
  rejection's sentence in that same kept line: the `ActionBar` draws the host's `Acting.line` in
  `FIELD_ERROR_LINE`, the field error's cell and ink, in place of the reason when no act is blocked,
  and holds the line empty while neither shows, so a failure moves nothing; no `Banner`). The sheet
  is the host of its acts (below), so the modal `Sheet` draws the same sentence in the foot bar's
  line on the desktop and under the head's submit on touch (the phone's modal only the latter).
  The modal Sheet's touch head wraps its row (`SHEET_HEAD_TITLE`, the title
  at most three fifths of it, a structural fraction): the submit that does not fit beside the title
  drops whole to a second line at the row's end, so a long act word is never truncated and the title
  never falls to a stack of fragments. On the desktop the docked Sheet holds
  `THREAD_COLUMN` in the foot that centres it. Focus: each page (a new `title`) takes the body's first
  tabbable on the web once the page has settled (a radio group sets its tab stop after the commit),
  so an act that relabels or leaves never drops focus to the document; on the phone the first
  field of the page takes it (a first-mount claim, `FieldClaim`, which the Gate provides too; its `full` bar fit stays the Gate frame's alone), Escape on the web
  calls `onClose`, and a docked foot hands focus to its first typing control when the page that held
  it leaves (the web region reads who held focus in the render that swaps the foot; the phone's
  region holds a `FootReturn` claim the leaving Sheet sets and the `MessageInput` that mounts takes).
  Rejected: a foot derived from a context (`FootPlace`) that made one `Sheet` two components by
  where it stands, a `DockedForm` component (a second component for the same regions, switched by
  the app per place), and a `Form` that pins its own bar in a foot (no head for the title and close
  act, and it restates the Sheet's regions).
- A long `Form` in a scroller keeps its bar in reach. A `Sheet` and a `Gate` take `form` (a Form's
  props) and draw its sheet or auth form themselves, through the Form's body (`FormBody`, its `in`
  prop internal: `page` for a `Form` placed alone, `sheet`, `auth`), so a `Form` alone is always the
  page's (at most a measure wide, the leave guard on) and nothing reads where it stands. The web sheet's
  form wraps its `bar`'s `ActionBar` in its foot (`sticky bottom-0`, the host's ground, and a negative
  margin with matching padding across the scroller's inset, an overlay since positioning and the
  bleed are platform overlays), so the bar stays at the scroller's bottom edge and stands at the
  form's end when the form fits. Nothing lifts the bar out of the Form, so its
  Enter-to-submit and `SubmitContext` stay the Form's (`ActionBarBase submits`) and its run is the
  host's: the sheet passes its `Acting` down, so one act pends across the head submit, the foot bar
  and the form's bar. The phone has no `sticky`: its `Sheet`, holding
  `form`, draws `form.bar` in its own foot (gorhom's footer) after the foot line, and the form body
  takes the sheet's touched state, so the footer's blocked reason and the fields share it; capped or
  full height the bar stays on screen while the fields scroll, and uncapped the foot stands at the
  content's end, where the bar stood. A docked sheet's form keeps its bar in flow on both platforms. A
  Gate draws its form's bar `full` itself (`fit`), and a new `title` is a new step, its form keyed
  afresh. The sheet's own `submit` and the form's `bar` are two ways to complete the task, one given:
  a Form's bar can hold several acts, so the sheet's `submit` does not stand in for it.
- A bar at a phone's bottom edge clears the home indicator with the web emit's `pb-safe`
  (`padding-bottom: env(safe-area-inset-bottom)`, non-zero under the document's
  `viewport-fit=cover`), an overlay the tab bar spells beside `SHELL_TAB_BAR`; native pads the
  same inset from `react-native-safe-area-context`.
- A Pane before the last holds one width, `list` (`w-list`, 003-322), giving way to `region-min`
  as its Place narrows. 003-305 sized the list to its content, and Stead's critique (2026-10-11)
  found the cost: the column moved from 215 to 360 as its rows loaded and between lists (240, 288,
  360), so the last Pane reflowed on every load and filter. The width is therefore the ceiling it always
  was, so 003-122's arithmetic (a last Pane of at least a page less the list) holds exactly.
  Rejected: a list width the app names (a consumer option, and an app cannot know its rows' width),
  and holding the content-sized width through a paint (the loaded rows would still differ list to
  list).
- A frame's fixed regions are widths (`sidebar`, `list` the width of a Pane before the last, `region-min` its floor, `pane` a side sheet's, `column`, `node` a canvas node, `auth`, `empty` an empty
  state's column, `selection` a selection bar's column), so a region keeps its measure at any viewport. A fraction width (`w-2/3`: a chart column's share of its slot, a table column's declared share) is structural, a closed list in the web verify's overlay acceptance, never a token. A size the data decides (a meter's fill width, a chart
  column's height) is the value's share, set by the component on both platforms, never a class.
- A column cell is a width and nothing else (`w-full max-w-<width>`: `THREAD_COLUMN`,
  `ACTION_BAR_SELECTION`, `EMPTY_COLUMN`), so a column's alignment is its region's: a region that
  owns its frame's width centres what it holds (a filling Thread's log, a docked foot, the
  empty state's region), and a column standing among sections keeps the region's start, as `Text`
  and `Prose` hold the measure. A Thread's regions spell `items-center` as an overlay on the desktop
  alone, since on touch the column cell is absent and the content spans the region; a Pane's docked foot
  centres at every density on both platforms, so a selection bar wider than the screen's measure
  stands centred on a wide touch screen too, and what else it holds spans it (`w-full`). A region that holds a page's sections stands them a sections gap apart
  (`PAGE_BODY`, `SHEET_BODY`), so no wrapper restates the gap; a
  `Form` is one child, so the gap shows only between a sheet's sections. A Pane's body is one such
  column at the measure: its children are capped at `measure` (`*:max-w-measure`), aligned to the
  start under the title, so a label stays near its value, a field near the size of what it holds and
  a Save near the fields it saves, and a Section, a Group, a Code and an ActionBar end where a Prose
  or a Form does (an end-fit bar's acts stand at that column's end, not the Pane's far edge). `wide`
  lifts the cap for a Pane whose content's meaning is its width: a `Canvas` (the workflow canvas,
  the knowledge graph) and a code `Diff`; a wide table in a reading Pane scrolls sideways inside
  the column, so the empty space a reading Pane leaves stands only at the screen's right edge.
  Measured with the cap lifted at 1920 px: pickers 1270 px long, a `DefinitionRow`'s value or switch
  1200 px from its label, an `OptionList` box mostly empty, a `Slider` track too long to set, a
  Form's Save and a Section's act far from what they act on.
- A class with no look is structural, an overlay the web's class sweep classifies: a stacking
  order inside one component (`z-1`, a frozen table column over the cells that scroll under it,
  inside `isolate`, the grid its own stacking context so the column never stands over a sheet),
  `invisible` (an absent act holding its slot's
  width), grid placement (`col-start-1 row-start-1`, two acts in one slot), `table-fixed`, a
  hanging indent (`-indent-control-x`, a wrapped diff line's first line pulled back over its
  hang) and `wrap-anywhere`.
- A long unbroken word never widens a page. A 300-character word grew 264 of 541 roster text slots
  past their box, so a sentence, description, label or touch title breaks anywhere
  (`overflow-wrap: anywhere` on the web body, `wrap-normal` where a figure lane must hold, no
  per-slot spelling), while a desktop title, a button label and the single-line slots keep their
  ellipsis. A Button's box is bounded (`max-w-full min-w-0`) so its label truncates; the act slots
  of Banner, Toast, Section, ListRow and MessageInput may shrink; a unit, a size, a Slider's output,
  a Status word and a chart tick cut at a word's 18 characters as Chip does; a tooltip holds the
  measure; a URL or path in a meta line keeps cutting at its end. Native takes the same per slot
  (`shrink` on a row's text; a source check fails row text with none). The roster stress floor
  (below) feeds every text slot the long word and a URL.
- The stacking order between components is a token, `STACK_ORDER`, each layer one step above the one
  before (`sheet` 1, `popover` 2, `toasts` 3, over the page's 0), emitted on the root as
  `--layer-<layer>` and read on the web as `z-(--layer-<layer>)`, since Tailwind's `z-*` reads no
  theme namespace. A sheet's scrim and layer, each popover's positioner and the toasts' layer each
  draw theirs, so a toast raised while a sheet or a `confirm()` is open stands over the scrim and
  its dismiss takes the press. On the web every popup (a menu, a picker, a tooltip, a sheet)
  portals into `<body>` as Base UI does by default, never into the Shell's or the `Gate`'s `main`: a
  popup mounted in `main` drew its first frame offset by `main`'s origin and made the frame scroll
  sideways as it opened (verified by `PopupMountsInTheBody`). Only a showcase stage names a
  `PortalContainer` (`lib/portal`), so its popups draw the stage's mode from its `.dark` class and a
  sheet in it stays non-modal; in an app a sheet is modal. The sheet's portal follows the root in
  DOM order and stands on `--layer-sheet`, the toasts' layer inside `main` on `--layer-toasts`, so
  the `z-(--layer-*)` steps decide. The toasts' layer stays inside `main` for its geometry
  (above the tab bar, the docked foot's anchor), so nothing between it and the
  root may make a stacking context (verify `b-layers`). Rejected: a literal `z-*` at the call site, and portalling the toasts after
  the sheets (a Base UI portal mounts in the order it opens, and the layer would lose `main`'s
  geometry). React Native's `zIndex` orders siblings only, so native reads the order by tree
  position: gorhom's `BottomSheetModalProvider` draws its sheets after its children, in its own
  host. The native `FrameHost` (the Shell's and the Gate's) holds a provider around its frame, inside a host view, and draws the
  toasts' layer after that view, so over every sheet; the layer stands over the box the page draws
  for it (`ToastRoom`), measured against the frame's root, so the toasts keep the page's geometry. A
  sheet resolves the nearest provider, so every sheet opened under a Shell stands in the Shell's
  host and stacks against the others there; the entry's root provider hosts only the screens with no
  Shell, where no toast stands, so the two hosts never hold sheets that must stack together. The
  host view is never flattened: a sheet's layer is `accessibilityViewIsModal` and the toasts' layer is not among them. gorhom draws a sheet's content
  in its host, outside the screen that opened it, so the entry's words, Query and Auth providers
  wrap the root provider. Rejected: a toasts portal through gorhom's host (its name is internal, and
  an entry keeps its first mount's place, under every later sheet), react-native-screens'
  `FullWindowOverlay` (iOS only; a plain `View` on Android), and a layer wrapped around the root
  provider that the Shell hands its frame (a context, two effects and an export for what the Shell's
  own tree holds).
- A table cell stands at the row's floor behind a transparent side border (`TABLE_CELL`: `min-h-row`
  and `px-control-x`), and the `Input` that edits it in place stands inside it at the field's bar
  fit, so a cell and its edit put their text in one place and the row keeps its height at either
  density. The row (`TABLE_ROW`) is a hairline under the pointer's and the open record's washes; the
  wash is the body ink at an alpha, so every ink the sheet measures on the surface keeps its ratio
  on it. A sortable header is a cell-wide act (`TABLE_HEAD`), its label meta 500 in the meta ink and
  the body ink on the sorted column (`TABLE_HEAD_LABEL`). The grid draws from `tablet` of the page
  up; below it the Table is a `List` of `ListRow`s with its sort a `Picker` above them, its options
  the sortable columns, the sorted one led by its direction's glyph (`Option.icon`), the trigger
  named "Sort, {column}, {direction}" by the words `sort`, `ascending` and `descending`; its rows
  are the List's `items` through a `row` map whose slots the columns declare (an age column the
  trailing, the status and chip columns the marks), so its painted rows stand in the slots the loaded ones draw. What a cell reads as and sorts by (`shown`, `order`, `sorted`, an age read through the
  platform's own words), the rows a tick reaches (`tickable`), a row's reason (`chooseReason`) and
  the cell guards (`isChangeCell`, `isStatusCell`) are `./list-state`'s, so neither platform's Table
  re-derives them. A Table takes data as a List does: `items`, a constant or a selection, each `TableColumn<T>` reading its cell from the item by `cell`, and a `row` map (`TableRowSlots<T>`) for the row's own slots. Both forms draw one projection, `tableRecords` in `./list-state`, so the grid and the touch List read the same item. It holds no read and no state branch: while the selection's read waits, `PAINT_ROWS` rows stand in the columns it declares (the `cell` and `row` slots run over the placeholder through `painting`), the header constant over them, each cell painted by its column's kind (a number a figure, a status the Status's painted form, a check a painted Checkbox, a chip a box, any text filler) and the rows inert; the touch List paints the same records. Its failed, missing and empty forms are its frame's, which holds the read, and the Section around it counts an array read once. A row
  with `href` is its leading cell's link (`tabindex -1`, so a new tab opens it); a row's `locked`
  names the columns it draws read only (an owner's role), and in an editable table a cell it locks
  (one its column would edit) ends in the lock mark. A column's own
  `locked` (a boolean) makes the column read only in this table: its cells never edit and
  carry no glyph, since a lock on every cell of a column is noise, and its head draws the glyph
  after the label. Both scopes share `cellEdit` and `cellLocked`
  in `./list-state`. A chip column's pick draws its value and options as the column's chips (the
  Picker's internal base), and an Input, a Picker or a Checkbox inside a cell stands at the bar fit,
  named by the cell and out of the tab order, by the cell's context. An edit the keyboard or a tap
  starts mounts its cell's control afresh, a typed one focused and a pick open; Enter, Escape (which
  ends the field's `CommitMoment`, so the leave after it commits nothing) and the pick's close end
  it in their own handlers. Enter and Escape focus the cell at once; the pick's list names the cell
  as its `finalFocus`, so Base UI hands focus back there once the list unmounts, after an option's
  own press has focused it, unless a press outside the list moved focus on. A painted status cell is the Status's own painted form (its internal base: the dot's box and a word's filler at its gap).
  A read-only check cell draws a tick. Where the grid scrolls sideways its
  leading column stays: the frozen cell on the surface
  (`TABLE_FROZEN`), its content carrying its end hairline and the row's wash (`TABLE_FROZEN_CELL`).
  A `change` column holds a `ChangeCell` (`{ before, after }`, either null), read only and sorted by
  its `after`. A kind beats a cell-level flag: the kind is how the Table types every cell, and the
  touch row spells its meta part from it ("X → Y"). The cell draws `before` in the meta ink, an
  `ArrowRight` and `after` in the body ink, neither tinted, since a changed value is no verdict;
  only a value added (null `before`) takes `ok-soft` and one removed (null `after`) `danger-soft`,
  struck, each a chip-radius pill (`TABLE_CHANGE`, `TABLE_CHANGE_VALUE`); the values draw in tabular
  figures, as a column of numbers does. The touch row leads its meta with it (`touchMeta`: one
  part, the change value with a moved tick's reason after it, then the other values), since it is
  what the table is read for and the first meta part truncates last; the reason is the tail of
  that part, so it truncates before the value does, and a blocked tick's reason joins the first
  part the same way. At 320 the status mark (whole) takes 90 of the 146 px the row's text has, so
  a change value of 73 px draws ellipsized there. A change cell with one value draws `added` or
  `removed` before it.
  Rejected: tinting `after` for any change (a rename is not good news), and a Comparison column
  (that sets facts side by side, not one value's movement). A Table chooses rows through `choose`
  (`TableChoice<T>`: `chosen`, the ticked ids, and `onChange`, which hears the set a tick makes;
  optional `blocked` and `moved`, each a row's reason from its item). It is controlled and the rule
  stays the consumer's: `onChange` hears the viewer's toggle, and the consumer returns the ruled set
  (ticking a change under a new parent ticks the parent) through `chosen`. One controlled set beats
  a per-row `onTick` because the head tick and a parent and child rule both act on sets; the prop is
  `choose` because `selected` is already the open record. A tick column leads the grid, a square the
  row's height (`w-row`) in the cell cursor's first column (Space or Enter ticks), each row's
  `Checkbox` named by its leading cell, the head tick `unchecked`,
  `mixed` or `checked` over the rows that can be ticked and named by the word `chooseAll`
  (`chooseHead` and `chooseAllToggled` in `./list-state`: from mixed it checks every tickable row,
  from checked it clears them, and a chosen id the rows do not hold keeps its place). A `blocked`
  row's tick is disabled (a field's disabled state around the Checkbox); its reason, or the `moved`
  one ("Needed by Checkout"), is a meta line under the leading cell, starting where the name starts
  (the change mark stands on the name's line, the reason under the name; `chooseReason`: blocked
  first), and only that row grows to `row-2`, in every cell of it, so the row's halves still line up.
  Every tick that is not in a grid cell is a tab stop (the head tick; a `ListRow`'s tick); inside a
  cell the grid's cursor owns focus and the tick leaves the tab order, an explicit `tabIndex` of
  `undefined` on Base UI's checkbox would drop its own stop, so it is spread only for a cell. A
  reason is a meta line, never a tick tooltip, since a tooltip is unreachable on touch and by
  keyboard. On touch the leading and tick columns both freeze (the leading one at the tick
  column's width); below `tablet` the tick is the `ListRow`'s leading `check` and a moved reason
  follows the change value in its meta. The head tick draws no count, and the table none: "N of M chosen" belongs to the
  selection bar, which reads this selection: an `ActionBar` with `chosen: { count, of, onAll? }`
  docked as the Pane's `foot`. The table draws its head tick from `tablet` of its page and a list
  form below it, so `onAll` puts the choose-all act on the bar wherever the table shows no head tick,
  decided by that same page width and never by touch (a desktop window at 768 has the act, a touch
  grid at 1280 has the tick; on the phone the table is always the list form). Two acts stand beside
  the count, words washed at the pointer at the control radius (`ACTION_BAR_ALL`, so the ring
  follows the filled act's edge): `chooseAll`, calling `onAll(true)` and drawn only where the table
  has no head tick, and `chooseNone`, calling `onAll(false)` at every width, the clear act the
  selection-bar pattern names. One that does not apply (every row chosen, none chosen) stays drawn in
  the disabled ink and focusable, so the focus a press leaves is not lost as the other applies. `of`
  counts the rows that can be chosen, so a list with blocked rows still reaches the cleared state. It draws the slot word
  `chosenOf` at meta at the bar's start (one phrase, since the count left behind is `of - count`),
  and the acts beside it at the end (`ACTION_BAR_CHOSEN`, a pair apart),
  the bar's one filled act the page's one; on touch the count stands over the full-width act. The
  foot spans the body, but the bar's count and acts stand in a column centred in it no wider than
  the `selection` width (`ACTION_BAR_SELECTION`, the selection-bar pattern's table-wide bar), so
  the count and the act stay a reading distance apart on a wide screen. The
  act's label ("Publish 4 changes") and its blocked reason stay the consumer's `Act`. The bar is not
  a new component: `ActionBar` already owns the filled act, its pending state, the reason and the
  touch stacking, and `Pane.foot` already docks, scrolls the body under it and stands above the tab
  bar and the toasts. A grid re-renders only the rows and cells whose state changed: rows and cells
  are memoised components fed per-cell values and one stable set of callbacks. On the web a cell
  holds the pointer's hover itself (an editable cell under the pointer shows its control), so a
  pointer crossing the grid renders the cells it leaves and enters; the cursor moves by focus, and a
  focus on the cursor's own cell sets nothing. On the phone a row's two halves (the frozen leading
  cell and the cells that scroll) wash together on a press, so both read one store of the pressed
  row's id, each only whether it is the pressed one; a sortable header washes through the
  Pressable's own pressed state. The web mounts only the live form: a Table finds its page (the
  `data-page` mark of a Pane) in the layout phase and reads whether the page is `tablet`
  wide through one external store (`usePageTablet`), so the choice re-renders before paint; a Table
  outside a page draws the list.
  On touch the grid's scroller carries `scroll-padding-inline-start` of the frozen width (the short
  measure, and the tick column's square before it), and the cursor's cell takes focus with
  `preventScroll` then `scrollIntoView` at `nearest`, which honours that padding, so a cell never
  stands under the frozen column and nothing measures; a frozen cell scrolls nothing, since it stands
  in place.
- A thread is a molecule (`Thread`), a collection: its Messages from `items` (constants, or a
  selection) through the `message` map, one function per `Message` slot (`key`,
  `author`, `name`, `body`, `at`, `attachments` and `meta` for a turn, `onOpen` returning a system
  line's handler or none, and `detail` returning a system line's `MessageDetail` or none), a
  sections gap apart (one rung above Prose's block gap), and its `MessageInput` its `foot`, the one
  authored part. While the selection's read waits the log holds `PAINT_ROWS` messages of the other
  author (an author is the item's and unknown before the data, so `author(P)` falls to `other`),
  Message's internal `painted` form: the name and a paragraph of filler, inert. A Thread is a frame of its
  items (`useCollection`): its failed and missing forms stand in the log's place with Retry, and
  its empty form is an empty log with no sentence; its foot and reply stand through each, so a
  thread whose items failed still sends. A Pane, Section or Sheet holding the same read draws
  instead and replaces the Thread, so an input that must outlive that docks in the Pane's `foot`. A reply on its way is the
  Thread's boolean `replying`: the loaded log ends on one
  loading Message of the other author, after the items, followed and pinned to as any message is and
  replaced in place when the app adds the reply's item and clears the flag. It is a prop and not a
  `loading` slot on `MessageSlots`, since a per-item slot needs an item and the app would invent a
  placeholder `body`, `author` and `key` for something that is not a message yet; every other state
  ignores `replying`. On the desktop both stand in
  a measure-wide column (`THREAD_COLUMN`, held by no entry: a `MessageInput` and a record's
  `ItemHeader` over a filling Thread stand in it too), on touch in the screen's. The column is a
  width alone (below, column rule); a docked foot centres it, and a Thread among sections keeps
  their start. A Thread has one structure: it fills what it stands in by plain flex (`grow
  min-h-0`), decided by no prop, context or mark. In a Pane's body, whose height is definite, it
  takes the free height: its log scrolls at the page inset (`THREAD_LOG`), opening at the newest
  message and following each that arrives while the reader is at the end, and the input docks at
  its foot (`FOOT_DOCKED`) a sections gap under the log; among sections it stands at its content's
  height. A part above a Thread is its sibling in the body, a sections gap from the log. The phone
  log's origin is its end: the ScrollView and each message turn
  upside down (as React Native's `VirtualizedList` inverts a list), the messages newest first, so
  its first frame shows the newest message and a keyboard's resize keeps the bottom anchored;
  `maintainVisibleContentPosition` keeps a scrolled-up reader's place as a message arrives at the
  origin, and follows from the end. Its insets swap (`THREAD_LOG`'s top inset at its layout end) and
  a short log stands at its layout end, the top of the screen. Rejected: scrolling to the end from
  `onContentSizeChange` and `onLayout`, which showed the oldest messages for a frame and jumped on
  each keyboard resize; a Thread telling its frame in a layout effect (the frame commits twice),
  a room the frame hands it (`ThreadRoom`) and a `data-fill` mark on its root for the body to
  read, each a frame choosing its form from what stands in it. The cost accepted: the log's
  scrollbar stands inside the page inset. While a filling Thread's
  reader is scrolled up (the log's `atEnd` false), a secondary `Button` (`ArrowDown`, the word
  `latest`) floats centred at the foot of the log's region, a pair above the foot, on a lifted
  ground at its radius (`THREAD_LATEST`: `bg-raised`, `shadow-float`, since the secondary act draws
  no fill); pressing it scrolls to the end and resumes following (the web log takes the focus the
  act held). It takes no prop: the Thread hands its way back to the internal `Latest` (`onBack`,
  `null` at the end), which it draws in the log's region over its docked foot. The layer is anchored
  inside that region, never hung above the foot by `bottom-full`, because Android does not hit-test
  a child outside its parent's bounds.
  On the web the layer is a size container, absolute so its height is the region's whatever the
  content, whose font size is the act's reach (the act, a pair above the foot, and the focus ring),
  and the act is `invisible` under `@container (height < 1em)`: a region too short for it leaves
  the act out of the tab order and the tree, with no measure.
- A web `Slider`'s thumb stands by CSS from the value on the first frame. Base UI places an
  edge-aligned thumb from a measure it takes after mount and hides it until then, so the thumb
  would jump; the thumb's start is the fill's width plus half the thumb (`--share`, the value's
  share of the range, set on the control), over Base UI's inline style, and it stays visible.
  Base UI's pointer and keyboard handling is kept: it maps the track less the thumb, as the
  fill and the rest do.
- A content molecule derives once per input: `Prose` lexes and folds its markdown, `Diff` runs its
  patch, `ProseDiff` its word diff and runs, and `QrCode` its encoding and module path, each
  memoised on its text and skipped while it waits (a painted QR tile draws a version 2 code's 25
  modules and encodes nothing). A streaming `other` message (`streaming`, a Thread `message` slot too) draws `closeOpenRuns(body)` from `@fcalell/ui-core/streaming` (a pure function both platforms run), which closes the runs open at the text's end (fence, emphasis, strong, strike, code span, link text and target), so the closing marker changes nothing drawn; unset, an unmatched marker stays text. `Message` is memoised on its props, and the Thread draws each item
  through a memoised item that renders again only when its item does: every slot reads the item, and
  a system line's `onOpen` and a detail row's `onOpen` call the thread's latest slots when pressed,
  so a thread's re-render (a keystroke in its input, a message arriving) skips every message already
  drawn. The showcase compiles the workspace's plugin source with the React Compiler, which memoises
  on its own, and a consumer's web build compiles its `node_modules` copy too (plugin-react's
  `exclude` and the compiler's `sources` both let `@fcalell` paths through); the phone's copy
  (`babel-preset-expo` never runs the compiler on `node_modules`) and the web dev server's
  pre-bundled copy are not compiled, so these memos are explicit.
- A blocked act shows its reason once pressed or once its form or sheet is touched, except in an
  ActionBar, which draws the last blocked act's reason at rest under the acts (it hands its acts
  `REASON_AT_REST`, a host whose press shows nothing). The press is
  derived, never reset by an effect: it is kept as the reason the act was blocked by when
  pressed, and stands while `blocked` is that reason (`pressStands` in ui-core's `./reason`,
  `usePressed` in each plugin's `lib/reason`), so unblocking or a new reason forgets it in render
  and a new reason waits for its own press. A reason host (a sheet's submit, a Section's head
  act, a Banner's or a PendingBar's act) keeps the press the same way. A host's run
  (`useRun`) settles an act's promise with a handler for each outcome, so a failing act leaves no
  derived promise to reject unhandled.
- A `MessageInput` sends while an answer streams: `working` sets Stop before Send and leaves Send
  live, so Send and Enter send whenever the text is non-empty. Stop is the secondary bar Button on
  the desktop and an icon act at the bar fit (`ICON_BUTTON.fit.bar`, `CircleStop`) on touch, and
  Send the primary bar Button on the desktop and an icon act (`Send`) on touch, named "Send", so the
  touch field gives up only a compact square for each. Lucide draws no filled stop square, and a bare
  `Square` beside the field reads as an unchecked box. What becomes of a message sent while an
  answer runs is the consumer's sentence in `notice`; the input takes no prop for it. On native,
  Send and Stop never touch focus: the keyboard stays up because no tap takes it, the Pane's
  scroll (`Scroll` in `lib/hosts`) keeping taps on its acts
  (`keyboardShouldPersistTaps="handled"`) and a docked foot standing outside any scroll. The web
  input refocuses its text after Send and Stop, which is keyboard focus management there. A removed
  chip hands no focus on.
- A message carries what came with it: `Message` for `you` and `other` takes `attachments`
  (`Attachment`: an id, a name and an optional `src`, an image's address) and `meta` (`Part[]`, the
  name `ListRow` gives its meta line), `system` takes neither. The attachments stand in one wrapping
  row (`MESSAGE_ATTACHMENTS`) over the bubble at the column's end, over another's reply
  start-aligned; one with `src` is an `Image` at `thumb` (it opens full size, so the mechanism stays
  Image's), one without a neutral `Chip` of its name. `meta` is the provenance ("by voice",
  "Kitchen"), joined by a middle dot before the time in the line under the bubble, beside the name
  over a reply; a message with no body draws no bubble, so an image sent alone stands alone. The row
  is one internal part (`message/attachments`) in each plugin that `MessageInput` draws as well, so
  the two never differ; only the input passes `onRemove`. The row aligns its items to the start, so a
  chip keeps its own height beside a thumbnail. A thumbnail's remove act is a `target`-sized hit
  box (`IMAGE_REMOVE`: 24, 44 on touch, a gap in from the tile's corner) centring the `REMOVE_HIT`
  disc (the chip remove's round box, held by no entry) on the raised ground in a hairline
  (`IMAGE_REMOVE_DISC`), so the glyph reads over any picture; the outside-content mark a product
  may want on each attachment is not built, since the product says it once (a notice or a header
  fact).
- `MessageInput.onAttach(files)` hears every file the viewer brings, as `PickedFile`s (the
  file control's descriptor, its `accepts` left to the consumer, who turns a file into an
  `Attachment`, uploading or reading it as the product needs, and passes it back). Stack owns the
  chooser. On the web the attach act clicks a hidden multiple file input, a file pasted into the
  text (any clipboard file when the clipboard holds no text; pasted text stays the text area's, so
  an image beside copied text pastes as the text) and one dropped on the input come
  through the same callback, and a drag-over draws the field's `edge-hover` boundary. On the
  phone the act opens the menu sheet with Photos (`expo-image-picker`, the library, no permission
  asked for the system picker) and Files (`expo-document-picker`), both native-ui peers
  declared as `expo-clipboard` is. The phone has no paste: React Native 0.85's `TextInput`
  exposes no paste event and hands over no pasted image, so the phone takes files through the
  attach act alone, a limit until React Native gives the text input one. A picked file's
  `PickedFile` reads its bytes through `blob()` like every file, and carries `src`, a local address
  to draw its thumbnail from before it is uploaded: the asset's uri on the phone, which needs no
  revoke, and on the web an object URL (`URL.createObjectURL`) that `MessageInput`'s attach path
  alone makes, for an image (a web `FileInput`'s file carries no `src`). The package never revokes
  it, since it cannot know when the consumer stops showing the file: the consumer calls
  `URL.revokeObjectURL(file.src)` once it drops the attachment.
- Focus at mount is declarative on native: a typing control (`Input`, `InputOtp`) takes
  `autoFocus` from `FieldFocus`, which the caller that knows no other field holds focus sets (a
  confirm's typed name), never a mount effect reading the focused input. An `Input` or `TextArea` the
  app opens in place of what the viewer read takes `autoFocus` (the platform's own word, off by
  default so a field on a form that loads with the page keeps the page's focus): it focuses on
  mount and ends the text under the caret (web: a ref sets the selection, since a programmatic
  focus leaves a textarea's caret at the start; native: `selection` for the first render only).
  Rejected: a field that guesses a swap from a mount after an interaction.
- What an agent made or did stands in a thread as a system Message's `detail` (`MessageDetail`,
  exactly one of three, the others typed `?: never`): `row`, one `ListRow` (its `title` a `Part`) in a
  hairline card on the surface (`MESSAGE_CARD`), its slots the row's (the kind leads as the icon or
  the first meta part), opening its record; `code`, a free act's arguments in the code role under
  the line, its verb, in the meta ink since they rank under it (`MESSAGE_CODE`); `fold`, meta lines
  (`MESSAGE_FOLD`) the line opens in place under it, its chevron turning down, read whole without a
  sheet. The code and the fold stand start-aligned across the message column at the pill's inset,
  wrapping at a space and breaking a token only when it outruns the line. The line stays the centred
  meta line; a fold's line is its toggle, so it opens nothing else. A line and its card stand a pair step apart (`MESSAGE_ENTRY`), the label over its content as a Section's title is over its body. A thread holds one item kind, so
  a row or a `Code` between messages is a detail, never a second item map or children.
- A collection takes data and draws its rows, and given a selection it is a frame of its own items.
  A `List` takes `items` (a
  constant, or a selection that paints) and one item map: `row`, one function per `ListRow` slot,
  `file`, one per `FileRow` slot, `meter`, one per `Meter` slot, or `definition`, one per
  `DefinitionRow` slot (`copyable` one value for the list). `useCollection` (`lib/read`) gives a
  List, Group's list, Table, Thread, BarChart, Comparison, Canvas (its `nodes`) and Diff (its
  `hunks`) the form of their own selection alone, whatever stands above: the failed form with Retry,
  the missing form and the empty form in the collection's own box with the generic sentences
  (`readFailed`, `words.missing`, `readEmpty`), and the stale and paused line above its rows while
  it holds its read. A frame that holds the same read draws instead and unmounts the collection
  with its failure, so the flags are drawn once. The collection takes no `empty` and no `failed`: a
  sentence of its own is the frame's, and the failed one is never anyone's. A collection whose read fails with no frame holding it holds
  it itself, so the dev no-holder error stays quiet. While the selection's read waits, a List paints `PAINT_ROWS` rows from the item map's
  slots, run over the placeholder through `painting` (a slot that throws paints itself with a dev
  warning, never the page), so a painted row draws exactly the slots the map declares: a ListRow's
  filler in each declared text slot and a painted mark per declared `status`, `chip`, `warning`,
  `lock` or `change`; a FileRow's chip only when `file` declares `chip` and its change lane when it
  declares `change`; a Meter's line only when `meter` declares `meta` or `counts`; a
  DefinitionRow's change lane, meta line (a description or a lock's reason) and end square (an act
  or `copyable`, or a chevron) by the slots `definition` declares. A row is wholly painted or wholly
  loaded, and a painted tree draws flat, since its depths are the data's. A painted row is inert and
  draws a chevron only where the `row` map declares `href` or `onOpen`, as the loaded rows would. A
  loaded string value too long for its room cuts in its middle (`list-state`'s `valueCut`: the stem
  truncating to the room the row gives, the last four characters standing whole), each platform
  measuring its own box; the whole value stays the read text and the copy act's payload. The
  `leading` slot names its kind by its one key (`{ avatar }`, `{ icon }` or `{ status }`, each a
  function of the item), so a list's rows share one kind or have none, and the painted row draws
  that kind's mark painted. A collection of unknown length paints four rows, and its height change
  on load is accepted. The collections' pure logic (the tree, the table and option projections, the
  sort) is ui-core's `./list-state`, and a frame's state is `./read`'s, both imported by both
  platforms and tested without rendering.
- A `ListRow` carries several marks as named props, not a `marks` record: `status`, `warning`,
  `lock`, `chip`, at most one each, in that order on the meta line (`ROW_MARKS`). `warning` is what
  is wrong with the row (a string: "Name conflicts with Checkout"), a `TriangleAlert` glyph at the
  meta icon size in `warn` (`ROW_WARNING`) beside its label in the meta ink; `lock` is what the row holds ("Holds 3 fields"), the lock mark whose label shows
  from `tablet`, the glyph alone below. The mark
  is one internal `LockMark` per platform (`list-row/lock`), which a Table cell and head and a
  `DefinitionRow` draw too: `LOCK_GLYPH` (the meta ink, no margin) names the glyph, and the
  container's gap spaces it from what it follows. The act that clears a warning is the row's `act`,
  one visible act a row; a mark that is itself a press would put a second hit inside a row that may
  open. The meta line yields from its end, by shrink weights (1, 10^7, 10^14 and 10^20, the lock's
  label absent on the phone: a flex line takes the overflow from each item in proportion to its
  weight times its own width, and `truncate` draws an ellipsis on any overflow, so a thin ratio
  lets an earlier part take a sub-pixel share and cut a part that fits; at these the share stays a
  few thousandths of a pixel against the layout's 1/64 px, and Tailwind reads no bare number from
  10^21) so the order holds: the later meta parts (they take no width of their own), then the chip, then the lock's
  label, then the warning's label, and last the first part, which names the item and truncates with
  an ellipsis (the status stays whole on the web, `shrink-0` and held to the line less `figures`, which the first part keeps; the phone's shares the first part's tier and truncates, uncapped, only when the line is out of room); every glyph keeps its width, and past them the line clips at the
  row's edge rather than overprint. The chip is shown whole or not at all: it stands in a slot one
  line tall that wraps (a start item as wide as nothing and as tall as the slot holds the first
  line a flex line always keeps, so a chip wider than the room the slot is left wraps under the
  slot and is clipped away; a start item with no height leaves the wrapped chip in the slot's
  height, drawn cut), so no sliver of a pill ever draws. Below `tablet` of its page a row with
  an `act` stands its acts on a line of their own at the row's end, under the text (`flex-wrap`
  on the row, the text a zero basis, the acts a whole line wide; on the phone always): beside
  them the text kept 65 of 288 px at 320, under the 112 the status and the two glyphs need, and
  the painted row draws the same line. A row holding an entry or wrapping its title keeps its acts
  on the title's first line. `selected` (`RowSlots.selected`) washes a row as the open record
  whatever its `href`, as the route does at one: a Table's list form passes its `selected`
  through it. The marks are flat items of the meta line, not a box of their own,
  so one set of weights orders them with the parts. Why named props: `List`'s per-slot functions let a painted row know which marks to reserve before any item exists (the slots run over the placeholder, and a mark is drawn where its slot is declared); a `marks` record function would hide that. A count is a meta part and a
  test status a `status`, so no cell kind is added; a change set's mark is `change`, below. A
  `Table` row's `warning` (`TableRowSlots.warning`) is drawn after its leading cell's name on the
  grid, the same glyph and label; on touch it is the `ListRow` warning, and on the phone's frozen
  leading column, a short measure wide, the glyph alone with the sentence read with the row's name.
  The Table has no row act, so a warning's act on a Table row is the row's open.
- A row's `status` is a `StatusMark`, and a painted row draws it as the Status's own painted form
  (`StatusBase painted`): the dot's box and a word's filler, at most `w-measure-short` wide, starting
  at the loaded word's x (the unseen dot's room and the status's gap in), in a box the meta line's
  height (`LINE_BOX` `meta`, `h-lh`; a `Strut` on the phone), so nothing shifts sideways when the word
  arrives, and the row is the two-line row from its first frame, yielding to the first part as the
  status does. There is no `{ loading: true }` status: a row is wholly painted or wholly loaded,
  and the `status` slot, run over the placeholder, only says the row has one. A row's status has one form, its word: `StatusMark` is `{ state, label }`, held whole
  on the meta line before the later parts and cut, its word truncating, only where the line is out of
  room beyond the first part's floor. Nothing measures the line, so no
  second form can flip against the first. A canvas node's status keeps a `short` of its own (the
  node's `status` is `StatusMark & { short? }`): the word beside the dot, where the dot alone
  otherwise stands for the status. A `DefinitionRow`'s status value stays whole as well, the label
  wrapping to the room it leaves, held to three quarters of the line.
- A row, a fact or a field carries where it stands in a change set as one `change?: ChangeKind`
  (`added`, `changed`, `removed`, `unchanged`, `stale`, in `descriptors.ts`, the one `ChangeKind`;
  the change cell's own kinds are the subset `ChangeCellKind`) across `ListRow`, `DefinitionRow` and
  `FormField`, with a `change` slot on `RowSlots` and `TableRowSlots`. One internal mark draws it
  (`ChangeMark`, beside `StatusDot`, not a roster entry): the kind's glyph (`CHANGE_GLYPH`: `Plus`,
  `PencilLine`, `Minus`, `Equal`, `History`) at the meta icon size in the kind's ink (`CHANGE_MARK`:
  added `ok`, removed `danger`, changed and stale `warn`, unchanged `ink-meta`, the same hues as the
  change cell's added and removed values) in a lane one icon wide, so the marked rows of a set line
  up (an unmarked row draws no lane). The glyph carries kind and hue: no edge bar, which the rubric
  keeps for the diff. Its word is the kind's own (`added`, `changed`, `removed`, `unchanged`,
  `stale`, plain words), its accessible name on the phone. The lane stands ahead of the leading slot (`ListRow`), the
  label (`DefinitionRow`), the field on its label's line (`FormField`, every form of it), and the
  name in a Table's leading cell (on touch the `ListRow` change). A row with no `change` draws no
  lane, so a set marks its untouched rows `unchanged`; a painted row draws the lane when its map declares `change`. Why one prop, no wrapper: the four parts each own their row box, a
  wrapper would have to reach into it, and the canon has no node slots.
- A row's `leading` may be a tick: `RowLeading` gains `{ check: { checked, onChange, blocked? } }`,
  a `Checkbox` in the leading slot at its hit box (`target`) above the row's open hit, named by the
  title. `blocked` (the reason it cannot be ticked) draws it disabled and leads the row's meta line,
  so the row grows to two lines. It is how a touch Table chooses rows; a `List`'s `leading` slot
  takes `check` as it does `avatar`, `icon` and `status`, and a painted row holds the tick's painted box in the same slot.
- A `ListRow` shows a labelled act and holds an input by two props, not a second row kind. `act` is
  one `Act` at the row's end ahead of the more act, a secondary Button at the bar fit with its
  pending and blocked forms; the more menu stays the row's other acts, so an act the row waits on
  has one home, `act`. `entry` is a `RowEntry` (`label`, `field`, `placeholder`, `act`, `error`): an
  Input at the bar fit and a labelled Button on one line under the title, in the meta line's place
  (it wins over `meta`, `status` and `chip`), its error under it in the error ink
  (`FIELD_ERROR_LINE`, the cell a `FormField`'s error draws too, held by neither; `ROW_ENTRY` is the
  gap, held by ListRow). The row keeps no state: the consumer gives `meta` or `status` in place of
  `entry` once the act settles. The Input is named by the entry's `label` and takes its bar fit from
  an internal prop (`inline` on `InputBase`, shared with a `Rules` term), as a Table cell's does
  from `cell`. A blocked act's reason draws on the row's own line, the Button handed a reason host,
  so the act keeps its place. A row with an entry stands its leading, trailing and acts on the
  title's first line (the box `wrap` uses), so the glyph names the line it sits by and not the
  input under it. Rejected: a `Form` or a `FormField` in a `Group` row, which draws a
  label over its field and a foot ActionBar, the wrong geometry for a row, and a Group child loses
  the row's leading and title. `RowSlots` carries `act` and `entry`, and a painted row draws a painted field box and a painted act in their places, the entry's line in the meta line's.
- A `ListRow` takes three more props, each a look the consumer cannot know and the row cannot
  derive. `dim` (`RowSlots.dim`, per item) stands the row off a highlighted path: its title in
  `ink-meta` at 400 (`ROW_TITLE` `form` `dim`), never faded, since opacity drops the title under the
  4.5:1 text floor and only a disabled part is carved out of it; the row stays a hit and focusable,
  its leading glyph and marks keep their hue (a status colour is meaning, not path), and the
  trailing is already `ink-meta`. It is an axis cell and never an overlay because the pointer and
  selection states of `ROW.state` are drawn from outside and `dim` is given. `steps` (`readonly
  StatusMark[]`, `RowSlots.steps`, per item) stands in the meta line's place while the row's act
  pends (the entry's rank: `entry`, then `steps`, then `meta` and the marks; the consumer gives
  `meta` back once the act settles), one line each (`ROW_STEPS`, a pair gap, and `ROW_STEP`, each
  line one body line's box tall, `line-body`, 22 at the desktop body size: the loading-and-pending
  page's range for a step list is 19 to 20, its 19 one approximate preview reading): the
  status mark (`StatusDot`, the spinner while `running`, the same cells as `Status`) and the label
  at meta size, the running step in `ink-body` and the others in `ink-meta`; each mark carries its
  state's word as its label, so the state is never told by colour alone. It takes no descriptor of
  its own, so it shares nothing with `Stage` (a rail of fixed stages: a progress indicator, not a
  status list). A painted row draws the meta line a `steps` slot declares, never the steps: the steps show while an act pends, never while a list loads, so a pending row standing taller than its painted row is a change of state, not of loading. `wrap` (`RowSlots.wrap`, one boolean for the list) is a
  title read whole: `ROW.lines.whole` (no minimum height, a `pair` pad, the lines set the height)
  wraps it to every line at body 400 (`ROW_TITLE` `form` `whole`, so a list of notes is not a wall
  of medium weight), the change mark, leading, trailing value or pick and acts standing in a box one
  body line tall on its first line (`line-body`, `h-line-body` on both platforms: the box is pinned
  to one body line, so a 44 act overflows it centred on the line instead of growing it). A `Quoted`
  title wraps whole in a row that has a second line (its closing quote is never cut away) and adds quotes (a model-written name), `Prose` has no per-item
  meta or more, `Message` is a turn; a row whose title wraps is none of them. The list's `wrap` flag makes the painted row draw the one-line form (one body line in the title's place, its
  leading, trailing and acts on it), the row a note loads into when it fits a line, and the list
  grows on load only by the lines a title wraps. The one `ROW_TITLE` family holds the four forms (`strong`, `dim`, `whole`, `whole-dim`)
  so a title's weight and ink are one cell, not a call-site pick; `rowTitleForm(wrap, dim)` names it
  for both platforms.
- A `List` whose `row` map gives `children` is a tree, not a new component: folding hides rows a
  lone `ListRow` does not own, and a tree component would copy the List's four states. `treeRows` in
  `./list-state` flattens the items to the visible rows (each item, then its children one depth in
  unless its key is folded), pure and tested; the List holds the folded keys (open by default;
  `RowSlots.key` names a branch, so keys are unique across the tree) and hands each row its depth
  and fold as an internal prop of `ListRowBase` (the public `ListRow` is a thin wrapper that never sets it), so `ListRow`'s roster props do not change. Each level is one
  `indent` step (a size, 16 desktop and 20 touch: the leading slot plus the gap would be 30 or 40
  per level, and three levels would cost 90 px of a 360 px list column) with a hairline on its end
  (`TREE_RAIL`), which falls under the middle of the parent's fold lane. Every row of the tree
  reserves the lane (`TREE_LANE`, the `control-compact` square; painted rows too), a branch's fold act standing in it as the bar-fit `IconButton` with a
  `ChevronRight` or `ChevronDown`, named by the words `expand` and `collapse` before the title. The
  levels and the lane stand as one box that bleeds the row's padding (`TREE_BLEED`, keyed on
  `ROW.lines`: the negative of the form's `py`, so `-my-rows` on a two-line row and `-my-pair` on a
  wrapped one), and the tree's list drops the row gap (`LIST_TREE`), so a rail is unbroken from row
  to row. A flat list whose `row` map declares `meta` (two-line rows) abuts its rows too and parts
  them with one full-width hairline (`LIST_DIVIDED`: on the web a pseudo-element on each row but the last, a react-ui overlay, so it
  stays straight across the row; `between` per row on the phone); a Group's own hairline falls once instead, and a tree draws none. On the web the tree is a real tree, the WAI-ARIA tree pattern: the list is `role="tree"`,
  each row a `treeitem` (the row's own element: named by its title,
  `aria-level` its depth plus one, `aria-expanded` on a branch, `aria-current` at its `href`) and the
  tree holds one tab stop, roving to the row last focused (`treeStop`; the hit link and the fold act
  leave the tab order, the fold act staying for the pointer). Down and Up
  move between visible rows, Right opens a closed branch or moves to the first child, Left folds an
  open branch or moves to the parent, Home and End go to the first and last visible row, and Enter
  opens the row. That navigation is `treeMove` in `./list-state` (pure, tested, returning a focus
  index or a fold), with `folding` setting a branch open or folded by key; the List's container
  hears the keys and focus its rows send up and moves the focus. A row's own controls (its act, its
  more menu) keep their tab stops. The phone has no keyboard focus: the fold act's
  `accessibilityState.expanded` is its state. A painted tree draws flat, since the data's own depths are unknown while it waits. `dim` composes by item: an off-path branch gives `dim`
  to its parent and each child, so the branch reads grey whole, its chevron staying in the meta ink
  and its rail the `edge` hairline. A Section counts a tree's top level, not every node.
- A value outside its editable context reads locked on the fact's own row: `DefinitionRow.locked` is
  a `Lock` (`reason`, `href`), drawing the lock mark after the value and the reason as the row's
  meta line, the whole line an inline `Link` when `href` names what holds it ("Held by CR-12, Ana").
  The value stays (`copyable` too); the row takes no `description`, `act`, `href` or `onOpen` (a
  union on `locked`), since the reason is its one line and its one link, never a link inside a row
  that opens. `FormField` keeps `disabled` for a control that cannot take input now; a held fact is
  not a disabled input. Rejected: a `Part` kind carrying a link, which would put links in every meta
  line where the row itself may be the hit.
- A read that answers not found is `missing`, a state of its own beside `failed`: every read
  ends in content, "does not exist" with a way back, or Retry, and Retry cannot bring back what
  was removed. The handle knows its error type, so `read(options, { missing, kind })` carries the test
  (default `isNotFound`, `code === "NOT_FOUND"` or `status === 404`) and ui-core's
  `readState(result, missing)` (`@fcalell/ui-core/read`, framework-free: it names only the few
  fields of a query result it reads and imports neither TanStack nor React) gives the phase
  (`idle`, `waiting`, `ready`, `failed`, `missing`) both platforms share, so no error shape is
  guessed and no prop is added. `frameOf` folds a frame's held root and drawn value into its form
  (`ready`, `waiting`, `still`, `empty`, `failed`, `missing`). A frame draws the missing
  form when its own selection's read is `missing` and the failed form (with Retry) when it is
  `failed`, whichever frame holds the read above it. The form is
  (`missing/base.tsx`): the empty state's frame at rest ink with no mark, the word `missing`
  ("This no longer exists.") and Back, the hairline act with no plus (a Back is no create act,
  as Retry is not; the base's internal `missing` tone carries it), never Retry. The form is
  public as `Missing` (`sentence?`, `act?: LinkAct`) for a missing state decided from data (a
  loaded list lacking the record, an address nothing serves): `LinkAct` is the act that goes to a
  route (`{ label, href }`), the one descriptor both platforms carry, and the act defaults to
  Back. Rejected: an empty-state flag for the act's kind (a consumer option to pick a look) and
  deriving it from `href` (a create act that navigates, "Add a repo", keeps its plus). `tone`
  stays internal, as does `fill`. Back goes to `BackRoute`, the `back` of the Pane around the read, else to `PlaceRoute`, the route of the place that owns the
  address (`placeAt` in `./route`, which the Shell reads, below); with neither it draws no act. Going to a route is navigation, so on the web Back is an anchor
  in the hairline act's look (the internal `ButtonLink`), as a Pane's back and
  Close acts are anchors in the icon act's (`IconButtonLink`); native presses through
  `navigate`. On the web every anchor routes in place: its `onClick` is `lib/navigate`'s
  `follow`, which opens a plain primary click on a route of the app through the app's router
  (bound by the generated entry through `react.slots.routerBindings`) and leaves every other
  click (modified, middle, external) to the browser. A missing list gives the Section no count.
- An address no route serves is drawn by stack, with no part, option or prop: the `notFound` word
  ("Not found") as the title and the `nowhere` word ("Nothing is at this address.") as the sentence,
  on both platforms through one internal component per platform (`lib/not-found`), not in the roster.
  Where it stands decides its frame: under a Shell, a `Place` holding a `Pane` with the `Missing` form whose act
  goes to the Shell's first place that is a route (`ShellHome`, a context the Shell hands down; a
  place that is a spot on its page, `#activity`, leads nowhere from a missing address); outside
  one, a `Gate` with the `back` word as a standalone link to `/`. On the web react-ui contributes
  `bindNotFound` through `react.slots.routerBindings`, which sets the router's
  `defaultNotFoundComponent` after `createRouter` (`router.update` merges options and the
  default is read at render). TanStack's `fuzzy` mode hands a miss to the nearest matched route
  with children: an address under one of the app's routes (`/members/zzz`) stands in that route's
  layout, so under a pathless `_app` Shell, while a miss no route is under matches the root alone
  and stands outside it. A route of the app's own wins (a catch-all that matches, a route's
  `notFoundComponent`). On the phone expo-router reads an unmatched address's route from a
  `+not-found` file at the root of the routes directory and from no other place, so expo writes
  one there through `expo.slots.notFoundRoute`/`notFoundFile` (native-ui contributes the module)
  only while none sits at the root; it stands inside the root layout, so a layout drawing a Shell
  is where it draws a Place. Rejected: a roster part and an option (the page is the same in every
  app and an app's own route replaces it), expo-router's require-context keys patched in the
  generated entry (a documented file route exists), and a file in `.stack/` (expo-router reads
  none).
- The failed form is public as `Failed` (`sentence`, `act: Act`) for a failure that is no read (a
  mutation that opens a file): the alert mark, the hairline act with no plus, drawn by the same
  empty state's `failed` tone (`lib/empty`) that a frame renders through `FrameBody` for a failed
  read, so the two cannot drift. A failed tone's act is the hairline one in every form. Its act is a function act, never a `LinkAct` (a way back is a `Missing`). A frame's
  failed form says `readFailed` ("This didn't load."), never a sentence of the frame's own (a Pane, Section, Sheet, Form and a form's group take no `failed`: what failed to load is the frame's title and place, and a per-frame wording only repeats the generic line), and its Retry
  refetches the read it holds and pends while it does; a frame's empty form says `readEmpty`
  ("Nothing here yet.") or its `empty`. Rejected: a frame taking a mutation's result (a frame holds
  a read, and a fake read is a workaround), `Missing` taking an `Act` (its form has no mark and no
  Retry) and an empty-state tone (the look option `tone` stays internal).
- An empty state is no placed component (`EmptyState` is gone from the roster): a `Pane`, a
  `Section`, a `Sheet`, a `Form` and a form's groups take `empty` (`Empty`: `{ sentence, act? }`) and
  draw it in place of their body, only when the frame's own `read` is empty. The read alone decides:
  a frame with no `read` has no `empty` (`PaneProps` and `SectionProps` are unions, so `read={maybe}`
  with `empty` does not type-check), and it carries a sentence and an act, no icon, title or children.
  A first run is no empty state: it is a titled `Gate` (see the Gate), so the drawer has no title,
  children or icon of its own (only a failed read's alert mark). A collection draws its own
  generic empty form. One drawer (`lib/empty`) takes an internal `fit` from whoever stands it, so
  nothing reads where it stands (the `PageTitle`, `SectionContext` and `GroundContext` reads are
  gone): `page` (a Pane's: centred in what the body leaves, the act the filled one with the plus),
  `frame` (a Section's, a Sheet's, a Form's and a group's, a collection's, and
  `Failed` and `Missing`: the `EMPTY_FRAME` hairline card and the act the hairline one, or one quiet
  sentence at meta when only `sentence` is given). `PageTitle` stays the id of the title that labels a Thread's log and a
  Table's grid, and nothing else.
- A `Comparison` is a collection of facts with the List's source (`items`, a constant or a selection)
  and a `row` map over a fact's slots: `key`, `label`, `values` (one per column, in order), `chips`
  and `status`. A fact's `status` is its verdict, a `StatusMark` drawn in the label's line after the
  label and its chips, so on touch it never squeezes the values; a passing fact returns none, or
  `{ state: "done", label: "Matches" }` where the screen wants the pass read. It is a trailing
  `Status` rather than a leading one (a passing row has none, and every row of a list leads with the
  same kind of mark) or a tint (status hue stays on the dot). Its column heads are its declared
  `columns`, constant, so its painted form is the real head over `PAINT_ROWS` painted facts: filler
  for the label, a value per column, and a chip's box and a status's painted mark beside the label
  when `row` declares `chips` or `status`. The Section around it holds the read and gives no
  count: its facts are one record's, not items the Section counts.
- An `OptionList` is a collection with a static form. A static set takes `options` (an `Option` is
  already the projected row, and never paints); a set from data takes `items` (a constant or a
  selection) and an `option` map over the check row's slots (`value`, `label`, `description`,
  `recommended`, `blocked`, and `group`, the label it stands under, groups in the order they first
  appear). Painted, a set from data is `PAINT_ROWS` check rows, two-line only when `description` is
  declared, under a group label's filler only when `group` is; its options' state is its own
  (`useOptions`, `lib/read`): while the read waits the trigger or rows paint, and once it has failed or is missing the control draws the failed sentence with Retry (or `words.missing`) in a line under itself, with no busy or stale flag and no frame needed, so the field keeps its place in the form. Its `value` is a `Datum`
  followed through `useDraft`: a selection paints the boxes or rings until it lands, and the
  viewer's pick then replaces it. No Section reads it. Its projection (`optionsOf`) is in
  `./list-state`.
- An `OptionList`'s `value` picks its form: a set is several choices, check rows each toggling
  the set; one value or null is one choice, radio rows in a radiogroup (the web's
  Base UI `RadioGroup`, native `radiogroup` around `radio` rows with their checked state). The
  radio is the box's size (`OPTION_RADIO {state}`, a `full` ring in `edge-strong`, `toggle-on`
  when chosen) around the `toggle-on` dot (`OPTION_RADIO_DOT`), both held by OptionList. The
  radio is the focused element, so the web's base focus ring draws on it; painted, radio rows lead with the ring's paint, check rows with the box's. The
  description line, the recommended mark and the children under the chosen option are the same
  in both forms. The form is the component's two call signatures (`OneChoice`, `SetChoice` in
  `./list-state`), so an inline `onChange` takes its parameter from `value`: TypeScript does
  not narrow a props union by `value: V | null` against `value: readonly V[]`, neither member
  being a literal type. Rejected: a `ChoiceList` beside it, the same rows under a second name.
- A `BarChart` is a collection on the same decisions: `items` (a constant or a selection) and a `bar` map (`key`, `value`, `parts` by `keys`, `at`, each a function of the
  item). Its head is the sum of its bars (a flow); `level` (the bars are a level, a fact only the
  app holds, so no derivation) makes it the last bar's value and each key's last part. Its axis scale and head are `./chart`'s `chartScale` and `chartHead`,
  one pure answer for both platforms (with `unitOf`, the unit's form at the figure it follows:
  `unit` is a word, `{ one, other }` or `{ currency }`, whose figures carry the symbol and no word
  follows; a currency's head and keys stay exact and its ticks drop the cents when the step is
  whole): four even steps over the peak, and when every value and
  part is a whole number and the step would fall under 1, a step of 1 over as many bands as the peak
  rounds up to, so a peak of 3 ticks 1, 2, 3 and never past its bars. Each tick is centred on its
  gridline and the baseline carries the 0, so the top tick reaches half a meta line above the plot
  and the body stands that far below the head (`tickReach`; the web's `1lh / 2`). Its `keys` are declared, so its painted form is the legend standing with its figures painted, the
  total a painted figure and the plot one painted box at its loaded height, the time labels filler.
  Its failed and empty forms are its own.
- A Section's rhythm has two steps: its head is paired to its body (`SECTION`, `pair`) and the body's own parts (a Prose, a Code, a Group, an ActionBar) stand the `fields` step apart
  (`SECTION_BODY`) wherever the Section sits, so a dense run of parts reads as parts; a Group keeps its
  rows' own tight spacing.
- A Section's head ends in its `act` then its `more` (`MenuItem[]`, a prop shaped as `ListRow.more`, drawn by `MenuBase` titled by the Section; not a menu kind of `act`, which would widen the shared `Act` descriptor). Both stand in one end slot, so they wrap under the title together on touch; the more sits outside a foldable Section's toggle and never folds it.
- A Section's count is exactly its `count` (static) or an array read's length once it lands, and
  is never drawn while its body waits, on either platform (003-326: the waiting chip had been a bar one figure wide around an unseen "0" so nothing moved when the count arrived, and Stead's
  critique read the "0" in a loading head). The count arrives at the title's end, where it moves no
  title.
- A Section is a heading over its body and no landmark: the web's `section` carries no
  `aria-labelledby`, so it has no role, and the Pane is the page's one named region at each
  title. A Section titled as its Pane (a record's tree under the record's name) is therefore not
  a second region of one name (axe `landmark-unique`); heading navigation still lists it, and
  the page's content stays inside the Pane's or Gate's landmark. The phone's Section is a
  `View` with no role. The render walk's same-name check stays for the regions an app names
  itself.
- A Section holds one read of its body (`read`: a read, a selection or a `combine`; the one
  non-quiet read no enclosing frame holds) and draws its failed, missing and empty forms in the
  body's place, the head standing. The forms are `FrameBody`'s (`lib/read`, one per platform) over
  the state `useFrame` derives with plugin-api's `useFrameRead(read, frameOf)`: one `useQueries` per
  frame whose derivation runs in `combine`, so a frame renders when its form, count or busy changes
  and never on a value change. A frame's form comes from its own selection alone. `HoldsContext`
  (`FrameHolds`, a context of query hashes, identity only, which `FrameBody` publishes to the body
  and which both verifies sweep for rule 11) places flags and nothing else: the frame that holds a
  read draws its busy, stale and paused lines, is `aria-busy` while it waits (the phone's
  `accessibilityState.busy`), carries `heldPlaceholder` on its observers (the dev holder, below), and
  has Retry refetch the read it holds. Sibling frames that draw one read each hold it and each fail in place; the repeated
  line is accepted, and a read is never lifted into a frame around them. A second
  non-quiet read in one frame is a dev `console.error` naming both keys, and the frame holds the
  first. `selection.or(fallback)` is for enrichments (a name, a badge, a lane order): a read used
  only through `or` is quiet, subscribed and never held or painted (its observer carries no
  placeholder), and its part gives
  the fallback in every state but real data. A Sheet, a Pane's docked foot and docked sheet and a
  Thread's foot start with no holds. Acts paint by their own datum (`Drawn.phase`): a constant act
  is live in every form of the frame; a selection act paints while its read waits, stands still
  with no sentence when its read is idle or paused with no data, and stands blocked with the failed
  sentence (`words.missing` when missing) once its read ended. A Pane's actions and more, a
  Section's act and more, a Banner's act, a row's act and more, a Sheet's or Form's submit (its own
  read's) all follow that, and a Section's count shows only when its form is ready or empty. A
  failed or missing Pane is the whole page with Retry its one act, its foot and docked sheet kept. A
  selector that throws over the placeholder returns it silently; a throw over real data rethrows.
  Empty is an empty array, `null` or `undefined` on real data, and the frame's read alone decides
  it.
  The body's leaves paint on their own selections: a List and a Group their painted rows, a Prose,
  a Thread, a Code, a Meter, a Slider, a DefinitionRow and a FormField's control take a `Datum` and
  read nothing from the Section, so no context carries a wait flag (structure rule 11: a context carries identity only). A body that is an app's own component draws as it is and reads with
  `useRead`. A control follows its selection until the viewer edits it (`useDraft`; a selection
  over another read drops the edit), so typed text outlives a refetch and no control flips on the
  frame. A control whose value's read ended stands in its loaded box with no value (`Draft.ended`, set
  from the selection's `failed` or `missing` phase; `painted` still says the value is absent): no
  switch position, no segment, an empty pick, empty text, an empty meter, nothing moving, because the
  box is the painted one without the fill. It is blocked like an ended act, and what blocks it is the
  draft itself: `useHeldDraft` and `useFieldDraft` (`lib/act`) hand the control a `change` that
  changes nothing and says `endedReason` (`readFailed`, or `missing`) where that control already
  says a refused save, a failed toast for a bare control and the field's error line, kept until the
  read answers, for a field. The controls write nothing for it beyond reading `ended` for their
  look and skipping their separate `onChange` (a Slider's, an Input's); a Picker opens no list,
  asking the draft to change instead. A Meter has nothing to press, so it only stands empty. This
  is the rule a row that holds its own read follows (a failed row's label stays, its value slot
  shows the failure, its description says it and pressing it retries); a control elsewhere is only
  blocked. Rejected: registration (a layout effect per collection, a second commit before paint), a
  registration the head reads in render from a host object (the head renders before the body, so it
  would always be a render pass stale), and a context handing the body a wait flag (every part had
  to read it and keep a second tree for it). `SectionContext` is gone: a Section's `empty` is its
  own prop and its title one size, and no Section stands in a Section. Only a frame that holds a
  read is busy; a collection is not.
- **The frame's states past the first read.** The frame that holds the root renders on `busy`,
  `stale` and `paused` (`frameOf` carries them, so there is no second subscription), and its
  children are the same elements, so they bail out. *Busy* is `BusyMark` (`lib/read`): the
  `Spinner` in meta ink after the heading (a Pane's title, a Section's title and count, a Sheet's
  title, a form group's legend; a frame with no heading, a Form's root, shows none), faded in after
  `WAIT_DELAY` on the web and snapped in by `useShown` on the phone, so a fast refetch draws
  nothing. `aria-busy` is the first wait alone (form `waiting`), never a refetch. The scramble
  glyph waits for `theme.loading` (`motion.md`). *Stale* and *paused* share `FrameLine`, one
  `StateLine` (a meta sentence and an optional quiet act) under the heading row: "Couldn't
  refresh." with Retry, pending while its own refetch runs (`useFrameRead`'s `retry` returns the
  `refetchQueries` promise, `More.fetch` `fetchNextPage`'s, and the act holds it like any act; a
  refetch nobody pressed shows the busy mark alone), and "Waiting for a connection." with no act.
  `StateLine` is the one internal part the more row and a stopped reply reuse. *Still* is the form
  for a painted drawn value whose root is idle (`enabled: false`, `skipToken`) or paused: the
  loaded tree painted and inert, not `aria-busy`, with no busy mark; it changes nothing visible
  until the motion phase's pulse reads it. A fetch of a `kind: "stream"` read with data is
  `streaming`, not busy, so a live read does not spin forever.
- **The more row belongs to the collection.** A paginated procedure's `.pages(input)` is a read of
  `kind: "pages"` whose options carry `_type: "infinite"` (so a leaf's plain `useQueries` builds the
  query infinite whichever observer creates it) and whose value is the flat list, so
  `Pane read={deploys}` with `List items={deploys}` keeps the plain idiom. The frame reads the raw
  pages for `more` and `hasNextPage`: no count while more remains, and an empty first page with more
  is not empty. List, Group's list and Table pass `pagesOf(items)` to `MoreRow` (`lib/more`), which
  holds its own `useMore` (an infinite observer with `enabled: false`, so it never fetches by
  mounting) and renders alone on a page fetch: "Show more" pressed by the viewer (scroll-triggered
  loading would need measuring, rule 7), `PAINT_ROWS` painted rows through the collection's
  `paint` callback while the page loads, "Couldn't load more." with Retry when it failed, and a
  fetch on mount for an empty first page that has more. A next-page fetch is `fetchingMore`, which
  `readState` excludes from busy and `settleReads` does not count as a flip; a page that failed is
  the collection's line, not the frame's stale (`planFrame` presents the pages it has as success).
  A `Table` paints its next page as a grid of its own at the same columns, under the loaded one's
  box; the narrow list paints rows in the same slots. Rejected: a more row owned by the frame (it cannot know which collection
  below it pages), and `useInfiniteQuery` in the frame (its result carries no `hasNextPage` through
  `useQueries`).
- **The reply turn.** `Thread reply?: Selection<T | null | undefined>` is the turn being written,
  a read the app declares: a stream (`kind: "stream"` over TanStack's `streamedQuery`, re-exported
  by plugin-api, which builds no oRPC `.stream()` since that API is unstable) or a slice of a
  channel read (`plugin-node/live`). `ReplyTurn`, the Thread's child, holds it with its own
  `useFrameRead(reply, turnOf)`, so a chunk renders it alone. `turnOf` names the form: `waiting`
  (a root asked for, no chunk yet, drawn as `WaitingReply`), `writing` (the message with
  `streaming`), `written`, `stopped` (a failed or stale root with text written: the partial message, then a
  `StateLine` "The reply stopped." with Retry, which re-runs the stream) and `failed` (a failed or
  missing root with no value: the same `StateLine` with the generic `readFailed` and Retry, since
  nothing was said that could have stopped); a turn draws waiting, stopped and failed only when it
  holds its read (`root.held`), so a Thread whose items share the read, which
  says the failure once, gets `none` for a waiting or failed root with no value and `written` for
  a partial or stale one; a selection reply draws its value only and `none` is `null`. The turn steps aside when its key equals the last item's,
  which removes the double draw as history catches up. `replying` stays the app's boolean for a
  reply it does not stream. Thread's earlier-history paging is not built: no thread pages, and
  its anchor on a prepend went with it.
- **A long collection windows on the web, with no prop.** `@fcalell/ui-core/window` holds the
  count (`VIRTUAL_FROM`, 100 loaded rows, set from a render measurement kept in `states.md` §7),
  `OVERSCAN` (8 rows past each edge) and the node-tested arithmetic: `slotsOf` places the mounted
  runs of rows and one spacer for each run of unmounted ones (gap-exact), `ranged` adds the indices
  kept mounted to TanStack's range. react-ui's `lib/window` holds the rest. `Scroller` is a context
  of identity whose value is a holder (a ref), provided by the Pane body, Sheet base body, docked
  Sheet body, Gate page and Thread log through `useScroller` (one stable ref function, the node
  also in state for `useScrolls`); the holder is the same from the first render and its element
  arrives with the commit, so a collection mounting with its Pane windows in its first draw, from
  the viewport's size, and renders once more to measure against the element. The nearest scroller
  wins, so a List in a portaled Sheet never windows against the Pane. `Window` is TanStack Virtual
  over it: the host gives `Window({ count, keyOf, row })` and the box the rows stand in, and
  `Window` builds `row(index)` only for the mounted indices, so the rest are never built or rendered
  (each row kind is one `memo` component taking its item, index, descriptor and `painted`); below
  the count or with no scroller it returns every row (crossing the count on a Show more keeps the
  same keys in the same parent, so nothing remounts) and otherwise the mounted slice
  between spacers (`aria-hidden`, a `tr` in a tbody, sized against the box's `row-gap`). Rows are
  measured by their place among the box's children (a row is exactly one element, enforced in
  dev), never by an attribute or wrapper; offsets are box-relative, re-reported by a
  ResizeObserver on the scroller's children when content above the box changes height. The
  virtualizer is the one scroll anchor (`overflow-anchor: none` on the box, `useFlushSync: false`,
  so the settle's `flushSync` is the only one), and its adjustments are applied as increments
  from the scroller's own position, so a scroll the browser made (a focus) is not undone. The
  focused row (tracked by `focusin` on the box) and the host's `keep` stay mounted through the
  range extractor, so mounted runs may be non-contiguous; `keep` is in the extractor's
  dependencies, so a new one ranges again. Which collections window: List (flat; rows, files,
  meters and definitions), Group's list (its card is the box), Table at both widths (the narrow
  form is a ListBase; the grid's tbody takes `keep` as the cursor row and `spacer="tr"`, moves the
  cursor first and focuses in a layout effect so Ctrl+End reaches the last row, and carries
  `aria-rowcount` and `aria-rowindex`), and Thread (the log is the scroller, its content div the
  box, `end` opens at the last rows; `replying`, `ReplyTurn` and the more row stand after the
  window, so a token grows outside it), trees (the tab stop's row kept mounted, keys moving by
  index over the visible rows, `treeRows` saying each row's place among its siblings for
  `aria-setsize` and `aria-posinset`), an OptionList's groups (a memo `OptionRow` each; the checkboxes
  carry no set size, the radios their place in the group), a Picker's sheet and its desktop search
  list (Base UI's virtualized combobox, from `VIRTUAL_FROM` options, the highlight kept mounted and
  brought into view), Comparison (its facts behind a kept head row, with `aria-rowcount` and
  `aria-rowindex`, on the Group's `GroupCard`) and BarChart (past `VIRTUAL_FROM` bars it keeps a
  bar's width and scrolls sideways under its axis, its bars and times windowing along x through
  `Window horizontal`). Not windowed: painted forms (`PAINT_ROWS`, always below the count). Rows carry no settle names, so the settle and the shift check are unchanged. Accepted:
  find in page and print reach drawn rows only. The phone draws every row and its Thread keeps
  its inverted log; the design for it stays open in `states.md` §7 until a device measures it.
- **The phone wires TanStack's managers.** `QueryProvider listen` takes `online` and `focus`
  setters, which native-ui passes (`lib/net.ts`: `expo-network`, `AppState`) the way it passes
  `settle`; without them the phone never pauses a read and never refetches on focus.
  `folded` is the initial fold: the Section holds its fold from there and reads no later change. A foldable Section's chevron stands after its title (and count) inside the toggle, so every Section's heading starts at one left edge (003-327: with the chevron before it, a folded Section's heading stood 22 px right of an unfolded one's); the phone's Section still leads with it.
  
- A Form's structure is its props, one of `children` (a flat run of FormFields, a `fields` step apart)
  or `groups` (`{ title, description?, lead?, fields, read?, empty?, failed? }`, each a `fieldset` with a `legend`
  on the web, a labelled group with a header on the phone, `FORM_GROUP` and `FORM_LEGEND`, the groups
  a `sections` step apart), a TypeScript-exclusive union a `steps` shape can join. Its `bar` is the
  ActionBar's own props, drawn in the foot (`FORM_FOOT` under a form of groups; stuck in a sheet on
  the web); the form reads no child. A form's `read` frames all its fields and a group's `read` its own (`FormGroup.read`, `empty`): each group is a frame, so a page of a workspace group and a devices group reads each where it stands, and the bar follows the form's own read alone: its filled act paints while that read (or its sheet's) waits and stands blocked with the failed sentence once it ended, and a group's read never reaches it. A FormField's control is exactly one descriptor (`switch`, `checkbox`, `slider`,
  `options`, `segments`, `input`, `textArea`, `picker`: the component's own props less the label the field supplies) or its
  `children` for any other control, and the field's form comes from which is set; a DefinitionRow
  likewise takes an explicit `switch` or `pick` (an `OptionPick`, drawn as the Picker at the row fit,
  named by the row's label, the way an ItemHeader's pick fact is) in place of its `value`; a painted pick row stands the picker's box where its value stands. `FormIn` is `page`, `sheet`, `auth`
  (`pane` died with the Split's pane foot).
- `Group` is a frame whose structure is its prop, exactly one of `items` or `list` (a union, as a
  Form's `children | groups`), and it reads no children. `items` is `GroupItem[]`, each `{ key, row }`
  (a ListRow, FileRow or DefinitionRow, drawn bare: the row pads itself) or `{ key, item }` (a Meter,
  a FormField or a Slider, drawn in a box at the card's inset, `GROUP_ITEM`, the Group's own class
  for the entry box); the Group's
  hairline falls between entries (web: the entries stand in the card directly, under `GROUP`'s
  `divide-*`; phone: Group maps its own array, so each entry box after the first draws `border-t`).
  `list` is a `ListProps` the card frames, drawn by the internal `ListBase` with `framed` set (an
  internal prop, not a context: the public `List` is a thin wrapper that never sets it), which drops
  the bleed and the List's own box: its rows, painted ones too, stand on the card, the Group's
  hairline once between them (phone: the List draws it on each row after the first itself, as a
  divided list does), A tree and a `definition` list take `list` too. Not both: a Meter list in a `list` stands each meter in `LIST_ITEM` (the List's own
  `p-card`), and a FormField beside a List is two Groups. The web card,
  like each other block frame that hides its overflow (`Code`, `Diff`, `ProseDiff`, `Image`, `Stats`), never shrinks (`shrink-0`): its `overflow-hidden` gives a flex item a zero automatic
  minimum, so in a column that scrolls (a Pane's body, a Sheet's body) it would give up
  height and clip its rows; native's `flexShrink` default is 0. A Group reads nothing of its body: each part paints on its own selection, so a card of static
  parts waits at one painted form per part and at the loaded card's height, and a row of an app's
  own draws as it is. A painted DefinitionRow is the loaded row (`painted` is internal; its `value`
  and `description` take a `Datum`): the label constant, the value's slot filler or its control's
  box, the description's line painted, in the loaded DefinitionRow's boxes (the label's body line
  box beside the switch's target-sized hit box on the title line, the description's meta line box
  under it), so its height and its bars' centres are a one-line setting row's at either density. A
  Slider paints its label's and value's filler over its track's box. A `definition` list is facts and carries no count of its own.
- A Meter, a FormField or a Slider is an `item` of a Group's `items`, in the entry box at the card's
  inset; a FormField keeps its label, and a Meter, a Slider and a FormField carry no inset of their own. A set of them from data is a `List` taking `meter`, in the Group's `list` (a set
  of label and value rows from data is a `List` taking `definition`). A
  FileRow is selected at its `href`, as a ListRow is.
- A Meter's one line under its bar is `meta` (words) or `counts` (`readonly CountLink[]`, links),
  exclusive in the type, as the meter's head already carries the share. `CountLink` (`{ label,
  value, href }`) is the shared descriptor for a count that leads to its list; every molecule
  carrying counts takes it and composes `Link`, never spelling it: the line of links is
  `COUNT_LINKS`, one cell the Meter and the Stats cell both draw through one private `CountLinks`
  part per platform. Each count is a `fit="standalone"` link: it stands alone on its line, so it
  takes the `target` box (`LINK_TARGET`, 28 / 44; the web's anchor carries it, the phone's link is a
  pressable of that height with its words centred, since a text's own box takes no touch past its
  words) rather than the inline fit's line-high one. A painted meter or strip cell stands at the loaded height by the line it declares (`counts`, a
  target-high box, over `meta`, a meta line box, over none), read off the `meta` or `counts` it is
  given even while painted. A Meter's `label`, `value` and `max` take a `Datum`; a `Stats` cell's
  figure is a `Datum<number>` and paints alone, its label, unit and line constant. A `mark` (`{ value }`, `MeterMark`) is a tick across the track centred
  on `value / max` (`METER_MARK`, outside the clipping track) and the meter's near point in place of
  `METER_NEAR`. The role's children are presentational, so the counts stand outside the element
  carrying the meter role.
  The `List`'s `meter` map takes `counts` (a function of the item, exclusive with `meta`) and
  `mark`.
- A `StepCount` (`{ at, of }`) is an onboarding flow's place in it: `of` segments (two to four) at
  the `meter` height, 6/8, inside the 3–6 the references measure (`STEP_COUNT_SEGMENT {state}`,
  radius `chip`, a gap `inside` apart), the steps
  before `at` `done`, `at` `current` and the rest `later` (`stepStateOf` in `./list-state`, so both
  platforms draw one state per segment, its `StepState` the type a `Stage` takes too), over "Step n
  of m" (the slot word `stepOf`) at meta. `done` and
  `current` fill `ink-meta`, `later` `fill-neutral`, never the accent, which the rubric leaves to
  checked controls and the active dot. It is an atom, not a prop on `Pane`, `Form` or `Sheet`: an
  onboarding step can be any of the three. The one frame that owns its place is `Gate`, whose
  `step` draws it between the mark and the title. It takes the count alone, not a `Step[]`: onboarding
  steps carry no label or date.
- `Gate` is the layout frame of a page outside the shell (a sign-in, a consent step), beside
  `Shell`, `Place` and `Pane` rather than a variant of `Pane`, whose bar, acts and foot
  assume the sidebar or tab bar beside it and which carries a back act; a host element at the `auth` width would be a numeric dimension, which the
  rules refuse. Its props are `title`, `description`, `step`, `mark`, `banner` and `children`, the
  style channels closed. It is a root frame as the `Shell` is: it mounts the `FrameHost` both share
  (the `toast()` queue, the `confirm()` decisions; `components/shell/host.tsx` on
  each platform), so `toast()` and `confirm()` stand in it, and on the web it sets `PageTitle`, a
  `HeadingContext` of 2 and a `main` landmark. It draws, on the surface at the page inset (`GATE`),
  one column `w-full max-w-auth` (`GATE_COLUMN`, a width and nothing else; the region centres it,
  across, and down by an auto margin while it fits, never `justify-center`, which clips the top of a
  column taller than the viewport, and at the top on touch), whose banner and step stand a
  `sections` gap apart (`GATE_FLOW`): the `banner` (a `Banner`, first at the column's width), then
  the step (`GATE_STEP`, a `fields` gap between every part, so none is nearer another): the app's mark, the
  `StepCount`, the `title` at the `title` role, the page's one `h1`, its body's `Section`s a level
  under, the `description`, and the body. The `description` is a `Sentence`
  (`./descriptors`: runs, each a string or `{ strong }` at 500, the way a nested `Text strong`
  draws), data because composed regions are data; a lone string is no `Sentence`. The mark is no
  prop: it is the app's lockup (see "The app's mark"), a row (`GATE_MARK_ROW`) of the logo at the
  avatar's size (`GATE_MARK`, `size-avatar`) and the app's name at body and 500, drawn when the
  Gate has a `title` and the app has an icon. It is not an `Image`, which opens a full view. On touch it spans the viewport inside the
  page inset; on the phone it keeps the safe area and its keyboard-aware scroll keeps the focused
  field and the submit act in view. It draws no word of its own. Its `form` prop (a Form's props) is drawn in the
  column by the Gate (`FORM in.auth`, no cell of its own: the column is the form's, as a sheet's body
  is), with the bar's `fit` `full` (an explicit `fit` wins). The `title` is required, so every Gate
  is a step with its `h1`; a first run (no workspace yet) is a Gate whose `title` and `description`
  say what is missing and whose children are its `Button`s, the primary act first. It has no icon
  of its own (the app's mark leads it), and on touch its column stands at the top like every
  step's. Rejected: an untitled first-run form with an `empty` of its own (a second form of the
  same page, with an `h1` the Gate did not draw, and `icon`, `title` and `children` branches in the
  empty-state drawer that nothing else used). Focus: the first field of a
  step takes it. On the web the frame runs `focusFirst` (`lib/focus.ts`) over its column's typing
  controls once on mount and again whenever `title` changes, so a sign-in opens on its field and the
  step that replaces the body hands focus to its own; a step with no field leaves focus where it is.
  On the phone a first-mount claim (`FieldClaim`, a held `TextInput` the frame owns) goes to the
  first `Input` or `InputOtp` that mounts and to no second field beside it or one revealed while
  another is typed in. Programmatic focus opens no keyboard on mobile Safari; on the phone it does,
  which suits a one-task page. A `Picker` that reveals a typed field hands focus to that
  field, since a pick holds no typing focus. The mark is a prop (its first consumer); a
  `reactUi({ mark })` or `nativeUi({ mark })` config asset that the `Shell` draws too is the move
  when a second frame draws it.
- A count strip is `Stats` (`items: StatSpec[]`) and one display figure is `Stat`, the two members
  of one figure-with-its-label mechanism. The strip is one card (`STATS`) whose cells draw their own
  top and start hairline (`STATS_CELL`) so it splits wherever the cells wrap, which `divide-*`
  cannot do and native has not; the card's edge (`STATS_EDGE`) is a layer drawn over the cells, so
  their outer hairlines lie under it: one hairline at every density, where a cell pulled back by
  `-mt-px` stays 1 px while the room's hairline scales. A cell is the label in meta over its figure
  at the `figure` role (a ratio of the body, 1.69, so 22 desktop and 27 touch at 500 and tabular:
  the strip's measured range is 18 to 26, and a body-strong figure reads as meta-sized beside its
  label) with a unit muted beside it, then a meta line or the cell's sub-counts as `Link`s, or the
  whole cell a link to its `href` (a hit over the cell with the row wash), never both, since a cell
  inside a link cannot hold links: `StatSpec` types the two exclusive. Zeros are drawn. Cells stand
  in one row from `tablet` of the page and two to a row below it and on the phone; an odd count ends
  on one cell across its row. `Stat` is the figure first at `display` with its label in meta under
  it (read "2, need you", where a strip's cell is label-first because its label names which count),
  one per screen as the role's rule says. A strip's cells are declared (`items`), so a painted strip is the loaded strip with its figures
  painted and moves nothing.
- The phone `Link` takes an `href` of either kind and decides by its shape: a path from the root
  navigates through `lib/navigate` (as a row's `href` does) and anything else (a scheme, or a
  protocol-relative `//`) opens through `Linking`. Both platforms' `href` is a string, so the
  props stay the same; the router's route types are checked where a `Route` is a prop
  (`CountLink`, a row), not in the Link's string.
- On the web every route reader shares the page's one listener (`useRoute` in `lib/navigate`):
  the bound router's `onResolved`, so the route read is the resolved location (a place's
  selection flips with the page drawn), and the window's `popstate` and `hashchange`, which
  the readers hear only while unbound (routes off; bound, the router resolves a move and
  `onResolved` tells them once). The free `navigate` opens a route through the router the same way, with `location.assign`
  for an external URL or no router. `lib/navigate` imports no router: it takes the slice it
  needs structurally. A List reads the route once and hands it to its rows through `ListedRoute`,
  internal: a row's `useRoute` takes it from there and subscribes to nothing, and a ListRow or
  FileRow standing alone subscribes itself. Rows are not memoised: a route change redraws the
  List's rows, cheaper and plainer than serializing each row's props to skip it. On the phone a
  Group keys each row's wrapper by the row's own key (`Children.toArray`'s, its place among the
  children as written), so a conditional row appearing shifts no later row's state.
- **A link's intent preloads its route, and navigation is never held.** A route warms what its
  screen reads in its TanStack Router `loader`, `loader: ({ params }) => preload(project(params.id))`,
  where `project` is a function both the loader and the component call, so a key is written once and
  components keep building their own reads (a route-level declaration of reads, handed down to them, would
  break that, and has nowhere to go in an app whose routes are empty files).
  plugin-api's `preload(...selections)` starts each distinct read through the client `QueryProvider`
  binds as it renders (`bindClient`: the router never sees the query client, and the last provider
  rendered wins; unbound, it does nothing) and returns at once: `prefetchQuery` for a query,
  `prefetchInfiniteQuery` for a pages read (its first page), nothing for a stream (no observer
  would ever abort it) or an idle read (`skipToken`, `enabled: false`, which would throw), and a
  failed prefetch resets to waiting when its leaf mounts, so the viewer sees painted, never failed.
  A read whose input comes from another read's data is not preloaded; it starts when its component
  mounts. The query cache's `staleTime` (30 s) decides whether a request goes out. react-ui's
  `bindRouter` installs one `pointerover` and `focusin` listener for the page (`INTENT_DELAY` 50 ms,
  TanStack's own default, dropped by any other intent in that time) that calls
  `router.preloadRoute({ href })` for the nearest `a[href]` that is a route of the app other than
  the one drawn; no stack anchor is a TanStack `Link`, so `defaultPreload: "intent"` would have
  preloaded nothing, and the listener covers all of them (and `Link`) with no prop. It reads the
  bound router when the timer fires, so the screens workbench rebinding per story adds no listener.
  A touch's `pointerover` fires as the finger lands: the web's press-in. plugin-react's mount sets
  `defaultPreloadStaleTime: 0` so every intent reaches the loader and the query cache is the one
  authority on freshness. A loader returns nothing, so most opens are cache hits that draw loaded on
  the first frame, a read still in flight paints and settles, and a cold deep link paints (it also
  starts its fetches beside the chunk's load). The phone preloads nothing: no list there opens a
  record, expo-router has no loaders on native, and its `router.prefetch(href)` renders the target
  in the background and needs a Stack; the path when a consumer arrives is native-ui's row and
  `Link` `onPressIn` calling it, after a spike. A phone screen starts its reads as it mounts.
- A FileRow's own change is its `change` (a `ChangeKind`): the one change mark every row draws,
  in its lane before the glyph, a painted row reserving the lane when the `file` map declares `change`.
  The chip never carries it.
- A FileRow carries at most one `ChipMark` (why the file is listed),
  standing between the path and the count lanes at its label's `measure-short` cap; the path
  takes the room the chip leaves and yields in order: the directory down to its leading ellipsis
  (`DIRECTORY_LEAD`, two characters, its first and an ellipsis, the path's floor holds beside the name's, so a cut directory
  says it is cut and never shrinks to a span too narrow to draw one), then the name down to its
  floor, then the web's counts from their four-figure lanes down to their own text, then the
  chip's label truncates with an ellipsis; no row overflows sideways at any width. The phone's
  counts keep their lanes. The floor is
  the whole name when it is short (at most twice the three-character lead, the extension and
  one character), else its cut form: the first three characters, an ellipsis, then its end (`pathCut` in
  `list-state`, one source for both platforms). The path splits after its last slash, the slash
  staying with the directory, so a directory that yields takes its separator and the name never
  begins with a slash. The
  chip is why the row is listed, so it stays present, and a cut path gives up its directory
  first, keeping its file name, and its record opens in full a press away. The path fits by layout,
  never by measure, so it draws cut in its first frame and never re-cuts when the mono face
  loads: the directory takes the room the name leaves, ellipsized at its end down to its
  one-character floor (its shrink weight 10^4 against the name's 1); past that the name is
  cut in its middle, its end kept (the web: a truncating stem of at least three characters
  before an unshrinking tail of the extension and the three characters before it, the path
  box's `min-width` the floor in `ch` and its shrink weight 10^7 against the chip's 1, as
  ListRow's meta line, the counts' lanes 10^5 with `FILE_COUNT_YIELD`, each a flex item of the row; the phone: `ellipsizeMode="middle"`, the floor in px at a quarter of
  `figures` per character, the same weights). The chip's
  cells and size are FileRow's own in the roster, composed from `Chip`, with no token of its own.
- Code, Diff and ProseDiff stand in one frame on the surface inside a hairline (`CONTENT_FRAME`),
  so a diff's soft grounds always sit on the surface; a diff's number columns and a file row's
  count lanes are `figures` wide. A painted Diff is a collection of unknown length: its hunk header and `PAINT_ROWS` lines are painted at the loaded rows' heights and code start, and its height changes on load by the line count, and on touch by the lines that wrap, which no painted form can know.
- A picture is `Image`, one component for every place a picture stands (a record's screenshot, a
  message's attachment, a message input's pending file): `src` (a `Datum`), `alt`, `fit` and `aspect`. `thumb` is a square tile (`IMAGE`, `size-image-tile`, the control radius) and
  `content` the container's width at the picture's own aspect down to a height cap (`image-cap`,
  the card radius), both cover-cropped inside the hairline `edge` (`IMAGE_PICTURE`). A content
  picture has no aspect before its bytes, so its painted and pending forms stand at the loaded height through `aspect`, a number (width over height, `16 / 9`) that is required for `content` and typed off
  `thumb` (a union on `fit`, so a `content` picture without one is a type error) and fixes the box
  in every state with the picture cover-cropped to it, so no state moves when the bytes land
  (`imageAspect` in `./variants` reads it for both platforms). The picture mounts while it
  waits, hidden, so the frame (`IMAGE {state}`: the `skeleton` fill at that height) is replaced by the bytes
  without a second fetch; a failed fetch draws a group-ground tile at the same box with an
  `ImageOff` glyph in the meta ink (`IMAGE_FAILED_INK`, 4.5:1 on `group` in both modes with the alt
  text it labels) over the alt text in meta, wrapped whole and centred inside the box (the box's
  height holds it, so no part of the sentence is cut), and nothing to open (a thumbnail draws the
  glyph alone, its alt the tile's accessible name and tooltip, since an 80 px tile holds no
  sentence), so `alt`
  is the one word the form needs and `words` gains none. A press moves the
  frame's hairline: `edge-hover` under the pointer, `ink-body` while pressed, since `edge-hover`
  aliases `edge-strong` and a pressed frame must differ from a hovered one. A loaded picture is a button named by `alt`; a press opens it over the scrim with no frame,
  contain-fit inside the page inset (`IMAGE_FULL`), with a Close act on a lifted ground
  (`IMAGE_CLOSE`, as `THREAD_LATEST` lifts the Latest act, since the icon act's meta ink has no
  ground of its own over a scrim). The view is the sheet's internal base at its `view` form on the
  web, for the scrim, the focus trap, Escape, the layer and the portal container: no head, body or
  foot, and the popup takes no press so a press around the picture is a press on the scrim. A `view`
  is not a `SheetFit`, since a sheet's head and inset would take the picture's room. On the phone it
  is the native sheet base's `view` form too: gorhom's modal at the screen's height inside the safe
  area with no handle, ground, body or foot, the picture and its own Close act over the scrim, and
  the scrim and the Close act dismiss it. It stands under the Shell's toasts like every sheet.
  Rejected: an `image` slot on `FileRow` or `Message`, which would repeat the open-full mechanism
  per component.
- A rail of fixed states is `Stages`, a known sequence with a position in it (an activity feed draws
  what happened, onboarding's step progress is its own molecule): `steps`, each a `Stage` (`{ label,
  state: "done" | "current" | "later", at? }`, its own descriptor), and `ended`, a `StageEnd` (`{
  label, reason }`). Stages stand top to bottom as an ordered list on a hairline rail
  (`STAGE_RAIL`) running from each mark to the next, so at phone width the line is what reads as
  sequence: the strong hairline through the done stages, the plain `edge` after (a solid rail then a
  grey one, never dashed, since a React Native border dashes only on a view's four sides). Every
  mark is the meta icon size (`STAGE_MARK`, 12 / 14, the state rail's 8–13 dots): a done stage a
  filled `ink-meta` disc with its check on it (`STAGE_CHECK`, the canvas ink, 3:1 on the disc in
  both modes, read on the phone through `stageContentTone`) and its `at` as a moment in meta under
  the label; the current stage a ring in `accent-ink` with its label at body 500 and
  `aria-current="step"` (the phone: the selected row); a later stage a hollow ring in `ink-meta`
  with its label in meta. `at` is typed off a later stage, which draws none. `ended` replaces every
  stage after the last done one (`stagesShown` in `./list-state`, so both platforms draw the same
  rows, the current one included) with a terminal row: a cross in `danger` (`STAGE_CROSS`), its
  label at 500 and its reason in meta. The marks carry the hue (the current ring's accent, the
  cross's danger) and a label's ink is its own in every state. `STAGE {state}` is the label's cell, the row's
  gap, the words' bottom inset and a minimum row of the two-line row's height (`STAGE_ROW`,
  `STAGE_WORDS`; `row-2`, 52 / 64, the state rail's 28–56 and 48–70) carry the room between stages,
  so a later row of one meta line keeps the pace of a done one. The rail runs through each mark's
  line box in two halves around the mark, so it breaks nowhere. Each mark stands on its label's first line (a later label is meta, so its mark is
  on a meta line) and draws its state as its glyph, so `words` gains none. Stages takes its steps as a `Datum`: a selection paints `PAINT_ROWS` stages, each mark a painted control and each label filler, until its read lands.
- A copy act (`Code`'s, `DefinitionRow`'s) reads Copied for two seconds from the last copy: each
  copy is a counted moment and the reset is keyed on it, so a copy inside the window restarts it.
  Unfolding a `Code` moves focus to its already-mounted text in the press, before the fold act
  unmounts, so focus never drops to the page. A `Code` keeps its line breaks and wraps a long line
  anywhere (no `wrap` prop, no sideways scroll), so an argument the operator copies reads whole at
  every width and the web's text is focusable by script alone, where the fold lands on it. Its
  height on load changes by the lines that wrap, as a Diff's does. The web's page-frame
  scrollers (the Pane's body, a sheet's body, the Gate's page) take a
  tab stop only while they scroll, through `lib/scrolls.ts`, on the vertical axis, with one more condition: a
  region takes the stop only while it scrolls and holds nothing a keyboard reaches (what a keyboard reaches is `isTabbable` of `lib/focus`, the rule a
  docked Sheet's focus hand-back reads), re-measured when its content changes anywhere inside it or
  an element's tab-affecting attribute does, since a painted form holds its loaded size and resizes nothing, so a body of links gains no stop, and a body of text, which
  Safari leaves unreachable, gains one, ringed inset. It takes no role or name; focus reads the
  content inside `main`. A native scroll view has no tab order.
- `Code`'s `download` is the file's name, a string because the name is the one value stack cannot
  derive. The act sits beside the copy act, in the head with a title, else side by side in the copy
  column. The web saves a `Blob` of the text through an anchor's `download`; the phone writes it to
  the cache directory with `expo-file-system` and hands it to the share sheet with `expo-sharing`,
  from which iOS and Android save to Files, so both are native-ui peers beside `expo-clipboard`. A
  refused write or share raises the failed Toast, which says `downloadFailed`. The acts are named by
  what they act on (`named` in `./tokens`): the title, else the file's name for both acts (the
  bare word for a copy with neither), never the generic `code` word, which names the text group
  alone.

## The canon, the roster and the closed props

- The canon binds every component either UI plugin ships: one name per concept (`label`,
  `onChange`, `onAct`, `act`, `blocked`, `sentence`), composed regions as typed descriptors (`Act`,
  `StatusMark`, `ChipMark`, `RowLeading`, `RowTrailing`, `PlaceSpec`, `Switcher`, `Option`,
  `OptionGroup`, `Part`, `FieldBinding`, `MessageDetail`, `Confirmation`, `MenuItem`, `RowEntry`,
  `Lock`, `Answered`, `TableColumn`, `TableRowSlots`) instead of node slots, and no `class` /
  `className` / `classList` / `style` prop. Laws live in the README under `## The canon`. An icon is
  an `IconName`, a closed type over Lucide's PascalCase names read off the `lucide` package ui-core
  depends on: the set is baked in, never a consumer map, and each plugin draws a name from one table
  built over its platform package's exports (`lucide-react`, `lucide-react-native`), which fails the
  build if the package lacks a name. A descriptor is generic only in a value, which is data: an
  option and a row's trailing pick (`OptionPick<V>`) in the string they pick, a field binding in the
  value its field holds, a table column (`TableColumn<T>`, bare a column over any item) and its row
  map (`TableRowSlots<T>`) in the item they read. `FieldBinding<V>` is how a bound `FormField` types
  its control by the field, and `useApiForm(...).bind(name)` produces it on the web from TanStack
  Form's store, one binding per name under the form's owner. A route a descriptor carries
  (`PlaceSpec.route`, a message row's `href`, `TableRowSlots.href`) is a `Route`, which reads
  `RouteRegistry`, an empty interface a platform fills by declaration merging: native-ui registers
  the string forms of expo-router's `Href` and types its own route props (`href`, `back`) as
  `Route`, so in a phone app with its route types every route a component takes is checked against
  the app's route files; unregistered (the web, ui-core's own tests) a route is any string.
  Rejected: a route type parameter on each descriptor, which every call site would spell, and a
  native-only copy of the descriptors, which a shared `PlaceSpec[]` would no longer satisfy.
  Rejected: optional `value` and `onChange` on every control read from the field's context, which
  would compile a control with no value anywhere and could not type a boolean field against an
  `Input`.
- The roster is data: `ROSTER` in `packages/ui-core/src/roster.ts` names 64 components in four
  layers (atoms, layout molecules, shared molecules, content molecules) with their prop names, the
  cells each draws (a whole matrix family, one family cell as `FAMILY.axis.value`, or a single cell)
  and the states it has a form for, the same in both plugins; an entry with `platforms` ships on
  those alone (`Canvas`, web only, so `rosterEntries("native")` leaves it out and the phone's
  verify suite reads the rest); the showcase draws exactly those
  matrix cells and states. Each plugin's verify suite reads every component's exported props type
  against it with ts-morph, so a prop added on one platform, renamed, or a style channel reopened
  fails by name. A component's directory is `componentDir(name)` (`ListRow` → `list-row`). A
  component draws another's place by composing that component, never by spelling its cells, so a
  change to the component (its hit box, its ring, its press, its label) reaches every place it
  stands. An entry declares `holds`, the families and constants of its own box, and each plugin's
  verify fails a component that imports a held cell outside its holder's directory. A popup trigger
  renders the icon act's base (`icon-button/base.tsx`, which the `./components/*` export does not
  reach), taking the trigger's props through Base UI's `render`; on native a trigger is a press, and
  renders `IconButton` itself. The icon act's base also names the act: it wraps itself in a Base UI
  Tooltip (`TOOLTIP`, held by `IconButton`; 500 ms hover rest, keyboard focus, Escape and a press
  hide it, none on touch), so every icon act, popup triggers and the canvas zoom stack among
  them, gets it with no app change. The trigger's pressed look reads `aria-expanded`, not
  `data-popup-open`, which the tooltip's own trigger also sets. No popup of the roster locks the
  page: `Picker` passes `modal={false}` (Base UI's select defaults to a scroll lock that
  changes the root's overflow and gutter and moves the page as the list opens), as `Menu` does; a
  sheet is modal by design.
- The paint shows only for a read that lasts: `WAIT_DELAY` is 400 ms (`@fcalell/ui-core/paint`, one
  number both platforms run; emitted as `--wait-delay`, which reduced motion does not zero: the
  delay holds, the fade snaps). During the delay the painted tree stands transparent in its place
  (the web's `animate-paint` fades in from `opacity: 0` once the delay has run; the phone has no
  fade, and `useShown` snaps its fill in), so the page keeps its height and a read the server
  answers at once paints nothing a viewer sees. The delay is fixed, not an option: one rhythm for
  every paint of an app, and once shown the paint stays only as long as the read.
- The switch to the loaded form is the page's one large motion, the settle
  (`@fcalell/ui-core/settle`: `createSettle(env)`, framework-free and tested in node; each platform
  supplies the env). A read's first answer (its first data, its first failure with no data, a reset
  to waiting) reaches the screen through `QueryProvider settle`: plugin-api's `settleReads` sets
  TanStack's `notifyManager` scheduler so the flush runs through `settle` while the painted form
  is still on screen, and a refetch is not a first answer and flushes at once. Two
  `QueryProvider`s mounted at once fall back to the default scheduler, harmlessly. On the web
  `lib/settle` supplies `startViewTransition` with `flushSync`, each frame root carrying its own
  `view-transition-name` (`useSettleName`, from `useId`) so the browser moves it from its old place
  by a transform, the duration and curve set on `::view-transition-group(*)` in `globals.css` from
  the motion scale; it applies at once under reduced motion, in a hidden document, while any view
  transition runs (the router's) and while the viewer types in a field (`typing`: a text-like
  input, a textarea or a contenteditable has focus, so a move never takes the caret). On the phone
  `lib/settle` calls `LayoutAnimation.configureNext` on the `base` rung, and applies at once under
  the system's reduced motion, in the background and while a `TextInput` has focus. Each UI
  plugin's providers contribution passes `settle` to `QueryProvider`, so a consumer writes nothing.
  A painted list may still change height when its data lands, by the difference in row count: the
  change is animated, not prevented, and the rubric's paint rule bounds it to the rows' difference.
- A page's outline comes from its route and its data fills it. A `Section` stands whatever its data
  holds, drawing its `empty` when there is none, so its arrival moves nothing; a Section per member
  iterates the domain the app knows (the usage windows, the leads), not the response; a waiting page
  is the loaded tree painted, never a second tree; and a Section that must stay optional stands
  after every Section that always stands, so its arrival moves nothing above it. Measured before
  this held: every route that drew a waiting form (55 of 55) differed from its loaded form, 266 of 297
  regions, because Sections existed only once their data landed and a waiting row's bars came from a
  fixed width table. A consumer holds it by a check that no Section is gated on its data's length,
  none waits on a hand-built tree (`b-wait`), and the shift check of `stack screens test`: each
  screen's loading story holds its reads, measures every Section heading's top and height waiting
  and then loaded at 320, 1280 and 1920 px, per Pane and per column, and fails the screen when the
  first Section moves, a later one moves by other than what the Sections above it grew by, a Section
  that stood is gone, or a Section with no rows, chart or text changes height; the guide's rules
  page says how. The run also fails each read in turn: the answerer records the procedures the
  sidebar Data story called (nothing declares them), and for a screen of two or more it answers one
  procedure's GETs with a server error, resets its queries and runs the overflow, walk and console
  floors at each width, each finding prefixed `with <procedure> failed`. That is where the dev
  error for a read no frame holds becomes a test finding on every screen. Empty (the empty story
  already empties every collection), not found (the failed form with another sentence), waiting (a
  painted leaf has its loaded geometry, which the shift check holds) and axe (the roster stories
  judge the failed forms) are not repeated per read, and the workbench keeps its five states over
  every read, with no per-read picker.
- A cell no entry holds is shared, spelled by each component that draws
  it: the type roles, the field box (`Input`, `TextArea`, the Picker's field fit, the
  touch `MessageInput`), the row with its leading slot and its title and meta lines (`ListRow`,
  `FileRow`), the content frame, `FIGURES`, the option group and its label (`SELECT_GROUP`,
  `OPTION_GROUP_LABEL`: `Picker`, `OptionList`), the error line (`FIELD_ERROR_LINE`:
  `FormField`, `ListRow`'s entry), the remove act's round hit box (`REMOVE_HIT`: `Chip`, an
  attachment's thumbnail), the line box, the popover, the paint (`PAINT`, spelled by each component that paints its own box), and the toasts' layer
  (`TOASTS`, which the Shell stands over its page).
  `Picker` is the one pick, of one option or several: the field box (`FIELD`)
  whose open list is a popover (`POPOVER`) of rows (`ROW`), a search leading past six options, the
  list windowed past `VIRTUAL_FROM`; on touch and on the phone the same rows in a sheet. Inside a
  `FormField` (`picker`) the box is the form's field height (`FIELD` `fit: form`), the field's error
  draws `edge-error`, its disabled state the disabled fill, `placeholder` stands in the placeholder's
  ink while nothing is chosen (the field's label already stands over the box, so a pick in a form
  with none says nothing), and the sheet is titled by the field's label. The list stands at the
  popover's width or the trigger's when that is wider.
- `FileInput` is the field box (`FIELD`) that chooses a file. Its value is `PickedFile` (`{ name,
  size, type, blob(), src? }`), one descriptor on both platforms so a consumer's upload code is one:
  the web wraps its `File` (`blob` resolves to it) and the phone the document picker's asset (`blob`
  is `fetch(uri).blob()`); a message input's paste or drop reuses it. `accept` entries are MIME
  types, MIME families and dotted extensions, matched by `accepts` in `@fcalell/ui-core/file` on
  every file either platform hands over (a drop and the phone's picker can bring any); the phone's
  picker names MIME types alone, so `pickerTypes` asks for every type when `accept` holds an
  extension. A refused file never reaches `onChange`: it is drawn in the `FormField`'s own error
  line under its box (the line then in error and the box on `edge-error`), the control's own
  and cleared by the next pick, so the error stays one place and nothing reports up to a parent. The web draws a drag-over as the focus ring (the contract has no dashed
  edge); the phone has no drop. `expo-document-picker` is a native-ui peer declared as
  `expo-clipboard` is; its config plugin only sets an iCloud container, so the component needs none.
- `Canvas` (web only) draws a graph on two libraries that react-ui carries as its own
  dependencies, so a consumer installs neither: `d3-zoom` is the viewport and `elkjs` places the
  nodes. The canvas owns everything else. Below `tablet` its ground (loaded or waiting) keeps
  `min-h-1/2`, half the content box of the region it fills (a Pane's body), so the column scrolls past it and the
  head and banners above it scroll away rather than shrink it; the percentage resolves because the
  body is a flex item of the Pane, whose post-flex size is definite, so a viewport-share token is not needed
  (`canvas-touch` holds it at 375 × 667 and 390 × 844). A selection in `nodes`, `edges` or `groups` swaps the whole graph component for `CanvasWait` (the ground and grid it shares with the graph, three `canvasNode` cards of filler in a column), the one painted form that is a tree of its own, since a layout has no geometry before its data (the named exception to structure rule 15, held by `b-wait`), so no viewport, layout or ELK runs while waiting and no zoom stack or act
  stands (both are overlays, so omitting them moves nothing). The column stands where a loaded
  chain opens: the wait measures its pane and column and takes `openTransform` (the loaded
  canvas's opening view) with `clearanceOf`, the room the zoom stack leaves, held by an unseen
  `ZoomRoom` of the stack's frame, so the arrival moves no card (`canvas.stories` holds it at 375,
  768 and 1440, both modes). Only the stack's width is held: an `act` or a foot, which a loaded
  canvas keeps clear of, is not; nor is the graph's shape: a graph that overflows (opening
  top-anchored) or has a wider pitch opens by its own rule, so its first node can move on arrival. `empty` is a string, not a slot or a
  `words` entry (it is app copy, and the app decides when it stands): the layer's first child
  centres it under the graph's bounds and holds its size through `--canvas-unzoom`, so it
  stays at the text floor, and `pointer-events-none` lets a drag through it pan and a tap on it
  reach the ground. `d3-zoom` on the region gives pan, the Ctrl or Cmd wheel
  and pinch, and its transform lands on one layer by script, so a pan renders no React tree; a
  plain wheel pans through the canvas's own listener, since d3-zoom's wheel always zooms. The layer
  holds, bottom to top, the group frames, one SVG of every edge with its chips over it, and the
  nodes, which are absolutely placed elements in path order measured by a `ResizeObserver`; every
  look is a held `CANVAS_*` cell or a listed overlay. A group is a frame computed from its
  members' boxes, not a node, so a group needs no parent or ordering rule. Node and group ids share
  one namespace (`holds` mixes both), so the same `onSelect` and `selected` choose a group, with no
  `onSelectGroup`: only the head is a `<button>` (the frame's body keeps `pointer-events-none` and
  pans, and `CANVAS_GROUP_HEAD` carries `min-h-target`, so the probe lays the frame out with the
  taller head), `CANVAS_GROUP` is a `state` matrix whose `selected` recolours the dash and doubles its line to 2 px as an inset dashed outline over the same 1 px border box, so selecting moves nothing inside the frame (one accent hairline reads faint in dark; `accent-ink` holds 3:1 on `canvas`), the head carries a transparent border (`CANVAS_GROUP_HEAD`) that the button steps to `edge-hover` on hover, as a node's does (a platform overlay), the heads
  take their Tab stops before the nodes (frames render first), and under the text floor the head is
  no button. A group holds no `onMove` (a frame follows its holds). A group holding no present node
  and no group is a leaf of the graph (`emptyGroups`), not a frame computed from members: ELK lays
  it out as a leaf of a node's width and a head plus two paddings high, an edge may name it as
  `from` or `to` (so it stands in `pathOrder` and its edges meet its frame, with no port ring), its
  head is a button as any group's, and it takes no port, drag, connection or `onMove`. A group
  holding only empty groups frames them, and an edge naming a group that holds a node is still
  ignored. ELK places it; where every node has a position no layout runs and the empty groups
  stand in one row below the nodes' bounds, left-aligned, in path order (`hollowRow`; an empty group
  takes no position, so a consumer cannot place it). ELK runs only when no
  node has a position, and is given the forward edges alone, to layer the nodes: it does not break
  a cycle inside a group, and it never sees a label or draws an edge. The canvas routes every edge
  itself from the final boxes (`geometry.ts`, pure): a forward edge bends in the middle of the layer
  gap under its source, or in the gap above its target when that leg would cross a node or another
  group's head, and the layer gap is derived from the chip so a chip beside the leg after the bend
  clears the line, the arrowhead and the next row by a `pair`;
  a back edge runs up a corridor at the side, inside the group when both ends are in it, the frame
  growing on the right to hold the corridor and its chip. A chip stands beside its edge, never on
  it, so one route serves a computed layout and a stored one. A group's left padding grows so its
  head text ends a `pair` before the first column an edge crosses the head band at, and ELK's
  Brandes-Köpf placement is balanced so a parent stands over its children. A graph opens as Fit
  shows it (003-324; it opened at scale 1 with the first node at the top and the rest past the edge, the text floor first, until
  Stead's critique found groups cut at the edge at every width): centred at its own size where it fits the room, else at the scale
  that holds the whole graph. Fit is capped at scale 1 and leaves the room the zoom stack and the act take (each marks itself `data-clear` with the edge it stands against, which the viewport reads off the DOM), and the opening view stands in that same room through the one `clearance` read.
  Under the floor the frames follow the glyphs, so the bounds depend on the scale they are fitted to (a group's head and padding keep their
  size on screen, growing in the flow by the zoom's inverse, `grow` in `layout.ts`): the fit is taken again at the scale it gave, down until the bounds at that scale fit it
  (`fitted`, at most six rounds), by the opening view and by Fit alike, and the lowest scale is set from the boxes before the view is (a stale `limit` had clamped a first view to 1).
  A group's head under the floor draws at its own size on screen (`UNZOOM` about the frame's top left, its width the frame's on screen), is still a button and a Tab stop,
  and a node's name in the overview is the meta role (12.9 px, over the caption's 11.8 that fell under the rubric's 12 px floor). A node's status is its dot, named by its label, or its `short` word beside it: the long word took a third of the node and cut the title. ELK's worker is its own file imported with `?worker`, which cannot survive
  Vite's pre-bundling of this package's `.tsx` entries: the module holding the import
  (`lib/canvas-layout`) is reached from a dynamic import by the package's own name, so a graph the
  consumer placed loads neither ELK nor its worker, and the generated Vite config carries
  `canvasPlugin()`, which serves that module as source and pre-bundles ELK's CJS API by name.
  Screen readers are out of scope; the keyboard is in: with `onSelect` each node is a button in
  path order, and a node focused from the keyboard, or a selection from outside, pans into view
  (a press focuses the button too, and panning then would move a node out from under the pointer).
  A node's tone is `nodeLook` and an edge's is `edgeLook` (`look.ts`, pure): selected over problem,
  off path over off over rest, and an off node ignores its problem; a problem's words keep the rest
  ink (status colour is a mark's) and its mark is a `failed` `StatusDot` in the trailing column,
  which outlives selection taking the border; an edge is on a path by its own id and dims beside an
  off node. The dimmed edge draws `grid`, the dot grid's ink: `edge` is fainter than the grid
  (1.19:1 and 1.41:1 on `canvas`) and `ink-faint` stands within 0.05 of lightness of
  `edge-strong`, so neither tells a dimmed edge from the grid or from a taken one. A state recolours and never moves a node or reruns the layout (`graphKey` reads structure only). Editing is controlled: the canvas holds only a drag's live position, a landed node's spot and a connection in progress, and reports through `onMove` and `onConnect`. A node's pointer handlers and its ports live in `NodeView`, and a port is hit-tested through `elementsFromPoint` on the laid-out DOM, never by geometry, which is also how the in port a dragged link would end on is found (pointer capture holds `:hover`), so it can fill with ink. A dragged node lifts in z-order only, with no shadow. Where ports show, the router ends a forward edge above its target by the port's radius, the arrowhead tip's overhang and a pixel centre, so the tip stands on the ring's outer top and the ring never covers the arrowhead. On touch the canvas lifts a node by a long press over `NodeView`'s own pointer handlers (d3-zoom reads its filter once, at `touchstart`, and has no cancel, so a lift starves its gesture of touch moves with `document` capture listeners until the finger ends, and lets `touchend` close it; the lifted node draws the selection's colour at the focus ring's width, 2 px, and pulses the device with `navigator.vibrate?.(10)`; the lift timer runs on the page's clock but the press is judged on the events' own `timeStamp`, so a page that stalled past the press and lifted the node before it handled a move or a second finger stamped inside the press puts the node back), and a port's hit holds its size on screen through `--canvas-unzoom`, a variable the region keeps at `1 / zoom` by script. Two flags for the whole canvas, derived on every input from the zoom and re-rendered once per crossing, make each node its glyph under the text floor (the caption's size, zoom 1) and its glyph alone under the overview floor: bands are zoom 1 and up the full node, `OVERVIEW_FLOOR` (0.5, in `floor.ts`) up to 1 the overview, under it the glyph alone, and a zoom step is 1.2 (a wheel tick moves at most that). The overview draws the node's `title` (the one name it has, no new prop) at the glyph's inline end, vertically centred, one line: `CANVAS_NODE_NAME`, the caption role in body ink at 500 cut at `measure-short` on a `canvas` chip so an edge never strikes through it, inside the glyph's own scaled button so it holds the floor size on screen at any zoom, `pair` out of the glyph clear of the marks; the whole is the zoom target, and status and problem marks stay on the glyph. A graph raises the overview floor to the lowest zoom at which no two overview forms (glyph, a `pair`, the name at its cap) stand closer than two `pair` (`overviewFloorFor`, on the `minZoomFor` principle, by the nearer of the two axes' gaps), and one that cannot clear them under 1 has no overview: the glyph alone from zoom 1, as before. The cap, not the name's own width, decides, so the floor moves with the graph's layout and not its words. Under the floor `CANVAS_NODE_GLYPH` at the density's `control` size (its button carries `title={node.title}`, the whole name where the overview cuts it and the only one under the overview floor, which axe's `button-name` accepts), over the card's own box (which keeps its place, so nothing laid out moves), its marks straddling the glyph's right corners (`-top-inside`, `-bottom-inside`, each less the border's pixel, so a mark stands `inside` past the glyph's outer edge) clear of the icon, with group heads and edge labels drawing nothing. Under the floor the routes and the group frames follow the glyph, not the card: each node's routing box is a square of the glyph's size over the zoom (rounded up to a `pair` in the flow, so the routes are drawn again only as that side steps, not on every wheel tick) on the card's centre, while ELK's positions and the cards' sizes stay as they are. The lowest zoom rises (`minZoomFor`) to where two glyphs would stand `2 * pair` apart on screen, less the `pair` their routing boxes round up by, so the route between them still draws that long; the act may cover the last glyph there, which is a bound and not a chosen view.
- A `FormField` folds an answered question by `answered` (`{ answer, onEdit }`): one summary row
  at the row height (`FORM_FIELD_SUMMARY`: a `Check` in the `ok` ink, the label in body 500, the
  answer truncated in meta, a trailing `Pencil` `IconButton` at the bar fit named by the `edit`
  word and the label), the control not rendered. The question stays one `FormField`, so its label
  is one across fold and unfold, and the field unfolds when the consumer clears `answered`: the
  web focuses the first control it holds, the phone mounts a typing control afresh under
  `FieldFocus` (a pick control opens its sheet only when pressed, so nothing is focused). A
  choice that reveals the next question is the consumer's conditional rendering inside one
  `Form`; the field keeps no fold state. Rejected: a `ListRow` per answer above the open field,
  which loses the focus return and draws a chevron where this edits in place; a labelled "Edit"
  `Button`, which makes every folded row louder than the question it summarises.
- A component that sits in more than one container takes `fit`, a closed enum read off its matrix's
  `fit` axis (`IconFit`, `ButtonFit`, `IconButtonFit`, `LinkFit`, `ActionBarFit`, `FieldFit`,
  `SheetFit`, `PickerFit`, `ColumnsFit`), defaulting to the matrix's default; the composing molecule
  sets it (a `Pane` passes `bar` to its bar's acts, a field's trailing act `field`, a `Form`
  under a `Gate` `full`) and a call site may.
  `ACTION_BAR`'s two fits carry no cell: `end` and `full` differ in structure (an overlay) and in
  the `Button` fit the bar passes (`body`, `field`), and the matrix exists so the closed type is
  read off an axis like every other fit. `Columns` takes `fit` the same way: `board` (the default)
  is a row of sections scrolling sideways from the page inset, each a grid track at the column width
  (`*:w-column` on the web grid, no wrapper per section; the phone's sections stand at their own
  width, a flex row), `half` is two to
  a row filling the body from the Pane's `page-desktop` width and stacking in order below it, at
  the `sections` gap, with no bleed and no column width (a web grid overlay, no scroll region). The
  phone stacks both: it never reaches `desktop`.
- A `Toolbar` reads none of its children: its `search` (`ToolbarSearch`) and `chips` (`ToolbarChip`,
  a `ChipMark` and its `onRemove`) are descriptors it draws as a `kind="search"` `Input` and
  removable `Chip`s, and `children` are the acts at the bar fit. It once sorted its children by
  type into three rows, which hid a search or a chip an app component drew inside itself.
- An `Act` says what it does, never how it looks: `destructive` marks an act that removes or
  ends something, and the `ActionBar` draws it as `danger` when it is the bar's one filled act
  and as `destructive` (the hairline form) otherwise, so a confirm's filled act needs no kind of
  its own. `quiet` draws a non-filled act as `BUTTON {act: quiet}`: words in the meta ink, no fill
  and no hairline, the sign-in pattern's Resend (the login-and-otp range's muted 12 text); it has no
  press ink of its own beyond the wash.
- **An act is `ActBase`, and holds its own run.** `ActBase { onAct: () => unknown; failed? }` is what
  `Act`, `IconAct`, `MenuItem` and `ConfirmAct` extend; `loading` is on no act, nor on `Button`,
  `IconButton` or `InputOtp`. A thenable `onAct` returns holds the act pending until it settles. Every
  act renderer holds its own run by default (`ButtonBase`, the public `IconButton` that every
  `IconAct` is drawn through, a `Menu` with its trigger drawn pending), through `useAct` in each
  plugin's `lib/act.ts` over plugin-api's `useRun`. The act is inert (`aria-busy`) at the press and
  is ready the moment its promise settles. Its pending look (the pending fill, label and glyph
  hidden, the spinner) waits `ACT_DELAY`, 300 ms in `@fcalell/ui-core/paint` beside `WAIT_DELAY` and
  emitted as `--act-delay`: on the web one keyframe pair (`act-out`, `act-in`) delayed by the token,
  on the phone `useShown(pending, ACT_DELAY)`. The delay is fixed, not an option; it holds under
  reduced motion and the fades snap. Pending is the roster's act state (`pending`, in place of
  `loading`) for Button, IconButton, ActionBar, Menu and InputOtp. A done act has no mark: what it
  changed is drawn by the reads its invalidation refetches (their busy mark), and plugin-api's
  invalidation is deliberately not awaited, or a delete that navigates would draw its record's stale
  line before leaving. A `state: "done"` toast stays the app's report of a change off screen.
- **A host takes over its acts' run.** The `ActionBar` hosts any of its acts (one pends, the rest
  stand inert through `ActInert`); the `Sheet` hosts its head submit, foot bar and form bar, holds
  its dismissal while one pends, and shares its `Acting` with the docked sheet and `ConfirmSheet`
  through `SheetBase acting`. A host hands `pending` to the act it renders, whose handler
  then returns nothing: `ButtonBase pending` makes a hosted button call its handler as it is, since
  holding a second run would pend twice. `FormContext`, the form's submitting `aria-busy`,
  `SheetBase.busy`, `ActFailed` and ConfirmSheet's swallowed rejection are gone. The bar's filled act
  follows the form's own read (or its sheet's) alone: it paints while that read waits or stands
  still (`ActionBarInternal painted`) and is blocked with the failed sentence or `words.missing`
  once it ended (`ended`); a group's read never touches it, and nothing reports up. A confirm's
  act runs the work: `ConfirmSheet` hands it to the bar as `then(act.onAct(), onDone)`, so the
  sheet closes when it resolves and stays open, ready, with the sentence in its bar line when it
  rejects, and a non-promise act closes it at once. `confirm()` returns nothing, and its optional
  `cancel` is the way out's label (the `cancel` word unless given): the words for leaving a decision
  are the decision's own ("Keep editing", "Stay"), so no word derives them.
- **A failure is drawn by its host, in its line, else in a toast.** `Acting.line` is the rejection's
  sentence (the generic one for an act refused for the connection too): the `ActionBar`'s kept line, the `Sheet`'s, a standing
  public `Button`'s reason line under itself, a field's error for a control's save, and `InputOtp`'s
  field for its `onComplete`. Every other act raises a failed toast whose Retry is the same `ActBase`
  (the app's whole `onAct` again, a navigate included), held by the toast's own button. The sentence
  is `refusal(error) ?? words.actFailed` ("That didn't go through."): an act carries no sentence of its own, since a per-act wording repeats what the generic line says; `refusal`
  (plugin-api `./acts`) is an `ORPCError`'s own message for a 4xx other than 401, 403, 404 and 429
  whose message is not the code's stock text. The line clears on the next press. A failed (high
  priority) toast is announced by its own alert, so its root sets `aria-live="off"` and
  `aria-hidden={false}` and its close act `aria-hidden={false}`: the toast and its focusable acts stay
  in the tree. There is no MutationCache failure handler (it runs before the caller's promise
  rejects and cannot know whether a host drew it) and no client undo: a window the server holds is
  `PendingBar until`.
- **Nothing queues for a missing connection.** `createQueryClient`'s mutation cache runs
  `guardReach` in `onMutate`: while `onlineManager` is offline, or a cached read's `meta.reach` says
  the server is out of reach (plugin-node's `ws.connection`, `lost` after `PAUSE_AFTER`), it throws `Unreached` before any
  fetch, so no mutation pauses and none fires on reconnect. A caller-supplied `mutationCache` must
  call it. The act's host draws the generic `words.actFailed` as the failure line, with no Retry and
  nothing held, because the reason is the app's offline banner's and a second telling would repeat
  it: siblings stay live and a sheet can be dismissed. Whether an act also looks blocked
  before the press is the owner's open question; the press is what refuses.
- **A control holds a save it is handed.** `FieldControl.onChange`, `OptionPick`/`MultiPick`
  `onChange` and `onCommit` (Input, TextArea and the new Slider `onCommit`, the value the thumb is
  let go on) return `unknown`; a promise holds the viewer's value, a selection's or a constant's,
  while the latest save pends (`useDraft.change(next, save)`, through `useHeldDraft` in `lib/act`,
  for a bare control, whose rejection toasts; a `FormField` hosts the save of its `switch`,
  `checkbox`, `slider`, `options`, `segments`, `input`, `textArea` and `picker` through
  `useFieldDraft`, holds the refusal line in its own state and clears it on the next change, and the
  control's Base takes the field's `draft`). Over a read that ended the draft blocks every change
  and says the read's sentence in that same place instead (above). Each change carries a sequence
  number and only the latest's outcome counts. Resolved, the hold waits for the refetch the save's
  invalidation started on the control's own reads (a query-cache subscription; the write's
  `onSuccess` starts it synchronously), then follows its datum unless edited since. Rejected, the
  value falls back to its datum and the reason goes to the field's line, else a failed toast
  whose Retry saves the same value. `change` returns the save's promise, never rejecting, so an
  act that saves again holds the run. No saving mark is drawn: the value is the optimistic one.
  Molecules pass the value through (`DefinitionRow` `switch` and `pick`, `Table` `onEdit`,
  `FormField`). A Picker's `options` and `value` are `Datum`s (platform props, as every data prop is), so the trigger paints, inert, while either waits, and DefinitionRow's `pick` takes the same props. ui-core's `OptionPick`/`MultiPick` stay constants: a rule's terms and the Shell's switcher are worded before anything draws, and an ItemHeader pick fact is data as a whole `Datum<Fact>`.
  No stack helper touches the cache's `onMutate`; a `setQueryData` in an `onSuccess`
  stays the app's. Latest-wins is client-only: a mutation that cares about order gives itself a
  `scope`. `InputOtp` holds its `onComplete` promise with `useRun` and draws its checking line at
  once, without `ACT_DELAY`: a code is never typed twice, so there is no fast answer to spare the
  line for.
- **The dev holders** are the query cache's own observers, with no registry of ours. A leaf that
  draws a read is an observer whose `placeholderData` is plugin-api's `placeholderData`, the painter;
  a frame (its held and extra reads) and a leaf that draws a failure itself (`useDrawsFailure`, one
  `useQueries` with `notifyOnChangeProps: []`) carry a second constant, `heldPlaceholder`, which also
  returns the placeholder, the holder. `watchUnheld` (run by `QueryProvider`) names a read that failed
  with no data while its `query.observers` hold a painter and no holder. It judges on the cache's
  error event and again on its `observerAdded` and `observerRemoved` events, one tick later so the
  holders that mount in the same commit count; a late painter or a leaving holder is caught the same
  way. A frame holding two reads is `holdReads`'s `console.error` alone. A quiet read's observer
  carries neither constant. Rejected: a Map of counts registered in effects (a second source of
  truth that the cache's observer list already is).
- **The dev checks** (plugin-api `watchActs` and `heldAct`, run by `QueryProvider`) `console.error`
  on a mutation an `onAct` or a `change` save started without returning its promise, and on a
  mutation failure that no host marked as drawn (`drew`) within a macrotask, unless the mutation has
  an `onError` of its own. The showcase's Storybook preview fails a story that logs either.
- A `Form` that stands edited asks once when its page is left, with no prop: the app passes
  nothing and writes no guard. The state is ui-core's `createLeave` (`./leave`), one object per
  `Form` beside `touched` in `useTouchState`, a ref-like store and never React state, because a
  leave is tried in a router callback that must read the press made a tick before. A field's
  input edits it; the `ActionBar`'s filled act clears it before running (a sync act that
  navigates, or an async one that navigates after it resolves, is never asked) and puts it back if
  the act rejects; no question while the act pends. `touched` keeps its meaning (a blocked act's
  reason shows), so the two are apart. The question is a `Confirmation` (`discardEdit`, a
  the `editUnsaved` sentence, a destructive `discard` act, `cancel` `keepEditing`)
  asked through each plugin's `ask`, which resolves with the decision's answer where `confirm()`
  returns nothing, and resolves `true` at once when no frame hosts the queue. Web: the bound
  router's `history.block` (an async blocker resolving to hold or go, so a push, a replace and the
  back button ask alike, with `enableBeforeUnload` true only while the form asks); unbound, a
  `beforeunload` listener alone. Phone: the screen's `beforeRemove` is prevented and a discard
  dispatches the event's action; `navigate` between tabs removes no screen, so a tab switch asks
  nothing. A `Form` in a sheet asks nothing (the sheet closes on its own acts), and two edited
  forms on one page each ask. Rejected: a prop or a `Form` variant (every edited form wants it),
  a capture-phase anchor interceptor (a router push and a back never reach it) and block-then-replay.
- A desktop Sheet is always a centred card (`SHEET_DESKTOP`: `w-sheet`, or `w-pane` at
  `fit: "pane"`, `rounded-sheet`, a border on all four sides, `LAYER_CENTRED` with the page inset
  above and below, `CENTRED_MOTION`), capped at the layer's height with its body scrolling between
  a pinned head and foot. Nothing is measured: a form that grows or a wizard's next page stays
  the card. `form="centred"` (`SHEET_CENTERED`, a decision's cell) is unchanged, and touch is the
  bottom sheet. The full-height side sheet and the measure that chose it (`useShortOrSide`) are
  gone; this reverses 003-147's card hung at the end edge. A sheet's title wraps beside its acts at
  every density and never ends in an ellipsis.
- A sheet is content-tall and grows with its content. On the phone every sheet sizes dynamically
  (gorhom's `enableDynamicSizing`) up to a cap, the screen under its top inset
  (`maxDynamicContentSize`), the body in the one `BottomSheetScrollView` so past the cap it
  scrolls; a `TextArea` that grows grows the sheet a line at a time until the cap, then scrolls
  inside. The foot is always gorhom's `footerComponent` (empty, it draws nothing), so it is
  measured with the sheet and held above the keyboard, `enableFooterMarginAdjustment` adding its
  height to the body's end; the home indicator's inset is the footer's `bottomInset`, which gorhom
  drops once the keyboard is up. The one tall form is a menu that searches (a pick past six
  options, whose list would else jump as the filter narrows), which stands at the cap from its
  first frame, an internal `SheetBase` prop and no public one. Nothing reads the sheet's children
  or decides its height in an effect after `present()` (it once read a `TextArea` off the elements,
  and moved the foot into the footer once a reaction found the content capped). Needs a device run:
  the keyboard over a growing field, the foot's inset, and the body's nested scroll. On the web only
  the touch sheet of a searching pick stands
  tall, up to the page inset under the viewport's top, and the desktop pick is a popover. Every
  touch sheet keeps that strip of scrim above it, so a press there closes it; a searching pick is
  never a pushed page. Rejected: the TextArea asking the sheet from a mount effect (gorhom mounts
  the content only once presented, so the sheet opened content-tall and re-snapped after paint, and
  never shrank back), a public height prop, a full-height form sheet, and the sheet reading its
  children.
- A source TextArea never fills: it is as tall as its value, three lines at least, whatever it
  stands in, and the page's body scrolls past it. It filled the free height of a page's Form until
  the form-by-context cleanup (`data-fill`, `HOLDS_FILL` and a read of `FormStands` and
  `SectionContext`: a field choosing its form from where it stood). Rejected: `rows` and `fill` props
  (the page decides the height, not the app), and the phone, where the keyboard takes the lower half
  and the field keeps growing with its value.
- An `Input` with an `act` presses that act on Enter (the key's `commit` moment still fires, a
  blur does not press it), so a field that adds what is typed needs no `Form` around it.
- A sheet keeps its content until it has left. State that belongs to one opening resets as the next
  arrives, during render, never as the sheet starts closing: a sheet's touched and pressed marks
  reset as it opens or turns to a new page (a wizard's, or the next queued decision's), and a
  confirm's typed name and pending act reset when its decision's id changes. `Confirmations` draws
  the queue's first decision in the render that hears it, else the last one while its sheet leaves,
  and `ConfirmSheet` stays unkeyed, so a decision queued behind an open one takes the open sheet in
  place. Rejected: an effect mirroring the queue (the first `confirm()` drew a commit late, and a
  dismissed decision's content stood a frame in the next one's sheet), and a reset on close (the
  name emptied and the act turned blocked while the sheet left). A pick's sheet holds the same rule.
  On the web its rows, the search with them, are a component inside the sheet's popup, which Base UI
  removes once the leave has played, so the search dies with the sheet however it closes (a pick,
  the act, the scrim, Escape). The options' one tab stop starts on the chosen option, which the
  sheet hands Base UI's `initialFocus` by ref, and follows focus in the DOM, so an arrow key
  re-renders no option. On the phone the search stands in the sheet's head, apart from the rows, so
  it clears as the sheet opens; the options' groups derive once per options identity, shared by the
  trigger and its sheet, and the filter runs once per search. A cell's pick ends its edit once its
  list has left, never in the handler that closes it: on the web from Base UI's
  `onOpenChangeComplete(false)` (the sheet, the desktop list and its search alike), on the phone
  from gorhom's `onDismiss`. A Picker latches its form (the desktop list or its search, the sheet's
  search field) while open: the options' count picks it only while the list is closed, so data
  crossing six never tears down an open list and its focus. Rejected: clearing the search in the
  close handler (a pick or the act closed another way, and on the phone the rows re-expanded while
  the sheet left), and focusing the stop after two animation frames (a guess against Base UI's own
  focus).
- `Text` draws `body` and `meta` and names those roles' cells of `TEXT`, not the family; every
  other type role is drawn by the molecule that owns its place, and `TEXT` keeps all eight roles
  as the one table those owners draw from. A run of emphasis inside a line is `Strong`, which
  names the `TEXT_STRONG` cells (body and meta share the weight): it takes no role, so it needs
  no context to read its line's, and a `Text` inside a `Text` is not a form (a paragraph in a
  paragraph is not HTML).
- Tokens are enforced by ownership: a token names a place, and the component that owns the place
  draws it. A component declares `owns` on its entry, the type roles, colours (a name, or a family
  prefix ending in `-`), radii, spacing roles, sizes and widths, and shadow levels it may draw. A
  molecule that picks a composed atom's `fit` or `act` (a `Pane` its bar's acts `ICON_BUTTON.fit.bar`)
  draws those cells and owns what they spell; a
  slot the consumer fills (`children`, a `ReactNode`) draws nothing of its content. The least data
  that makes the check exact: a class is classified by its utility prefix into one namespace and
  looked up by name, so `rounded-chip`, `min-h-chip` and `bg-chip-red-soft` land in three namespaces
  and cannot be confused. Rejected: one flat prefix list (`chip` is a radius, a size and a colour
  family) and a declaration per cell (the matrices already say which cell a component draws).
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
procedure, the rubric with its judging questions, and one page per pattern under `patterns/` holding
its measured range and the references behind it (`references.md` says how to read them). The rubric
is the standard every render is judged by, and the critique is run by a session that played no part
in composing the unit. ui-core is no plugin, so it contributes nothing itself:
`@fcalell/ui-core/manifest` lists its pages, and react-ui and native-ui each contribute them to
`cliSlots.guide`, where the index lists a page once. Each UI plugin depends on `@fcalell/ui-core` in
the consumer's own `dependencies`, so the index's `node_modules/@fcalell/ui-core/guide/` paths
resolve. A platform's rules for every `.tsx` are its plugin's own page (react-ui's
`guide/rules.md`).

## The showcase and Storybook

`apps/showcase` is a stack consumer. Its routes are the token page and the television page
(`/foundations`, `/tv`; `/` redirects to `/foundations`) and the places of one app composed from
the built components: `/deploys` (with `/deploys/$deployId` and `/deploys/$deployId/steps/$stepId`),
`/projects`, `/usage`, `/domains` (and `/domains/verify`, a covering Pane over it), `/logs`, `/assistant`,
`/members`, `/settings` and `/home` in the Shell (the pathless layout `_app`), and `/sign-in`
and `/connect` outside it. A place calls typed procedures through the generated client
(`src/worker/routes/`, each with zod schemas and a stub handler that answers no rows) and reads them as `orpc.*.read` handles into frames (`read`) and selections (`.at`, `combine`), so every place waits as its loaded tree painted; `src/app/fixtures.ts` answers every
procedure with the data a place shows and gives each route `$param` an example value. The screens
workbench (`stack screens dev`) draws every route in data, loading, error, empty and not found, light
and dark, at either density. The roster is in Storybook. react-ui's `./showcase/cells`, `./showcase/frame` and
`./showcase/frames/*` export the frame data, the `Frame` wrapper and one drawer per component;
`.storybook/` imports them, nothing is copied. A story is a component in one state
(`rest`, `disabled`, `loading`, `error`, `empty`, `selected`, whichever its roster entry lists)
drawing every cell through `Frame`, light and dark side by side, at the toolbar's density. The pointer and
focus states (`hover`, `active`, `focus`) stay in the roster, the contract both platforms verify, and
draw no frame and no story: the web's variants match only the real pseudo-classes, and the critique
reaches those looks by driving the real component. A frame is not a page, so a component story runs
every axe rule except the document-structure ones (`.storybook/preview.tsx`: landmarks, `page-has-heading-one`,
`region`, `heading-order`, `bypass`, `skip-link`), which no frame draws; `stack screens test` runs them, with every other rule, on each screen of an app.

Two kinds of story, one `pnpm stories:test` run (headless Chrome at desktop density and 1280 px;
touch is a toolbar toggle, not a test run; `a11y.test` is `error`):

- **Behaviour stories**: hand-written in `apps/showcase/behaviour/`, one per interactive component
  that owns a widget behaviour the rubric's accessibility floor sets (an overlay's focus in and
  out, Escape and focus kept inside a modal; a composite's arrow keys and typeahead),
  each a play function driving the real component by keyboard. They cover Sheet and a `confirm()`
  decision, a Sheet docked in a Pane's foot, Menu, Picker, OptionList, SegmentedControl,
  Table, List (tree), Slider, InputOtp and Gate; Place and Shell move no focus
  themselves (a Pane takes the keyboard on its first control when opened from another,
  `usePaneFocus`).
- **Paint stories**, also hand-written: `behaviour/paint.stories.tsx` draws a row, a definition row, a
  stat, a control and a Section heading loaded (over a read that answers) and painted (over a read
  that never does, `showcase/waiting`'s `waiting` and `failing` reads) and asserts the painted box
  equals the loaded box, at the desktop density and in a 375 px phone at the touch one: the
  per-leaf form of structure rule 15, whose screen-level form is the shift check. The settle,
  waiting-late, section-loading and not-found stories drive frames over the same reads.
- **Act stories**: `act`, `act-hosts`, `act-offline`, `control-save`, `input-otp` and
  `preload-intent` in `apps/showcase/behaviour` drive an act's pending after the delay, a host's
  inert siblings and held dismissal, a refusal in a line and in a toast, a press offline, the latest
  save winning and a rollback, and a hover that requests a record before the click. The Storybook
  preview fails any story that trips a dev check. `Timings` (`behaviour/timings.stories.tsx`) is the
  tuning bench for `WAIT_DELAY` and `ACT_DELAY`: sliders set `--wait-delay` and `--act-delay` on the
  root, a read's time and an act's time and outcome (resolve, refuse, fail, offline), so the owner
  feels a number before it goes into `paint.ts`; the phone takes the numbers settled there. The
  same numbers live in `timings` (`waitDelay`, `actDelay`, `waitMin`), read at use, and `holdFor`
  turns them into the minimum hold `QueryProvider hold` gives a read's first write: a first answer
  that lands after the paint has shown waits until the paint has stood for `waitMin` (0 by
  default), counted from the fetch's start; queries made with `read()` and `channelRead` hold,
  refetches and later pages do not.
- **Component stories**, above, and the roster stress floor: a generated `RosterStress` module
  (`.storybook/roster.ts`) draws each component's frames at desktop and at touch in a 320 px
  column, and `.storybook/stress.ts` feeds every text slot a 300-character word and a URL, failing
  on a page that grows, a box past its parent (unless a box above cuts it) or text drawn outside
  its box with no ellipsis; `behaviour/roster-stress.stories.tsx` holds its canaries. The same
  story then runs the render walk over the component's frames alone and the margin check on each
  frame's root (no component's root carries a margin; the icon act's reach across a field's
  hairline is the one named exception).

A page is not one of them: the places above are the app's routes, and the workbench draws each as
the document it is; `stack screens test` checks it.

The test run's floors are one preview annotation (`@fcalell/plugin-screens/floors`) that, per story,
visits three widths, each answering what the others cannot: 320 is the narrowest phone, the touch set;
1280 a laptop, the desktop set where a list and its record stand together and `wide` is closed; 1920 a
desktop monitor, where `wide` is open and every region shows, the only width at which a cap leaves dead
space (narrowed by `--width`; the density's pin is taken off at each width so
320 draws the touch set and the others the desktop one, the way the media query decides in a
browser), and at each width, once the page has settled, checks overflow and runs the render walk
(`@fcalell/plugin-screens/walk`). The walk reads the contract off the page, never from a copy: the
`--spacing-*`, `--text-*` and `--radius-*` custom properties at the element's own density (a `room`
`Place` holds its own), named by ui-core's token lists. Its checks are pure functions over measured
data, tested in node, and every one has a canary in `behaviour/walk.stories.tsx` that hands it bad
markup (and hidden, zero-size and `display: contents` cases) and asserts exactly what it finds.
What the contract itself draws off a rule is a named exception in `EXCEPTIONS` (`walk.ts`), with
its reason, never a baseline. The standing family is the pair the contract does not make concentric:
a control, a row or a chip (6, 6, 4) inside a card, a popover or a sheet (8) keep their roles'
radii. A concentric inner radius, the outer's less the inset, would need the inner part to know its
outer, a context or a CSS variable the outer sets (which is the same thing), and the numbers that
would line up fall outside the rubric's ranges for a control, a row and a chip (decided 2026-10-13);
the walk still holds every other nested pair to the outer less the inset. The alignment rules (`align-dead`, `align-centre`, `align-baseline`, `align-grid`: no box that takes room and draws nothing, a row's end items on its centre, one baseline to a line, flex alone) are report-only until the sweep has fixed what they find: `findings()` leaves them out unless `ALIGN_FAILS` (`walk.ts`) is set, `alignFindings()` returns them, and the screens run and the roster stress print them as `align-…` lines. Behaviour stories call `walked()` (`behaviour/support.ts`) at the end
of a play function that ends in a state input reached (an open picker, a menu, a sheet, a dialog's
returned focus, focus on the last act above the tab bar). The workbench's stories carry a tag per
state (`state:loading`) and per checked global (`mode:dark`) so `--state` and `--mode` leave the
others out, and `--screen` selects story files by route.

A failing assertion is a finding in the component: it stays failing until the component is fixed,
never weakened or skipped, and nothing is excluded from axe beyond the document-structure rules and
the node buttons of a canvas that draws a run's path: `Canvas`'s dimmed frames
(`.storybook/state-stories.tsx`) and the behaviour stories that draw a `path`. An open non-modal
popup (Menu, Picker, a Pane's more menu) has `[data-base-ui-focus-guard]` spans around
it, focusable and `aria-hidden` by Base UI's design with no prop to drop them, so
`aria-hidden-focus` flagged each open menu (serious, on every desktop menu) until Stead's critique
(2026-10-11) asked for an open menu that audits clean (003-323). Menu and Picker call
`useQuietGuards` (`lib/guards.ts`), one document observer for every mounted popup that takes
`aria-hidden` off the guards as they appear: they stay in the tab order, so the Tab relay into and
past the popup holds (each guard moves focus the moment it takes it), and they are empty spans with
no role, which assistive tech passes over. Nothing is excluded for them any more. Rejected:
`tabindex="-1"` on the guards (it breaks the relay), a role on them (`presentation` on a focusable
span is its own axe finding), and patching Base UI. A node off the path
draws disabled ink (about 3:1) by the pattern's rule, and axe exempts only a disabled control, which
these enabled buttons are. The exclusion leaves those nodes out of every rule, since a per-story
`config.rules` entry replaces the preview's document-structure list and would copy it. A story-level
`context.exclude` replaces the preview's too (Storybook overwrites arrays).

Storybook runs on `.stack/storybook.vite.config.ts` (by `viteConfigPath`), which `.storybook/main.ts`
writes at start by calling `writeStorybookConfig({ config, cwd })` from
`@fcalell/plugin-screens/node` with the app's `stack.config.ts` (it resolves the slots the app's own
config renders from; `stack generate` writes no such file), and which Vitest's config loads the
same way (`vitest.config.ts` calls it, then `loadConfigFromFile`). Nothing is adapted by hand:

- The TanStack router plugin is not in it (it needs the route files and rewrites
  `routeTree.gen.ts`, and no roster story routes): it is in `vite.slots.appPlugins`, which the
  function does not read, so nothing matches its name, and the `server` block is blank of the headers
  `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`, which block Storybook's preview iframe,
  and of the proxy and the port.
- Vite's `root` stays `.stack/`: every path a contribution hands a plugin is anchored on the config
  file, so nothing moves it. `main.ts` names its story globs relative to `.storybook/`, which is how
  `@storybook/addon-vitest` joins them to the config directory to find the story files.
- Storybook runs Vite in middleware mode and never calls `server.listen()`, the call that starts
  Vite's dependency optimizer, so `optimizeDeps.include` and the scan never run: a CJS dependency
  behind a `node_modules` import (`react-dom/client` through Storybook's dom shim) is served raw
  and fails with "require is not defined", and each dep found late reloads the page. The
  config's host plugin, `storybookHost()` from `@fcalell/plugin-screens/vite`, starts the
  optimizer (`depsOptimizer.init()`), which restores the scan; no dependency list is kept.

What stays in `.storybook/` is the roster's own: `rosterPlugin` (added to the derived config by
`main.ts`' `viteFinal` and by Vitest's config), the story globs and the generated modules below.

- The browser provider launches Playwright's own browser; where none is installed,
  `CHROME_PATH` names a Chrome to launch. `@storybook/addon-vitest` needs no
  `setProjectAnnotations` file since Storybook 10.3.

The stories are generated: `.storybook/roster.ts` writes one CSF module per roster component into
the gitignored `apps/showcase/stories/` (Storybook's watcher does not see a file under a dot
directory, so not under `.storybook/`), each importing only that component's drawer. Storybook
re-indexes a file matched by `stories` only when it changes and Node caches an ES module for the
life of a process, so the roster is read in a child process, and a Vite plugin watches
`cells.ts`, the drawers and ui-core's built `dist` and rewrites the modules whose text changed:
a roster edit reaches the sidebar without a restart, and `vitest --changed` reruns only the
modules whose import graph holds the edited file.

The showcase is the first consumer of the screens workbench (`stack screens dev`, plugin-screens): every
route of the app (the three pages included) is a screen in five states, on the derived
`.stack/screens.vite.config.ts`. The two hosts derive their config the same way, from vite's slots, and
differ in what they draw: the workbench keeps the router plugin and adds `screensPlugin` (the route
tree, the fixtures, MSW's worker); the roster's Storybook leaves the router out and adds only the
optimizer start.

The Vitest run sets `maxWorkers: 2` for both browser projects, which caps the story pages one `pnpm stories:test` opens at
once (each is a renderer, and a wider run exhausts the memory of a 16 GiB machine). The showcase's browser
scripts (`test-storybook`, `test-screens`) run through `browser-run.sh`, a memory budget per user shared by
every session and worktree: a run claims its cap (`STACK_BROWSER_MB`, 7 GiB by default: a full run peaks near 6.1) and starts while
the available memory, less the caps of the runs already admitted, covers it and a reserve
(`STACK_BROWSER_RESERVE_MB`, 2 GiB); otherwise it waits, and a cap plus reserve above `MemTotal` is
refused at once with the three numbers, since no wait admits it. Under systemd the run is held to its cap with no
swap, so one that outgrows it is killed alone instead of exhausting the machine, and the script prints the
run's peak (the scope's `memory.peak`) when it ends; without `/proc/meminfo`
the budget is one run at a time. A run scoped with `--changed <ref>` peaks lower: a `bar-chart`
component edit selects 70 of the 202 story files and peaked at 4.7 GiB (`browser-run: peak 4784 MiB`),
so a scoped run's cap is set from the printed peak.

A change reaches a story file only through its module graph, which `dist/` and generated files do not
join: `@fcalell/ui-core` and react-ui's `.`, `./node/*` and `./density` resolve to gitignored `dist/`,
and the theme and token CSS and the derived Vite configs are written to `.stack/`. So the roster's
`vitest.config.ts` and the generated screens config both add `workspaceTriggers(<app dir>)`
(`@fcalell/plugin-screens/node`) to Vitest's default `forceRerunTriggers`: for each workspace package
the app links (a dependency that resolves outside `node_modules`), every file under its `src/` that no
source export serves, derived from the package's `exports` (react-ui's `./components/*` serves
`src/ui/components/`, `./globals.css` serves `src/ui`). A change to one of those files reruns every
story and every screen; an edit to a served component reruns only the files that reach it. A published
consumer links nothing, so only Vitest's defaults apply. `vitest run --changed <ref>` and
`stack screens test --changed <ref>` diff `<ref>...HEAD` plus uncommitted edits, so a batch committed in
a worktree runs both with `--changed master`. A file subset goes through the script too
(`pnpm --filter showcase test-storybook <files>`); `vitest` called directly bypasses the budget, and any
other browser (a script driving Playwright) runs as `apps/showcase/browser-run.sh <command>` with its own cap.

## Enforcement

Three verify suites (ui-core, native-ui and react-ui) are the design system's enforcement layer: the
derivation's scales and colour mixes checked against their rules and swept over every accent and
cast hue, matrices asserted verbatim over their full axis products, every class a cell or a web
overlay draws checked against the tokens its roster entry owns, the roster compared against every
component's props type, closure fixtures that compile every component's `?: never` props, word and
product-noun scans over the sources, class-literal set-equality against each plugin's overlay
allowlist, every class a web component spells emitted by the built `app.css`, and the structure rules
of the guide's `structure.md` (no read of children, no literal length in an arbitrary value, measuring,
contexts and `dataset` only in closed lists, no `type` prop, no Section in a Section), whose matchers
live in `@fcalell/ui-core/structure` with a test that each fails on a bad case. The split follows what
a check needs: a rule a grep can answer runs in each package's `pnpm verify` (inside `pnpm check`, on
web and native alike, since native has no render harness), and a rule that needs a layout (heights,
gaps, insets, radii, clipping, type sizes, late fonts, tabular digits, a root's margin, same-name
regions) is the render walk of `stack screens test`, which reads the contract's numbers off the page,
never from a second policy file. Every `createContext` is classed `data`, `behaviour` or `portal`, so
a new one fails until classified and no class changes a child's form; the form contexts are retired
(a row's ground, a Section's empty and a Form's stands, a Group's registration, a foot's place), each
now a prop its owner passes or a structure its parent draws; where the provider drew the consumer
itself, the context became the consumer's internal prop. `ShellHome` is the one
named `form` exception: the router mounts the page for an unknown address wherever the miss lands, and
only the tree above it knows whether a Shell stands there, while a Gate is a root frame and a Place of
a Pane cannot draw outside one. Every check, grep or walk, has a test that it fails on a bad case
(`display: contents`, a hidden element, zero height), so none passes by never matching. The web builds the
roster one component at a time, so react-ui holds each component directory present to its entry and
reports how many of the roster are built. A new matrix that skips a registry, a component the roster
does not name, a literal that duplicates a cell, an off-contract utility, or a drawn word outside
`words` each fails a named check.

## Limits

- Native has no render harness: its verify reads the components against the matrix strings and the
  roster, and no check draws a native screen.
- A native QR tile inside a dark raised ground draws its edge at the dark raised value: uniwind
  1.12's `ScopedTheme` keeps the parent's scoped variables and cannot clear one. No screen does this
  today.
- A native Button's `count` is not in its accessible name: that is its `label` alone.
- Base UI's Checkbox, Switch, Radio and OTP field look for a `<label>` after every render (a
  layout effect with no dependencies reading the hidden input's `labels`, which walks the whole
  document) unless the control is named by `aria-labelledby`, a `Field` label, or renders a native
  button. The cost grows with the document, so a long list of ticks renders in quadratic time:
  react-ui's Checkbox and Switch render a native `<button>` (`nativeButton`), as
  SegmentedControl's radios do, and a disabled one carries `disabled` and `data-disabled`, never
  `aria-disabled`, so their disabled looks key on `data-disabled`.
- The native toasts' layer stands over a box measured against the frame's root (`ToastRoom`,
  `ToastFrame`): the layer must stand after the sheets' host, outside the page's tree, so no layout
  places it, and it follows a growing input a layout late.
- An `Image`'s full view takes no pinch-zoom or pan: it is contain-fit, as large as the page inset
  leaves room for.
- A product cannot draw in the platform font: `fonts.sans` unset is IBM Plex Sans,
  and the platform stack only stands behind the named family and its metric fallback face.
- Comparison's `hyphens-auto` is unverified: the Playwright browsers the run uses ship no hyphenation
  dictionaries, so a value wider than its column breaks mid-letter there.
- Native Diff and Comparison name a `list`-role container (React Native has no table role).
