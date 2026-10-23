# ui-core, the design contract

`@fcalell/ui-core` is the design contract both UI plugins render from: the token contract with its
parametric derivation, the words the molecules speak, the shared `cn()` merge config, the
platform-invariant variant matrices, the component roster and the shared descriptor types. It is a
preset library like `biome-config`: no `plugin()` factory, no slots, no framework dependency. The
normative laws (the canon, the sharing line, the `cn` ordering rule) are in the package README and
are stated there; the emitted `DESIGN.md` is the generated reference for tokens,
cells and roster. This page holds the architecture and the reasons for its shape.

Source map: `tokens.ts` (the sheet as data, `MOTION_KNOBS`, `MOVES`, `MOTION_CELLS`), `derive.ts`
(`deriveTheme`), `variants.ts` / `variant-tables.ts` (the matrices and `FAMILIES`), `roster.ts`
(`ROSTER`), `words`, and framework-free logic subpaths (`paint`, `arrive`, `scramble`, `roll`,
`follow`, `clock`, `format`, `window`, `file`, `list-state`, `structure`, `manifest`).

## Tokens and theming

- The contract is held as data in `tokens.ts`; the emitted `app.css` carries exactly those values.
  The Tailwind theme namespaces for colour, radius, text, leading, tracking, shadow, font,
  container, breakpoint, duration and ease are zeroed, so an off-contract utility compiles to
  nothing; `tablet:`, `desktop:` and `wide:` are the only viewport variants. The numeric
  `--spacing` base stays live, so the matrices pin their cell strings verbatim and the closed
  props keep a numeric off a call site.
- Five knobs only: `hue` (`accent`, and `cast`, the neutrals' hue, the accent's unless set), `radius` (the control's, the layers derive theirs), `fonts`
  (two family names) and `defaultMode`. Every other value is the sheet. The cast reaches every
  neutral through the `"cast"` hue marker and never the accent, status, chip or avatar hues; its
  chroma is a constant per role and mode. Density is no knob: the pointer and the width decide it.
  Rejected: a knob per scale and per-token overrides (a consumer that moved one re-tuned a system
  it had not designed, and every measured pair would need re-checking by hand); a second primary
  fill (a theme decision, never a call-site value).
- Colours are declared as a light and a dark OKLCH value, an alias, a `veil` (a role at an alpha)
  or a `mix` (a blend toward another role in OKLab). A literal or `mix` may carry `holds`, a
  contrast contract against named grounds; the derivation moves lightness until each holds at the
  knob's hue and clamps chroma inside sRGB, so a re-hued accent keeps its contrasts. Colour roles are named for the place they draw: surfaces,
  three inks, the accent family, status families, chip families, avatars, washes, act fills and the
  switch set. A chart's series take `chart-<hue>` fills in `CHART_SERIES` order and a meter's level
  turns on `METER_NEAR`, so both platforms draw the same colour for a value.
- The dark hairline is two tokens (`edge`, `edge-raised`): a group or lifted layer re-points
  `--color-edge` for everything inside it (`RAISED_GROUNDS`, `raisedGroundTokens`). The web scopes
  it by class; native wraps a raised surface's content in `RaisedGround` (uniwind
  `ScopedVariables`, which take a value, never a `var()`).
- Density is a theme over three scales (type roles, spacing roles, sizes, plus `hairline`):
  desktop and touch are automatic; `themeTokens` seeds the touch set on both platforms, the web
  overrides it with the desktop set under a fine pointer at `tablet` width and wider, so no cell
  carries a density class. `data-density` on the web root pins a set (the showcase's pin, and the
  one supported answer for a narrow fine-pointer window). Structure follows width in CSS wherever
  CSS can; the `touch:` custom variant and `useTouch` read one query where the tree differs. A
  value that flips by density is an overlay over the desktop cell, never a matrix value. Native is
  touch-only. Rejected: a `fine:` variant in the cells (an interaction condition in a shared cell,
  meaningless on native); one type scale at every density.
