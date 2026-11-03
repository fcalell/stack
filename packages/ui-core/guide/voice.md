# Voice

The look of every stack app, decided once. The mechanics (density, hierarchy, what a row and a
record hold) come from one anchor; the face is our own, drawn as a specimen before any component
takes it. Each line below is the decision, never a range. The floors at the end are checked by
looking at the render.

## The anchor, for mechanics only

Linear's web app sets the density and the hierarchy: one-line rows, a panel on a canvas, a bar
over each page, bands over groups, a record's name in the body. Its pinned screens are read for
how much a row carries and where things stand, never for colour, type, corners or rules:

| Pattern | Screen |
| --- | --- |
| List grouped with bands, counts and pills | https://mobbin.com/screens/0ac97560-1aef-4907-a356-8c18c749437b |
| Record: name, facts, description, sub-list, activity | https://mobbin.com/screens/1ea32209-1221-46de-b4ad-875a8f1b5777 |
| Settings: a titled column of grouped rows | https://mobbin.com/screens/f3134ca3-b7e5-47ab-a283-92ce2db403db |

## The face: a drafting table

1. **Frame.** The sidebar is a slate column (the dark calibration of the same tokens, pinned
   dark in both modes) beside the canvas, the table; on the phone the same column is a layer
   over the whole screen, opened by the menu glyph that leads the bar. A page is its bar across the top, on the
   surface over a hairline, and its sections under it on the table at the page inset, a sections
   gap apart; a section's label stands on the table and its rows on a sheet under it: the
   surface, a 1 px edge, `rounded-sheet` corners (8 px at the default `radius`). On touch the same, at the touch inset.
2. **Sidebar.** The `sidebar` is 220 px wide. Its first row is a bar as the page's (the same height, the same line): the
   app's mark in the glyph slot, then the switcher (name at 500, an up-down glyph), so the
   organization's name and the page title stand on one line. Items are `control` rows (32 px at the default `size`) at the body
   size; groups carry an uppercase label at 500 at the `caption` size (12 px at the default `size`), tracked 0.07 em, in the meta ink; a group
   that is a scope (the project) carries its own switcher as the row under its label, its places
   following the pick; the places scroll between the bar and the footer group, which stay in
   place, so none is ever clipped; settings and exits stand in the footer group. The current place carries the
   current bar (decision 6) and a 6 percent white wash. The mark stands on the Gates as a lockup.
3. **Rules.** Regions part by a hairline in the edge colour (the ink at about 15 percent); no
   rule is heavier. Rows stand on hairlines inside their sheet. A sheet is the surface, a
   1 px edge, rounded corners, and every part of a Section's body is one of its own: a list's or a
   group's rows flush on it, a form's fields as rows too (the label in its column, the control
   filling the rest, the bar the last row; where each field commits itself the row is its label over its
   description beside the control at its own measure, the short measure for a line and a toggle's own
   width, so the row is as tall as its two lines and a short value does not fill it), a table's rows, a stats strip (its cells split by
   hairlines), a chart, and anything else (prose, a control alone, a comparison) at a sheet's inset in a
   `Card`, which a stats strip and a chart never stand in (a box in a box); a control over a
   list (a toolbar, a segmented filter) stands bare on the table over its list's sheet; a list outside a section is a sheet
   of its own; the Section itself draws nothing. Nothing else is a card. Shadows only on layers (popover,
   sheet, toast), soft, never offset.
4. **Corners.** `rounded-control` (6 px at the default `radius`) on a control, a pill and a row's wash; `rounded-sheet` (8 px at the default `radius`) on a sheet, a card, a popover
   and a centred sheet; a dot and an avatar are round. No pill is fully rounded.
5. **Controls.** One family: every outlined control (button, picker, field, pill, tab track) shares
   the hairline edge of the sheets at the `control` height (32 px, 44 px on touch, at the default `size`), the body line and the gap above and
   below, darkening to the strong edge under the pointer; a
   focused field swaps its edge for the accent (the keyboard adds the ring). The only filled
   control is the primary act (the accent, white type), at most one per bar. A chosen tab carries a 2 px ink underline, no fill. A checked
   switch, box or radio fills with the accent.
