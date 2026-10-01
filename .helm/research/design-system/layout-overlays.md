# Layout: the overlay notes

The Stage 2 layout molecules' approved artboards (`plugins/react-ui/design/3*-*.dc.html`, boards 30
to 32, approved 2026-09-30) split into the ui-core cells and what each plugin composes over them.
This file is what the React step copies: for every part of every drawn frame and state, the
board's class string verbatim, the ui-core cell or constant it now draws, and the overlay, which is
the board string less the cell. Generated from the light column of each board; the dark column
spells the same strings. Each board is drawn at both densities; where the desktop and the touch
board draw a part differently, both strings stand under one heading, marked by density, and the
React step picks the structure under the `touch:` variant or by breakpoint.

## How to read an overlay

- The atoms note's rules hold (`atoms-overlays.md`, "How to read an overlay"): a rest overlay is
  unconditional; under another state the classes that differ from rest are that state's, spelled
  under its web variant; the web base `:focus-visible` rule draws the ring the board spells as
  `outline-2 outline-offset-2 outline-ring`.
- A part inside another pressable region rings inset: a place row, the sidebar switcher and a tab
  draw `outline-2 -outline-offset-2 outline-ring`, which is the `focus-visible:-outline-offset-2`
  overlay over the base rule. The Section's fold toggle rings at the offset (`outline-offset-2`).
- `PLACE_ROW` and `PLACE_TAB` carry their states as cells (the washes, the tab's ink), so a place
  row's hover is `PLACE_ROW {state: hover}`, not an overlay. The sidebar switcher is a place row:
  its hover is `PLACE_ROW {state: hover}` and its open state `PLACE_ROW {state: active}`. Every
  other layout part carries no state cell: the fold toggle's `bg-wash-hover` and `bg-wash-press`
  are `hover:` and `active:` overlays, desktop only for hover, and its chevron steps from
  `text-ink-meta` to `text-ink-body` under the same variants.
- A composed atom's string is its own matrix at the fit or act the molecule passes (`BUTTON`,
  `ICON_BUTTON`, `COUNT`), recorded here with that cell; its disabled, pending and pressed
  classes are the atom's own overlays (`atoms-overlays.md`), so an overlay here that names
  `bg-fill-disabled`, `bg-act-accent-pending` or `bg-wash-press` on an act is the atom's state.
- A board's frame is not a component's: the desktop `shell` part's `border border-edge
  rounded-card` and the touch `shell` and `screen-frame` parts' `border border-edge rounded-card`
  draw the viewport on the board. The Shell fills the viewport; the touch frame's `bg-surface` is
  the column's ground (`SHELL_COLUMN`).
- A skeleton line's fraction width (`w-1/4` to `w-3/4`) is structural, a web overlay, never a
  token.
- `divide-y divide-edge` (`GROUP`) is a child selector uniwind drops: native draws the hairline
  per row (`border-t` with the `edge` colour on every row after the first).
- `-mx-page` (the Columns' scroller) and `-ms-inside` (the fold toggle's wash past the title's
  start) are overlays: a region bleeds by a negative margin of the inset it pulls back.
- Positioning is an overlay: the desktop toasts' layer (`absolute inset-0 flex items-end
  justify-end pointer-events-none`, each toast `pointer-events-auto`), the touch act layer, the
  tab's count at `absolute top-0 left-full` beside the glyph's top corner (the tab holds its
  label ahead of its glyph in a `flex-col-reverse` column, so its name reads label then count), a menu anchored under
  its trigger (`absolute right-0 top-full pt-pair`, or `left-0 right-0` on the switcher).
- Context the layout molecules do not own, recorded on the boards for the composition: the banner
  in the Shell's slot and the toasts (the shared group's `Banner` and `Toast`); the switcher's and
  the more act's menus (`POPOVER` of `ROW {ground: list}` rows, the group label `TEXT {role: meta}
  + TEXT_STRONG {role: meta}`, the menu at `w-popover` under the more act; the shared group's
  `Menu`); the List's rows, the Group's setting, member and open rows (`ListRow`,
  `DefinitionRow`, the settings row); the Split's empty state (`EmptyState`) and the record's
  heading in the main (`flex items-center` over `TEXT {role: heading}`, the record's
  own); a form's fields (`FormField`), the toolbar's search (`Input {kind: search}`, `grow`), its
  chips (`Chip`) and a Sheet's or a Dialog's footer inset.
- The sidebar switcher's name is body at 500 (`TEXT {role: body} + TEXT_STRONG {role: body}`)
  with `text-left` on the desktop (a button's text centres by default).

## Shell

Board: `30-frames-desktop.dc.html` and `30-frames-touch.dc.html`.

### shell (the board's frame) · rest

- desktop: `flex overflow-hidden border border-edge rounded-card`
  - cell: none; overlay: `flex overflow-hidden border border-edge rounded-card`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- touch: `flex flex-col overflow-hidden border border-edge rounded-card bg-surface`
  - cell: `SHELL_COLUMN`; overlay: `flex flex-col overflow-hidden border border-edge rounded-card`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### sidebar · rest

- desktop: `relative flex flex-col shrink-0 w-sidebar bg-canvas border-r border-edge`
  - cell: `SHELL_SIDEBAR`; overlay: `relative flex flex-col shrink-0`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### switcher slot · rest

- desktop: `flex p-float`
  - cell: `SWITCHER_SLOT`; overlay: `flex`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### switcher · rest

- desktop: `flex items-center gap-inside w-full min-h-row px-control-x rounded-row`
  - cell: `PLACE_ROW {state: rest}`; overlay: `flex items-center w-full`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- touch: `flex items-center gap-inside min-w-0 min-h-target rounded-control`
  - cell: `SWITCHER`; overlay: `flex items-center min-w-0`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### switcher › name · rest

- desktop: `truncate grow text-body leading-body font-medium text-ink-body text-left`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate grow text-left`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- touch: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### switcher › glyph · rest

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: rest}`; overlay: `shrink-0`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- touch: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### switcher · hover

- desktop: `flex items-center gap-inside w-full min-h-row px-control-x rounded-row bg-wash-hover`
  - cell: `PLACE_ROW {state: hover}`; overlay: `flex items-center w-full`
  - under: hover

### switcher › name · hover

- desktop: `truncate grow text-body leading-body font-medium text-ink-body text-left`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate grow text-left`
  - under: hover

