# Atoms: the overlay notes

The Stage 2 atoms' approved artboards (`plugins/react-ui/design/1*-*-desktop.dc.html`, boards 10 to 14,
approved 2026-09-30) split into the ui-core cells and what each plugin composes over them. This
file is what the React step copies: for every part of every drawn cell and state, the board's
class string verbatim, the ui-core cell it now draws, and the overlay, which is the board string
less the cell. Generated from the light column of each desktop board; the dark column and the
touch board spell the same strings.

## How to read an overlay

- A board draws each state statically. A rest overlay (display, alignment, flex sizing,
  truncation, positioning) is unconditional. Under any other state, the classes that differ from
  the same cell's rest are that state's, spelled under its web variant: `hover:`, `active:`,
  `focus-visible:`, `disabled:` or `aria-disabled:`, and the pending act's `aria-busy`. The
  component composes cell then overlay through `cn()`, so an overlay colour replaces the cell's.
- Focus: the board draws `outline-2 outline-offset-2 outline-ring` on the focused part; the web
  base `:focus-visible` rule draws that ring, so a component spells nothing for it. A control
  inside another control (the chip's remove act, the in-field act) rings inset: its focus is the
  `focus-visible:-outline-offset-2` overlay. A switch or checkbox is focused on its hit box and
  rings its drawn control: `group-focus-visible/toggle:outline-2` (`outline-offset-2`, `outline-ring`
  alike) on the track or box, `outline-none` on the hit box.
- A labelled act's ink sits on its fill (`BUTTON`, `CHIP`) so the web glyph and spinner take it
  as currentColor, and on its label (`BUTTON_LABEL`, `CHIP_LABEL`) since a native Text inherits
  none. The board swaps a disabled act's ink on the button alone; the label's own ink is swapped
  with it (`text-ink-disabled` on the label under the same condition).
- A pending act is inert: `aria-busy="true" aria-disabled="true"`, never `disabled` (it keeps
  focus), the act's `-pending` fill, the label and the glyph at `opacity-0` so the accessible name
  survives, and the Spinner centred over them in `absolute inset-0 flex items-center
  justify-center`.
- `Icon` and `Spinner` draw the ink of their place: the board spells it on each (`text-ink-meta`
  on a glyph, `border-on-act-accent` on a primary act's spinner) and neither atom takes a tone.
- A hover or press wash on a filled box (the unchecked checkbox, the slider thumb) is a child
  layer, `absolute inset-0 bg-wash-hover` or `bg-wash-press`, inside the box's `relative
  overflow-hidden`.
- A disabled control answers no pointer: its hover and press are guarded by the state Base UI
  sets on its hit box, `group-not-aria-disabled/toggle:group-hover/toggle:bg-switch-off-hover` (and
  `group-active/toggle:`, and `bg-toggle-on-hover` on the switch's on track), the checkbox wash
  `group-not-aria-disabled/toggle:group-hover/toggle:bg-wash-hover
  group-not-aria-disabled/toggle:group-active/toggle:bg-wash-press`, the
  slider thumb's `not-in-data-disabled:group-hover:bg-wash-hover
  not-in-data-disabled:group-active:bg-wash-press`.
- The in-field act is `ICON_BUTTON {fit: field}` with `shrink-0 focus-visible:-outline-offset-2`
  over it; in a disabled field it is `aria-disabled` in `text-ink-disabled` and takes no wash.
  The field box rings on its value's focus alone:
  `not-has-[button:focus-visible]:has-focus-visible:outline-2` (`outline-offset-2`,
  `outline-ring` alike), so the act's focus rings the act only. The box's hover is guarded the same
  way, `not-has-[button:hover]:hover:border-edge-hover`, so the act's pointer washes the act and
  the box keeps `edge`.
- A text area's value stands at least three body lines (`TEXT_AREA_VALUE`, `min-h-text-area`)
  and grows with its value (`field-sizing-content`), where the board spells `rows`.
- Context the atoms do not own: a field's label, description and error message are `FormField`'s;
  the slider's and the switch's settings row (`min-h-row-setting px-card py-pair`, split by
  `border-t border-edge`) is the settings row's; the code block's `p-card overflow-x-auto` is
  `Code`'s; the chip drawn on the text board is context, and the marks board is `Chip`'s.

## Button

Board: `10-acts-desktop.dc.html` (the touch board draws the same strings). A plain Button is the button alone; a blocked one is drawn inside the `stack` with its reason hidden from the start, so the tree holds when the reason appears (once pressed, or once its form or sheet is touched); the glyph is `Icon {fit: control}`, in the act's ink as currentColor, inside a `shrink-0` span that takes the pending `opacity-0`.

### act=primary fit=body · rest

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=primary · the accent fill, the default act; one per screen

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=body · hover

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=primary · the accent fill, the default act; one per screen

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent-hover text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=body · focus

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=primary · the accent fill, the default act; one per screen

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent text-on-act-accent outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=body · active

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=primary · the accent fill, the default act; one per screen

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent-press text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=body · disabled

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=primary · the accent fill, the default act; one per screen

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=body · blocked, pressed

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=primary · the accent fill, the default act; one per screen

- stack: `flex flex-col items-start gap-pair`
  - cell: none; overlay: `flex flex-col items-start gap-pair`
- button (aria-disabled): `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`
- reason: `text-meta leading-meta font-normal text-ink-error`
  - cell: `TEXT {role: meta}`; overlay: `text-ink-error`

### act=primary fit=body · loading

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=primary · the accent fill, the default act; one per screen

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-accent`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-accent`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-accent`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-accent`

### act=danger fit=body · rest

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=danger · the danger fill, a confirm's one filled act

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=body · hover

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=danger · the danger fill, a confirm's one filled act

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger-hover text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=body · focus

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=danger · the danger fill, a confirm's one filled act

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger text-on-act-danger outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=body · active

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=danger · the danger fill, a confirm's one filled act

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger-press text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=body · disabled

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=danger · the danger fill, a confirm's one filled act

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=body · blocked, pressed

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=danger · the danger fill, a confirm's one filled act

- stack: `flex flex-col items-start gap-pair`
  - cell: none; overlay: `flex flex-col items-start gap-pair`
- button (aria-disabled): `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`
- reason: `text-meta leading-meta font-normal text-ink-error`
  - cell: `TEXT {role: meta}`; overlay: `text-ink-error`

### act=danger fit=body · loading

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=danger · the danger fill, a confirm's one filled act

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger-pending text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-pending`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-danger`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-danger`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-danger`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-danger`

### act=secondary fit=body · rest

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=secondary · the hairline, no fill of its own

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=body · hover

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=secondary · the hairline, no fill of its own

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge bg-wash-hover text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-wash-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=body · focus

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=secondary · the hairline, no fill of its own

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=body · active

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=secondary · the hairline, no fill of its own

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge bg-wash-press text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-wash-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=body · disabled

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=secondary · the hairline, no fill of its own

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-disabled`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=body · blocked, pressed

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=secondary · the hairline, no fill of its own

- stack: `flex flex-col items-start gap-pair`
  - cell: none; overlay: `flex flex-col items-start gap-pair`
- button (aria-disabled): `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-disabled`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`
- reason: `text-meta leading-meta font-normal text-ink-error`
  - cell: `TEXT {role: meta}`; overlay: `text-ink-error`

### act=secondary fit=body · loading

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=secondary · the hairline, no fill of its own

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-ink-body`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-ink-body`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-ink-body`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-ink-body`

### act=destructive fit=body · rest

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=destructive · the secondary with its label in danger, for rows and menus

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-danger`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=body · hover

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=destructive · the secondary with its label in danger, for rows and menus

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge bg-wash-hover text-danger`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-wash-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=body · focus

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=destructive · the secondary with its label in danger, for rows and menus

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-danger outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=body · active

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=destructive · the secondary with its label in danger, for rows and menus

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge bg-wash-press text-danger`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-wash-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=body · disabled

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=destructive · the secondary with its label in danger, for rows and menus

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-disabled`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=body · blocked, pressed

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=destructive · the secondary with its label in danger, for rows and menus

- stack: `flex flex-col items-start gap-pair`
  - cell: none; overlay: `flex flex-col items-start gap-pair`
- button (aria-disabled): `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-disabled`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`
- reason: `text-meta leading-meta font-normal text-ink-error`
  - cell: `TEXT {role: meta}`; overlay: `text-ink-error`

### act=destructive fit=body · loading

Under: Light · Button, fit=body, every act in every state, on canvas, surface and group / act=destructive · the secondary with its label in danger, for rows and menus

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-danger`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-danger`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-danger`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-danger`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-danger`

### act=primary fit=bar · rest

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=bar · hover

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent-hover text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=bar · focus

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent text-on-act-accent outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=bar · active

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent-press text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=bar · disabled

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=bar · loading

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-accent`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-accent`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-accent`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-accent`

### act=danger fit=bar · rest

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-danger text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=bar · hover

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-danger-hover text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=bar · focus

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-danger text-on-act-danger outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: danger, fit: bar}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=bar · active

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-danger-press text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=bar · disabled

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: danger, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=bar · loading

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-danger-pending text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-pending`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-danger`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-danger`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-danger`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-danger`

### act=secondary fit=bar · rest

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=bar · hover

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge bg-wash-hover text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-wash-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=bar · focus

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-body outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=bar · active

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge bg-wash-press text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-wash-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=bar · disabled

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-disabled`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=bar · loading

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-ink-body`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-ink-body`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-ink-body`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-ink-body`

### act=destructive fit=bar · rest

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-danger`
  - cell: `BUTTON {act: destructive, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=bar · hover

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge bg-wash-hover text-danger`
  - cell: `BUTTON {act: destructive, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-wash-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=bar · focus

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-danger outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: destructive, fit: bar}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=bar · active

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge bg-wash-press text-danger`
  - cell: `BUTTON {act: destructive, fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-wash-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=bar · disabled

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-disabled`
  - cell: `BUTTON {act: destructive, fit: bar}`; overlay: `relative inline-flex items-center justify-center text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=bar · loading

Under: Light · Button, fit=bar, a top bar's or a toolbar's act, on canvas

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-danger`
  - cell: `BUTTON {act: destructive, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-danger`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-danger`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-danger`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-danger`

### act=primary fit=body with a glyph · rest

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=body with a glyph · focus

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent text-on-act-accent outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=body with a glyph · loading

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
- glyph (Icon): `size-icon-control shrink-0 opacity-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0 opacity-0`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-accent`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-accent`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-accent`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-accent`

### act=primary fit=bar with a glyph · rest

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=danger fit=body with a glyph · rest

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=body with a glyph · focus

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger text-on-act-danger outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=body with a glyph · loading

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control bg-act-danger-pending text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: body}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-pending`
- glyph (Icon): `size-icon-control shrink-0 opacity-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0 opacity-0`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-danger`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-danger`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-danger`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-danger`

### act=danger fit=bar with a glyph · rest

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact bg-act-danger text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=secondary fit=body with a glyph · rest

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=body with a glyph · focus

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=secondary fit=body with a glyph · loading

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0 opacity-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0 opacity-0`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-ink-body`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-ink-body`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-ink-body`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-ink-body`

### act=secondary fit=bar with a glyph · rest

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`

### act=destructive fit=body with a glyph · rest

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-danger`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=body with a glyph · focus

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-danger outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=destructive fit=body with a glyph · loading

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control border border-edge text-danger`
  - cell: `BUTTON {act: destructive, fit: body}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0 opacity-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0 opacity-0`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-danger`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-danger`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-danger`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-danger`

### act=destructive fit=bar with a glyph · rest

Under: Light · Button with a leading icon: icon then label, the gap inside; pending hides both and keeps the box

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact border border-edge text-danger`
  - cell: `BUTTON {act: destructive, fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: destructive}`; overlay: `truncate`

### act=primary fit=field · rest

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=primary · a login's Continue

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: field}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=primary fit=field · loading

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=primary · a login's Continue

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-accent-pending text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: field}`; overlay: `relative inline-flex items-center justify-center bg-act-accent-pending`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-accent`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-accent`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-accent`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-accent`

### act=primary fit=field · disabled

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=primary · a login's Continue

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: field}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`

### act=danger fit=field · rest

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=danger · a type-to-confirm dialog's Delete, every state

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-danger text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: field}`; overlay: `relative inline-flex items-center justify-center`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=field · hover

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=danger · a type-to-confirm dialog's Delete, every state

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-danger-hover text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: field}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-hover`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=field · focus

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=danger · a type-to-confirm dialog's Delete, every state

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-danger text-on-act-danger outline-2 outline-offset-2 outline-ring`
  - cell: `BUTTON {act: danger, fit: field}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=field · active

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=danger · a type-to-confirm dialog's Delete, every state

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-danger-press text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: field}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-press`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=field · disabled

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=danger · a type-to-confirm dialog's Delete, every state

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: danger, fit: field}`; overlay: `relative inline-flex items-center justify-center bg-fill-disabled text-ink-disabled`
- label: `truncate text-body leading-body font-medium`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate`

### act=danger fit=field · loading

Under: Light · Button, fit=field: full width at the field's height, a login's Continue under its input / act=danger · a type-to-confirm dialog's Delete, every state

- button: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-field w-full bg-act-danger-pending text-on-act-danger`
  - cell: `BUTTON {act: danger, fit: field}`; overlay: `relative inline-flex items-center justify-center bg-act-danger-pending`
