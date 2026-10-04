# Shared molecules: the overlay notes

The Stage 2 shared molecules' approved artboards (boards 40 to 43, approved 2026-10-01; the files
are in git history at `d777de6`) split into the ui-core cells and what each plugin composes over them.
This file is what the React step copies: for every part of every drawn frame and state, the
board's class string verbatim, the ui-core cell or constant it now draws, and the overlay, which is
the board string less the cell. Generated from the light column of each board; the dark column
spells the same strings. Each board is drawn at both densities; where the desktop and the touch
board draw a part differently, both strings stand under one heading, marked by density. Board 40
adds a tablet file (768, touch density): it spells the touch strings for every shared part, so it
has no entry of its own. States that draw a part the same way share one heading.

## How to read an overlay

- The atoms note's and the layout note's rules hold (`atoms-overlays.md` and `layout-overlays.md`,
  "How to read an overlay"): a rest overlay is unconditional, another state's classes are that
  state's web variant, the base `:focus-visible` rule draws the ring the board spells, a part
  inside a pressable region rings inset (`-outline-offset-2`), a composed atom's string is its
  own cell at the fit or act the molecule passes, a glyph draws the ink of its place (an overlay
  here, a tone through `Ink` on native), and a skeleton bar's fraction width is structural.
- A composed atom's label on these boards is its own board's string (10, 12), which predates the
  label's ink (`BUTTON_LABEL`, `CHIP_LABEL`): the atom draws its cell whole, so a label line here
  names the cell and no overlay.
- A row draws its states as cells (`ROW {state}`), as `PLACE_ROW` does: hover is `highlighted`,
  press `pressed`. A list's or a group's chosen row is `selected` (and `selected-hover` under the
  pointer); a Picker's or an OptionList's chosen option is ticked or checked, never washed, so its
  row state is the pointer's alone. A disabled row is `rest` with its inks swapped to
  `text-ink-disabled`.