6. **Current.** What is current carries a 3 px accent bar at its start: the open row (a tree's
   child at its rail), the sidebar's place, the tab bar's tab (on its top). Selection is never a fill of the accent.
7. **Type.** IBM Plex Sans for words, IBM Plex Mono for machine names. Sizes follow the `size` knob: `body` (13 px, 16 px on touch, at the default `size`),
   `meta` and `caption` (12 px, 15 px on touch, at the default `size`), `heading` at the body size at 500, section labels at the caption size uppercase at 500 tracked 0.07 em in the meta ink, a record's
   name at `title` (20 px, 24 px on touch, at the default `size`) at 500, `figure` (24 px at the default `size`) at 500.
   A machine name (a field, an event, a key, a path, `lights`) is always the mono, bare in a row, a
   name and a field's typed value, boxed only inside a sentence; a human name (a device, a room, a
   lead like Mail digest) is words, in the sans wherever it stands. A label (a field's, a row's) is the body role in the meta ink: it names, and the value it names stands in the body ink.
8. **Ink.** Text has two inks, body and meta, each read at the floor's 4.5:1 on the table, the sheet, a tile and a selected row, in both modes; a count, an absent word and an optional word stand in the meta ink, quieter than a title by their role (the caption size), never by a third grey. A third ink, the mark (`ink-mark`), is for what is no word (a separator, a chevron) and holds the non-text floor of 3:1 on the same grounds. Only a disabled control's text (`ink-disabled`) is below the floor. Colour carries state and type, never hierarchy. A QR code keeps its light tile and dark modules in both modes, as a printed code does, since a camera reads dark on light.
9. **Rows.** One line on hairlines: its first-line box and the gap above and below it, at least `row` (32 px, 44 px on touch, at the default `size`), never a set height. The leading part is the type mark on its hue (`T`, `#`,
   `[]`, `{}`, `?`; or a status dot, an avatar), sized to itself in the row's gap rhythm; the
   name (in the mono where it is a machine name, the sans where it is a human one, decision 7),
   its description in the meta ink on the same line; the end group holds, in one
   order, an age or a count, a switch or a pick, the act (one icon, the rest in the more menu: the
   first act stands, wherever acts stand side by side), and a branch's fold chevron. The facts
   (a state's dot and word, the lock, the warning, a chip, the required ring, a flag, plain words,
   decision 19) are badges, in the order given, under the name, so a row with a mark is two lines;
   a row with only words puts them after the name where it is wide enough for one line. In a room (read
   from across it, the board holding as many rows as the canvas gives) a row whose only mark is a
   status is one line: the name, its meta after it, the status's dot and word at the end group's
   start before the age. A quiet fact (where the content came from, a kind) is no badge:
   its glyph stands alone in the end group, named by its label, so it takes no line and a row with
   only such facts is as tall as one with none. In a record's head it stands at the end of the name's
   first line, so the facts line holds the badges and wraps by them alone, the same
   waiting and loaded.
   A fact and a thing are one row: a row with a label puts it in a column ahead of the text, in the
   body role in the meta ink, as wide as the widest label of the Pane; its title truncates,
   its meta stands after it or under it, and its end group stands, as any row's, on the row's centre. A row that
   opens draws no chevron. A tree's children indent behind a 1 px rail (on touch no wider than the row inset), the hairline above a child, its wash and its current bar starting at its rail, so the indent before it stays the parent's; no row reserves room for
   a part it does not have.
10. **Bands.** A list's group is a band at the row height: the name at 500, the count in the
    meta ink, the add act at the end, on the hairline at the top of the sheet. A Section's
    heading is uppercase as in 7, on the table over its sheet; an act beside a heading or a
    title is an icon act, its words in its tooltip and accessible name, never drawn beside the
    title. An act with words stands in the body: an empty state's button, a form's bar.