- label: `truncate text-body leading-body font-medium opacity-0`
  - cell: `BUTTON_LABEL {act: danger}`; overlay: `truncate opacity-0`
- spinner layer: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-danger`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-danger`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-danger`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-danger`

## IconButton

Board: `10-acts-desktop.dc.html` (the touch board draws the same strings).

### fit=body · rest

Under: Light · IconButton: icon only, square, no boundary at rest; the wash is its ground / fit=body · square at control

- button: `relative inline-flex items-center justify-center rounded-control size-control text-ink-meta`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### fit=body · hover

Under: Light · IconButton: icon only, square, no boundary at rest; the wash is its ground / fit=body · square at control

- button: `relative inline-flex items-center justify-center rounded-control size-control bg-wash-hover text-ink-body`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center bg-wash-hover text-ink-body`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### fit=body · focus

Under: Light · IconButton: icon only, square, no boundary at rest; the wash is its ground / fit=body · square at control

- button: `relative inline-flex items-center justify-center rounded-control size-control text-ink-meta outline-2 outline-offset-2 outline-ring`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### fit=body · active

Under: Light · IconButton: icon only, square, no boundary at rest; the wash is its ground / fit=body · square at control

- button: `relative inline-flex items-center justify-center rounded-control size-control bg-wash-press text-ink-body`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center bg-wash-press text-ink-body`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### fit=bar · rest

Under: Light · IconButton: icon only, square, no boundary at rest; the wash is its ground / fit=bar · square at control-compact

- button: `relative inline-flex items-center justify-center rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### fit=bar · hover

Under: Light · IconButton: icon only, square, no boundary at rest; the wash is its ground / fit=bar · square at control-compact

- button: `relative inline-flex items-center justify-center rounded-control size-control-compact bg-wash-hover text-ink-body`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-wash-hover text-ink-body`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### fit=bar · focus

Under: Light · IconButton: icon only, square, no boundary at rest; the wash is its ground / fit=bar · square at control-compact

- button: `relative inline-flex items-center justify-center rounded-control size-control-compact text-ink-meta outline-2 outline-offset-2 outline-ring`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### fit=bar · active

Under: Light · IconButton: icon only, square, no boundary at rest; the wash is its ground / fit=bar · square at control-compact