### switcher › glyph · hover

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: rest}`; overlay: `shrink-0`
  - under: hover

### switcher · focus

- desktop: `flex items-center gap-inside w-full min-h-row px-control-x rounded-row outline-2 -outline-offset-2 outline-ring`
  - cell: `PLACE_ROW {state: rest}`; overlay: `flex items-center w-full outline-2 -outline-offset-2 outline-ring`
  - under: focus

### switcher › name · focus

- desktop: `truncate grow text-body leading-body font-medium text-ink-body text-left`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate grow text-left`
  - under: focus

### switcher › glyph · focus

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: rest}`; overlay: `shrink-0`
  - under: focus

### switcher · open

- desktop: `flex items-center gap-inside w-full min-h-row px-control-x rounded-row bg-wash-press`
  - cell: `PLACE_ROW {state: active}`; overlay: `flex items-center w-full`
  - under: open · the menu on the trigger's edges (anchored on it, the trigger's width), the current workspace checked, the keyboard's row highlighted

### switcher › name · open

- desktop: `truncate grow text-body leading-body font-medium text-ink-body text-left`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate grow text-left`
  - under: open · the menu on the trigger's edges (anchored on it, the trigger's width), the current workspace checked, the keyboard's row highlighted

### switcher › glyph · open

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: rest}`; overlay: `shrink-0`
  - under: open · the menu on the trigger's edges (anchored on it, the trigger's width), the current workspace checked, the keyboard's row highlighted

### places · rest

- desktop: `flex flex-col gap-rows p-float`
  - cell: `SHELL_PLACES`; overlay: `flex flex-col`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### place · rest

- desktop: `flex items-center gap-inside min-h-row px-control-x rounded-row`
  - cell: `PLACE_ROW {state: rest}`; overlay: `flex items-center`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### place › glyph · rest

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: rest}`; overlay: `shrink-0`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### place › label · rest

- desktop: `truncate grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate grow`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### place · selected

- desktop: `flex items-center gap-inside min-h-row px-control-x rounded-row bg-wash-selected`
  - cell: `PLACE_ROW {state: selected}`; overlay: `flex items-center`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### place › glyph · selected

- desktop: `shrink-0 size-icon text-ink-body`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: selected}`; overlay: `shrink-0`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### place › label · selected

- desktop: `truncate grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate grow`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### place · hover

- desktop: `flex items-center gap-inside min-h-row px-control-x rounded-row bg-wash-hover`
  - cell: `PLACE_ROW {state: hover}`; overlay: `flex items-center`
  - under: hover · wash-hover

### place › glyph · hover

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: rest}`; overlay: `shrink-0`
  - under: hover · wash-hover

### place › label · hover

- desktop: `truncate grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate grow`
  - under: hover · wash-hover

### place · rest focus

- desktop: `flex items-center gap-inside min-h-row px-control-x rounded-row outline-2 -outline-offset-2 outline-ring`
  - cell: `PLACE_ROW {state: rest}`; overlay: `flex items-center outline-2 -outline-offset-2 outline-ring`
  - under: focus · the overlay ring over the cell, inset

### place › glyph · rest focus

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: rest}`; overlay: `shrink-0`
  - under: focus · the overlay ring over the cell, inset

### place › label · rest focus

- desktop: `truncate grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate grow`
  - under: focus · the overlay ring over the cell, inset

### place · active

- desktop: `flex items-center gap-inside min-h-row px-control-x rounded-row bg-wash-press`
  - cell: `PLACE_ROW {state: active}`; overlay: `flex items-center`
  - under: active (pressed) · wash-press

### place › glyph · active

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: rest}`; overlay: `shrink-0`
  - under: active (pressed) · wash-press

### place › label · active

- desktop: `truncate grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate grow`
  - under: active (pressed) · wash-press

### place · selected-hover

- desktop: `flex items-center gap-inside min-h-row px-control-x rounded-row bg-wash-selected-hover`
  - cell: `PLACE_ROW {state: selected-hover}`; overlay: `flex items-center`
  - under: selected, hover · wash-selected-hover

### place › glyph · selected-hover