- `room` is the third set, the one tier a screen declares (the place's `distance: "room"`), because no
  media query detects viewing distance. It is the touch set drawn on `ROOM_CANVAS` (960 x 540) and
  multiplied by the room unit `u = max(1px, min(100vw / 960, 100dvh / 540))`, never a hand-tuned
  ladder; `roomTokens` is one record both platforms scale. Radii, fixed widths, hairline and
  ring scale by `u`; breakpoints stay px, so a room place holds one structure and draws its last
  Pane alone, holding one column of `Columns` and `Stats`. Focus is the ring, scaled (no
  scale transform). A room app runs dark. Limits: a `vw` size ignores browser zoom, and `calc`
  sizes are fractional. Rejected: a consumer density option, breakpoints that scale with `u`.
- Sizes counted in figures are px at `MONO_ADVANCE`, never `ch` (uniwind has no `ch`); the short
  measure is `ch` on the web and `nativeMeasureTokens` px on native; the running-text `measure` is
  a derived size so a meta line, a paragraph and a form share one width. An icon's stroke is
  `ICON_STROKE` (`line`, `mark`), one number prop on both platforms.
- Emission (`./emit`) returns token records, never CSS text: records validate per key, need no
  escaping and keep ui-core free of `@fcalell/cli`. Both plugins wrap the two shadows
  in `@utility` rules, since the `--shadow-*` namespace does not resolve into RN's `boxShadow`.
  The web keys modes on `.dark` with `.light` restoring below it.
- What may animate is a matter of cost: `transform` and `opacity` run on the compositor; colour,
  `clip-path` and `filter` may transition; a box's size or place never animates through layout
  (`width`, `height`, insets, margins, padding, gap, grid tracks, `font-size`). It moves by
  transform, or lands at once.
- Fonts split by fact: the theme names the families, each plugin's `fonts` option carries the
  files. `fallbackFace(family)` in `./tokens` names the metric fallback once for the family stack
  and the web `@font-face`.
- The emitted `app.css` carries every contract utility whether or not a source spells it
  (`@source inline()` patterns per utility family, about 7.5 kB gzipped), because Tailwind reads
  source text.

## Motion contract

Every motion is a contract constant, never a component's own timing.
Rejected: a motion each component spells for itself (the same press eased three ways, nothing to
tune in one place).

- **Principles.** A motion explains one change or is cut. What a finger or pointer carries moves
  1:1 and only its release eases. A touch is answered within `instant`; nothing waits on an
  animation to take input. An error changes colour and gains its sentence, never shakes. The focus
  ring snaps. A wide surface does not give under a press. The phone has no haptics. Reduced motion
  snaps every transition; two loops stay (the spinner's turn, the delays).
- **One table of numbers.** `MOTION_KNOBS` in `tokens.ts` is every timing. Emit renders each as a
  CSS variable; `deriveTheme().motion` carries them to the phone; the tuning page and the
  write-back read the same rows. Under reduced motion the rungs and the tick are 0.
- **`tuned`.** `@fcalell/ui-core/paint` keeps `tuned`, the phone's mutable live source for what the
  web reads from a variable. Writers use `tune`; readers follow `tuned[name]` via
  `useSyncExternalStore` over `subscribeMotion`. `loading`/`setLoading` hold the theme's paint per
  glyph slot the same way.
- **Tuning and write-back.** The showcase's `Motion tuning` story and the phone's `/motion` route
  generate one slider per knob and "Copy values". `pnpm --filter @fcalell/ui-core motion:apply
  <file>` validates the keys and ranges (refusing the whole file otherwise), rewrites only the
  default literals in `tokens.ts` and regenerates DESIGN.md. A default changes only by that pass.
- **`theme.loading`.** `{ text, figure, id }`, each `pulse` or `scramble` (omitted: all `pulse`; a
  shape always pulses). It rides `ResolvedTheme.loading` to both plugins (the web as
  `data-loading-*` on the root, set by `themeModePlugin` before first paint; the phone through the
  generated `.stack/native-theme.ts`).
- **Moves.** `MOVES` is the vocabulary. A roster entry's `motion` names the moves its component
  makes (required; `[]` for none). The cells a move spells are the contract constants in
  `MOTION_CELLS`; they are the one place a cell carries an interaction state, a transition-status
  attribute or an arbitrary property list.
- **Answer, give, toggle.** Every cell a viewer points at or presses answers; a filled control
  gives (scales) on press, a wide surface never. The phone has no hover: a press lands a wash
  overlay and scales; a toggle drives thumb and chevron.
- **Layers.** What stands over the page enters from where it belongs and leaves the way it came,
  on transform and opacity. A tooltip rests before it shows and a second one soon after shows at
  once.
- **Lines and blocks.** A line (a reason, an error, a notice) fades in and pushes what follows at
  once. A block (a fold, a chip remove, a sheet close, a row the viewer adds or removes) lands at
  once, its neighbours with it; a block that arrives on its own fades in (`lib/arrive`). The
  segmented control's selection ground switches at once and never cuts a label (it scrolls its
  track).
- **Value.** A measured value moves by transform, never by size: a fill is the full track scaled
  from its start, a tick rides, a changing figure or mark swaps (`Swap`, `Roll`).
- **Wait and settle.** A read that lasts shows its waiting form after `WAIT_DELAY` (400 ms, fixed,
  not an option): the loaded tree painted, each slot breathing in one page-wide phase (`PULSE`), or
  the spinner where a wait has no shape. The switch to the loaded form lands at once: the painted
  form is the loaded one's geometry, so nothing moves and no transition runs (a view transition
  snapshots the whole document and blocks input until it finishes, 236–328 ms per click measured
  on a consumer, and the anchor apps animate none of this). Failed forms arrive as loaded ones,
  with no shake.