- button: `relative inline-flex items-center justify-center rounded-control size-control-compact bg-wash-press text-ink-body`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center bg-wash-press text-ink-body`
- glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

## Link

Board: `10-acts-desktop.dc.html` (the touch board draws the same strings). The board holds the standalone link in an inline `span`; the component spells `w-fit` over `inline-flex items-center` instead, so its box keeps to its words in a stretching parent.

### fit=inline · rest

Under: Light · Link: accent-ink at 500; inline underlined at rest and plain on hover, standalone plain at rest and underlined on hover, 24 tall / states, on canvas

- a: `font-medium text-accent-ink underline`
  - cell: `LINK {fit: inline}`; overlay: none

### fit=standalone · rest

Under: Light · Link: accent-ink at 500; inline underlined at rest and plain on hover, standalone plain at rest and underlined on hover, 24 tall / states, on canvas

- a: `inline-flex items-center min-h-target font-medium text-accent-ink`
  - cell: `LINK {fit: standalone}`; overlay: `inline-flex items-center`

### fit=inline · hover

Under: Light · Link: accent-ink at 500; inline underlined at rest and plain on hover, standalone plain at rest and underlined on hover, 24 tall / states, on canvas

- a: `font-medium text-accent-ink`
  - cell: `LINK {fit: inline}`; overlay: none

### fit=standalone · hover

Under: Light · Link: accent-ink at 500; inline underlined at rest and plain on hover, standalone plain at rest and underlined on hover, 24 tall / states, on canvas

- a: `inline-flex items-center min-h-target font-medium text-accent-ink underline`
  - cell: `LINK {fit: standalone}`; overlay: `inline-flex items-center underline`

### fit=inline · focus

Under: Light · Link: accent-ink at 500; inline underlined at rest and plain on hover, standalone plain at rest and underlined on hover, 24 tall / states, on canvas

- a: `font-medium text-accent-ink underline outline-2 outline-offset-2 outline-ring`
  - cell: `LINK {fit: inline}`; overlay: `outline-2 outline-offset-2 outline-ring`

### fit=standalone · focus

Under: Light · Link: accent-ink at 500; inline underlined at rest and plain on hover, standalone plain at rest and underlined on hover, 24 tall / states, on canvas

- a: `inline-flex items-center min-h-target font-medium text-accent-ink outline-2 outline-offset-2 outline-ring`
  - cell: `LINK {fit: standalone}`; overlay: `inline-flex items-center outline-2 outline-offset-2 outline-ring`

### fit=inline · active

Under: Light · Link: accent-ink at 500; inline underlined at rest and plain on hover, standalone plain at rest and underlined on hover, 24 tall / states, on canvas

- a: `font-medium text-accent-ink`
  - cell: `LINK {fit: inline}`; overlay: none

### fit=standalone · active

Under: Light · Link: accent-ink at 500; inline underlined at rest and plain on hover, standalone plain at rest and underlined on hover, 24 tall / states, on canvas

- a: `inline-flex items-center min-h-target font-medium text-accent-ink underline`
  - cell: `LINK {fit: standalone}`; overlay: `inline-flex items-center underline`

## Text

Board: `11-text-desktop.dc.html` (the touch board draws the same strings). A `Text` inside another is a run of its line: a `span` carrying only `TEXT_STRONG` of the line's role when strong, the line's role taken over its own.

### role=title · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use

- h1: `text-title leading-title tracking-title font-semibold text-ink-body`
  - cell: `TEXT {role: title}`; overlay: none

### role=meta · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use

- p: `text-meta leading-meta font-normal text-ink-meta max-w-measure`
  - cell: `TEXT {role: meta}`; overlay: `max-w-measure`

### role=heading · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use

- h2: `text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: none

### role=body · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use

- p: `text-body leading-body font-normal text-ink-body max-w-measure`
  - cell: `TEXT {role: body}`; overlay: `max-w-measure`

### role=body strong · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use

- span: `font-medium`
  - cell: `TEXT {role: body} + TEXT_STRONG`; overlay: none

### role=code (inline) · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use

- code: `text-code leading-code font-normal text-ink-body font-mono whitespace-nowrap`
  - cell: `TEXT {role: code}`; overlay: `whitespace-nowrap`

### role=meta · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use

- p: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none

### role=display · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use / Requests today

- p: `text-display leading-display tracking-display font-medium text-ink-body tabular-nums`
  - cell: `TEXT {role: display}`; overlay: none

### role=meta strong · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use / strong: the table header (meta 500) and the leading cell (body 500); caption inside the chip

- span: `truncate text-meta leading-meta font-medium text-ink-meta`
  - cell: `TEXT {role: meta} + TEXT_STRONG`; overlay: `truncate`

### role=body strong · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use / strong: the table header (meta 500) and the leading cell (body 500); caption inside the chip

- span: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG`; overlay: `truncate`

### role=code (block) · rest

Under: Text · title, heading, body, meta, strong, display, caption and code, in use / code: inline above, a block here

- pre: `p-card overflow-x-auto text-code leading-code font-normal text-ink-body font-mono`
  - cell: `TEXT {role: code}`; overlay: `p-card overflow-x-auto`

## Icon

Board: `11-text-desktop.dc.html` (the touch board draws the same strings).

### fit=body · rest

Under: Icon · the size follows the text it sits beside; stroke 2 on the 24 grid, currentColor / beside body: a place's leading glyph, 14 in ink-meta (ink-body on the selected row)

- svg: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`

### fit=body · rest

Under: Icon · the size follows the text it sits beside; stroke 2 on the 24 grid, currentColor / beside body: a place's leading glyph, 14 in ink-meta (ink-body on the selected row)

- svg: `shrink-0 size-icon text-ink-body`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-body`

### fit=meta · rest

Under: Icon · the size follows the text it sits beside; stroke 2 on the 24 grid, currentColor / beside meta, 12

- svg: `shrink-0 size-icon-meta text-ink-meta`
  - cell: `ICON {fit: meta}`; overlay: `shrink-0 text-ink-meta`

### fit=control · rest

Under: Icon · the size follows the text it sits beside; stroke 2 on the 24 grid, currentColor / inside a control, 16: an act's leading glyph and an icon act

- svg: `shrink-0 size-icon-control text-ink-meta`
  - cell: `ICON {fit: control}`; overlay: `shrink-0 text-ink-meta`

## Count

Board: `11-text-desktop.dc.html` (the touch board draws the same strings).

### count · rest

Under: Count · caption, tabular numerals, a pill on one grey step / in a place's row: rest, selected (on the selection wash), a three-digit value, zero

- pill: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip px-inside rounded-full bg-fill-neutral`
  - cell: `COUNT`; overlay: `inline-flex items-center justify-center shrink-0`
- figures: `text-caption leading-caption tracking-caption font-normal text-ink-meta tabular-nums`
  - cell: `COUNT_LABEL`; overlay: none

## Spinner

Board: `11-text-desktop.dc.html` (the touch board draws the same strings). The box is `aria-hidden` with no role or name, as the board draws it: its owner announces the wait (an act through `aria-busy`, a page wait through its own status).

### spinner · rest

Under: Spinner · a ring the size of the glyph it replaces, 2 px, its colour the ink of the place / inside an act: rest beside loading, the box kept; the accent fill carries its label's ink, the hairline act ink-meta

- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-on-act-accent`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-on-act-accent`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-on-act-accent`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-on-act-accent`

### spinner · rest

Under: Spinner · a ring the size of the glyph it replaces, 2 px, its colour the ink of the place / inside an act: rest beside loading, the box kept; the accent fill carries its label's ink, the hairline act ink-meta