- desktop: `shrink-0 size-icon text-ink-body`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: selected}`; overlay: `shrink-0`
  - under: selected, hover · wash-selected-hover

### place › label · selected-hover

- desktop: `truncate grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate grow`
  - under: selected, hover · wash-selected-hover

### place · selected focus

- desktop: `flex items-center gap-inside min-h-row px-control-x rounded-row bg-wash-selected outline-2 -outline-offset-2 outline-ring`
  - cell: `PLACE_ROW {state: selected}`; overlay: `flex items-center outline-2 -outline-offset-2 outline-ring`
  - under: selected, focus · the overlay on the selected cell

### place › glyph · selected focus

- desktop: `shrink-0 size-icon text-ink-body`
  - cell: `ICON {fit: body} + PLACE_ROW_GLYPH {state: selected}`; overlay: `shrink-0`
  - under: selected, focus · the overlay on the selected cell

### place › label · selected focus

- desktop: `truncate grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate grow`
  - under: selected, focus · the overlay on the selected cell

### count · rest

- both densities: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip px-inside rounded-full bg-fill-neutral`
  - cell: `COUNT`; overlay: `inline-flex items-center justify-center shrink-0`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### column · rest

- desktop: `relative flex flex-col min-w-0 grow bg-surface`
  - cell: `SHELL_COLUMN`; overlay: `relative flex flex-col min-w-0 grow`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### toasts · rest

- desktop: `absolute inset-0 flex items-end justify-end p-page pointer-events-none`
  - cell: `TOASTS`; overlay: `absolute inset-0 flex items-end justify-end pointer-events-none`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### tab bar · rest

- touch: `flex px-float bg-canvas border-t border-edge pb-safe`
  - cell: `SHELL_TAB_BAR`; overlay: `flex pb-safe`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### tab · idle

- touch: `flex flex-col-reverse items-center justify-center gap-rows min-h-row rounded-row text-ink-meta min-w-0 grow basis-0`
  - cell: `PLACE_TAB {state: idle}`; overlay: `flex flex-col-reverse items-center justify-center min-w-0 grow basis-0`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### tab › label · idle

- touch: `max-w-full truncate text-caption leading-caption tracking-caption font-normal text-ink-meta`
  - cell: `PLACE_TAB_LABEL {state: idle}`; overlay: `max-w-full truncate`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### tab · selected

- touch: `flex flex-col-reverse items-center justify-center gap-rows min-h-row rounded-row text-ink-body min-w-0 grow basis-0`
  - cell: `PLACE_TAB {state: selected}`; overlay: `flex flex-col-reverse items-center justify-center min-w-0 grow basis-0`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### tab › label · selected

- touch: `max-w-full truncate text-caption leading-caption tracking-caption font-medium text-ink-body`
  - cell: `PLACE_TAB_LABEL {state: selected}`; overlay: `max-w-full truncate`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### tab · idle focus

- touch: `flex flex-col-reverse items-center justify-center gap-rows min-h-row rounded-row text-ink-meta min-w-0 grow basis-0 outline-2 -outline-offset-2 outline-ring`
  - cell: `PLACE_TAB {state: idle}`; overlay: `flex flex-col-reverse items-center justify-center min-w-0 grow basis-0 outline-2 -outline-offset-2 outline-ring`
  - under: focus · the overlay ring, inset (a keyboard on a tablet)

### tab › label · idle focus

- touch: `max-w-full truncate text-caption leading-caption tracking-caption font-normal text-ink-meta`
  - cell: `PLACE_TAB_LABEL {state: idle}`; overlay: `max-w-full truncate`
  - under: focus · the overlay ring, inset (a keyboard on a tablet)

### tab glyph · rest

- touch: `relative flex`
  - cell: none; overlay: `relative flex`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

## Place

Board: `30-frames-desktop.dc.html` and `30-frames-touch.dc.html`.

### place · rest

- desktop: `flex flex-col grow min-h-0`
  - cell: none; overlay: `flex flex-col grow min-h-0`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- touch: `flex flex-col grow`
  - cell: none; overlay: `flex flex-col grow`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### place · bleed

- both densities: `flex flex-col grow`
  - cell: none; overlay: `flex flex-col grow`
  - under: Place with bleed · the body edge to edge: no inset, no measure; its child (a Code log tail, context) scrolls itself

### head · rest

- desktop: `flex items-center gap-acts min-h-strip px-page border-b border-edge`
  - cell: `PAGE_STRIP`; overlay: `flex items-center`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- touch: `flex flex-col px-page`
  - cell: `PAGE_HEAD`; overlay: `flex flex-col`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### title · rest