- **Scramble and decode.** When the theme scrambles a slot's kind, the slot paints generated
  characters in the filler's length (`@fcalell/ui-core/scramble`: `kindOf`, `frame`, `decode`,
  `createTicker`; one ticker per page); a figure or id that waited then decodes by locking its
  characters across `slow`. `Decoded` (`lib/slot`) draws both forms as one instance. A wrapping slot
  always pulses. The spinner shows three cycling mono glyphs where `text` scrambles.
- **Navigate and stream.** A path change lands at once: the router runs no transition, a Pane
  that opens or closes stands in its place from the first frame. The stream rises a message that
  arrived after first draw.
- **Follow and canvas.** What a finger or pointer carries (`@fcalell/ui-core/follow`, pure) moves
  1:1; release eases from `tuned.fling`/`tuned.reach`.
- `stack screens test` runs with `prefers-reduced-motion: reduce`, so a screen is judged at rest;
  the design critique's motion pass is the run with motion on.

## Words

Every word a molecule draws on its own comes from `words`, a closed typed object with English
defaults. `Words` requires every key and `wordsSchema` is strict, so a translation missing a word
fails `tsc` and the schema. It is a plugin option beside `theme`; each plugin contributes a
`WordsProvider` through its `providers` slot, defaulting to English with no provider mounted.

- A consumer's sentence is a prop on the molecule that draws it, never a key.
- A word drawn with a number is `{ one, other }` through `counted(word, count)`, never a function
  (the words cross into the generated entry as a literal). A word drawn with values is one whole
  phrase with named slots through `filled(word, values)`; the schema rejects a translation that
  drops a slot. Rejected: a bare connective composed around figures.
- Ages, moments and every other `Intl` formatter come from ui-core (`ageWords`, `formatterFor(kind,
  lang, options)` in `./format`, built once per kind, language and options at module scope);
  `src` holds no `new Intl.`.
- Ages and pending bars read one coarse clock per plugin (`lib/clock`, `useClock(read, until)`),
  ticking once a second while a reader holds it. `pendingShare(run, now)` in `./clock` is pure; the
  fill animates by transform, and under reduced motion steps with the clock.

## Matrices and the sharing line

- `FAMILIES` registers every matrix by table name with its axes; `matrixCells` enumerates cells
  (`BUTTON.act.primary`). The showcase reads the list.
- Matrices hold platform-invariant cells only: fills, borders, ink, spacing roles, radius, type
  role, weight, family, sizes and widths. Display, alignment, flex sizing, truncation, positioning,
  overflow, negative bleed margins, fraction widths and every interaction state are platform
  overlays composed through `cn()` (RN is flex by default, web is not). What a component is given
  (act, family, checked, error) is an axis; where the pointer or focus is on it is an overlay.
  Type-role cells carry their ink; `mono` carries its family.
- A part with an axis is a matrix; a part with one shape is a named constant (`POPOVER`,
  `PAGE_HEAD`). A molecule draws an atom by composing it, never by spelling its cells; a composed
  molecule draws its own cells and the composer owns none of them. A cell no entry holds is shared
  and spelled by each component that draws it; an entry's `holds` lists the families and constants
  of its own box.
- No arbitrary values in a cell; no framework code in ui-core; framework-free logic both platforms
  run lives in ui-core subpaths.