- spinner box: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
- spinner track: `absolute inset-0 rounded-full border-2 opacity-30 border-ink-meta`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-ink-meta`
- spinner arc: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-ink-meta`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-ink-meta`

## Avatar

Board: `11-text-desktop.dc.html` (the touch board draws the same strings).

### step=1 · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- circle: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-1`
  - cell: `AVATAR {step: 1}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
- initials: `text-caption leading-caption tracking-caption font-medium text-avatar-1-ink`
  - cell: `AVATAR_LABEL {step: 1}`; overlay: none

### step=2 · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- circle: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-2`
  - cell: `AVATAR {step: 2}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
- initials: `text-caption leading-caption tracking-caption font-medium text-avatar-2-ink`
  - cell: `AVATAR_LABEL {step: 2}`; overlay: none

### step=3 · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- circle: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-3`
  - cell: `AVATAR {step: 3}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
- initials: `text-caption leading-caption tracking-caption font-medium text-avatar-3-ink`
  - cell: `AVATAR_LABEL {step: 3}`; overlay: none

### step=4 · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- circle: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-4`
  - cell: `AVATAR {step: 4}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
- initials: `text-caption leading-caption tracking-caption font-medium text-avatar-4-ink`
  - cell: `AVATAR_LABEL {step: 4}`; overlay: none

### step=5 · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- circle: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-5`
  - cell: `AVATAR {step: 5}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
- initials: `text-caption leading-caption tracking-caption font-medium text-avatar-5-ink`
  - cell: `AVATAR_LABEL {step: 5}`; overlay: none

### step=6 · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- circle: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-6`
  - cell: `AVATAR {step: 6}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
- initials: `text-caption leading-caption tracking-caption font-medium text-avatar-6-ink`
  - cell: `AVATAR_LABEL {step: 6}`; overlay: none

### step=7 · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- circle: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-7`
  - cell: `AVATAR {step: 7}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
- initials: `text-caption leading-caption tracking-caption font-medium text-avatar-7-ink`
  - cell: `AVATAR_LABEL {step: 7}`; overlay: none

### step=8 · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- circle: `inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full size-avatar bg-avatar-8`
  - cell: `AVATAR {step: 8}`; overlay: `inline-flex items-center justify-center shrink-0 overflow-hidden`
- initials: `text-caption leading-caption tracking-caption font-medium text-avatar-8-ink`
  - cell: `AVATAR_LABEL {step: 8}`; overlay: none

### image · rest

Under: Avatar · a full circle at the avatar size, initials in caption 500 on the step's fill / the eight steps with two-letter initials, then the image form; on canvas and on surface

- img: `shrink-0 rounded-full size-avatar object-cover`
  - cell: `AVATAR (base)`; overlay: `shrink-0 object-cover`

## Status

Board: `12-marks-desktop.dc.html` (the touch board draws the same strings).

### state=active · rest

Under: Status, the six states on canvas: dot in the status colour, the word in meta ink

- status: `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-accent-ink`
  - cell: `STATUS_DOT {state: active}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=waiting · rest

Under: Status, the six states on canvas: dot in the status colour, the word in meta ink

- status: `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-ink-meta`
  - cell: `STATUS_DOT {state: waiting}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=done · rest

Under: Status, the six states on canvas: dot in the status colour, the word in meta ink

- status: `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-ok`
  - cell: `STATUS_DOT {state: done}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=attention · rest

Under: Status, the six states on canvas: dot in the status colour, the word in meta ink

- status: `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-warn`
  - cell: `STATUS_DOT {state: attention}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=failed · rest

Under: Status, the six states on canvas: dot in the status colour, the word in meta ink

- status: `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-danger`
  - cell: `STATUS_DOT {state: failed}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=idle · rest

Under: Status, the six states on canvas: dot in the status colour, the word in meta ink

- status: `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 border border-ink-meta`
  - cell: `STATUS_DOT {state: idle}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=active with onOpen · rest

Under: Status with onOpen, active: rest, hover, focus, active / rest

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-accent-ink`
  - cell: `STATUS_DOT {state: active}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=active with onOpen · hover

Under: Status with onOpen, active: rest, hover, focus, active / hover

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target bg-wash-hover`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0 bg-wash-hover`
- dot: `size-dot rounded-full shrink-0 bg-accent-ink`
  - cell: `STATUS_DOT {state: active}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=active with onOpen · focus

Under: Status with onOpen, active: rest, hover, focus, active / focus

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target outline-2 outline-offset-2 outline-ring`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0 outline-2 outline-offset-2 outline-ring`
- dot: `size-dot rounded-full shrink-0 bg-accent-ink`
  - cell: `STATUS_DOT {state: active}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=active with onOpen · active

Under: Status with onOpen, active: rest, hover, focus, active / active

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target bg-wash-press`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0 bg-wash-press`
- dot: `size-dot rounded-full shrink-0 bg-accent-ink`
  - cell: `STATUS_DOT {state: active}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=failed with onOpen · rest

Under: Status with onOpen, failed: rest, hover, focus, active / rest

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-danger`
  - cell: `STATUS_DOT {state: failed}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=failed with onOpen · hover

Under: Status with onOpen, failed: rest, hover, focus, active / hover

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target bg-wash-hover`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0 bg-wash-hover`
- dot: `size-dot rounded-full shrink-0 bg-danger`
  - cell: `STATUS_DOT {state: failed}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=failed with onOpen · focus

Under: Status with onOpen, failed: rest, hover, focus, active / focus

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target outline-2 outline-offset-2 outline-ring`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0 outline-2 outline-offset-2 outline-ring`
- dot: `size-dot rounded-full shrink-0 bg-danger`
  - cell: `STATUS_DOT {state: failed}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=failed with onOpen · active

Under: Status with onOpen, failed: rest, hover, focus, active / active

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target bg-wash-press`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0 bg-wash-press`
- dot: `size-dot rounded-full shrink-0 bg-danger`
  - cell: `STATUS_DOT {state: failed}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=done with onOpen · rest

Under: Status with onOpen in a row's trailing slot

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-ok`
  - cell: `STATUS_DOT {state: done}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

### state=attention with onOpen · rest

Under: Status with onOpen in a row's trailing slot

- button: `inline-flex items-center min-w-0 gap-inside rounded-full px-inside -mx-inside min-h-target`
  - cell: `STATUS + STATUS_OPEN`; overlay: `inline-flex items-center min-w-0`
- dot: `size-dot rounded-full shrink-0 bg-warn`
  - cell: `STATUS_DOT {state: attention}`; overlay: `shrink-0`
- word: `truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`

## Chip

Board: `12-marks-desktop.dc.html` (the touch board draws the same strings).

### family=violet trailing=none · rest

Under: Status in a table cell, beside a Chip; fixed layout, a 90-character name truncates

- chip: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-violet-soft text-chip-violet-ink`
  - cell: `CHIP {family: violet, trailing: none}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: violet}`; overlay: `truncate`

### family=red trailing=none · rest

Under: Status in a table cell, beside a Chip; fixed layout, a 90-character name truncates

- chip: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-red-soft text-chip-red-ink`
  - cell: `CHIP {family: red, trailing: none}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: red}`; overlay: `truncate`

### family=green trailing=none · rest

Under: Status in a table cell, beside a Chip; fixed layout, a 90-character name truncates

- chip: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-green-soft text-chip-green-ink`
  - cell: `CHIP {family: green, trailing: none}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: green}`; overlay: `truncate`

### family=teal trailing=none · rest

Under: Status in a table cell, beside a Chip; fixed layout, a 90-character name truncates

- chip: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-teal-soft text-chip-teal-ink`
  - cell: `CHIP {family: teal, trailing: none}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: teal}`; overlay: `truncate`

### family=pink trailing=none · rest

Under: Status in a table cell, beside a Chip; fixed layout, a 90-character name truncates

- chip: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-pink-soft text-chip-pink-ink`
  - cell: `CHIP {family: pink, trailing: none}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: pink}`; overlay: `truncate`

### family=amber trailing=none · rest

Under: Status in a table cell, beside a Chip; fixed layout, a 90-character name truncates

- chip: `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-amber-soft text-chip-amber-ink`
  - cell: `CHIP {family: amber, trailing: none}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: amber}`; overlay: `truncate`

### family=violet trailing=remove · rest

Under: Chip, removable: the remove mark in a round hit box the chip's height; rest, hover, focus (inset), active / rest

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-violet-soft text-chip-violet-ink`
  - cell: `CHIP {family: violet, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: violet}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

### family=violet trailing=remove · hover

Under: Chip, removable: the remove mark in a round hit box the chip's height; rest, hover, focus (inset), active / hover

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-violet-soft text-chip-violet-ink`
  - cell: `CHIP {family: violet, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: violet}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full bg-wash-hover`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0 bg-wash-hover`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

### family=violet trailing=remove · focus

Under: Chip, removable: the remove mark in a round hit box the chip's height; rest, hover, focus (inset), active / focus, inset

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-violet-soft text-chip-violet-ink`
  - cell: `CHIP {family: violet, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: violet}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full outline-2 -outline-offset-2 outline-ring`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0 outline-2 -outline-offset-2 outline-ring`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

### family=violet trailing=remove · active