- both densities: `min-w-0 grow text-title leading-title tracking-title font-semibold text-ink-body`
  - cell: `TEXT {role: title}`; overlay: `min-w-0 grow`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### action · rest

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control text-ink-meta`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### action · open

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact bg-wash-press text-ink-body`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 bg-wash-press text-ink-body`
  - under: more open · the overflow's MenuItems, the destructive one last in danger

### more · rest

- desktop: `relative flex`
  - cell: none; overlay: `relative flex`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column

### act · rest

- desktop: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- touch: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent text-on-act-accent pointer-events-auto`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center pointer-events-auto`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### act · loading

- desktop: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
  - under: act loading · the Place's act pending, its box kept

### body · rest

- desktop: `flex flex-col gap-sections p-page`
  - cell: `PAGE_BODY`; overlay: `flex flex-col`
  - under: Shell holding a Place · the sidebar (the switcher slot, the places, one selected, a count), the banner slot over the column, the Place's strip (title, two actions, more, the one act), its children (List rows lifted from board 31, context), a toast where the Shell stands them, bottom right of the column
- desktop: `flex flex-col`
  - cell: none; overlay: `flex flex-col`
  - under: Place with bleed · the body edge to edge: no inset, no measure; its child (a Code log tail, context) scrolls itself
- touch: `flex flex-col gap-sections p-page`
  - cell: `PAGE_BODY`; overlay: `flex flex-col`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five
- touch: `flex flex-col`
  - cell: none; overlay: `flex flex-col`
  - under: Place with bleed · the body edge to edge under the title, no inset of its own: whatever stands first in it carries its own top inset (the board's `pt-page` moved to the list alone; the record's cell already insets it)

### top bar · rest

- touch: `flex items-center gap-acts min-h-strip`
  - cell: `PAGE_TOP_BAR`; overlay: `flex items-center`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### body wrap · rest

- touch: `relative flex flex-col grow`
  - cell: none; overlay: `relative flex flex-col grow`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### act room · rest

- touch: `shrink-0 min-h-control`
  - cell: `FLOATING_ACT_ROOM`; overlay: `shrink-0`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

### act layer · rest

- touch: `absolute inset-0 flex flex-col items-center justify-end p-page pointer-events-none`
  - cell: `FLOATING_ACT`; overlay: `absolute inset-0 flex flex-col items-center justify-end pointer-events-none`
  - under: Shell holding a Place under tablet · the banner slot, the top bar (the switcher, one action, more; touch refreshes by the pull, so no Refresh act), the title on its own line, the one act floating over the body's end, the tab bar: four places and More, since eight places exceed five

## Screen

Board: `30-frames-desktop.dc.html` and `30-frames-touch.dc.html`.

### screen · rest

- desktop: `flex flex-col grow`
  - cell: none; overlay: `flex flex-col grow`
  - under: Screen in the column · back, title, actions, more; no act, the sidebar keeps its place selected; the property rows are board 31's (context)
- touch: `flex flex-col`
  - cell: none; overlay: `flex flex-col`
  - under: Screen · pushed over the place: back, actions, more, the title under the bar; it covers the tab bar; a toast stands at its foot, bounded by the column

### head · rest

- desktop: `flex items-center gap-acts min-h-strip px-page border-b border-edge`
  - cell: `PAGE_STRIP`; overlay: `flex items-center`
  - under: Screen in the column · back, title, actions, more; no act, the sidebar keeps its place selected; the property rows are board 31's (context)
- touch: `flex flex-col px-page`
  - cell: `PAGE_HEAD`; overlay: `flex flex-col`
  - under: Screen · pushed over the place: back, actions, more, the title under the bar; it covers the tab bar; a toast stands at its foot, bounded by the column

### action · rest

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Screen in the column · back, title, actions, more; no act, the sidebar keeps its place selected; the property rows are board 31's (context)
- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control text-ink-meta`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Screen · pushed over the place: back, actions, more, the title under the bar; it covers the tab bar; a toast stands at its foot, bounded by the column

### action · open

- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control bg-wash-press text-ink-body`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0 bg-wash-press text-ink-body`
  - under: Screen, more open · the overflow's MenuItems, the destructive one last in danger

### title · rest

- both densities: `min-w-0 grow text-title leading-title tracking-title font-semibold text-ink-body`
  - cell: `TEXT {role: title}`; overlay: `min-w-0 grow`
  - under: Screen in the column · back, title, actions, more; no act, the sidebar keeps its place selected; the property rows are board 31's (context)

### more · rest

- both densities: `relative flex`
  - cell: none; overlay: `relative flex`
  - under: Screen in the column · back, title, actions, more; no act, the sidebar keeps its place selected; the property rows are board 31's (context)

### body · rest

- both densities: `flex flex-col gap-sections p-page`
  - cell: `PAGE_BODY`; overlay: `flex flex-col`
  - under: Screen in the column · back, title, actions, more; no act, the sidebar keeps its place selected; the property rows are board 31's (context)

### screen (the board's frame) · rest

- touch: `relative flex flex-col overflow-hidden border border-edge rounded-card bg-surface`
  - cell: `SHELL_COLUMN`; overlay: `relative flex flex-col overflow-hidden border border-edge rounded-card`
  - under: Screen · pushed over the place: back, actions, more, the title under the bar; it covers the tab bar; a toast stands at its foot, bounded by the column

### top bar · rest

- touch: `relative flex items-center gap-acts min-h-strip`
  - cell: `PAGE_TOP_BAR`; overlay: `relative flex items-center`
  - under: Screen · pushed over the place: back, actions, more, the title under the bar; it covers the tab bar; a toast stands at its foot, bounded by the column

### toasts · rest

- touch: `flex flex-col items-center p-page`
  - cell: `TOASTS`; overlay: `flex flex-col items-center`
  - under: Screen · pushed over the place: back, actions, more, the title under the bar; it covers the tab bar; a toast stands at its foot, bounded by the column

## Split

Board: `31-structure-desktop.dc.html` and `31-structure-touch.dc.html`.

### Details act · rest