11. **Record.** The bar shows where the record stands in the meta ink, a slash in the mark ink, then the name at
    the heading role, with its acts at the end. The body
    opens with the name at 20 (a machine name in the mono, a human name in the sans, as
    decision 7 sets them), then the facts as badges (decision 19), then the description as plain
    text; sections follow under hairlines: rows with a label (the label in the body role and the meta ink in a column as wide
    as the widest label of every list in the Pane, so the lists read as one grid, the value
    in the body ink, both at the start; on touch the value under its label), lists, activity.
12. **Pills.** The `caption` line between its hairlines (20 px, 24 px on touch, at the default `size`), no height of
    its own, the box inset at the sides, outlined, `rounded-chip` corners (6 px at the default `radius`), a `dot` (7 px, 8 px on touch, at the default `size`) in the family's hue for a type or a label; a
    neutral one, which has no hue, draws no dot and no edge, its word on the grey soft ground
    (`fill-neutral`) a neutral type mark stands on, since a box with no dot is a control's
    outline (a compact one beside a row's switches reads as a toggle); a state pill is the state's dot and word (decision 9: the hollow dot for idle) on the state's
    soft fill with the state's ink under a hairline a step darker than the fill, but for the
    neutral states (`waiting`, `idle`), whose grey soft draws no edge, since a grey box in a grey
    hairline reads as a button. A record's
    facts (decision 11) are badges (decision 19), and a fact that acts is the one outlined
    control: a pick, or one that opens, outlined with its chevron at its end, so nothing outlined
    in the head is inert; a status that moves (a pick of states) is the state pill with its
    chevron inside at its end. A chip as a data value's tag in a form or a table keeps its pill
    of the three looks above; in a row's or a head's facts it is a badge. A pill is one size
    wherever it stands, so a list row keeps its `row` height (32 px, 44 px on touch, at the default `size`); a row's pick of a state is that state pill
    holding its chevron, one shape with the head's.
13. **Context.** The spec context is a pick in the bar: an outlined pill at the `control` height (32 px, 44 px on touch, at the default `size`) with a dot in the
    context's colour (the accent for Live, amber for a draft, grey for a version) and its name.
14. **Phone.** No sidebar. A page's bar leads with the menu glyph where the sidebar would stand, and a
    Pane that stands before another (a record opened over its list) leads with its back, the menu
    glyph one back away. The menu glyph opens the sidebar as a layer over the whole screen (the slate, the same rows, a
    close glyph at the bar's end), closed by a place, the close glyph or Escape. Rows at `row` (44 px on touch, at the default `size`), the
    `body` (16 px on touch, at the default `size`); a row with facts takes two lines on touch: on the phone the first line is the name and the end group (the age, the switch or pick, the acts), the badges under both at the row's whole width, as Linear Mobile sets its row, a name wrapping to a third line before it is cut; a definition's value stands under its label
    at the row's width, its acts on the value's line, and a label with no value (a switch's, an
    act's) stands on one line with its end group, as a name does. The sheets stand at the `page` inset (16 px on touch, at the default `size`), a `section` apart (24 px at the default `size`); the toolbar is
    one row, the search leading and the filters a glyph.
15. **Empty.** One form everywhere: one sentence in the meta ink over its act as an outlined
    button, both centred, at a sheet's inset where the rows would stand (inside the list's or
    form's own sheet, or on a sheet of its own where no part draws one: a section's or a pane's
    empty read). Absent facts say nothing. A first run is a Gate.
16. **Motion.** None on a navigation, a read landing or a list changing. Hover and press ease on
    `instant`. A layer enters and leaves on its rung. A wait is the spinner or the pulse.
17. **Widths.** A Pane that stands before another holds `list` (130 units of the space base), giving way to `region-min` (85 units), and the last Pane holds `list` beside one, yielding to that floor, so a Place stands two Panes from `tablet` (768 px), the first at `region-min` and the last taking the rest, and three from `wide` (1200 px), the two before the last at `region-min` each, never more, the oldest folding first; a record's parts stand within `reading` (180 units); a list page is `wide`, and its Pane takes all the spare room while the Pane after it, the record, holds `list` (floor `region-min`) from `tablet`. every width but `measure-short` is a count of the space base, so no font moves it; `measure-short` and running text (58 characters) count characters.
18. **Accent.** One blue (hue 264), on the primary act, the current bar, the focus ring, links and
    checked controls. Status hues are fixed: `ok` green, `warn` amber, `danger` red.

19. **Badges.** A fact is a badge, a sentence is text. Each fact of a row's, a record head's and a
    message detail row's facts is one badge: a box that never breaks inside, the meta text's line
    tall, its words in the meta ink on the meta ink's own tenth (`fill-badge`), corners at `rounded-badge` (5 px at the default `radius`), the inline inset the `gap` role (6 px, 8 px on touch, at the default `size`), badges the `badge` gap apart (4 px at the default `size`)
    across and down (`gap-badge`) with no separator and no clip at a line's start. Whole badges
    wrap to the next line; a badge longer than its line is cut with an ellipsis inside it, the
    full text its accessible name and, on a pointer, the cut-text tooltip. Only a glyph carries
    colour: the status's tone mark inside its badge before its word (the dot, the running dots,
    the waiting ring), the warning's glyph in the warn ink, a chip's family dot (a neutral chip has
    none and reads as a plain fact); the required ring is an outlined circle with a filled centre,
    never mistaken for a chip's solid dot. The lock is a badge right after the status, a link
    where it has an `href`. A status leads no lane: there is none that leads the whole line. What
    stays text is a sentence, a caption or a breadcrumb: a record head's overline (one line, cut
    at its end, on touch too), a message's provenance line, a canvas node's line, warning and
    overline (only its status is a badge), a picker option's line (its recommended mark is a
    badge), a stat's line, and a row's `line`: the sentence a row says (a remedy, a schedule, an
    error, what a setting does) is text under its title and badges in the meta ink, wrapping
    whole at every width, never a fact cut where touch cannot read the rest. A fact list that is
    one lone `{ code }` run is the row's value, the mono cut in its middle, no badge; a `{ code }`
    run among other facts is a badge cut in its middle too, its tail whole, as the end of an
    identifier is what tells it apart. A one-line row's badges follow the name on its line without
    wrapping and the last that does not fit is the one cut, an earlier one giving way (each cut
    inside its own box) only once it is gone. A waiting badge is one bar, its box. A status that
    is a row's title is its mark and word, plain: a pill's tint is a control's (decision 12).
    A short last badge standing alone on a wrapped line stays there: badges wrap whole, and
    keeping one with the badge before it would take a measure of the line; what is read first
    belongs in the end group (an age) or earlier in the order.