Under: Chip, removable: the remove mark in a round hit box the chip's height; rest, hover, focus (inset), active / active

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-violet-soft text-chip-violet-ink`
  - cell: `CHIP {family: violet, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: violet}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full bg-wash-press`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0 bg-wash-press`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

### family=red trailing=remove · rest

Under: Chip row that wraps, removable

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-red-soft text-chip-red-ink`
  - cell: `CHIP {family: red, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: red}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

### family=amber trailing=remove · rest

Under: Chip row that wraps, removable

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-amber-soft text-chip-amber-ink`
  - cell: `CHIP {family: amber, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: amber}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

### family=green trailing=remove · rest

Under: Chip row that wraps, removable

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-green-soft text-chip-green-ink`
  - cell: `CHIP {family: green, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: green}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

### family=teal trailing=remove · rest

Under: Chip row that wraps, removable

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-teal-soft text-chip-teal-ink`
  - cell: `CHIP {family: teal, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: teal}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

### family=pink trailing=remove · rest

Under: Chip row that wraps, removable

- chip: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-pink-soft text-chip-pink-ink`
  - cell: `CHIP {family: pink, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
- label: `truncate max-w-chip-label text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: pink}`; overlay: `truncate`
- remove act: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0`
- remove glyph (Icon): `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none

## Input

Board: `13-fields-desktop.dc.html` (the touch board draws the same strings).

### kind=text trailing=none · rest

Under: Input, kind text / Workspace URL

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center`
- placeholder: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`

### kind=text trailing=none · rest

Under: Input, kind text / Workspace URL

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`

### kind=text trailing=none · hover

Under: Input, kind text / Workspace URL

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge-hover bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center border-edge-hover`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`

### kind=text trailing=none · focus

Under: Input, kind text / Workspace URL

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center outline-2 outline-offset-2 outline-ring`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`

### kind=text trailing=none · error

Under: Input, kind text / Workspace URL

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge-error bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: error}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`

### kind=text trailing=none · disabled

Under: Input, kind text / Workspace URL

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-fill-disabled`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center bg-fill-disabled`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate text-ink-disabled`

### kind=text trailing=none · rest

Under: Input, forms / Request timeout

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`
- unit: `shrink-0 text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_UNIT`; overlay: `shrink-0`

### kind=text trailing=none · focus

Under: Input, forms / Sample rate

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center outline-2 outline-offset-2 outline-ring`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`
- unit: `shrink-0 text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_UNIT`; overlay: `shrink-0`

### kind=text trailing=none · disabled

Under: Input, forms / Sample rate

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-fill-disabled`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center bg-fill-disabled`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate text-ink-disabled`
- unit: `shrink-0 text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_UNIT`; overlay: `shrink-0 text-ink-disabled`

### kind=code trailing=act · rest

Under: Input, forms / Signing secret

- box: `flex items-center gap-inside rounded-control border min-h-field pl-control-x pr-inside border-edge bg-surface`
  - cell: `FIELD {kind: code, trailing: act, state: rest}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-code leading-code font-normal font-mono text-ink-body`
  - cell: `FIELD_VALUE {kind: code}`; overlay: `min-w-0 grow truncate`
- in-field act (IconButton): `relative inline-flex items-center justify-center rounded-control size-control-compact shrink-0 text-ink-meta`
  - cell: `ICON_BUTTON {fit: field}`; overlay: `relative inline-flex items-center justify-center shrink-0`
- act glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### kind=code trailing=act · hover

Under: Input, forms / Signing secret

- box: `flex items-center gap-inside rounded-control border min-h-field pl-control-x pr-inside border-edge-hover bg-surface`
  - cell: `FIELD {kind: code, trailing: act, state: rest}`; overlay: `flex items-center border-edge-hover`
- value: `min-w-0 grow truncate text-code leading-code font-normal font-mono text-ink-body`
  - cell: `FIELD_VALUE {kind: code}`; overlay: `min-w-0 grow truncate`
- in-field act (IconButton): `relative inline-flex items-center justify-center rounded-control size-control-compact shrink-0 text-ink-meta`
  - cell: `ICON_BUTTON {fit: field}`; overlay: `relative inline-flex items-center justify-center shrink-0`
- act glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### kind=code trailing=act · rest (act hover)

Under: Input, forms / Signing secret

- box: `flex items-center gap-inside rounded-control border min-h-field pl-control-x pr-inside border-edge bg-surface`
  - cell: `FIELD {kind: code, trailing: act, state: rest}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-code leading-code font-normal font-mono text-ink-body`
  - cell: `FIELD_VALUE {kind: code}`; overlay: `min-w-0 grow truncate`
- in-field act (IconButton): `relative inline-flex items-center justify-center rounded-control size-control-compact shrink-0 bg-wash-hover text-ink-body`
  - cell: `ICON_BUTTON {fit: field}`; overlay: `relative inline-flex items-center justify-center shrink-0 bg-wash-hover text-ink-body`
- act glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### kind=code trailing=act · rest (act focus)

Under: Input, forms / Signing secret

- box: `flex items-center gap-inside rounded-control border min-h-field pl-control-x pr-inside border-edge bg-surface`
  - cell: `FIELD {kind: code, trailing: act, state: rest}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-code leading-code font-normal font-mono text-ink-body`
  - cell: `FIELD_VALUE {kind: code}`; overlay: `min-w-0 grow truncate`
- in-field act (IconButton): `relative inline-flex items-center justify-center rounded-control size-control-compact shrink-0 text-ink-meta outline-2 -outline-offset-2 outline-ring`
  - cell: `ICON_BUTTON {fit: field}`; overlay: `relative inline-flex items-center justify-center shrink-0 outline-2 -outline-offset-2 outline-ring`
- act glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### kind=code trailing=act · rest (act active)

Under: Input, forms / Signing secret

- box: `flex items-center gap-inside rounded-control border min-h-field pl-control-x pr-inside border-edge bg-surface`
  - cell: `FIELD {kind: code, trailing: act, state: rest}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-code leading-code font-normal font-mono text-ink-body`
  - cell: `FIELD_VALUE {kind: code}`; overlay: `min-w-0 grow truncate`
- in-field act (IconButton): `relative inline-flex items-center justify-center rounded-control size-control-compact shrink-0 bg-wash-press text-ink-body`
  - cell: `ICON_BUTTON {fit: field}`; overlay: `relative inline-flex items-center justify-center shrink-0 bg-wash-press text-ink-body`
- act glyph (Icon): `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`

### kind=code trailing=none · rest

Under: Input, forms / Endpoint

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: code, trailing: none, state: rest}`; overlay: `flex items-center`
- placeholder: `min-w-0 grow truncate text-code leading-code font-normal font-mono text-ink-meta`
  - cell: `FIELD_VALUE {kind: code} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`

### kind=code trailing=none · error

Under: Input, forms / Endpoint

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge-error bg-surface`
  - cell: `FIELD {kind: code, trailing: none, state: error}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-code leading-code font-normal font-mono text-ink-body`
  - cell: `FIELD_VALUE {kind: code}`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · rest

Under: Input, kind search / rest, placeholder

- box: `flex items-center gap-inside rounded-control border min-h-control px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
- placeholder: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: search} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · rest

Under: Input, kind search / rest, placeholder

- box: `flex items-center gap-inside rounded-control border grow min-h-control px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center grow`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
- placeholder: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: search} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · rest

Under: Input, kind search / rest, value

- box: `flex items-center gap-inside rounded-control border min-h-control px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: search}`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · rest

Under: Input, kind search / rest, value

- box: `flex items-center gap-inside rounded-control border grow min-h-control px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center grow`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: search}`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · hover

Under: Input, kind search / hover

- box: `flex items-center gap-inside rounded-control border min-h-control px-control-x border-edge-hover bg-surface`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center border-edge-hover`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
- placeholder: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: search} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · hover

Under: Input, kind search / hover

- box: `flex items-center gap-inside rounded-control border grow min-h-control px-control-x border-edge-hover bg-surface`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center grow border-edge-hover`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
- placeholder: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: search} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · focus

Under: Input, kind search / focus

- box: `flex items-center gap-inside rounded-control border min-h-control px-control-x border-edge bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center outline-2 outline-offset-2 outline-ring`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: search}`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · focus