- Heights are floors, not fixed: a minimum height is the floor of something pressed (control,
  field, target, chip, row). An element a pointer lands on is the target (24 px, 44 on touch), so a
  smaller drawn box stands in a target-sized box pulled back by the difference (`REMOVE_HIT`).
  A part beside a line of text is that line's box (`LINE_BOX`). Stacking between components is the
  token `STACK_ORDER`. A long unbroken word never widens a page.
- Rows have one form everywhere (`ROW`, `ROW_TEXT`, `ROW_END`, flex groups). A row's marks
  (`status`, `warning`, `lock`, `chip`) are named props that fold, never cut; a row's change state
  is `change?: ChangeKind`. A chosen option is ticked or checked, never washed.
- `Picker` is the one pick, of one option or several (`MultiPick` is the same component given an
  array `value`, with two overloads typing each handler by its value). Fits: `field`, `bar`, `row`.
  `Rules` is the one molecule for inline-term rows.
- A page is the `Pane`s in the place the `Shell` draws; the frame reads nothing of what stands in it.
  The place is a flex row that draws no bar; `Pane` is a flex column (a bar with back act, title, `actions`, `more`; a
  body; optional `foot`). Every Pane but the last holds `list` width and shrinks to `region-min`;
  the last takes the rest. Rejected: a grid (cannot size its last track without counting Panes) and
  `auto` tracks (collapse under size containment). Rejected: `Screen`/`Split` and a filled/Details
  act, because each chose its layout from something other than its own props.
- Narrow widths and covering are one CSS mechanism: below `tablet` of the place's width every Pane
  but the last is `display: none`; a Pane with `data-cover` hides those before it. Hidden Panes stay
  mounted (scroll and typed text survive). A Pane opened from another takes the keyboard on its
  first control (`usePaneFocus`). The back act is a route: Back where the Pane stands alone,
  Close where a Pane stands after it; the Pane draws both and CSS shows one. The place's last Pane
  names the page (its title is the `h1`; earlier Panes draw `h2`, tracked by `useLastPane`). Each
  Pane is the `page` size container and keeps its own scroll. Native draws one Pane per route in
  expo-router's stack with the tab bar under it.
- Structure rules (guide `structure.md`) apply to the whole roster: a parent lays out with flex or
  grid and a child says only how it flexes; no read of children, no framework contexts that change a
  child's form (every `createContext` is classed `data`, `behaviour` or `portal`; `ShellHome` is the
  one named `form` exception).
- Collections take data and draw their own rows (`Section`, `Table`, `Picker` in `fit: list`,
  `BarChart`, `Table`, `Thread`): `items` is a constant or a selection. A `Section`'s rows
  are descriptors (`Row`: `RowItem`, `FileItem`, in `@fcalell/ui-core/descriptors`),
  and a row item whose `children` is given makes the sheet a tree. A long collection windows on the web with no
  prop (`@fcalell/ui-core/window`). A paginated procedure's `.pages(input)` read gives the
  collection its more row.
- Reads and states: a read that answers not found is `missing`, beside `failed`; a frame that holds
  the root renders on `busy`, `stale`, `paused`, `still`; a waiting page is the loaded tree painted,
  never a second tree (structure rule 15), so a `Section` stands whatever its data holds, drawing
  its `empty`. No Section is gated on its data's length and none waits on a hand-built tree
  (`b-wait`). An address no route serves is drawn by stack (the `notFound` word).
- An act's run: pending shows after `ACT_DELAY`; a host's line or a failed toast reports a refusal;
  presses offline are held; a control's save keeps the latest and rolls back on failure; a link's
  intent preloads its route and navigation is never held.