- desktop: `relative inline-flex items-center justify-center rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### split · rest

- both densities: `flex min-w-0 grow`
  - cell: none; overlay: `flex min-w-0 grow`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### split · empty

- desktop: `flex min-w-0 grow`
  - cell: none; overlay: `flex min-w-0 grow`
  - under: Split · empty: nothing selected, the main holds the empty state; no pane

### list · rest

- desktop: `flex flex-col shrink-0 w-list py-inside px-page border-r border-edge`
  - cell: `SPLIT_LIST`; overlay: `flex flex-col shrink-0`, below `tablet` of its page `page-max-tablet:w-full page-max-tablet:pt-page page-max-tablet:pb-0 page-max-tablet:border-r-0` (the list alone, still `px-page`, which its bleeding rows meet the page title across), `page-max-tablet:hidden` with a record open
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)
- touch: `flex flex-col`
  - cell: none; overlay: `flex flex-col`; native `pt-page px-page` (the list alone, its bleeding rows meeting the title)
  - under: Split · rest and empty below tablet: one region at a time, the list is the screen, so the empty main is never drawn; a row opens the record as a pushed Screen

### list's List · rest

- both densities: `flex flex-col gap-rows -mx-control-x`
  - cell: `LIST`; overlay: `flex flex-col` (the list bleeds by `control-x`, so its rows' leading meets the title over it)
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### main · rest

- desktop: `flex flex-col gap-sections min-w-0 grow p-page`
  - cell: `SPLIT_MAIN {state: rest}`; overlay: `flex flex-col min-w-0 grow`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### main · rest, touch

- touch: `flex flex-col gap-sections min-w-0 grow p-page`
  - cell: `SPLIT_MAIN {state: rest}`; overlay: `flex flex-col min-w-0 grow`
  - under: Split · a record open below `tablet`, standing first in the bleeding body, so its own cell's inset puts it one page inset under the title or under a Toolbar's hairline

### main · empty

- desktop: `flex grow min-w-0 items-center justify-center p-page`
  - cell: `SPLIT_MAIN {state: empty}`; overlay: `flex grow min-w-0 items-center justify-center`
  - under: Split · empty: nothing selected, the main holds the empty state; no pane

### pane · rest

- desktop: `flex flex-col gap-sections shrink-0 w-pane p-page border-l border-edge`
  - cell: `SPLIT_PANE`; overlay: `flex flex-col shrink-0`
  - under: Split · rest at wide (1440 and up): list, main and pane beside it, drawn at the board's 1232, so the main here is 550; at a 1440 viewport beside the 240 sidebar the main is ~518 (the frame is the Place's edge, its strip context)

## Section

Board: `31-structure-desktop.dc.html` and `31-structure-touch.dc.html`.

### section · rest

- both densities: `flex flex-col gap-pair min-w-0`
  - cell: `SECTION {in: page}`; overlay: `flex flex-col min-w-0`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### head · rest

- both densities: `flex flex-col gap-pair`
  - cell: `SECTION_HEAD`; overlay: `flex flex-col`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### head row · rest

- both densities: `flex items-center gap-fields`
  - cell: `SECTION_HEAD_ROW`; overlay: `flex items-center`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### title block · rest

- both densities: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### title block › title line · rest

- both densities: `flex items-center gap-inside min-w-0`
  - cell: `SECTION_TITLE`; overlay: `flex items-center min-w-0`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)
- both densities: `flex min-w-0`
  - cell: none; overlay: `flex min-w-0`
  - under: Split · rest at wide (1440 and up): list, main and pane beside it, drawn at the board's 1232, so the main here is 550; at a 1440 viewport beside the 240 sidebar the main is ~518 (the frame is the Place's edge, its strip context)

### title block › title · rest

- both densities: `truncate text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: `truncate`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### title block › description · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: Section · rest: title, count, description and act over a Group

### count · rest

- both densities: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip px-inside rounded-full bg-fill-neutral`
  - cell: `COUNT`; overlay: `inline-flex items-center justify-center shrink-0`
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### fold toggle · rest

- both densities: `flex items-center gap-inside grow min-w-0 -ms-inside px-inside rounded-row text-start`
  - cell: `SECTION_TOGGLE`; overlay: `flex items-center grow min-w-0 -ms-inside text-start`
  - under: Split · rest at wide (1440 and up): list, main and pane beside it, drawn at the board's 1232, so the main here is 550; at a 1440 viewport beside the 240 sidebar the main is ~518 (the frame is the Place's edge, its strip context)

### fold toggle › title · rest

- both densities: `truncate text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: `truncate`
  - under: Split · rest at wide (1440 and up): list, main and pane beside it, drawn at the board's 1232, so the main here is 550; at a 1440 viewport beside the 240 sidebar the main is ~518 (the frame is the Place's edge, its strip context)

### fold toggle › chevron · rest

- both densities: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: Split · rest at wide (1440 and up): list, main and pane beside it, drawn at the board's 1232, so the main here is 550; at a 1440 viewport beside the 240 sidebar the main is ~518 (the frame is the Place's edge, its strip context)

### fold toggle · hover

- desktop: `flex items-center gap-inside grow min-w-0 -ms-inside px-inside rounded-row text-start bg-wash-hover`
  - cell: `SECTION_TOGGLE`; overlay: `flex items-center grow min-w-0 -ms-inside text-start bg-wash-hover`
  - under: Section · the fold toggle hover