- Popover surfaces: a Menu's and a Picker's popover is `POPOVER` (raised, `edge-raised`, the
  float shadow, the float inset) at the popover's width (`MENU {form: popover}`,
  `PICKER_POPOVER`), anchored under its trigger as the layout note's menus are (`absolute
  right-0 top-full pt-pair`; Base UI's positioner on the web). Sheet surfaces: `SHEET` on touch,
  `SHEET_SIDE` and `SHEET_CENTERED` on the desktop, all raised over `SCRIM`; inside a raised
  ground `--color-edge` re-points to `edge-raised` (the web on the ground's fill class, native
  through `RaisedGround`), so the head's and the foot's `border-edge` draw the raised hairline
  there. The sheet's layer (`absolute inset-0 flex flex-col justify-end` on touch, the side
  sheet's `max-w-full`) is structure, and the bottom inset adds `pb-safe` on a phone.
- A row's pick pulls back by its own padding on the side that meets the row's edge: the
  Picker's row fit is `-me-inside` over `PILL_ACT`, so its value ends where a plain trailing
  value does and the row's gap stands before it; it centres in the row (`self-center`) as the
  more act does. A Status that opens in a facts line pulls back on both sides, `-mx-inside`, so
  its dot and word sit where a plain fact's would.
- The Picker's row trigger carries its ink for the chevron as currentColor (`PICKER {fit: row}`,
  `text-ink-meta`); open, the trigger takes the press wash and the body ink (`bg-wash-press
  text-ink-body`), an overlay under Base UI's `data-popup-open:`. A field-fit trigger's open
  state keeps its ring under the same attribute, as the `Select`'s does.
- Base UI states on the web: an option's or a menu item's `data-highlighted` picks `ROW {state:
  highlighted}`, a pressed one `pressed`; a menu item `data-disabled` (a blocked act) drops its
  pointer states; a trigger's `data-popup-open` is its open overlay. Native reads the same states
  off its press and its own open flag.
- A box beside a line of text stands in that line's box (`LINE_BOX {role}`): a checkbox on its
  label's first line (`text-body leading-body` around a zero-width space on the web), an
  ItemHeader's loading bar in the line its text fills (`h-lh`, the web's line-height box; native
  a box at the role's line height). `h-lh` and the zero-width space are structure.
- Where a molecule stands decides a form the board names by `data-*`: an EmptyState draws `in`
  a page (its column centred in the body), in a Section (inside `EMPTY_FRAME`, its title at body
  500, its act the hairline Button) or on a first run (its title at the title role, its acts
  stacked across the column); a FormField by what it holds (`FORM_FIELD {holds}`); a Sheet by
  its form (side, centred, bottom).
- Context the shared molecules do not own, recorded on the boards for the composition: the
  Place, Split, List, Group, Section, Form, Toolbar and ActionBar around them (board 30 to 32);
  a FormField's control, which is its children (the atoms note); the toasts' layer (`TOASTS`,
  the Shell's or the Screen's); the Sheet's foot `ActionBar`; a Split pane's property rows;
  board 41's touch pick sheet, a stand-in drawn before the Sheet's cells, whose options (`ROW
  {ground: group}`) are the Picker's and whose sheet is the Sheet's (board 42).
- A checkbox in a FormField's checkbox form or an OptionList row is the built Checkbox with its label row as its target: the row sets `LabelTarget`, and the Checkbox drops its `size-target` hit (the atoms note), so the `box line` strings below hold the box itself. A switch at a FormField's label end keeps its own target-sized hit, as board 41 draws it.
- The Menu's blocked item draws `min-h-row-2` without `ROW {lines: two}`'s `py-rows`, where
  ListRow, Picker and OptionList draw the cell whole; its entry says so.

## ListRow

Board 40.

A row has no disabled state (fcalell, 2026-10-01): an unavailable row is told by a Banner over its Section or list, or by its own value. Board 40's disabled frames are retired, and the `disabled` entries below are not drawn.

### row · selected ground=list

- both densities: `relative flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row touch:rounded-none bg-wash-selected`
  - cell: `ROW {lines: two, state: selected, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### row · hover ground=list

- desktop: `relative flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row touch:rounded-none bg-wash-hover`
  - cell: `ROW {lines: two, state: highlighted, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### row · rest ground=list

- both densities: `relative flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row touch:rounded-none`
  - cell: `ROW {lines: two, state: rest, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- both densities: `relative flex items-center gap-inside min-h-row px-control-x rounded-row touch:rounded-none`
  - cell: `ROW {lines: one, state: rest, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### row · focus ground=list; disabled ground=list

- both densities: `relative flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row touch:rounded-none`
  - cell: `ROW {lines: two, state: rest, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### row · active ground=list

- both densities: `relative flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row touch:rounded-none bg-wash-press`
  - cell: `ROW {lines: two, state: pressed, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### row · rest ground=group; focus ground=group; disabled ground=group

- both densities: `relative flex items-center gap-inside min-h-row-2 py-rows px-card`
  - cell: `ROW {lines: two, state: rest, ground: group}`; overlay: `relative flex items-center`
  - under: ground=group · rest

### row · hover ground=group

- desktop: `relative flex items-center gap-inside min-h-row-2 py-rows px-card bg-wash-hover`
  - cell: `ROW {lines: two, state: highlighted, ground: group}`; overlay: `relative flex items-center`
  - under: ground=group · hover (wash-hover)

### row · active ground=group

- both densities: `relative flex items-center gap-inside min-h-row-2 py-rows px-card bg-wash-press`
  - cell: `ROW {lines: two, state: pressed, ground: group}`; overlay: `relative flex items-center`
  - under: ground=group · active, pressed (wash-press)

### row · selected ground=group

- both densities: `relative flex items-center gap-inside min-h-row-2 py-rows px-card bg-wash-selected`
  - cell: `ROW {lines: two, state: selected, ground: group}`; overlay: `relative flex items-center`
  - under: ground=group · selected (wash-selected)

### row · selected-hover ground=list

- desktop: `relative flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row touch:rounded-none bg-wash-selected-hover`
  - cell: `ROW {lines: two, state: selected-hover, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ground=list · selected under the pointer (wash-selected-hover)

### row · selected-hover ground=group

- desktop: `relative flex items-center gap-inside min-h-row-2 py-rows px-card bg-wash-selected-hover`
  - cell: `ROW {lines: two, state: selected-hover, ground: group}`; overlay: `relative flex items-center`
  - under: ground=group · selected under the pointer (wash-selected-hover)

### hit · selected ground=list; rest ground=list; active ground=list; disabled ground=list

- both densities: `absolute inset-0 rounded-row touch:rounded-none`
  - cell: none; overlay: `absolute inset-0 rounded-row touch:rounded-none`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### hit · hover ground=list; selected-hover ground=list

- desktop: `absolute inset-0 rounded-row touch:rounded-none`
  - cell: none; overlay: `absolute inset-0 rounded-row touch:rounded-none`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### hit · focus ground=list

- both densities: `absolute inset-0 rounded-row touch:rounded-none outline-2 -outline-offset-2 outline-ring`
  - cell: none; overlay: `absolute inset-0 rounded-row touch:rounded-none outline-2 -outline-offset-2 outline-ring`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### hit · rest ground=group; active ground=group; selected ground=group; disabled ground=group

- both densities: `absolute inset-0`
  - cell: none; overlay: `absolute inset-0`
  - under: ground=group · rest

### hit · hover ground=group; selected-hover ground=group

- desktop: `absolute inset-0`
  - cell: none; overlay: `absolute inset-0`
  - under: ground=group · hover (wash-hover)

### hit · focus ground=group

- both densities: `absolute inset-0 outline-2 -outline-offset-2 outline-ring`
  - cell: none; overlay: `absolute inset-0 outline-2 -outline-offset-2 outline-ring`
  - under: ground=group · focus (the ring, inset)

### leading · selected ground=list; rest ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group; disabled ground=list; disabled ground=group

- both densities: `flex shrink-0 items-center justify-center size-avatar`
  - cell: `ROW_LEADING`; overlay: `flex shrink-0 items-center justify-center`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### leading · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `flex shrink-0 items-center justify-center size-avatar`
  - cell: `ROW_LEADING`; overlay: `flex shrink-0 items-center justify-center`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### avatar (Avatar) · selected ground=list; focus ground=group; active ground=group; selected ground=group

- both densities: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### avatar (Avatar) · hover ground=list

- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-5`
  - cell: `AVATAR {step: 5}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ground=list · hover (wash-hover)

### avatar (Avatar) · rest ground=list

- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-1`
  - cell: `AVATAR {step: 1}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-6`
  - cell: `AVATAR {step: 6}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ground=list · rest
- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-5`
  - cell: `AVATAR {step: 5}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-3`
  - cell: `AVATAR {step: 3}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- touch: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list below tablet
- touch: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-5`
  - cell: `AVATAR {step: 5}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list below tablet
- touch: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-3`
  - cell: `AVATAR {step: 3}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list below tablet

### avatar (Avatar) · focus ground=list

- both densities: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-8`
  - cell: `AVATAR {step: 8}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- both densities: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ground=list · focus (the ring, inset)

### avatar (Avatar) · active ground=list

- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-3`
  - cell: `AVATAR {step: 3}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ground=list · active, pressed (wash-press)
- touch: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-1`
  - cell: `AVATAR {step: 1}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Split's list below tablet
- touch: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-5`
  - cell: `AVATAR {step: 5}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…
- touch: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ground=list, ground=group · active

### avatar (Avatar) · rest ground=group

- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ground=group · rest
- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-5`
  - cell: `AVATAR {step: 5}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ground=group · rest
- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-1`
  - cell: `AVATAR {step: 1}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- touch: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-1`
  - cell: `AVATAR {step: 1}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Group (ground=group)
- touch: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ListRow in a Group (ground=group)

### avatar (Avatar) · hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
  - under: ground=group · hover (wash-hover)

### avatar › initials · selected ground=list; focus ground=group; active ground=group; selected ground=group

- both densities: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### avatar › initials · hover ground=list

- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-5-ink`
  - cell: `AVATAR_LABEL {step: 5}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ground=list · hover (wash-hover)

### avatar › initials · rest ground=list

- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-1-ink`
  - cell: `AVATAR_LABEL {step: 1}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-6-ink`
  - cell: `AVATAR_LABEL {step: 6}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ground=list · rest
- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-5-ink`
  - cell: `AVATAR_LABEL {step: 5}`; overlay: none
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-3-ink`
  - cell: `AVATAR_LABEL {step: 3}`; overlay: none
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- touch: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ListRow in a Split's list below tablet
- touch: `text-caption leading-caption tracking-caption font-medium text-avatar-5-ink`
  - cell: `AVATAR_LABEL {step: 5}`; overlay: none
  - under: ListRow in a Split's list below tablet
- touch: `text-caption leading-caption tracking-caption font-medium text-avatar-3-ink`
  - cell: `AVATAR_LABEL {step: 3}`; overlay: none
  - under: ListRow in a Split's list below tablet

### avatar › initials · focus ground=list

- both densities: `text-caption leading-caption tracking-caption font-medium text-avatar-8-ink`
  - cell: `AVATAR_LABEL {step: 8}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- both densities: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ground=list · focus (the ring, inset)

### avatar › initials · active ground=list

- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-3-ink`
  - cell: `AVATAR_LABEL {step: 3}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ground=list · active, pressed (wash-press)
- touch: `text-caption leading-caption tracking-caption font-medium text-avatar-1-ink`
  - cell: `AVATAR_LABEL {step: 1}`; overlay: none
  - under: ListRow in a Split's list below tablet
- touch: `text-caption leading-caption tracking-caption font-medium text-avatar-5-ink`
  - cell: `AVATAR_LABEL {step: 5}`; overlay: none
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…
- touch: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ground=list, ground=group · active

### avatar › initials · rest ground=group

- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ground=group · rest
- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-5-ink`
  - cell: `AVATAR_LABEL {step: 5}`; overlay: none
  - under: ground=group · rest
- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-1-ink`
  - cell: `AVATAR_LABEL {step: 1}`; overlay: none
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- touch: `text-caption leading-caption tracking-caption font-medium text-avatar-1-ink`
  - cell: `AVATAR_LABEL {step: 1}`; overlay: none
  - under: ListRow in a Group (ground=group)
- touch: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ListRow in a Group (ground=group)

### avatar › initials · hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none
  - under: ground=group · hover (wash-hover)

### text · selected ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group; disabled ground=list; disabled ground=group

- both densities: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### text · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### text · rest ground=list

- both densities: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)
- both densities: `flex items-center gap-inside grow min-w-0`
  - cell: `ROW_TITLE_LINE`; overlay: `flex items-center grow min-w-0`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### title line · selected ground=list; rest ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group; disabled ground=list; disabled ground=group

- both densities: `flex items-center gap-inside min-w-0`
  - cell: `ROW_TITLE_LINE`; overlay: `flex items-center min-w-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### title line · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `flex items-center gap-inside min-w-0`
  - cell: `ROW_TITLE_LINE`; overlay: `flex items-center min-w-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### title · selected ground=list; rest ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group

- both densities: `truncate grow text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate grow`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### title · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `truncate grow text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate grow`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### title · disabled ground=list; disabled ground=group

- both densities: `truncate grow text-body leading-body font-medium text-ink-disabled`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate grow text-ink-disabled`
  - under: ground=list · disabled (ink-disabled, no hit)

### trailing · selected ground=list; rest ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group

- both densities: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `ROW_TRAILING`; overlay: `shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### trailing · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `ROW_TRAILING`; overlay: `shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### trailing · disabled ground=list; disabled ground=group

- both densities: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-disabled`
  - cell: `ROW_TRAILING`; overlay: `shrink-0 text-ink-disabled`
  - under: ground=list · disabled (ink-disabled, no hit)

### meta line · selected ground=list; rest ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group; disabled ground=list; disabled ground=group

- both densities: `flex flex-wrap items-center gap-x-inside min-w-0`
  - cell: `ROW_META_LINE`; overlay: `flex flex-wrap items-center min-w-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### meta line · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `flex flex-wrap items-center gap-x-inside min-w-0`
  - cell: `ROW_META_LINE`; overlay: `flex flex-wrap items-center min-w-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### meta · selected ground=list; rest ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group

- both densities: `truncate grow text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `truncate grow`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### meta · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `truncate grow text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `truncate grow`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### meta · disabled ground=list; disabled ground=group

- both densities: `truncate grow text-meta leading-meta font-normal text-ink-disabled`
  - cell: `TEXT {role: meta}`; overlay: `truncate grow text-ink-disabled`
  - under: ground=list · disabled (ink-disabled, no hit)

### marks · selected ground=list; rest ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group

- both densities: `flex shrink-0 items-center gap-inside`
  - cell: `ROW_MARKS`; overlay: `flex shrink-0 items-center`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### marks · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `flex shrink-0 items-center gap-inside`
  - cell: `ROW_MARKS`; overlay: `flex shrink-0 items-center`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status (Status) · status=active; status=waiting; status=attention; status=done; status=failed

- both densities: `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status › dot · status=active

- both densities: `size-dot rounded-full shrink-0 bg-accent-ink`
  - cell: `STATUS_DOT {state: active}`; overlay: `shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status › dot · status=waiting

- both densities: `size-dot rounded-full shrink-0 bg-ink-meta`
  - cell: `STATUS_DOT {state: waiting}`; overlay: `shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status › dot · status=attention

- both densities: `size-dot rounded-full shrink-0 bg-warn`
  - cell: `STATUS_DOT {state: attention}`; overlay: `shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status › dot · status=done

- both densities: `size-dot rounded-full shrink-0 bg-ok`
  - cell: `STATUS_DOT {state: done}`; overlay: `shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status › dot · status=failed

- both densities: `size-dot rounded-full shrink-0 bg-danger`
  - cell: `STATUS_DOT {state: failed}`; overlay: `shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status › word · selected ground=list; rest ground=list; focus ground=list; active ground=list; rest ground=group; focus ground=group; active ground=group; selected ground=group

- both densities: `truncate max-w-measure-short text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status › word · hover ground=list; hover ground=group; selected-hover ground=list; selected-hover ground=group

- desktop: `truncate max-w-measure-short text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### leading › glyph · disabled ground=list; disabled ground=group

- both densities: `shrink-0 size-icon text-ink-disabled`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-disabled`
  - under: ground=list · disabled (ink-disabled, no hit)

### leading › glyph · rest ground=list; rest ground=group

- both densities: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### acts · rest ground=list; rest ground=group

- both densities: `relative flex shrink-0 items-center gap-acts`
  - cell: `ROW_ACTS`; overlay: `relative flex shrink-0 items-center`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### acts · active ground=list

- touch: `relative flex shrink-0 items-center gap-acts`
  - cell: `ROW_ACTS`; overlay: `relative flex shrink-0 items-center`
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…

### more (IconButton) · rest ground=list; rest ground=group

- both densities: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### more (IconButton) · active ground=list

- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…

### more › glyph · rest ground=list; rest ground=group

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### more › glyph · active ground=list

- touch: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…

### chip (Chip) · rest ground=list

- desktop: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-red-soft text-chip-red-ink`
  - cell: `CHIP {family: red, trailing: none}`; overlay: `inline-flex items-center min-w-0`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- desktop: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-teal-soft text-chip-teal-ink`
  - cell: `CHIP {family: teal, trailing: none}`; overlay: `inline-flex items-center min-w-0`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- desktop: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-violet-soft text-chip-violet-ink`
  - cell: `CHIP {family: violet, trailing: none}`; overlay: `inline-flex items-center min-w-0`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- touch: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-red-soft text-chip-red-ink`
  - cell: `CHIP {family: red, trailing: none}`; overlay: `inline-flex items-center min-w-0`
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…
- touch: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-violet-soft text-chip-violet-ink`
  - cell: `CHIP {family: violet, trailing: none}`; overlay: `inline-flex items-center min-w-0`
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…

### chip › label · rest ground=list

- desktop: `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: red}`; overlay: `truncate`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- desktop: `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: teal}`; overlay: `truncate`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- desktop: `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: violet}`; overlay: `truncate`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface
- touch: `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: red}`; overlay: `truncate`
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…
- touch: `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: violet}`; overlay: `truncate`
  - under: ListRow props in a List on the surface: a glyph, a status dot or an avatar leading; a Status or a Chip on the meta line, so a marked row is two-line; the age on every…

## DefinitionRow

Board 40.

A row has no disabled state (fcalell, 2026-10-01): an unavailable row is told by a Banner over its Section or list, or by its own value. Board 40's disabled frames are retired, and the `disabled` entries below are not drawn.

### row · rest

- both densities: `relative flex items-center gap-fields min-h-row px-card`
  - cell: `ROW {lines: one, state: rest, ground: group} + DEFINITION_ROW`; overlay: `relative flex items-center`
  - under: DefinitionRow in a Group of settings
- both densities: `relative flex items-center gap-fields min-h-row-setting py-pair px-card`
  - cell: `ROW {lines: setting, state: rest, ground: group} + DEFINITION_ROW`; overlay: `relative flex items-center`
  - under: DefinitionRow in a Group of settings

### row · disabled

- desktop: `relative flex items-center gap-fields min-h-row-setting py-pair px-card`
  - cell: `ROW {lines: setting, state: rest, ground: group} + DEFINITION_ROW`; overlay: `relative flex items-center`
  - under: DefinitionRow in a Group of settings
- desktop: `relative flex items-center gap-fields min-h-row px-card`
  - cell: `ROW {lines: one, state: rest, ground: group} + DEFINITION_ROW`; overlay: `relative flex items-center`
  - under: DefinitionRow · disabled
- touch: `relative flex items-center gap-fields min-h-row-setting py-pair px-card`
  - cell: `ROW {lines: setting, state: rest, ground: group} + DEFINITION_ROW`; overlay: `relative flex items-center`
  - under: DefinitionRow in a Group of settings

### row · hover

- desktop: `relative flex items-center gap-fields min-h-row px-card bg-wash-hover`
  - cell: `ROW {lines: one, state: highlighted, ground: group} + DEFINITION_ROW`; overlay: `relative flex items-center`
  - under: DefinitionRow · hover

### row · focus

- desktop: `relative flex items-center gap-fields min-h-row px-card`
  - cell: `ROW {lines: one, state: rest, ground: group} + DEFINITION_ROW`; overlay: `relative flex items-center`
  - under: DefinitionRow · focus

### row · active

- both densities: `relative flex items-center gap-fields min-h-row px-card bg-wash-press`
  - cell: `ROW {lines: one, state: pressed, ground: group} + DEFINITION_ROW`; overlay: `relative flex items-center`
  - under: DefinitionRow · active, pressed

### text · rest; disabled; active

- both densities: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: DefinitionRow in a Group of settings

### text · hover; focus

- desktop: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: DefinitionRow · hover

### line · rest; disabled; active

- both densities: `flex items-center gap-inside min-w-0`
  - cell: `ROW_TITLE_LINE`; overlay: `flex items-center min-w-0`
  - under: DefinitionRow in a Group of settings

### line · hover; focus

- desktop: `flex items-center gap-inside min-w-0`
  - cell: `ROW_TITLE_LINE`; overlay: `flex items-center min-w-0`
  - under: DefinitionRow · hover

### label · rest; active

- both densities: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate`
  - under: DefinitionRow in a Group of settings

### label · disabled

- both densities: `truncate text-body leading-body font-medium text-ink-disabled`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate text-ink-disabled`
  - under: DefinitionRow in a Group of settings

### label · hover; focus

- desktop: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate`
  - under: DefinitionRow · hover

### value · rest

- both densities: `basis-0 grow min-w-0 truncate text-end text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `basis-0 grow min-w-0 truncate text-end`
  - under: DefinitionRow in a Group of settings
- both densities: `basis-0 grow min-w-0 truncate text-end text-code leading-code font-normal text-ink-body font-mono`
  - cell: `TEXT {role: code}`; overlay: `basis-0 grow min-w-0 truncate text-end`
  - under: DefinitionRow in a Group of settings
- both densities: `flex basis-0 grow min-w-0 justify-end`
  - cell: none; overlay: `flex basis-0 grow min-w-0 justify-end`
  - under: DefinitionRow in a Group of settings

### value · disabled

- both densities: `basis-0 grow min-w-0 truncate text-end text-meta leading-meta font-normal text-ink-disabled`
  - cell: `TEXT {role: meta}`; overlay: `basis-0 grow min-w-0 truncate text-end text-ink-disabled`
  - under: DefinitionRow in a Group of settings

### value · hover; focus

- desktop: `basis-0 grow min-w-0 truncate text-end text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `basis-0 grow min-w-0 truncate text-end`
  - under: DefinitionRow · hover

### value · active

- both densities: `basis-0 grow min-w-0 truncate text-end text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `basis-0 grow min-w-0 truncate text-end`
  - under: DefinitionRow · active, pressed

### acts · rest

- both densities: `relative flex shrink-0`
  - cell: none; overlay: `relative flex shrink-0`
  - under: DefinitionRow in a Group of settings

### act (IconButton) · rest

- both densities: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: DefinitionRow in a Group of settings

### act › glyph · rest

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: DefinitionRow in a Group of settings

### description · rest; disabled

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: DefinitionRow in a Group of settings

### act slot · rest

- both densities: `relative flex shrink-0`
  - cell: none; overlay: `relative flex shrink-0`
  - under: DefinitionRow in a Group of settings

### hit · rest; active

- both densities: `absolute inset-0`
  - cell: none; overlay: `absolute inset-0`
  - under: DefinitionRow in a Group of settings

### hit · hover; disabled

- desktop: `absolute inset-0`
  - cell: none; overlay: `absolute inset-0`
  - under: DefinitionRow · hover

### hit · focus

- desktop: `absolute inset-0 outline-2 -outline-offset-2 outline-ring`
  - cell: none; overlay: `absolute inset-0 outline-2 -outline-offset-2 outline-ring`
  - under: DefinitionRow · focus

The web draws the hit as a stretched link, not the board's empty anchor: the label is the `<a>` (or, with `onOpen`, the button) and is named by its own text. Its after layer covers the `relative` row, `after:absolute after:inset-0`, and draws the focus ring inset there: `focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring`. The acts slot (`relative`) stands above it by tree order.

### chevron · rest; active

- both densities: `flex shrink-0 items-center justify-center size-control-compact`
  - cell: `DEFINITION_ROW_CHEVRON`; overlay: `flex shrink-0 items-center justify-center`
  - under: DefinitionRow in a Group of settings

### chevron · hover; focus; disabled

- desktop: `flex shrink-0 items-center justify-center size-control-compact`
  - cell: `DEFINITION_ROW_CHEVRON`; overlay: `flex shrink-0 items-center justify-center`
  - under: DefinitionRow · hover

### chevron › glyph · rest; active

- both densities: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: DefinitionRow in a Group of settings

### chevron › glyph · hover; focus

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: DefinitionRow · hover

### chevron › glyph · disabled

- desktop: `shrink-0 size-icon text-ink-disabled`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-disabled`
  - under: DefinitionRow · disabled

### status (Status) · status=done

- both densities: `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
  - under: DefinitionRow in a Group of settings

### status › dot · status=done

- both densities: `size-dot rounded-full shrink-0 bg-ok`
  - cell: `STATUS_DOT {state: done}`; overlay: `shrink-0`
  - under: DefinitionRow in a Group of settings

### status › word · rest

- both densities: `truncate max-w-measure-short text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`
  - under: DefinitionRow in a Group of settings

## ItemHeader


The status that opens is a status that moves (fcalell, 2026-10-02): a `Picker` at the row fit whose options carry states, its value drawn as the Status. In the facts line it pulls back at its start as well (`inline-flex -ms-inside` around the Picker, whose row fit pulls back its end), so the `status (Status, opens)` strings below stand as the Picker's trigger.

Board 40.

### head · rest; loading

- both densities: `flex flex-col gap-pair`
  - cell: `ITEM_HEADER`; overlay: `flex flex-col`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### overline · rest

- both densities: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `truncate`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### title · rest

- both densities: `text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### facts · rest

- both densities: `flex flex-wrap items-center gap-x-fields gap-y-pair`
  - cell: `ITEM_FACTS`; overlay: `flex flex-wrap items-center`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status (Status, opens) · status=active

- both densities: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside min-h-target -mx-inside`
  - cell: `STATUS + PILL_ACT`; overlay: `inline-flex items-center min-w-0 -mx-inside`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status (Status, opens) · status=attention

- desktop: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside min-h-target -mx-inside`
  - cell: `STATUS + PILL_ACT`; overlay: `inline-flex items-center min-w-0 -mx-inside`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)

### status › dot · status=active

- both densities: `size-dot rounded-full shrink-0 bg-accent-ink`
  - cell: `STATUS_DOT {state: active}`; overlay: `shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### status › dot · status=attention

- desktop: `size-dot rounded-full shrink-0 bg-warn`
  - cell: `STATUS_DOT {state: attention}`; overlay: `shrink-0`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)

### status › word · rest

- both densities: `truncate max-w-measure-short text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### fact (counted) · rest

- both densities: `inline-flex items-center gap-inside`
  - cell: `ITEM_FACT`; overlay: `inline-flex items-center`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### fact (counted) › word · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### count (Count) · rest

- both densities: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip px-inside rounded-full bg-fill-neutral`
  - cell: `COUNT`; overlay: `inline-flex items-center justify-center shrink-0`
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### count › figure · rest

- both densities: `text-caption leading-caption tracking-caption font-normal text-ink-meta tabular-nums`
  - cell: `COUNT_LABEL`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### fact · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: ListRow in a Split's list and ItemHeader over the record, below wide at the Shell's content width (1280 − 240 = 1040)

### loading line box · loading

- both densities: `flex items-center h-lh text-meta leading-meta`
  - cell: `LINE_BOX {role: meta}`; overlay: `flex items-center h-lh`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)
- both densities: `flex items-center h-lh text-heading leading-heading`
  - cell: `LINE_BOX {role: heading}`; overlay: `flex items-center h-lh`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)
- both densities: `hidden touch:flex items-center h-lh text-meta leading-meta`
  - cell: `LINE_BOX {role: meta}`; overlay: `hidden touch:flex items-center h-lh`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)