- The phone wires TanStack's managers (`QueryProvider listen` takes `online` and `focus`).
- Forms: a `Form` is derived from the procedure it submits: `form.ts` holds what both platforms share (the
  `FieldSpec`, `FormFields` and `FormGroupOf` types, and the derivation of a field's control,
  optionality, options and coercion from the input's JSON Schema, and the read of a picked file), the platforms draw. A `Sheet`'s
  `form` and a `Gate`'s `form` take the same props; a `Gate` step over local state draws its controls directly. A blocked act shows
  its reason once pressed or once its form is touched.
- `Gate` is the layout frame of a page outside the shell (sign-in, consent). `Stats` is the
  figure; `Image` is the one picture component; `Canvas` (web only, d3-zoom viewport and elkjs
  layout, both carried by react-ui) draws graphs; `Code`, `Diff` and `Diff` by word share
  `CONTENT_FRAME`.
- Links: the phone `Link` takes either kind of href and decides by shape; on the web every route
  reader shares one listener (`useRoute` in `lib/navigate`).

## The canon, the roster and the closed props

- The canon binds every component either plugin ships: one name per concept (`label`, `onChange`,
  `onAct`, `act`, `blocked`, `sentence`), composed regions as typed descriptors (`Act`,
  `StatusMark`, `ChipMark`, `RowLeading`, `RowTrailing`, `PlaceSpec`, `Option`, `FieldBinding`,
  `TableColumn`, ...) instead of node slots, and no `class` / `className` / `classList` / `style`
  prop. An icon is an `IconName`, a closed type over Lucide's names; each plugin draws a name from
  one table built over its platform package, which fails the build if a name is missing.
- A descriptor is generic only in a value, which is data. A route a descriptor carries is a
  `Route`, which reads `RouteRegistry`, an empty interface a platform fills by declaration merging
  (native-ui registers expo-router's `Href`; unregistered, a route is any string). Rejected: a route
  type parameter on each descriptor; a native-only copy of the descriptors; optional `value` and
  `onChange` on every control read from the field context.
- The roster is data: `ROSTER` in `packages/ui-core/src/roster.ts` names every component in four
  layers (atoms, layout, shared, content molecules) with its prop names, the cells it draws and the
  states it has a form for, the same in both plugins; an entry with `platforms` ships on those
  alone (`Canvas` is web only). The showcase draws exactly those cells and states. A component's
  directory is `componentDir(name)`. A component draws another's place by composing it, never by
  spelling its cells.
- A popup trigger renders the icon act's base (`icon-button/base.tsx`); the icon act's base names
  the act with a Tooltip (none on touch). Text the frame cuts names itself through one shared
  tooltip the frame host mounts (`shell/cut.tsx`), shown only when it measures cut. No popup of the
  roster locks the page scroll (`Picker` passes `modal={false}`); a sheet is modal by design.
- file `Input` is the field box that chooses a file; its value is `PickedFile` (`{ name, size, type,
  blob(), src? }`), one descriptor on both platforms; `accept` is matched by `accepts` in
  `@fcalell/ui-core/file` on every file; a refused file never reaches `onChange` and is drawn in the
  field's own error line.
- Menu and Picker call `useQuietGuards` (`lib/guards.ts`), which takes `aria-hidden` off Base UI's
  focus-guard spans so an open popup audits clean while the Tab relay holds. Rejected:
  `tabindex="-1"` on the guards, a role on them, patching Base UI.

## The guide

ui-core's `guide/` holds what both platforms share: the screen recipe, the voice (the anchor app,
its pinned screens, the decisions and the floors) and the structure rules. A screen is judged by
standing its render beside the anchor screen and asking which looks better. ui-core is no plugin: `@fcalell/ui-core/manifest`
lists its pages and react-ui and native-ui each contribute them to `cliSlots.guide`, where the index
lists a page once. Each UI plugin adds `@fcalell/ui-core` to the consumer's own `dependencies`, so
the index's `node_modules/@fcalell/ui-core/guide/` paths resolve. A platform's rules for every
`.tsx` are its plugin's own page (react-ui's `guide/rules.md`).

## The showcase and Storybook

`apps/showcase` is a stack consumer. Its routes are the token page and the television page
(`/foundations`, `/tv`) and the places of one app composed from the built components, called
through typed stub procedures (`src/worker/routes/`) whose fixtures live in `src/app/fixtures.ts`.
The screens workbench (`stack screens dev`) draws every route in data, loading, error, empty and
not found, light and dark, at either density.

The roster is in Storybook. react-ui's `./showcase/cells`, `./showcase/frame` and
`./showcase/frames/*` export the frame data, the `Frame` wrapper and one drawer per component;
`.storybook/` imports them. A story is a component in one state drawing every cell through `Frame`,
light and dark side by side. Pointer and focus states stay in the roster and draw no story (the web
variants match only real pseudo-classes). The behaviour stories (`apps/showcase/behaviour/`) drive
the real component by keyboard in a play function, the paint stories draw a part loaded beside it
painted, the act stories press an act through its pending, failed and offline forms, `Motion
tuning` is the one place every timing is tuned, and the generated `RosterStress` module draws each
component's frames at desktop and at touch in a 320 px column with a 300-character word in every
text slot. The Storybook preview fails any story that trips a dev check. Nothing runs them
headlessly: `pnpm stories` opens them, and `stack screens test` is the one machine run.