Under: Input, kind search / focus

- box: `flex items-center gap-inside rounded-control border grow min-h-control px-control-x border-edge bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center grow outline-2 outline-offset-2 outline-ring`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: search}`; overlay: `min-w-0 grow truncate`

### kind=search trailing=none · disabled

Under: Input, kind search / disabled

- box: `flex items-center gap-inside rounded-control border min-h-control px-control-x border-edge bg-fill-disabled`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center bg-fill-disabled`
- glyph (Icon): `size-icon-control shrink-0 text-ink-disabled`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0 text-ink-disabled`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_VALUE {kind: search}`; overlay: `min-w-0 grow truncate text-ink-disabled`

### kind=search trailing=none · disabled

Under: Input, kind search / disabled

- box: `flex items-center gap-inside rounded-control border grow min-h-control px-control-x border-edge bg-fill-disabled`
  - cell: `FIELD {kind: search, trailing: none, state: rest}`; overlay: `flex items-center grow bg-fill-disabled`
- glyph (Icon): `size-icon-control shrink-0 text-ink-disabled`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0 text-ink-disabled`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_VALUE {kind: search}`; overlay: `min-w-0 grow truncate text-ink-disabled`

## TextArea

Board: `13-fields-desktop.dc.html` (the touch board draws the same strings).

### kind=text · rest

Under: TextArea / Description

- box: `flex flex-col gap-rows rounded-control border px-control-x py-inside border-edge bg-surface`
  - cell: `TEXT_AREA {state: rest}`; overlay: `flex flex-col`
- placeholder: `block w-full resize-none text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + FIELD_PLACEHOLDER`; overlay: `block w-full resize-none`
- budget line: `flex justify-end`
  - cell: none; overlay: `flex justify-end`
- budget: `text-caption leading-caption tracking-caption font-normal tabular-nums text-ink-meta`
  - cell: `TEXT_AREA_BUDGET {state: rest}`; overlay: none

### kind=text · rest

Under: TextArea / Description

- box: `flex flex-col gap-rows rounded-control border px-control-x py-inside border-edge bg-surface`
  - cell: `TEXT_AREA {state: rest}`; overlay: `flex flex-col`
- value: `block w-full resize-none text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `block w-full resize-none`
- budget line: `flex justify-end`
  - cell: none; overlay: `flex justify-end`
- budget: `text-caption leading-caption tracking-caption font-normal tabular-nums text-ink-meta`
  - cell: `TEXT_AREA_BUDGET {state: rest}`; overlay: none

### kind=text · hover

Under: TextArea / Description

- box: `flex flex-col gap-rows rounded-control border px-control-x py-inside border-edge-hover bg-surface`
  - cell: `TEXT_AREA {state: rest}`; overlay: `flex flex-col border-edge-hover`
- value: `block w-full resize-none text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `block w-full resize-none`
- budget line: `flex justify-end`
  - cell: none; overlay: `flex justify-end`
- budget: `text-caption leading-caption tracking-caption font-normal tabular-nums text-ink-meta`
  - cell: `TEXT_AREA_BUDGET {state: rest}`; overlay: none

### kind=text · focus

Under: TextArea / Description

- box: `flex flex-col gap-rows rounded-control border px-control-x py-inside border-edge bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `TEXT_AREA {state: rest}`; overlay: `flex flex-col outline-2 outline-offset-2 outline-ring`
- value: `block w-full resize-none text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `block w-full resize-none`
- budget line: `flex justify-end`
  - cell: none; overlay: `flex justify-end`
- budget: `text-caption leading-caption tracking-caption font-normal tabular-nums text-ink-meta`
  - cell: `TEXT_AREA_BUDGET {state: rest}`; overlay: none

### kind=text · error

Under: TextArea / Description

- box: `flex flex-col gap-rows rounded-control border px-control-x py-inside border-edge-error bg-surface`
  - cell: `TEXT_AREA {state: error}`; overlay: `flex flex-col`
- value: `block w-full resize-none text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `block w-full resize-none`
- budget line: `flex justify-end`
  - cell: none; overlay: `flex justify-end`
- budget: `text-caption leading-caption tracking-caption font-normal tabular-nums text-ink-error`
  - cell: `TEXT_AREA_BUDGET {state: error}`; overlay: none

### kind=text · disabled

Under: TextArea / Description

- box: `flex flex-col gap-rows rounded-control border px-control-x py-inside border-edge bg-fill-disabled`
  - cell: `TEXT_AREA {state: rest}`; overlay: `flex flex-col bg-fill-disabled`
- value: `block w-full resize-none text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `block w-full resize-none text-ink-disabled`
- budget line: `flex justify-end`
  - cell: none; overlay: `flex justify-end`
- budget: `text-caption leading-caption tracking-caption font-normal tabular-nums text-ink-disabled`
  - cell: `TEXT_AREA_BUDGET {state: rest}`; overlay: `text-ink-disabled`

### kind=text · rest

Under: TextArea / Notes

- box: `flex flex-col gap-rows rounded-control border px-control-x py-inside border-edge bg-surface`
  - cell: `TEXT_AREA {state: rest}`; overlay: `flex flex-col`
- placeholder: `block w-full resize-none text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + FIELD_PLACEHOLDER`; overlay: `block w-full resize-none`

## Select

Board: `13-fields-desktop.dc.html` (the touch board draws the same strings).
The trigger's frames are below; the open list is the frame "open, highlighted and selected".
An option's description (`TEXT {role: meta}`, no board draws it) stacks under its label in
`flex flex-col min-w-0 grow`, each line `truncate`.

### open, highlighted and selected

Under: Default region, the list open

- popover (Popup, `role=listbox`): `flex flex-col gap-pair w-full p-float bg-raised border border-edge-raised rounded-popover shadow-float`
  - cell: `POPOVER`; overlay: `flex flex-col w-(--anchor-width)` (the trigger's width, which
    Base UI sets on the positioner; the board's `w-full` is its column, the trigger's width).
    Positioner `alignItemWithTrigger={false}`, `sideOffset` the `pair` role read off the root.
- trigger while open: `FIELD {kind: text, trailing: none, state: rest}` with the ring the board
  draws on it (`outline-2 outline-offset-2 outline-ring`); Base UI moves focus into the list, so the
  ring is spelled on the trigger's open state: `data-popup-open:outline-2
  data-popup-open:outline-offset-2 data-popup-open:outline-ring`.
- option group (Group): `flex flex-col gap-rows`
  - cell: `RHYTHM {unit: rows}`; overlay: `flex flex-col`
- group label (GroupLabel): `px-control-x pt-pair text-meta leading-meta font-medium text-ink-meta`
  - cell: `TEXT {role: meta} + TEXT_STRONG {role: meta}`; overlay: `px-control-x pt-pair`
- highlighted row (Item, `data-highlighted`): `flex items-center min-h-row px-control-x gap-inside rounded-row bg-wash-hover`
  - cell: `ROW {state: highlighted}`; overlay: `flex items-center outline-none` (the wash marks
    the keyboard's option, so the focused item draws no ring)
- selected row: `flex items-center min-h-row px-control-x gap-inside rounded-row`
  - cell: `ROW {state: rest}`; overlay: `flex items-center outline-none`
- option label (ItemText): `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `truncate` inside `flex flex-col min-w-0 grow`
- check (ItemIndicator, the chosen row): `size-icon shrink-0 text-ink-body`
  - cell: `ICON {fit: body}` (`<Icon name="Check" fit="body">`); overlay: `flex shrink-0
    text-ink-body` on the indicator, which the glyph inks as currentColor

### kind=text trailing=none · rest

Under: Select / Default region

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center`
- placeholder: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`

### kind=text trailing=none · rest

Under: Select / Default region

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`

### kind=text trailing=none · hover

Under: Select / Default region

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge-hover bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center border-edge-hover`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`

### kind=text trailing=none · focus

Under: Select / Default region

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center outline-2 outline-offset-2 outline-ring`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`

### kind=text trailing=none · error

Under: Select / Default region

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge-error bg-surface`
  - cell: `FIELD {kind: text, trailing: none, state: error}`; overlay: `flex items-center`