### skeleton line · loading

- both densities: `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)
- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)

### loading facts · loading

- both densities: `flex flex-col gap-pair`
  - cell: `SKELETON_LINES`; overlay: `flex flex-col`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)

### loading facts line · loading

- both densities: `flex items-center gap-x-fields min-h-target`
  - cell: `SKELETON_ROW {kind: facts}`; overlay: `flex items-center`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)

### skeleton count · loading

- both densities: `inline-flex shrink-0 min-h-chip min-w-chip rounded-full bg-skeleton`
  - cell: `SKELETON {kind: count}`; overlay: `inline-flex shrink-0`
  - under: ItemHeader at the heading role, the record's head in a Split's main (the Place owns the title)

## FormField


Around a group of controls (an OptionList, a SegmentedControl) the field takes no field context: its label is a `<p>` whose id names the group (`aria-labelledby`) and its description or error describes it, so each control inside keeps its own name.

Board 41.

### field · rest; error; disabled

- both densities: `flex flex-col gap-pair min-w-0`
  - cell: `FORM_FIELD {holds: field}`; overlay: `flex flex-col min-w-0`
  - under: rest · typed fields in a Form Section

### field · rest layout=inline; disabled layout=inline

- both densities: `flex items-center gap-fields min-w-0`
  - cell: `FORM_FIELD {holds: switch}`; overlay: `flex items-center min-w-0`
  - under: rest · the code and the toggles
- both densities: `flex items-start gap-inside min-w-0`
  - cell: `FORM_FIELD {holds: checkbox}`; overlay: `flex items-start min-w-0`
  - under: rest · the code and the toggles

### field · error layout=inline

- both densities: `flex items-start gap-inside min-w-0`
  - cell: `FORM_FIELD {holds: checkbox}`; overlay: `flex items-start min-w-0`
  - under: error · the message takes the description's slot, in ink-error; the field draws its own error cell (edge-error); a checkbox keeps its box, the message alone carries…

### label · rest; rest layout=inline; error; error layout=inline

- both densities: `text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: none
  - under: rest · typed fields in a Form Section