20. **Drag.** No animation: a drag lands at once. What follows the pointer is a label in the
    tooltip's ground (the row's name, or the count dragged) a step off the pointer; a row that
    lands between two others shows a line two hairlines tall in the accent at the row's edge across
    the row's width, no ghost of the row and no gap opening; a place that takes the drag (a sidebar
    place, a row of another list) washes as selected under the ring's outline while it is under the
    pointer, a table row as the open record does. A row is dragged by the press itself (a finger
    after a hold), never by a handle; every drag is also in the row's menu and, for the order,
    under Alt with the arrows.

## Floors

Checked by looking at the render at 320 and 1920 in dark (the render walk holds every width and both modes): text at 4.5:1 and a
control's glyph or a mark at 3:1 (a control's edge is the hairline: its label and its fill tell it apart); a badge's words at 4.5:1 on its fill on the canvas, the sheet and a group in both modes (`badge.test.ts`), the fill a step from its ground; a target 24 px, 44 px for a primary act on touch; no
horizontal overflow; Tab reaches every control with a visible ring, Escape closes a layer and
returns focus; no console error.

## How the face is held

The face lives on the specimen (the showcase's `Specimen` story): every control, pill, tab,
field, row, band, the frame and the player's dock, light and dark, on one page. A change to a cell or a
token is judged on the specimen first, as one family, and reaches a screen only after. A screen
is then shown beside the anchor's screen of its pattern with one question, which looks better;
"theirs" is answered with the three largest differences, each a composition finding (the app's)
or a specimen finding (stack's). The owner answers; no number replaces the eye.