The screens run's floors are one preview annotation (`@fcalell/plugin-screens/floors`) that visits
320 (touch set), 1280 (desktop set) and 1920 (where `wide` opens) and, per width, checks overflow and
runs the render walk (`@fcalell/plugin-screens/walk`). The walk reads the contract off the page
(`--spacing-*`, `--text-*`, `--radius-*` at the element's own density), never from a copy. Its
checks are pure functions, each with a canary in `behaviour/walk.stories.tsx`. What the contract
itself draws off a rule is a named exception in `EXCEPTIONS` (`walk.ts`) with its reason, never a
baseline; the standing one is a control, row or chip inside a card, popover or sheet, which keep
their roles' radii (a concentric inner radius would need the inner part to know its outer). The
alignment rules (`align-dead`, `align-centre`, `align-baseline`, `align-grid`) fail the run.
Behaviour stories call `walked()` at the end of a play function. Workbench stories carry tags per
state (`state:loading`) and checked global (`mode:dark`) so `--state` and `--mode` filter them.

A failing check is a finding in the component: it stays failing until the component is fixed,
never weakened or skipped. Nothing is excluded from axe beyond the document-structure rules and the
node buttons of a canvas that draws a run's path (a node off the path draws disabled ink by the
pattern's rule).

Storybook runs on `.stack/storybook.vite.config.ts`, written at start by
`writeStorybookConfig({ config, cwd })` from `@fcalell/plugin-screens/node`. The router plugin is not in it and the `server` block is blank of
`X-Frame-Options` and CSP `frame-ancestors` headers. Vite's `root` stays `.stack/`. Storybook runs
Vite in middleware mode (no `server.listen()`, so no dependency optimizer), so the host plugin
`storybookHost()` from `@fcalell/plugin-screens/vite` starts the optimizer. What stays in
`.storybook/` is the roster's own: `rosterPlugin`, the story globs and the generated modules.

The stories are generated: `.storybook/roster.ts` writes one CSF module per roster component into the
gitignored `apps/showcase/stories/` (Storybook's watcher does not see dot directories), each
importing only that component's drawer. The roster is read in a child process (Node caches ES
modules) and a Vite plugin rewrites changed modules, so a roster edit reaches the sidebar without a
restart.

A change reaches a story file only through its module graph, which `dist/` and generated files do
not join, so the generated screens config adds `workspaceTriggers(<app dir>)`
(`@fcalell/plugin-screens/node`) to Vitest's `forceRerunTriggers`: for each linked workspace
package, every file under `src/` that no source export serves. `stack screens test --changed <ref>`
diffs `<ref>...HEAD` plus uncommitted
edits.

## Enforcement

The render walk of `stack screens test` holds what needs a layout: heights, gaps, insets, radii,
clipping, type sizes, late fonts, tabular digits, a root's margin and same-name regions, read off
the page as the contract's numbers. Every check has a canary that fails on a bad case. The rules a
component's source must keep (`guide/structure.md`) are judged in review.

The shift check of `stack screens test` measures every Section heading waiting and then loaded at
320, 1280 and 1920 px and fails the screen when the first Section moves, a later one moves by other
than what the Sections above grew by, or a Section that stood is gone. The run also fails each read
in turn (one procedure's GETs answered with a server error) and runs the overflow, walk and console
floors at each width.

## Limits

- Native has no render harness: no check draws a native screen.
- A native Button's `count` is not in its accessible name.
- Base UI's Checkbox, Switch, Radio and OTP field look for a `<label>` after every render unless
  named by `aria-labelledby`, a `Field` label or a native button, which grows with the document;
  react-ui's Switch and its checkbox tick render a native `<button>` (`nativeButton`), and a disabled one
  carries `disabled` and `data-disabled`, never `aria-disabled`.
- The native toasts' layer stands over a box measured against the frame's root (`ToastRoom`,
  `ToastFrame`) and follows a growing input a layout late.
- An `Image`'s full view takes no pinch-zoom or pan.
- A product cannot draw in the platform font: `fonts.sans` unset is IBM Plex Sans.
- Table's `hyphens-auto` is unverified: the Playwright browsers ship no hyphenation
  dictionaries.
- Native Diff and Table name a `list`-role container (React Native has no table role).