### fold toggle › title · hover

- desktop: `truncate text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: `truncate`
  - under: Section · the fold toggle hover

### fold toggle › chevron · hover

- desktop: `shrink-0 size-icon text-ink-body`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-body`
  - under: Section · the fold toggle hover

### fold toggle · focus

- both densities: `flex items-center gap-inside grow min-w-0 -ms-inside px-inside rounded-row text-start outline-2 outline-offset-2 outline-ring`
  - cell: `SECTION_TOGGLE`; overlay: `flex items-center grow min-w-0 -ms-inside text-start outline-2 outline-offset-2 outline-ring`
  - under: Section · the fold toggle focus

### fold toggle › title · focus

- both densities: `truncate text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: `truncate`
  - under: Section · the fold toggle focus

### fold toggle › chevron · focus

- both densities: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: Section · the fold toggle focus

### fold toggle · active

- both densities: `flex items-center gap-inside grow min-w-0 -ms-inside px-inside rounded-row text-start bg-wash-press`
  - cell: `SECTION_TOGGLE`; overlay: `flex items-center grow min-w-0 -ms-inside text-start bg-wash-press`
  - under: Section · the fold toggle active (pressed)

### fold toggle › title · active

- both densities: `truncate text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: `truncate`
  - under: Section · the fold toggle active (pressed)

### fold toggle › chevron · active

- both densities: `shrink-0 size-icon text-ink-body`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-body`
  - under: Section · the fold toggle active (pressed)

### act slot · rest

- both densities: `flex items-center shrink-0`
  - cell: none; overlay: `flex items-center shrink-0`
  - under: Section · rest: title, count, description and act over a Group

### act · rest

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
  - under: Section · rest: title, count, description and act over a Group
- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-disabled`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
  - under: Section · disabled: the act blocked

### reason · rest

- both densities: `text-end text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `text-end`
  - under: Section · disabled: the act blocked

### section · in a Form

- both densities: `flex flex-col gap-fields min-w-0`
  - cell: `SECTION {in: form}`; overlay: `flex flex-col min-w-0`
  - under: board 32's settings form: a Section inside a Form, chosen by the Form through context, never a prop

### body · rest

- both densities: `flex flex-col gap-pair` on a page, `flex flex-col gap-fields` in a Form
  - cell: `SECTION {in}`, the section's own; overlay: `flex flex-col`
  - under: every Section: the body stacks its children at the section's rhythm (a column's cards at `gap-pair`, board 31; a form section's fields at `gap-fields`, board 32). The body stays mounted while folded, `hidden`, so the toggle's `aria-controls` resolves

### count (loading) · rest

- both densities: `inline-flex shrink-0 min-h-chip min-w-chip rounded-full bg-skeleton`
  - cell: `SKELETON {kind: count}`; overlay: `inline-flex shrink-0`
  - under: Section · loading: the title and act stay, the count and the body wait

A loading Section hands its loading down: a Group or a List in its body draws its own skeleton rows (Group · loading, List · loading). The Section sets `aria-busy` once; a Group or a List drawing its skeleton on the Section's word sets none, and sets its own only when its own `loading` is set. The fields below are the Section's own, drawn over a body that holds neither (a body of fields): three, at the section's rhythm (`gap-fields` in a Form).

### skeleton field · rest

- both densities: `flex flex-col gap-pair`
  - cell: `SKELETON_ROW {kind: field}`; overlay: `flex flex-col`
  - under: Section · loading over a body of fields: each field waits as its label line over its box, at the label-to-field gap

### skeleton field › label · rest

- both densities: `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: Section · loading over a body of fields

### skeleton field › box · rest

- both densities: `min-h-field rounded-control bg-skeleton`
  - cell: `SKELETON {kind: field}`; overlay: none
  - under: Section · loading over a body of fields: the box at the field's height (38 desktop, 48 touch)

### icon act · rest

- both densities: `relative inline-flex items-center justify-center rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center`
  - under: Columns · rest at the Shell's content width (1040, the Place's inset around it): three whole columns and the fourth at the edge, the row scrolling sideways; each column a Section whose act is an icon act; cards on the Place's ground, no well (sidebar, strip and cards are context)

## Group

Board: `31-structure-desktop.dc.html` and `31-structure-touch.dc.html`.

### group · rest

- both densities: `flex flex-col overflow-hidden rounded-card border border-edge bg-surface divide-y divide-edge`
  - cell: `GROUP`; overlay: `flex flex-col overflow-hidden`
  - under: Section · rest: title, count, description and act over a Group

### skeleton row · rest

- both densities: `flex items-center gap-fields min-h-row-setting px-card py-pair`
  - cell: `SKELETON_ROW {kind: setting}`; overlay: `flex items-center`
  - under: Group · loading: skeleton rows at the setting row's height

### skeleton row › lines · rest

- both densities: `flex grow min-w-0 flex-col gap-pair`
  - cell: `SKELETON_LINES`; overlay: `flex grow min-w-0 flex-col`
  - under: Group · loading: skeleton rows at the setting row's height

### skeleton row › switch · rest

- both densities: `shrink-0 w-switch-w h-switch-h rounded-full bg-skeleton`
  - cell: `SKELETON {kind: switch}`; overlay: `shrink-0`
  - under: Group · loading: skeleton rows at the setting row's height