### label · disabled; disabled layout=inline

- both densities: `text-body leading-body font-medium text-ink-disabled`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `text-ink-disabled`
  - under: disabled · FormField disabled

### description · rest; rest layout=inline; disabled; disabled layout=inline

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: rest · typed fields in a Form Section

### label block · rest layout=inline; error layout=inline; disabled layout=inline

- both densities: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: rest · the code and the toggles

### box line · rest layout=inline; error layout=inline; disabled layout=inline

- both densities: `flex shrink-0 items-center text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `flex shrink-0 items-center`
  - under: rest · the code and the toggles

### error · error; error layout=inline

- both densities: `text-meta leading-meta font-normal text-ink-error`
  - cell: `FORM_FIELD_ERROR`; overlay: none
  - under: error · the message takes the description's slot, in ink-error; the field draws its own error cell (edge-error); a checkbox keeps its box, the message alone carries…

## SegmentedControl


The track shrinks to its room and the segments with it, and hugs them in a column (a FormField) rather than stretching to the field (`inline-flex min-w-0 max-w-full items-center w-fit` for the track's `inline-flex shrink-0 items-center`, `min-w-0` on each segment), so at 320 a label that cannot fit truncates; where they fit, the labels stay whole. A FormField around it names the radiogroup with its label.

Board 41.

### track · rest

- both densities: `inline-flex shrink-0 items-center rounded-control bg-group`
  - cell: `SEGMENTED_CONTROL`; overlay: `inline-flex shrink-0 items-center`
  - under: selected · in a Toolbar

### segment · selected

- both densities: `relative inline-flex items-center justify-center rounded-control min-h-control-compact px-control-x bg-wash-selected text-ink-body`
  - cell: `SEGMENT {state: selected}`; overlay: `relative inline-flex items-center justify-center`
  - under: selected · in a Toolbar

### segment · rest

- both densities: `relative inline-flex items-center justify-center rounded-control min-h-control-compact px-control-x text-ink-meta`
  - cell: `SEGMENT {state: idle}`; overlay: `relative inline-flex items-center justify-center`
  - under: selected · in a Toolbar

### segment · hover

- both densities: `relative inline-flex items-center justify-center rounded-control min-h-control-compact px-control-x bg-wash-hover text-ink-meta`
  - cell: `SEGMENT {state: idle}`; overlay: `relative inline-flex items-center justify-center bg-wash-hover`
  - under: states · four options, Week selected

### segment · focus

- both densities: `relative inline-flex items-center justify-center rounded-control min-h-control-compact px-control-x text-ink-meta outline-2 -outline-offset-2 outline-ring`
  - cell: `SEGMENT {state: idle}`; overlay: `relative inline-flex items-center justify-center outline-2 -outline-offset-2 outline-ring`
  - under: states · four options, Week selected

### segment · active

- both densities: `relative inline-flex items-center justify-center rounded-control min-h-control-compact px-control-x bg-wash-press text-ink-meta`
  - cell: `SEGMENT {state: idle}`; overlay: `relative inline-flex items-center justify-center bg-wash-press`
  - under: states · four options, Week selected

### segment · selected-hover

- both densities: `relative inline-flex items-center justify-center rounded-control min-h-control-compact px-control-x bg-wash-selected-hover text-ink-body`
  - cell: `SEGMENT {state: selected-hover}`; overlay: `relative inline-flex items-center justify-center`
  - under: states · four options, Week selected

### segment › label · selected

- both densities: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SEGMENT_LABEL {state: selected}`; overlay: `truncate`
  - under: selected · in a Toolbar

### segment › label · rest; hover; focus; active

- both densities: `truncate text-body leading-body font-medium text-ink-meta`
  - cell: `SEGMENT_LABEL {state: idle}`; overlay: `truncate`
  - under: selected · in a Toolbar

### segment › label · selected-hover

- both densities: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SEGMENT_LABEL {state: selected-hover}`; overlay: `truncate`
  - under: states · four options, Week selected

## Picker


The keyboard's highlighted option rings inset as well as washing (`outline-2 -outline-offset-2 outline-ring`): a select's option and a touch option under `focus-visible:`, a combobox's while Base UI's highlight reason is `keyboard`; the pointer's highlight is the wash alone. An option carrying a state leads its row with the status's dot, its label at the body role as every option's; only the trigger's value draws as the Status mark. With no value the trigger shows the Picker's `label` in the placeholder's ink (`FIELD_PLACEHOLDER`) at either fit. The popover is bounded by the room Base UI measures under its trigger (`flex flex-col max-h-(--available-height)` on the popup) and its rows scroll inside it (`flex flex-col gap-pair min-h-0 overflow-y-auto overscroll-contain` on the list), the search staying above; the touch sheet stops at the viewport's top (the Sheet's `max-h-full`) and its listbox scrolls the same way (`flex flex-col min-h-0 overflow-y-auto overscroll-contain`) under the search.

An option carrying an avatar leads its row with the `Avatar` (drawn from its label, or its `src`), as a status option leads with its dot. The optional act (the act that makes a new option) ends the list under a hairline across it: `HAIRLINE` with `flex flex-col border-t pt-float` (the sheet's `border-t pt-float`), the act a `ROW {ground: list}` row (`ROW {ground: group}` in the touch sheet) of its glyph in `text-ink-meta` (`flex shrink-0 text-ink-meta`) and its label at the body role, washing `hover:bg-wash-hover active:bg-wash-press` and ringing inset; running it closes the list. The Shell's switcher draws its own trigger over the same list through the Picker's internal base (`picker/base.tsx`, outside the exports; native composes `PickSheet`).

Board 41; the row fit's trigger from board 40's members.

### trigger (row fit) · rest fit=row

- both densities: `inline-flex shrink-0 self-center items-center gap-inside rounded-full px-inside min-h-target -me-inside text-ink-meta`
  - cell: `PILL_ACT + PICKER {fit: row}`; overlay: `inline-flex shrink-0 self-center items-center -me-inside`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### trigger (row fit) · hover fit=row

- desktop: `inline-flex shrink-0 self-center items-center gap-inside rounded-full px-inside min-h-target -me-inside bg-wash-hover text-ink-meta`
  - cell: `PILL_ACT + PICKER {fit: row}`; overlay: `inline-flex shrink-0 self-center items-center -me-inside bg-wash-hover`
  - under: pick · hover (wash-hover)

### trigger (row fit) · focus fit=row

- desktop: `inline-flex shrink-0 self-center items-center gap-inside rounded-full px-inside min-h-target -me-inside text-ink-meta outline-2 outline-offset-2 outline-ring`
  - cell: `PILL_ACT + PICKER {fit: row}`; overlay: `inline-flex shrink-0 self-center items-center -me-inside outline-2 outline-offset-2 outline-ring`
  - under: pick · focus (the ring at offset 2)

### trigger (row fit) · active fit=row

- desktop: `inline-flex shrink-0 self-center items-center gap-inside rounded-full px-inside min-h-target -me-inside bg-wash-press text-ink-meta`
  - cell: `PILL_ACT + PICKER {fit: row}`; overlay: `inline-flex shrink-0 self-center items-center -me-inside bg-wash-press`
  - under: pick · pressed (wash-press)

### trigger (row fit) · open fit=row

- desktop: `inline-flex shrink-0 self-center items-center gap-inside rounded-full px-inside min-h-target -me-inside bg-wash-press text-ink-body`
  - cell: `PILL_ACT + PICKER {fit: row}`; overlay: `inline-flex shrink-0 self-center items-center -me-inside bg-wash-press text-ink-body`
  - under: pick · open (the press wash held, the label in body ink; the popover

### trigger › value · rest fit=row

- both densities: `truncate tabular-nums text-meta leading-meta font-normal`
  - cell: `PICKER_VALUE`; overlay: `truncate`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### trigger › value · hover fit=row; focus fit=row; active fit=row; open fit=row

- desktop: `truncate tabular-nums text-meta leading-meta font-normal`
  - cell: `PICKER_VALUE`; overlay: `truncate`
  - under: pick · hover (wash-hover)

### trigger › value · open

- desktop: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + PICKER_EMPTY`; overlay: `min-w-0 grow truncate`
  - under: active · an owner filter in a Toolbar

### trigger › value · rest