- placeholder: `min-w-0 grow truncate text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + FIELD_PLACEHOLDER`; overlay: `min-w-0 grow truncate`
- glyph (Icon): `size-icon-control shrink-0 text-ink-meta`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0`

### kind=text trailing=none · disabled

Under: Select / Default region

- box: `flex items-center gap-inside rounded-control border min-h-field px-control-x border-edge bg-fill-disabled`
  - cell: `FIELD {kind: text, trailing: none, state: rest}`; overlay: `flex items-center bg-fill-disabled`
- value: `min-w-0 grow truncate text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_VALUE {kind: text}`; overlay: `min-w-0 grow truncate text-ink-disabled`
- glyph (Icon): `size-icon-control shrink-0 text-ink-disabled`
  - cell: `ICON {fit: control} + FIELD_GLYPH`; overlay: `shrink-0 text-ink-disabled`

## InputOtp

Board: `13-fields-desktop.dc.html` (the touch board draws the same strings).
`otp` is the box's largest side: `w-otp min-w-0 shrink aspect-square` in `OTP_BOX` stands each box at
`otp` and shrinks the six together, square, when the row is narrower (a 320 viewport). Loading is
the inert state and there is no disabled one: the input is `readOnly`, `tabIndex={-1}` and
`aria-disabled`, never `disabled` or `inert` (either drops its name and digits from the
accessibility tree), the row `aria-busy`, and the active box takes no ring.
The component stacks the row and its loading line in `flex flex-col gap-pair`.

### otp · rest

Under: InputOtp / Enter the code sent to ada@acme.dev

- row: `flex items-center gap-inside`
  - cell: `OTP`; overlay: `flex items-center`
- box (rest): `flex items-center justify-center w-otp min-w-0 shrink aspect-square rounded-control border border-edge bg-surface`
  - cell: `OTP_BOX {state: rest}`; overlay: `flex items-center justify-center`
- digit: `text-heading leading-heading tracking-heading font-semibold text-ink-body font-mono text-center`
  - cell: `OTP_DIGIT`; overlay: `text-center`

### otp · focus

Under: InputOtp / Enter the code sent to ada@acme.dev

- row: `flex items-center gap-inside`
  - cell: `OTP`; overlay: `flex items-center`
- box (rest): `flex items-center justify-center w-otp min-w-0 shrink aspect-square rounded-control border border-edge bg-surface`
  - cell: `OTP_BOX {state: rest}`; overlay: `flex items-center justify-center`
- digit: `text-heading leading-heading tracking-heading font-semibold text-ink-body font-mono text-center`
  - cell: `OTP_DIGIT`; overlay: `text-center`
- box (focus): `flex items-center justify-center w-otp min-w-0 shrink aspect-square rounded-control border border-edge bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `OTP_BOX {state: rest}`; overlay: `flex items-center justify-center outline-2 outline-offset-2 outline-ring`
- digit: `text-heading leading-heading tracking-heading font-semibold text-ink-body font-mono text-center`
  - cell: `OTP_DIGIT`; overlay: `text-center`

### otp · loading

Under: InputOtp / Enter the code sent to ada@acme.dev

- row: `flex items-center gap-inside`
  - cell: `OTP`; overlay: `flex items-center`
- box (loading): `flex items-center justify-center w-otp min-w-0 shrink aspect-square rounded-control border border-edge bg-surface`
  - cell: `OTP_BOX {state: rest}`; overlay: `flex items-center justify-center`
- digit: `text-heading leading-heading tracking-heading font-semibold text-ink-body font-mono text-center`
  - cell: `OTP_DIGIT`; overlay: `text-center`
- loading line: `flex items-center gap-inside text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `flex items-center gap-inside`, `role="status"`; the
  Spinner (board 11) in the line's ink as currentColor, then `words.checking` ("Checking the code")

### otp · error

Under: InputOtp / Enter the code sent to ada@acme.dev

- row: `flex items-center gap-inside`
  - cell: `OTP`; overlay: `flex items-center`
- box (error): `flex items-center justify-center w-otp min-w-0 shrink aspect-square rounded-control border border-edge-error bg-surface`
  - cell: `OTP_BOX {state: error}`; overlay: `flex items-center justify-center`
- digit: `text-heading leading-heading tracking-heading font-semibold text-ink-body font-mono text-center`
  - cell: `OTP_DIGIT`; overlay: `text-center`

## Switch

Board: `14-toggles-desktop.dc.html` (the touch board draws the same strings). The component's switch element is the hit box, so a press anywhere in it toggles; the track inside it takes the listed track strings, with each state spelled on the hit box, a named group `group/toggle` (`group-hover/toggle:`, `group-active/toggle:`, `group-aria-disabled/toggle:`, `group-focus-visible/toggle:` for the ring), and the hit box itself is `outline-none`.

### state=off · rest

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-switch-off`
  - cell: `SWITCH {state: off}`; overlay: `inline-flex shrink-0 items-center justify-start`
- thumb: `size-thumb rounded-full bg-switch-thumb`
  - cell: `SWITCH_THUMB {state: off}`; overlay: none

### state=on · rest

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-toggle-on`
  - cell: `SWITCH {state: on}`; overlay: `inline-flex shrink-0 items-center justify-start`
- thumb: `size-thumb rounded-full bg-switch-thumb translate-x-switch-travel`
  - cell: `SWITCH_THUMB {state: on}`; overlay: none

### state=off · hover

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-switch-off-hover`
  - cell: `SWITCH {state: off}`; overlay: `inline-flex shrink-0 items-center justify-start bg-switch-off-hover`
- thumb: `size-thumb rounded-full bg-switch-thumb`
  - cell: `SWITCH_THUMB {state: off}`; overlay: none

### state=on · hover

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-toggle-on-hover`
  - cell: `SWITCH {state: on}`; overlay: `inline-flex shrink-0 items-center justify-start bg-toggle-on-hover`
- thumb: `size-thumb rounded-full bg-switch-thumb translate-x-switch-travel`
  - cell: `SWITCH_THUMB {state: on}`; overlay: none

### state=off · focus

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-switch-off outline-2 outline-offset-2 outline-ring`
  - cell: `SWITCH {state: off}`; overlay: `inline-flex shrink-0 items-center justify-start outline-2 outline-offset-2 outline-ring`
- thumb: `size-thumb rounded-full bg-switch-thumb`
  - cell: `SWITCH_THUMB {state: off}`; overlay: none

### state=on · focus

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-toggle-on outline-2 outline-offset-2 outline-ring`
  - cell: `SWITCH {state: on}`; overlay: `inline-flex shrink-0 items-center justify-start outline-2 outline-offset-2 outline-ring`
- thumb: `size-thumb rounded-full bg-switch-thumb translate-x-switch-travel`
  - cell: `SWITCH_THUMB {state: on}`; overlay: none

### state=off · active

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-switch-off-hover`
  - cell: `SWITCH {state: off}`; overlay: `inline-flex shrink-0 items-center justify-start bg-switch-off-hover`
- thumb: `size-thumb rounded-full bg-switch-thumb`
  - cell: `SWITCH_THUMB {state: off}`; overlay: none

### state=on · active

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-toggle-on-hover`
  - cell: `SWITCH {state: on}`; overlay: `inline-flex shrink-0 items-center justify-start bg-toggle-on-hover`
- thumb: `size-thumb rounded-full bg-switch-thumb translate-x-switch-travel`
  - cell: `SWITCH_THUMB {state: on}`; overlay: none

### state=off · disabled

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-fill-disabled`
  - cell: `SWITCH {state: off}`; overlay: `inline-flex shrink-0 items-center justify-start bg-fill-disabled`
- thumb: `size-thumb rounded-full bg-ink-disabled`
  - cell: `SWITCH_THUMB {state: off}`; overlay: `bg-ink-disabled`

### state=on · disabled

Under: Light · Switch, bare: off and on (selected) in every state, on canvas, surface and group. Active draws the hover fill; disabled is the grey fill with the thumb in the disabled ink

- track: `inline-flex shrink-0 items-center p-switch-inset w-switch-w h-switch-h rounded-full justify-start bg-fill-disabled`
  - cell: `SWITCH {state: on}`; overlay: `inline-flex shrink-0 items-center justify-start bg-fill-disabled`