### skeleton line · rest

- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: Group · loading: skeleton rows at the setting row's height
- both densities: `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: Group · loading: skeleton rows at the setting row's height
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: Group · loading: skeleton rows at the setting row's height

## List

Board: `31-structure-desktop.dc.html` and `31-structure-touch.dc.html`.

### list · rest

- both densities: `flex flex-col gap-rows -mx-control-x`
  - cell: `LIST`; overlay: `flex flex-col` (the list bleeds by `control-x`, so its rows' leading meets the title over it)
  - under: Split · rest below wide, at the Shell's content width (1280 − 240 sidebar = 1040): list and main, the first record selected; the pane opens as a sheet below wide, from the Details act in the Place's strip (sidebar and strip are context)

### skeleton row · rest

- both densities: `flex items-center gap-inside min-h-row-2 px-control-x`
  - cell: `SKELETON_ROW {kind: two-line}`; overlay: `flex items-center`
  - under: List · loading: skeleton rows at the two-line row's height

### skeleton row › avatar · rest

- both densities: `shrink-0 size-avatar rounded-full bg-skeleton`
  - cell: `SKELETON {kind: avatar}`; overlay: `shrink-0`
  - under: List · loading: skeleton rows at the two-line row's height

### skeleton row › lines · rest

- both densities: `flex flex-col grow min-w-0 gap-pair`
  - cell: `SKELETON_LINES`; overlay: `flex flex-col grow min-w-0`
  - under: List · loading: skeleton rows at the two-line row's height

### skeleton line · rest

- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: List · loading: skeleton rows at the two-line row's height
- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: List · loading: skeleton rows at the two-line row's height
- both densities: `h-skeleton w-2/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-2/3`
  - under: List · loading: skeleton rows at the two-line row's height
- both densities: `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: List · loading: skeleton rows at the two-line row's height
- both densities: `h-skeleton w-3/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-3/4`
  - under: List · loading: skeleton rows at the two-line row's height

## Columns

Board: `31-structure-desktop.dc.html` and `31-structure-touch.dc.html`.

### columns · rest

- both densities: `flex items-start gap-fields overflow-x-auto -mx-page px-page`
  - cell: `COLUMNS`; overlay: `flex items-start overflow-x-auto -mx-page`
  - under: Columns · rest at the Shell's content width (1040, the Place's inset around it): three whole columns and the fourth at the edge, the row scrolling sideways; each column a Section whose act is an icon act; cards on the Place's ground, no well (sidebar, strip and cards are context)

### column · rest

- both densities: `flex flex-col w-column shrink-0`
  - cell: `COLUMN`; overlay: `flex flex-col shrink-0`
  - under: Columns · rest at the Shell's content width (1040, the Place's inset around it): three whole columns and the fourth at the edge, the row scrolling sideways; each column a Section whose act is an icon act; cards on the Place's ground, no well (sidebar, strip and cards are context)

## Form

Board: `32-forms-bars-desktop.dc.html` and `32-forms-bars-touch.dc.html`.

### form · rest

- both densities: `flex flex-col gap-sections`
  - cell: `FORM {holds: sections}`; overlay: `flex flex-col`
  - under: rest · a settings form: sections at gap-sections, fields at gap-fields; its ActionBar closes the whole form under a hairline across it (border-t border-edge pt-fields): Discard, then the one filled act
- both densities: `flex flex-col gap-fields`
  - cell: `FORM {holds: fields}`; overlay: `flex flex-col`
  - under: rest · nothing typed yet (content): the submit is the ActionBar's disabled act; the bar's reason line sits under the acts, end-aligned; hidden (announced) until the submit is pressed or the form touched, drawn here

### section · rest

- both densities: `flex flex-col gap-fields`
  - cell: `FORM {holds: fields}`; overlay: `flex flex-col`
  - under: rest · a settings form: sections at gap-sections, fields at gap-fields; its ActionBar closes the whole form under a hairline across it (border-t border-edge pt-fields): Discard, then the one filled act

### foot · rest

- both densities: `border-t border-edge pt-fields`
  - cell: `FORM_FOOT`; overlay: none
  - under: rest · a settings form: sections at gap-sections, fields at gap-fields; its ActionBar closes the whole form under a hairline across it (border-t border-edge pt-fields): Discard, then the one filled act

## Toolbar

Board: `32-forms-bars-desktop.dc.html` and `32-forms-bars-touch.dc.html`.

### toolbar · rest

- both densities: `flex flex-col gap-pair px-page py-inside border-b border-edge`
  - cell: `TOOLBAR`; overlay: `flex flex-col`
  - under: rest · one row: the search grows (Input kind=search, control-compact), Filter and Sort at fit=bar with their glyphs, Display an IconButton; no filled act: the create act (New project) is the Place's, in the header (board 30); gap-acts (8) between the search and the acts and between the acts; py-inside and a hairline under the strip; the list under it is context

### controls · rest

- both densities: `flex flex-wrap items-center gap-acts`
  - cell: `TOOLBAR_ROW`; overlay: `flex flex-wrap items-center`
  - under: rest · one row: the search grows (Input kind=search, control-compact), Filter and Sort at fit=bar with their glyphs, Display an IconButton; no filled act: the create act (New project) is the Place's, in the header (board 30); gap-acts (8) between the search and the acts and between the acts; py-inside and a hairline under the strip; the list under it is context