- desktop: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`
  - under: trigger · rest with a value, rest with the empty choice (the placeholder's ink), hover (edge-hover), focus (the ring)
- desktop: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + PICKER_EMPTY`; overlay: `min-w-0 grow truncate`
  - under: trigger · rest with a value, rest with the empty choice (the placeholder's ink), hover (edge-hover), focus (the ring)
- touch: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + PICKER_EMPTY`; overlay: `min-w-0 grow truncate`
  - under: active · an owner filter in a Toolbar, seven options, so the search leads the sheet; typed “an”, the rows filtered under it
- touch: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`
  - under: trigger · rest with a value, rest with the empty choice (the placeholder's ink), hover (edge-hover), focus (the ring)

### trigger › value · hover; focus

- both densities: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`
  - under: trigger · rest with a value, rest with the empty choice (the placeholder's ink), hover (edge-hover), focus (the ring)

### trigger › chevron · rest fit=row

- both densities: `size-icon-meta shrink-0`
  - cell: `ICON {fit: meta}`; overlay: `shrink-0`
  - under: ListRow props in a List (left) and in a Group (right), on the Place's surface

### trigger › chevron · hover fit=row; focus fit=row; active fit=row; open fit=row

- desktop: `size-icon-meta shrink-0`
  - cell: `ICON {fit: meta}`; overlay: `shrink-0`
  - under: pick · hover (wash-hover)

### trigger › chevron · open

- desktop: `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
  - under: active · an owner filter in a Toolbar

### trigger › chevron · rest; hover; focus

- both densities: `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
  - under: trigger · rest with a value, rest with the empty choice (the placeholder's ink), hover (edge-hover), focus (the ring)

### popover · rest

- desktop: `flex flex-col gap-pair w-popover p-float bg-raised border border-edge-raised rounded-popover shadow-float`
  - cell: `POPOVER + PICKER_POPOVER`; overlay: `flex flex-col`
  - under: selected · a member's role, applied on pick

### group · rest

- both densities: `flex flex-col gap-rows`
  - cell: `SELECT_GROUP`; overlay: `flex flex-col`
  - under: selected · a member's role, applied on pick

### option · rest

- desktop: `flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row`
  - cell: `ROW {lines: two, state: rest, ground: list}`; overlay: `flex items-center`
  - under: selected · a member's role, applied on pick
- touch: `flex items-center gap-inside min-h-row-2 py-rows px-card`
  - cell: `ROW {lines: two, state: rest, ground: group}`; overlay: `flex items-center`
  - under: selected · on touch a pick opens the pick sheet over the scrim (the Picker's sheet), titled by its label

### option · highlighted

- desktop: `flex items-center gap-inside min-h-row-2 py-rows bg-wash-hover px-control-x rounded-row`
  - cell: `ROW {lines: two, state: highlighted, ground: list}`; overlay: `flex items-center`
  - under: selected · a member's role, applied on pick

### option · selected

- desktop: `flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row`
  - cell: `ROW {lines: two, state: rest, ground: list}`; overlay: `flex items-center`
  - under: selected · a member's role, applied on pick
- desktop: `flex items-center gap-inside min-h-row px-control-x rounded-row`
  - cell: `ROW {lines: one, state: rest, ground: list}`; overlay: `flex items-center`
  - under: active · an owner filter in a Toolbar
- touch: `flex items-center gap-inside min-h-row-2 py-rows px-card`
  - cell: `ROW {lines: two, state: rest, ground: group}`; overlay: `flex items-center`
  - under: selected · on touch a pick opens the pick sheet over the scrim (the Picker's sheet), titled by its label

### option · pressed

- desktop: `flex items-center gap-inside min-h-row-2 py-rows bg-wash-press px-control-x rounded-row`
  - cell: `ROW {lines: two, state: pressed, ground: list}`; overlay: `flex items-center`
  - under: active · an owner filter in a Toolbar

### option › text · rest; selected

- both densities: `flex flex-col min-w-0 grow`
  - cell: none; overlay: `flex flex-col min-w-0 grow`
  - under: selected · a member's role, applied on pick

### option › text · highlighted; pressed

- desktop: `flex flex-col min-w-0 grow`
  - cell: none; overlay: `flex flex-col min-w-0 grow`
  - under: selected · a member's role, applied on pick

### option › label · rest

- both densities: `truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate`
  - under: selected · a member's role, applied on pick

### option › label · highlighted; pressed

- desktop: `truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate`
  - under: selected · a member's role, applied on pick

### option › label · selected

- desktop: `truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate`
  - under: selected · a member's role, applied on pick
- desktop: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `TEXT {role: body} + PICKER_EMPTY`; overlay: `min-w-0 grow truncate`
  - under: active · an owner filter in a Toolbar
- touch: `truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate`
  - under: selected · on touch a pick opens the pick sheet over the scrim (the Picker's sheet), titled by its label

### option › description · rest; selected

- both densities: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `truncate`
  - under: selected · a member's role, applied on pick

### option › description · highlighted; pressed

- desktop: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `truncate`
  - under: selected · a member's role, applied on pick

### option › tick · selected

- both densities: `size-icon shrink-0 text-ink-body`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-body`
  - under: selected · a member's role, applied on pick

### search (Input) · rest kind=search

- both densities: `flex grow items-center gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge`
  - cell: `FIELD {fit: bar, trailing: none, state: rest}`; overlay: `flex grow items-center`
  - under: active · an owner filter in a Toolbar

### search › glyph · rest kind=search

- both densities: `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
  - under: active · an owner filter in a Toolbar

### search › placeholder · rest kind=search

- both densities: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: search} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`
  - under: active · an owner filter in a Toolbar

### trigger (field fit) · open

- desktop: `flex shrink-0 items-center text-start gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {fit: bar, trailing: none, state: rest} + PICKER {fit: field}`; overlay: `flex shrink-0 items-center text-start outline-2 outline-offset-2 outline-ring`
  - under: active · an owner filter in a Toolbar

### trigger (field fit) · rest

- both densities: `flex shrink-0 items-center text-start gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge`
  - cell: `FIELD {fit: bar, trailing: none, state: rest} + PICKER {fit: field}`; overlay: `flex shrink-0 items-center text-start`
  - under: trigger · rest with a value, rest with the empty choice (the placeholder's ink), hover (edge-hover), focus (the ring)

### trigger (field fit) · hover

- both densities: `flex shrink-0 items-center text-start gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge-hover`
  - cell: `FIELD {fit: bar, trailing: none, state: rest} + PICKER {fit: field}`; overlay: `flex shrink-0 items-center text-start border-edge-hover`
  - under: trigger · rest with a value, rest with the empty choice (the placeholder's ink), hover (edge-hover), focus (the ring)

### trigger (field fit) · focus

- both densities: `flex shrink-0 items-center text-start gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {fit: bar, trailing: none, state: rest} + PICKER {fit: field}`; overlay: `flex shrink-0 items-center text-start outline-2 outline-offset-2 outline-ring`
  - under: trigger · rest with a value, rest with the empty choice (the placeholder's ink), hover (edge-hover), focus (the ring)

### search › value · rest kind=search

- touch: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: search}`; overlay: `min-w-0 grow truncate`
  - under: active · an owner filter in a Toolbar, seven options, so the search leads the sheet; typed “an”, the rows filtered under it

## OptionList

Board 41.

### list · rest

- both densities: `flex flex-col gap-pair p-float rounded-card border border-edge bg-surface`
  - cell: `OPTION_LIST`; overlay: `flex flex-col`
  - under: selected · in a FormField of a Form Section

### group · rest

- both densities: `flex flex-col gap-rows`
  - cell: `SELECT_GROUP`; overlay: `flex flex-col`
  - under: selected · in a FormField of a Form Section

### group label · rest

- both densities: `px-control-x pt-pair text-meta leading-meta font-medium text-ink-meta`
  - cell: `OPTION_GROUP_LABEL + TEXT {role: meta} + TEXT_STRONG {role: meta}`; overlay: none
  - under: selected · in a FormField of a Form Section
- both densities: `flex items-center px-control-x pt-pair text-meta leading-meta`
  - cell: `OPTION_GROUP_LABEL + LINE_BOX {role: meta}`; overlay: `flex items-center`
  - under: loading · the rows keep their height

### option · selected; focus

- both densities: `flex items-center gap-inside min-h-row px-control-x rounded-row`
  - cell: `ROW {lines: one, state: rest, ground: list}`; overlay: `flex items-center`
  - under: selected · in a FormField of a Form Section

### option · rest

- both densities: `flex items-center gap-inside min-h-row px-control-x rounded-row`
  - cell: `ROW {lines: one, state: rest, ground: list}`; overlay: `flex items-center`
  - under: selected · in a FormField of a Form Section
- both densities: `flex items-center gap-inside min-h-row-2 py-rows px-control-x rounded-row`
  - cell: `ROW {lines: two, state: rest, ground: list}`; overlay: `flex items-center`
  - under: selected · in a FormField of a Form Section

### option · selected hover

- both densities: `flex items-center gap-inside min-h-row bg-wash-hover px-control-x rounded-row`
  - cell: `ROW {lines: one, state: highlighted, ground: list}`; overlay: `flex items-center`
  - under: hover, focus, active · the row under the pointer takes the hover wash, a pressed row the press wash; focus rings the box, as the Checkbox's does

### option · selected active

- both densities: `flex items-center gap-inside min-h-row bg-wash-press px-control-x rounded-row`
  - cell: `ROW {lines: one, state: pressed, ground: list}`; overlay: `flex items-center`
  - under: hover, focus, active · the row under the pointer takes the hover wash, a pressed row the press wash; focus rings the box, as the Checkbox's does

### option line · selected; rest; selected hover; focus; selected active

- both densities: `flex grow min-w-0 items-start gap-inside`
  - cell: `OPTION_LINE`; overlay: `flex grow min-w-0 items-start`
  - under: selected · in a FormField of a Form Section

### box line · selected; rest; selected hover; focus; selected active

- both densities: `flex shrink-0 items-center text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `flex shrink-0 items-center`
  - under: selected · in a FormField of a Form Section

### checkbox (Checkbox) · rest value=checked

- both densities: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on`
  - cell: `CHECKBOX {state: checked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`
  - under: selected · in a FormField of a Form Section

### checkbox (Checkbox) · rest value=unchecked

- both densities: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip border border-edge-strong bg-surface`
  - cell: `CHECKBOX {state: unchecked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`
  - under: selected · in a FormField of a Form Section

### checkbox (Checkbox) · focus value=unchecked

- both densities: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip border border-edge-strong bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `CHECKBOX {state: unchecked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden outline-2 outline-offset-2 outline-ring`
  - under: hover, focus, active · the row under the pointer takes the hover wash, a pressed row the press wash; focus rings the box, as the Checkbox's does

### checkbox › mark · rest value=checked

- both densities: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
  - under: selected · in a FormField of a Form Section

### option › label · selected; selected hover; focus; selected active

- both densities: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `min-w-0 grow truncate`
  - under: selected · in a FormField of a Form Section

### option › label · rest

- both densities: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `min-w-0 grow truncate`
  - under: selected · in a FormField of a Form Section
- both densities: `truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `truncate`
  - under: selected · in a FormField of a Form Section

### children · rest

- both densities: `flex gap-inside px-control-x pb-pair`
  - cell: `OPTION_CHILDREN`; overlay: `flex`
  - under: selected · in a FormField of a Form Section

### children › indent · rest

- both densities: `shrink-0 size-check`
  - cell: `OPTION_INDENT`; overlay: `shrink-0`
  - under: selected · in a FormField of a Form Section

### children › body · rest

- both densities: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: selected · in a FormField of a Form Section

### option › text · rest

- both densities: `flex flex-col min-w-0 grow`
  - cell: none; overlay: `flex flex-col min-w-0 grow`
  - under: selected · in a FormField of a Form Section

### description line · rest

- both densities: `flex flex-wrap items-center gap-x-inside min-w-0`
  - cell: `ROW_META_LINE`; overlay: `flex flex-wrap items-center min-w-0`
  - under: selected · in a FormField of a Form Section

### description · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: selected · in a FormField of a Form Section

### chip (Chip) · family=neutral

- both densities: `inline-flex items-center min-w-0 shrink-0 rounded-full px-inside min-h-chip bg-chip-neutral-soft text-chip-neutral-ink`
  - cell: `CHIP {family: neutral, trailing: none}`; overlay: `inline-flex items-center min-w-0 shrink-0`
  - under: selected · in a FormField of a Form Section

### chip › label · rest

- both densities: `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: neutral}`; overlay: `truncate`
  - under: selected · in a FormField of a Form Section

### option › label line · rest

- both densities: `flex items-center gap-inside min-w-0`
  - cell: `ROW_TITLE_LINE`; overlay: `flex items-center min-w-0`
  - under: selected · in a FormField of a Form Section

### skeleton lane · rest

- both densities: `flex grow min-w-0 max-w-measure-short`
  - cell: `SKELETON_LANE {role: meta}`; overlay: `flex grow min-w-0`
  - under: loading · the rows keep their height
- both densities: `flex grow min-w-0 max-w-measure-short text-body`
  - cell: `SKELETON_LANE {role: body}`; overlay: `flex grow min-w-0`
  - under: loading · the rows keep their height

### skeleton line · rest

- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: loading · the rows keep their height
- both densities: `h-skeleton w-2/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-2/3`
  - under: loading · the rows keep their height
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: loading · the rows keep their height

### skeleton option · rest

- both densities: `flex items-center gap-inside min-h-row px-control-x rounded-row`
  - cell: `ROW {lines: one, state: rest, ground: list}`; overlay: `flex items-center`
  - under: loading · the rows keep their height

### skeleton box · rest

- both densities: `shrink-0 size-check rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: check}`; overlay: `shrink-0`
  - under: loading · the rows keep their height

## Sheet

Board 42.

### scrim · rest

- both densities: `absolute inset-0 bg-scrim`
  - cell: `SCRIM`; overlay: `absolute inset-0`
  - under: Sheet · side, desktop

### sheet (side) · fit=form form=side

- desktop: `bg-raised border-l border-edge-raised rounded-l-sheet shadow-modal w-sheet relative flex flex-col max-w-full`
  - cell: `SHEET_SIDE {fit: form}`; overlay: `relative flex flex-col max-w-full`
  - under: Sheet · side, desktop

### sheet (side) · fit=pane form=side

- desktop: `bg-raised border-l border-edge-raised rounded-l-sheet shadow-modal w-pane relative flex flex-col max-w-full`
  - cell: `SHEET_SIDE {fit: pane}`; overlay: `relative flex flex-col max-w-full`
  - under: Sheet · the Split's details pane below wide, opened by the Details act (pressed while open)

### head · rest

- both densities: `gap-pair px-card py-pair border-b border-edge flex flex-col`
  - cell: `SHEET_HEAD`; overlay: `flex flex-col`
  - under: Sheet · side, desktop

### head row · rest

- both densities: `gap-acts flex items-center`
  - cell: `SHEET_HEAD_ROW`; overlay: `flex items-center`
  - under: Sheet · side, desktop

### back (IconButton) · rest

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Sheet · side, desktop
- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control text-ink-meta`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: back · a sheet's second page

### back › glyph · rest

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: Sheet · side, desktop

### title block · rest

- both densities: `flex flex-col grow min-w-0`
  - cell: none; overlay: `flex flex-col grow min-w-0`
  - under: Sheet · side, desktop

### title slot · rest

- both densities: `flex items-center min-w-0`
  - cell: none; overlay: `flex items-center min-w-0`
  - under: Sheet · side, desktop

### title · rest

- desktop: `truncate text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: `truncate`
  - under: Sheet · side, desktop
- desktop: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate`
  - under: Sheet · the Split's details pane below wide, opened by the Details act (pressed while open)
- touch: `truncate text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: `truncate`
  - under: Menu · open on touch

### description · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: Sheet · side, desktop

### close (IconButton) · rest

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Sheet · side, desktop
- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control text-ink-meta`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Menu · open on touch

### close › glyph · rest

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: Sheet · side, desktop

### body · rest

- both densities: `p-card flex flex-col grow min-h-0`
  - cell: `SHEET_BODY`; overlay: `flex flex-col grow min-h-0`
  - under: Sheet · side, desktop

### foot · rest

- desktop: `gap-acts px-card py-card border-t border-edge flex items-center`
  - cell: `SHEET_FOOT`; overlay: `flex items-center`
  - under: Sheet · side, desktop
- touch: `gap-acts px-card py-card border-t border-edge flex flex-col`
  - cell: `SHEET_FOOT`; overlay: `flex flex-col`
  - under: Sheet · bottom, touch

### foot line · rest

- desktop: `flex items-center min-w-0 grow`
  - cell: none; overlay: `flex items-center min-w-0 grow`
  - under: Sheet · side, desktop
- touch: `flex items-center min-w-0`
  - cell: none; overlay: `flex items-center min-w-0`
  - under: Sheet · bottom, touch

### foot line › text · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: Sheet · side, desktop

### sheet (centred) · form=centred

- desktop: `gap-fields w-dialog p-card bg-raised border border-edge-raised rounded-sheet shadow-modal relative flex flex-col max-w-full`
  - cell: `SHEET_CENTERED`; overlay: `relative flex flex-col max-w-full`
  - under: Sheet · centred, desktop (a confirm)

### layer · rest

- touch: `absolute inset-0 flex flex-col justify-end`
  - cell: none; overlay: `absolute inset-0 flex flex-col justify-end`
  - under: Menu · open on touch

### sheet (menu) · form=menu

- touch: `bg-raised border-t border-edge-raised rounded-t-sheet shadow-modal relative flex flex-col`
  - cell: `SHEET`; overlay: `relative flex flex-col`
  - under: Menu · open on touch

### sheet (bottom) · form=bottom

- touch: `bg-raised border-t border-edge-raised rounded-t-sheet shadow-modal relative flex flex-col`
  - cell: `SHEET`; overlay: `relative flex flex-col`
  - under: Sheet · bottom, touch

### submit (Button) · act=primary

- touch: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
  - under: Sheet · bottom, touch

### submit (Button) · act=blocked

- touch: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
  - under: disabled · the submit blocked

### submit (Button) · act=primary-loading

- touch: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
  - under: loading · the submit pending, its box kept

### submit › label · act=primary; act=blocked

- touch: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`
  - under: Sheet · bottom, touch

### submit › label · act=primary-loading

- touch: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate opacity-0`
  - under: loading · the submit pending, its box kept

### reason · rest

- touch: `text-meta leading-meta font-normal text-ink-meta text-end`
  - cell: `TEXT {role: meta}`; overlay: `text-end`
  - under: disabled · the submit blocked

### submit › spinner layer · act=primary-loading

- touch: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
  - under: loading · the submit pending, its box kept

### submit › spinner · act=primary-loading

- touch: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
  - under: loading · the submit pending, its box kept

### submit › spinner track · act=primary-loading

- touch: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-accent`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-accent`
  - under: loading · the submit pending, its box kept

### submit › spinner arc · act=primary-loading

- touch: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-accent`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-accent`
  - under: loading · the submit pending, its box kept

### motion · enter; leave

- both densities, on Base UI's `data-starting-style` and `data-ending-style` (board 42's motion notes; transform and opacity alone, every rung 0 under reduced motion):
  - scrim: `transition-opacity duration-slow ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-base data-ending-style:ease-in`
  - side sheet (desktop): `transition-transform duration-slow ease-out data-starting-style:translate-x-full data-ending-style:translate-x-full data-ending-style:duration-base data-ending-style:ease-in`
  - bottom sheet and menu sheet (touch, the touch board's note): `transition-transform duration-slow ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:duration-base data-ending-style:ease-in`
  - centred sheet (desktop): `transition-[opacity,translate] duration-slow ease-out data-starting-style:translate-y-pair data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-base data-ending-style:ease-in`
  - cell: none; overlay: the strings above

## Menu

Board 42.

### trigger (IconButton) · rest

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: closed · rest
- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control text-ink-meta`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: closed

### trigger (IconButton) · hover

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact bg-wash-hover text-ink-body`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 bg-wash-hover text-ink-body`
  - under: hover

### trigger (IconButton) · focus

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta outline-2 outline-offset-2 outline-ring`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 outline-2 outline-offset-2 outline-ring`
  - under: focus
- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control text-ink-meta outline-2 outline-offset-2 outline-ring`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0 outline-2 outline-offset-2 outline-ring`
  - under: focus

### trigger (IconButton) · active; open

- desktop: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact bg-wash-press text-ink-body`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 bg-wash-press text-ink-body`
  - under: active
- touch: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control bg-wash-press text-ink-body`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0 bg-wash-press text-ink-body`
  - under: active

### trigger › glyph · rest; focus; active; open

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: closed · rest

### trigger › glyph · hover

- desktop: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: hover

### root · rest

- desktop: `relative flex`
  - cell: none; overlay: `relative flex`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### anchor · rest

- desktop: `absolute right-0 top-full pt-pair`
  - cell: none; overlay: `absolute right-0 top-full pt-pair`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### menu · rest

- desktop: `gap-pair p-float bg-raised border border-edge-raised rounded-popover shadow-float w-popover flex flex-col`
  - cell: `POPOVER + MENU {form: popover}`; overlay: `flex flex-col`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### menu · form=sheet

- touch: `gap-pair p-float flex flex-col`
  - cell: `MENU {form: sheet}`; overlay: `flex flex-col`
  - under: Menu · open on touch

### group · rest

- both densities: `gap-rows flex flex-col`
  - cell: `MENU_GROUP {place: first}`; overlay: `flex flex-col`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### group · place=after

- both densities: `gap-rows border-t border-edge pt-float flex flex-col`
  - cell: `MENU_GROUP {place: after}`; overlay: `flex flex-col`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item · rest; rest destructive

- both densities: `gap-inside min-h-row px-control-x rounded-row flex items-center`
  - cell: `ROW {lines: one, state: rest, ground: list}`; overlay: `flex items-center`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item · highlighted

- desktop: `gap-inside min-h-row px-control-x rounded-row flex items-center bg-wash-hover`
  - cell: `ROW {lines: one, state: highlighted, ground: list}`; overlay: `flex items-center`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item · blocked

- both densities: `gap-inside min-h-row-2 px-control-x rounded-row flex items-center`
  - cell: `ROW {lines: two, state: rest, ground: list}`; overlay: `flex items-center`; the board omits the cell's `py-rows`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item · pressed destructive

- desktop: `gap-inside min-h-row px-control-x rounded-row flex items-center bg-wash-press`
  - cell: `ROW {lines: one, state: pressed, ground: list}`; overlay: `flex items-center`
  - under: open · items without glyphs, the label alone; the pointer down on Delete deployment (pressed, the press wash)

### item · pressed

- touch: `gap-inside min-h-row px-control-x rounded-row flex items-center bg-wash-press`
  - cell: `ROW {lines: one, state: pressed, ground: list}`; overlay: `flex items-center`
  - under: Menu · open on touch

### item · focus (the keyboard's highlight)

- both densities: the highlighted row the keyboard reached (`:focus-visible`, Base UI's item on the desktop, the sheet's row button on touch) draws `ROW {state: highlighted}` and the inset ring, the base `:focus-visible` rule's `outline-2 outline-ring` at `focus-visible:-outline-offset-2`, since the wash alone is 1.1:1, under the 3:1 a state needs; the pointer's highlight is the wash alone. A blocked row takes both and stays inert.
  - cell: `ROW {lines, state: highlighted, ground: list}`; overlay: `focus-visible:-outline-offset-2`

### item › glyph · rest

- both densities: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › glyph · highlighted

- desktop: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › glyph · blocked

- both densities: `shrink-0 size-icon text-ink-disabled`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-disabled`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › glyph · rest destructive

- both densities: `shrink-0 size-icon text-danger`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-danger`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › glyph · pressed

- touch: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: Menu · open on touch

### item › label · rest

- both densities: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body} + MENU_LABEL {kind: act}`; overlay: `min-w-0 grow truncate`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › label · highlighted

- desktop: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body} + MENU_LABEL {kind: act}`; overlay: `min-w-0 grow truncate`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › label · blocked

- both densities: `truncate text-body leading-body font-normal text-ink-disabled`
  - cell: `TEXT {role: body} + MENU_LABEL {kind: act}`; overlay: `truncate text-ink-disabled`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › label · rest destructive

- both densities: `min-w-0 grow truncate text-body leading-body font-normal text-danger`
  - cell: `TEXT {role: body} + MENU_LABEL {kind: destructive}`; overlay: `min-w-0 grow truncate`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › label · pressed destructive

- desktop: `min-w-0 grow truncate text-body leading-body font-normal text-danger`
  - cell: `TEXT {role: body} + MENU_LABEL {kind: destructive}`; overlay: `min-w-0 grow truncate`
  - under: open · items without glyphs, the label alone; the pointer down on Delete deployment (pressed, the press wash)

### item › label · pressed

- touch: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body} + MENU_LABEL {kind: act}`; overlay: `min-w-0 grow truncate`
  - under: Menu · open on touch

### item › text · blocked

- both densities: `flex flex-col min-w-0 grow`
  - cell: none; overlay: `flex flex-col min-w-0 grow`
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### item › reason · blocked

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: open · the keyboard on Export as CSV (highlighted, the hover wash); glyphs at fit=body in meta ink; a blocked item inert, its label disabled, its reason under it…

### motion · enter; leave

- desktop, the popover on Base UI's `data-starting-style` and `data-ending-style`: `transition-[opacity,translate] duration-base ease-out data-starting-style:-translate-y-float data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-in`
  - cell: none; overlay: the string above; on touch the menu sheet moves as the bottom sheet (Sheet)

## Toast

Board 42.

### the layer (`TOASTS`, the Shell's or the Screen's) · rest

- desktop: `p-page gap-pair absolute inset-0 flex flex-col items-end justify-end pointer-events-none`
  - cell: `TOASTS`; overlay: `absolute inset-0 flex flex-col items-end justify-end pointer-events-none`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner
- touch: `p-page gap-pair absolute inset-0 flex flex-col items-center justify-end pointer-events-none`
  - cell: `TOASTS`; overlay: `absolute inset-0 flex flex-col items-center justify-end pointer-events-none`
  - under: Toast · stacked at the Screen's foot, centred at p-page; the frame bleeds to the board's edges so the toasts stand at a 390 screen's width (358); oldest on top

### toast · done; attention; failed

- both densities: `w-toast pl-card pr-pair py-pair gap-inside rounded-card bg-raised border border-edge-raised shadow-float flex items-center max-w-full pointer-events-auto`
  - cell: `TOAST`; overlay: `flex items-center max-w-full pointer-events-auto`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### glyph · done

- both densities: `size-icon text-ok shrink-0`
  - cell: `ICON {fit: body} + TOAST_STATE {state: done}`; overlay: `shrink-0`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### glyph · attention

- both densities: `size-icon text-warn shrink-0`
  - cell: `ICON {fit: body} + TOAST_STATE {state: attention}`; overlay: `shrink-0`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### glyph · failed

- both densities: `size-icon text-danger shrink-0`
  - cell: `ICON {fit: body} + TOAST_STATE {state: failed}`; overlay: `shrink-0`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### sentence · done; attention; failed

- both densities: `min-w-0 grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `min-w-0 grow`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### act (Button) · act=secondary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-body shrink-0`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### act › label · act=secondary

- both densities: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### dismiss (IconButton) · rest

- both densities: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### dismiss › glyph · rest

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: Toast · stacked where the Shell stands them, bottom right of the column at p-page, oldest on top, newest nearest the corner

### motion · enter; leave; close up

- both densities: the stack on Base UI's offset, `absolute bottom-0 right-0 -translate-y-[calc(var(--toast-offset-y)_+_var(--toast-index)_*_var(--spacing-pair))]` inside a `relative w-toast max-w-full` anchor; the motion `transition-[translate,transform,opacity] duration-base [transition-timing-function:var(--ease-in-out),var(--ease-out),var(--ease-out)] data-starting-style:[transform:translateY(var(--spacing-pair))] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-in`
  - cell: none; overlay: the strings above. The close-up runs on `translate` (ease-in-out) and the entry on `transform` and opacity (ease-out), so each keeps its own curve.

## EmptyState

Board 43.

### empty state (in page) · in=page

- both densities: `flex grow items-center justify-center`
  - cell: none; overlay: `flex grow items-center justify-center`
  - under: EmptyState · in a Place body, alone
- both densities: `flex flex-col items-center gap-fields w-full max-w-empty text-center self-center`
  - cell: `EMPTY_COLUMN`; overlay: `flex flex-col items-center text-center self-center`
  - under: EmptyState · in a Place body with children

### column · rest

- both densities: `flex flex-col items-center gap-fields w-full max-w-empty text-center`
  - cell: `EMPTY_COLUMN`; overlay: `flex flex-col items-center text-center`
  - under: EmptyState · in a Place body, alone

### mark · tone=rest

- both densities: `size-control rounded-full bg-fill-neutral inline-flex items-center justify-center shrink-0 text-ink-meta`
  - cell: `EMPTY_MARK`; overlay: `inline-flex items-center justify-center shrink-0 text-ink-meta`
  - under: EmptyState · in a Place body, alone

### mark · tone=failed

- both densities: `size-control rounded-full bg-fill-neutral inline-flex items-center justify-center shrink-0 text-danger`
  - cell: `EMPTY_MARK`; overlay: `inline-flex items-center justify-center shrink-0 text-danger`
  - under: error · the sentence and Retry in the Group's place, the section's frame (radius 8, hairline)

### mark › glyph · tone=rest; tone=failed

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: EmptyState · in a Place body, alone

### text · rest

- both densities: `flex flex-col items-center gap-pair`
  - cell: `EMPTY_TEXT`; overlay: `flex flex-col items-center`
  - under: EmptyState · in a Place body, alone

### text · empty

- desktop: `flex flex-col items-center gap-pair`
  - cell: `EMPTY_TEXT`; overlay: `flex flex-col items-center`
  - under: EmptyState · in a Split's empty main

### title · rest

- both densities: `text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: none
  - under: EmptyState · in a Place body, alone
- both densities: `text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: none
  - under: EmptyState · in a Section
- both densities: `text-title leading-title tracking-title font-semibold text-ink-body`
  - cell: `TEXT {role: title}`; overlay: none
  - under: EmptyState · first run (the onboarding row)

### title · empty

- desktop: `text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: none
  - under: EmptyState · in a Split's empty main

### sentence · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: EmptyState · in a Place body, alone

### sentence · empty

- desktop: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: EmptyState · in a Split's empty main

### act (Button) · fit=bar act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
  - under: EmptyState · in a Place body, alone

### act (Button) · fit=bar act=secondary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
  - under: EmptyState · in a Section

### act (Button) · fit=body act=primary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
  - under: EmptyState · first run (the onboarding row)

### act (Button) · fit=body act=secondary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
  - under: EmptyState · first run (the onboarding row)

### act › glyph · fit=bar act=primary

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: EmptyState · in a Place body, alone

### act › label · fit=bar act=primary; fit=body act=primary

- both densities: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`
  - under: EmptyState · in a Place body, alone

### act › label · fit=bar act=secondary; fit=body act=secondary

- both densities: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`
  - under: EmptyState · in a Section

### empty state (in section) · in=section

- both densities: `flex justify-center p-card rounded-card border border-edge`
  - cell: `EMPTY_FRAME`; overlay: `flex justify-center`
  - under: EmptyState · in a Section

### empty state (in first) · in=first

- both densities: `flex flex-col gap-fields w-full max-w-empty text-center`
  - cell: `EMPTY_COLUMN`; overlay: `flex flex-col text-center`
  - under: EmptyState · first run (the onboarding row)

### mark slot · in=first

- both densities: `flex justify-center`
  - cell: none; overlay: `flex justify-center`
  - under: EmptyState · first run (the onboarding row)

### acts · rest

- both densities: `flex flex-col gap-acts`
  - cell: none; overlay: `flex flex-col gap-acts`
  - under: EmptyState · first run (the onboarding row)

## QueryBoundary

Board 43.

### loading › the Section's count · rest

- both densities: `inline-flex shrink-0 min-h-chip min-w-chip rounded-full bg-skeleton`
  - cell: `SKELETON {kind: count}`; overlay: `inline-flex shrink-0`
  - under: loading · in a Section over a Group

### loading › skeleton row · rest

- both densities: `flex items-center gap-fields min-h-row-setting px-card py-pair`
  - cell: `SKELETON_ROW {kind: setting}`; overlay: `flex items-center`
  - under: loading · in a Section over a Group
- both densities: `flex items-center gap-inside min-h-row-2 px-control-x`
  - cell: `SKELETON_ROW {kind: two-line}`; overlay: `flex items-center`
  - under: loading · error · rest, in a Split's list (the list column three times, its hairline between)

### loading › skeleton lines · rest

- both densities: `flex grow min-w-0 flex-col gap-pair`
  - cell: `SKELETON_LINES`; overlay: `flex grow min-w-0 flex-col`
  - under: loading · in a Section over a Group
- both densities: `flex flex-col grow min-w-0 gap-pair`
  - cell: `SKELETON_LINES`; overlay: `flex flex-col grow min-w-0`
  - under: loading · error · rest, in a Split's list (the list column three times, its hairline between)

### loading › skeleton line · rest

- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: loading · in a Section over a Group
- both densities: `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: loading · in a Section over a Group
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: loading · in a Section over a Group
- both densities: `h-skeleton w-2/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-2/3`
  - under: loading · error · rest, in a Split's list (the list column three times, its hairline between)
- both densities: `h-skeleton w-3/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-3/4`
  - under: loading · error · rest, in a Split's list (the list column three times, its hairline between)

### loading › skeleton switch · rest

- both densities: `shrink-0 w-switch-w h-switch-h rounded-full bg-skeleton`
  - cell: `SKELETON {kind: switch}`; overlay: `shrink-0`
  - under: loading · in a Section over a Group

### loading › skeleton avatar · rest

- both densities: `shrink-0 size-avatar rounded-full bg-skeleton`
  - cell: `SKELETON {kind: avatar}`; overlay: `shrink-0`
  - under: loading · error · rest, in a Split's list (the list column three times, its hairline between)

## Banner

Board 43.

### banner · kind=warn

- both densities: `rounded-control px-control-x py-pair gap-pair text-body leading-body text-ink-body bg-warn-soft flex flex-col justify-center`
  - cell: `BANNER {kind: warn}`; overlay: `flex flex-col justify-center`
  - under: Banner · at the top of a Place body (warn), over the body's sections

### banner · kind=danger

- both densities: `rounded-control px-control-x py-pair gap-pair text-body leading-body text-ink-body bg-danger-soft flex flex-col justify-center`
  - cell: `BANNER {kind: danger}`; overlay: `flex flex-col justify-center`
  - under: Banner · inside a Section (danger), over the Group it speaks for

### banner · kind=note

- both densities: `rounded-control px-control-x py-pair gap-pair text-body leading-body text-ink-body bg-accent-soft flex flex-col justify-center`
  - cell: `BANNER {kind: note}`; overlay: `flex flex-col justify-center`
  - under: rest · note

### main · rest

- both densities: `gap-inside flex items-center touch:flex-col touch:items-start touch:gap-pair`
  - cell: `BANNER_MAIN`; overlay: `flex items-center touch:flex-col touch:items-start touch:gap-pair`
  - under: Banner · at the top of a Place body (warn), over the body's sections

### line · rest

- both densities: `gap-inside items-start flex grow min-w-0 touch:self-stretch`
  - cell: `BANNER_ROW`; overlay: `items-start flex grow min-w-0 touch:self-stretch`
  - under: Banner · at the top of a Place body (warn), over the body's sections

### glyph box · rest

- both densities: `flex shrink-0 items-center h-lh`
  - cell: none; overlay: `flex shrink-0 items-center h-lh`
  - under: Banner · at the top of a Place body (warn), over the body's sections

### glyph · rest

- both densities: `size-icon text-warn shrink-0`
  - cell: `ICON {fit: body} + BANNER_GLYPH {kind: warn}`; overlay: `shrink-0`
  - under: Banner · at the top of a Place body (warn), over the body's sections
- both densities: `size-icon text-danger shrink-0`
  - cell: `ICON {fit: body} + BANNER_GLYPH {kind: danger}`; overlay: `shrink-0`
  - under: Banner · inside a Section (danger), over the Group it speaks for
- both densities: `size-icon text-accent-ink shrink-0`
  - cell: `ICON {fit: body} + BANNER_GLYPH {kind: note}`; overlay: `shrink-0`
  - under: rest · note

### sentence · rest

- both densities: `min-w-0 grow text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `min-w-0 grow`
  - under: Banner · at the top of a Place body (warn), over the body's sections

### act slot · rest

- both densities: `flex shrink-0`
  - cell: none; overlay: `flex shrink-0`
  - under: Banner · at the top of a Place body (warn), over the body's sections

### act (Button) · fit=bar act=secondary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
  - under: Banner · at the top of a Place body (warn), over the body's sections

### act (Button) · blocked fit=bar act=secondary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-disabled`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
  - under: disabled · the act blocked; its reason announced, hidden until pressed

### act › label · fit=bar act=secondary; blocked fit=bar act=secondary

- both densities: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`
  - under: Banner · at the top of a Place body (warn), over the body's sections

### reason · rest

- both densities: `text-end touch:text-start text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `text-end touch:text-start`
  - under: disabled · the act blocked; its reason announced, hidden until pressed

## PendingBar

Board 43.

### bar · rest

- both densities: `flex flex-col items-end gap-pair touch:items-stretch`
  - cell: `PENDING_BAR`; overlay: `flex flex-col items-end touch:items-stretch`
  - under: PendingBar · over a Form's foot, in the ActionBar's place

### row · rest

- both densities: `flex items-center gap-acts self-stretch touch:flex-col touch:items-stretch`
  - cell: `PENDING_ROW`; overlay: `flex items-center self-stretch touch:flex-col touch:items-stretch`
  - under: PendingBar · over a Form's foot, in the ActionBar's place

### track · rest

- both densities: `rounded-control bg-group min-h-control px-control-x gap-inside relative flex items-center grow min-w-0 overflow-hidden`
  - cell: `PENDING_TRACK`; overlay: `relative flex items-center grow min-w-0 overflow-hidden`
  - under: PendingBar · over a Form's foot, in the ActionBar's place

### fill · rest

- both densities: `h-track bg-ink-meta absolute bottom-0 left-0 w-1/3`
  - cell: `PENDING_FILL`; overlay: `absolute bottom-0 left-0 w-1/3`
  - under: PendingBar · over a Form's foot, in the ActionBar's place
- both densities: `h-track bg-ink-meta absolute bottom-0 left-0 w-2/3`
  - cell: `PENDING_FILL`; overlay: `absolute bottom-0 left-0 w-2/3`
  - under: rest · until
- both densities: `h-track bg-ink-meta absolute bottom-0 left-0 w-1/4`
  - cell: `PENDING_FILL`; overlay: `absolute bottom-0 left-0 w-1/4`
  - under: rest · a sentence longer than the bar truncates; the time and the act keep their place

### sentence · rest

- both densities: `relative min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `relative min-w-0 grow truncate`
  - under: PendingBar · over a Form's foot, in the ActionBar's place

### time left · rest

- both densities: `relative shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `PENDING_LEFT`; overlay: `relative shrink-0`
  - under: PendingBar · over a Form's foot, in the ActionBar's place

### act (Button) · fit=body act=secondary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
  - under: PendingBar · over a Form's foot, in the ActionBar's place

### act (Button) · blocked fit=body act=secondary

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-disabled`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
  - under: disabled · the act blocked; its reason announced, hidden until pressed

### act › label · fit=body act=secondary; blocked fit=body act=secondary

- both densities: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`
  - under: PendingBar · over a Form's foot, in the ActionBar's place

### spinner (Spinner) · rest

- both densities: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
  - under: PendingBar · at the page's end, the body's last child after its sections

### spinner › track · rest

- both densities: `absolute inset-0 rounded-full border-2 opacity-30 border-ink-meta`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-ink-meta`
  - under: PendingBar · at the page's end, the body's last child after its sections

### spinner › arc · rest

- both densities: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-ink-meta`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-ink-meta`
  - under: PendingBar · at the page's end, the body's last child after its sections

### reason · rest

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: disabled · the act blocked; its reason announced, hidden until pressed