- thumb: `size-thumb rounded-full bg-ink-disabled translate-x-switch-travel`
  - cell: `SWITCH_THUMB {state: on}`; overlay: `bg-ink-disabled`

## Checkbox

Board: `14-toggles-desktop.dc.html` (the touch board draws the same strings). The component's checkbox element is the hit box, as the switch's is; the box inside it takes the listed box strings, its states spelled on the hit box the same way. The mark is Lucide's `Check` or `Minus` on its 24-unit grid at stroke 3.5, round caps and joins, filling the `size-icon-meta` mark: 12 in the 16 box (desktop, 1.75 px), 14 in the 20 box (touch, 2.04 px).

### state=unchecked · rest

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip border border-edge-strong bg-surface`
  - cell: `CHECKBOX {state: unchecked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`

### state=checked · rest

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on`
  - cell: `CHECKBOX {state: checked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`
- mark: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=mixed · rest

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on`
  - cell: `CHECKBOX {state: mixed}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`
- mark: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=unchecked · hover

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip border border-edge-strong bg-surface`
  - cell: `CHECKBOX {state: unchecked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`
- state layer: `absolute inset-0 bg-wash-hover`
  - cell: none; overlay: `absolute inset-0 bg-wash-hover`

### state=checked · hover

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on-hover`
  - cell: `CHECKBOX {state: checked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-toggle-on-hover`
- mark: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=mixed · hover

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on-hover`
  - cell: `CHECKBOX {state: mixed}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-toggle-on-hover`
- mark: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=unchecked · focus

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip border border-edge-strong bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `CHECKBOX {state: unchecked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden outline-2 outline-offset-2 outline-ring`

### state=checked · focus

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on outline-2 outline-offset-2 outline-ring`
  - cell: `CHECKBOX {state: checked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden outline-2 outline-offset-2 outline-ring`
- mark: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=mixed · focus

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on outline-2 outline-offset-2 outline-ring`
  - cell: `CHECKBOX {state: mixed}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden outline-2 outline-offset-2 outline-ring`
- mark: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=unchecked · active

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip border border-edge-strong bg-surface`
  - cell: `CHECKBOX {state: unchecked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`
- state layer: `absolute inset-0 bg-wash-press`
  - cell: none; overlay: `absolute inset-0 bg-wash-press`

### state=checked · active

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on-hover`
  - cell: `CHECKBOX {state: checked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-toggle-on-hover`
- mark: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=mixed · active

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on-hover`
  - cell: `CHECKBOX {state: mixed}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-toggle-on-hover`
- mark: `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=unchecked · disabled

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip border border-edge bg-fill-disabled`
  - cell: `CHECKBOX {state: unchecked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden border-edge bg-fill-disabled`

### state=checked · disabled

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-fill-disabled`
  - cell: `CHECKBOX {state: checked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-fill-disabled`
- mark: `flex w-full text-ink-disabled`
  - cell: `CHECKBOX_MARK`; overlay: `flex text-ink-disabled`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

### state=mixed · disabled

Under: Light · Checkbox in its target: unchecked, checked (selected) and mixed in every state, on canvas, surface and group. Active draws the hover fill

- box: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-fill-disabled`
  - cell: `CHECKBOX {state: mixed}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-fill-disabled`
- mark: `flex w-full text-ink-disabled`
  - cell: `CHECKBOX_MARK`; overlay: `flex text-ink-disabled`
- mark glyph: `w-full`
  - cell: none; overlay: `w-full`

## Slider

Board: `14-toggles-desktop.dc.html` (the touch board draws the same strings).

### slider · rest

Under: Light · Switch and slider in a settings card: label at body 500 over a meta description, the control trailing; rows off, on, slider, disabled

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair border-t border-edge`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair border-t border-edge`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- fill: `grow h-track rounded-full bg-toggle-on`
  - cell: `SLIDER_FILL`; overlay: `grow`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden`
- rest of the track: `grow h-track rounded-full bg-edge`
  - cell: `SLIDER_REST`; overlay: `grow`

### slider · rest

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / rest, 30 of 0 to 60

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- fill: `grow h-track rounded-full bg-toggle-on`
  - cell: `SLIDER_FILL`; overlay: `grow`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden`
- rest of the track: `grow h-track rounded-full bg-edge`
  - cell: `SLIDER_REST`; overlay: `grow`

### slider · hover

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / hover: the thumb takes the hover wash, the fill its hover step

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- fill: `grow h-track rounded-full bg-toggle-on-hover`
  - cell: `SLIDER_FILL`; overlay: `grow bg-toggle-on-hover`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden`
- state layer: `absolute inset-0 bg-wash-hover`
  - cell: none; overlay: `absolute inset-0 bg-wash-hover`
- rest of the track: `grow h-track rounded-full bg-edge`
  - cell: `SLIDER_REST`; overlay: `grow`

### slider · focus

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / focus: the ring on the thumb

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- fill: `grow h-track rounded-full bg-toggle-on`
  - cell: `SLIDER_FILL`; overlay: `grow`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden outline-2 outline-offset-2 outline-ring`
- rest of the track: `grow h-track rounded-full bg-edge`
  - cell: `SLIDER_REST`; overlay: `grow`

### slider · active

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / active: the press wash on the thumb, the fill the hover step (a toggle has no press step)

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- fill: `grow h-track rounded-full bg-toggle-on-hover`
  - cell: `SLIDER_FILL`; overlay: `grow bg-toggle-on-hover`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden`
- state layer: `absolute inset-0 bg-wash-press`
  - cell: none; overlay: `absolute inset-0 bg-wash-press`
- rest of the track: `grow h-track rounded-full bg-edge`
  - cell: `SLIDER_REST`; overlay: `grow`

### slider · rest

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / at the minimum

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden`
- rest of the track: `grow h-track rounded-full bg-edge`
  - cell: `SLIDER_REST`; overlay: `grow`

### slider · focus

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / focus at the minimum: the ring clears the track's start

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden outline-2 outline-offset-2 outline-ring`
- rest of the track: `grow h-track rounded-full bg-edge`
  - cell: `SLIDER_REST`; overlay: `grow`

### slider · rest

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / at the maximum

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- fill: `grow h-track rounded-full bg-toggle-on`
  - cell: `SLIDER_FILL`; overlay: `grow`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden`

### slider · focus

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / focus at the maximum: the ring clears the track's end

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `SLIDER_LABEL`; overlay: `truncate`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- fill: `grow h-track rounded-full bg-toggle-on`
  - cell: `SLIDER_FILL`; overlay: `grow`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge-strong bg-surface outline-2 outline-offset-2 outline-ring`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden outline-2 outline-offset-2 outline-ring`

### slider · disabled

Under: Light · Slider in a settings row: label at body 500, the value with its unit in meta, tabular, trailing / disabled: the fill and label in the disabled ink, the thumb the grey fill

- slider: `flex flex-col justify-center gap-pair min-h-row-setting px-card py-pair`
  - cell: `SLIDER`; overlay: `flex flex-col justify-center min-h-row-setting px-card py-pair`
- label line: `flex items-center justify-between gap-fields`
  - cell: `SLIDER_HEAD`; overlay: `flex items-center justify-between`
- label: `truncate text-body leading-body font-medium text-ink-disabled`
  - cell: `SLIDER_LABEL`; overlay: `truncate text-ink-disabled`
- value: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-disabled`
  - cell: `SLIDER_VALUE`; overlay: `shrink-0 text-ink-disabled`
- track: `flex w-full items-center min-h-target`
  - cell: `SLIDER_TRACK`; overlay: `flex items-center`
- fill: `grow h-track rounded-full bg-ink-disabled`
  - cell: `SLIDER_FILL`; overlay: `grow bg-ink-disabled`
- thumb: `relative shrink-0 overflow-hidden size-thumb rounded-full border border-edge bg-fill-disabled`
  - cell: `SLIDER_THUMB`; overlay: `relative shrink-0 overflow-hidden border-edge bg-fill-disabled`
- rest of the track: `grow h-track rounded-full bg-edge`
  - cell: `SLIDER_REST`; overlay: `grow`