### search slot · rest

- both densities: `flex grow min-w-0 touch:w-full`
  - cell: none; overlay: `flex grow min-w-0 touch:w-full`
  - under: rest · one row: the search grows (Input kind=search, control-compact), Filter and Sort at fit=bar with their glyphs, Display an IconButton; no filled act: the create act (New project) is the Place's, in the header (board 30); gap-acts (8) between the search and the acts and between the acts; py-inside and a hairline under the strip; the list under it is context

### acts · rest

- both densities: `flex flex-wrap items-center gap-acts`
  - cell: `TOOLBAR_ROW`; overlay: `flex flex-wrap items-center`
  - under: rest · one row: the search grows (Input kind=search, control-compact), Filter and Sort at fit=bar with their glyphs, Display an IconButton; no filled act: the create act (New project) is the Place's, in the header (board 30); gap-acts (8) between the search and the acts and between the acts; py-inside and a hairline under the strip; the list under it is context

### chips · rest

- both densities: `flex flex-wrap items-center gap-pair`
  - cell: `TOOLBAR_CHIPS`; overlay: `flex flex-wrap items-center`
  - under: rest · applied filters (content): a row of removable neutral chips under the controls at gap-pair, a band of its own under the controls band

## ActionBar

Board: `32-forms-bars-desktop.dc.html` and `32-forms-bars-touch.dc.html`.

### bar · fit=end

- both densities: `flex flex-col items-end gap-pair touch:items-stretch`
  - cell: `ACTION_BAR {fit: end}`; overlay: `flex flex-col items-end touch:items-stretch`
  - under: rest · a settings form: sections at gap-sections, fields at gap-fields; its ActionBar closes the whole form under a hairline across it (border-t border-edge pt-fields): Discard, then the one filled act

### bar · fit=full

- both densities: `flex flex-col gap-pair`
  - cell: `ACTION_BAR {fit: full}`; overlay: `flex flex-col`
  - under: rest · a login form: one field, then the ActionBar's full form: one act at the field's height across the column

### acts · rest

On touch the acts are in the tree filled first (the ActionBar orders them per density), so Tab follows the drawn order; no reverse class.

- both densities: `flex items-center justify-end gap-acts touch:flex-col touch:items-stretch`
  - cell: `ACTION_BAR_ACTS`; overlay: `flex items-center justify-end touch:flex-col touch:items-stretch`
  - under: rest · a settings form: sections at gap-sections, fields at gap-fields; its ActionBar closes the whole form under a hairline across it (border-t border-edge pt-fields): Discard, then the one filled act
- both densities: `grid grid-flow-col auto-cols-fr gap-acts touch:flex touch:flex-col`
  - cell: `ACTION_BAR_ACTS`; overlay: `grid grid-flow-col auto-cols-fr touch:flex touch:flex-col`
  - under: rest · a login form: one field, then the ActionBar's full form: one act at the field's height across the column

### act · rest fit=body act=secondary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
  - under: rest · a settings form: sections at gap-sections, fields at gap-fields; its ActionBar closes the whole form under a hairline across it (border-t border-edge pt-fields): Discard, then the one filled act

### act · rest fit=body act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
  - under: rest · a sheet's footer (its hairline split and inset are the sheet's, context): Cancel, then the one filled act last, end-aligned, gap-acts (8)

### act · blocked fit=body act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
  - under: disabled · Save blocked while the description is empty: the reason is the bar's own line under the acts, end-aligned, so the acts keep their places; hidden (announced) until pressed or the sheet touched, drawn here

### act · loading fit=body act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
  - under: loading · Save pending: its box kept, the spinner for its label; Cancel live

### act · rest fit=body act=danger

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center`
  - under: rest · a confirm's footer (the Dialog's, context): the destructive act is its one filled act (act=danger), after Cancel

### act · blocked fit=body act=danger

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
  - under: disabled · the confirm until the name is typed: Delete blocked with the confirmation's reason

### submit · rest fit=body act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
  - under: rest · a settings form: sections at gap-sections, fields at gap-fields; its ActionBar closes the whole form under a hairline across it (border-t border-edge pt-fields): Discard, then the one filled act

### submit · blocked fit=body act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
  - under: rest · nothing typed yet (content): the submit is the ActionBar's disabled act; the bar's reason line sits under the acts, end-aligned; hidden (announced) until the submit is pressed or the form touched, drawn here

### submit · loading fit=body act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
  - under: loading · submitting: the submit pending (its box kept, the spinner for its label); Cancel and the fields as typed

### submit · rest fit=field act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: field}`; overlay: `relative inline-flex items-center justify-center`
  - under: rest · a login form: one field, then the ActionBar's full form: one act at the field's height across the column

### submit · blocked fit=field act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: field}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
  - under: rest · login, nothing typed (content): Continue disabled; the bar's reason line starts under the full-width act

### submit · loading fit=field act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: field}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
  - under: loading · login submitting: Continue pending across the column

### reason · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: rest · nothing typed yet (content): the submit is the ActionBar's disabled act; the bar's reason line sits under the acts, end-aligned; hidden (announced) until the submit is pressed or the form touched, drawn here
