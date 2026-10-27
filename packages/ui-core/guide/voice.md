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
   surface, a 1 px edge, 8 px corners. On touch the same, at the touch inset.
2. **Sidebar.** 220 px. Its first row is a bar as the page's (the same height, the same line): the
   app's mark in the glyph slot, then the switcher (name at 500, an up-down glyph), so the
   organization's name and the page title stand on one line. Items are 28 px rows at the body
   size; groups carry a 12 px uppercase label at 500, tracked 0.07 em, in the meta ink; a group
   that is a scope (the project) carries its own switcher as the row under its label, its places
   following the pick; settings and exits stand in a footer group. The current place carries the
   current bar (decision 6) and a 6 percent white wash. The mark stands on the Gates as a lockup.
3. **Rules.** Regions part by a hairline in the edge colour (the ink at about 15 percent); no
   rule is heavier. Rows stand on hairlines inside their sheet. A sheet is the surface, a 1 px
   edge, rounded corners, and every part of a Section's body is one of its own: a list's or a
   group's rows flush on it, a form's fields as rows too (the label in its column, the control
   filling the rest, the bar the last row), a table's rows, and anything else (prose, stats, a
   comparison) at a sheet's inset in a `Card`; a control over a list (a toolbar, a segmented
   filter) stands bare on the table over its list's sheet; a list outside a section is a sheet
   of its own; the Section itself draws nothing. Nothing else is a card. Shadows only on layers (popover,
   sheet, toast), soft, never offset.
4. **Corners.** 6 px on a control, a pill and a row's wash; 8 px on a sheet, a card, a popover
   and a centred sheet; a dot and an avatar are round. No pill is fully rounded.
5. **Controls.** One family: every outlined control (button, picker, field, pill, tab track) shares
   the hairline edge of the sheets at the control height (the body line and the gap above and
   below: 32 px desktop, 44 touch), darkening to the strong edge under the pointer; a
   focused field swaps its edge for the accent (the keyboard adds the ring). The only filled
   control is the primary act (the accent, white type), at most one per bar. A chosen tab carries a 2 px ink underline, no fill. A checked
   switch, box or radio fills with the accent.
6. **Current.** What is current carries a 3 px accent bar at its start: the open row (a tree's
   child at its rail), the sidebar's place, the dock's tab (on its top). Selection is never a fill of the accent.
7. **Type.** IBM Plex Sans for words, IBM Plex Mono for machine names. Desktop: body 13, meta 12, caption 12,
   heading 13 at 500, section labels 12 uppercase at 500 tracked 0.07 em in the meta ink, a record's
   name 20 at 500, figure 24 at 500. Touch: body 16, meta 15, caption 15, name 24.
   A machine name (a field, an event, a key, a path, `lights`) is always the mono, bare in a row, a
   name and a field's typed value, boxed only inside a sentence; a human name (a device, a room, a
   lead like Mail digest) is words, in the sans wherever it stands. A label (a field's, a row's) is the body role in the meta ink: it names, and the value it names stands in the body ink.
8. **Ink.** Text has two inks, body and meta, each read at the floor's 4.5:1 on the table, the sheet, a tile and a selected row, in both modes; a count, an absent word and an optional word stand in the meta ink, quieter than a title by their role (the caption size), never by a third grey. A third ink, the mark (`ink-mark`), is for what is no word (a separator, a chevron) and holds the non-text floor of 3:1 on the same grounds. Only a disabled control's text (`ink-disabled`) is below the floor. Colour carries state and type, never hierarchy.
9. **Rows.** One line on hairlines: its first-line box and the gap above and below it (32 px
   desktop, 44 touch), never a set height. The leading part is the type mark on its hue (`T`, `#`,
   `[]`, `{}`, `?`; or a status dot, an avatar), sized to itself in the row's gap rhythm; the
   name (in the mono where it is a machine name, the sans where it is a human one, decision 7),
   its description in the meta ink on the same line; the end group holds, in one
   order, an age or a count, a switch or a pick, the act (one icon, the rest in the more menu: the
   first act stands, wherever acts stand side by side), and a branch's fold chevron. The marks (a
   state's dot and word, the lock, the required ring, a chip in its compact form, decision 12)
   lead the meta line under the name, each its glyph and its word, so a row with a mark is two lines;
   a line it wraps to starts under the status's word, the dot hanging before it.
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
    decision 7 sets them), then the facts as pills (decision 12), then the description as plain
    text; sections follow under hairlines: rows with a label (the label in the body role and the meta ink in a column as wide
    as the widest label of every list in the Pane, so the lists read as one grid, the value
    in the body ink, both at the start; on touch the value under its label), lists, activity.
12. **Pills.** The caption line and the gap above and below it (30 px desktop), the box inset at
    the sides, outlined, 6 px corners, a 7 px dot in the family's hue for a type or a label; a
    neutral one, which has no hue, draws no dot and no edge, its word on the grey soft ground
    (`fill-neutral`) a neutral type mark stands on, since a box with no dot is a control's
    outline (a compact one beside a row's switches reads as a toggle); a state pill is the state's dot and word (decision 9: the hollow dot for idle) on the state's
    soft fill with the state's ink under a hairline a step darker than the fill. A record's
    facts (decision 11) are pills of these three looks and one control: a plain fact (a word,
    a count, an age, a sum) is the neutral one, its word on the grey soft ground with no edge
    and no dot; a status is the state pill; only a fact that acts (a pick, one that opens) is
    outlined, its chevron at its end, so nothing outlined in the head is inert; a status that
    moves (a pick of states) is the state pill with its chevron inside at its end. A pill inside a list row is the compact form: the caption line and the hairline
    above and below it (20 px desktop), so the row keeps its 32 px; a row's pick of a state is
    that compact state pill holding its chevron, one shape with the head's.
13. **Context.** The spec context is a pick in the bar: a 32 px outlined pill with a dot in the
    context's colour (the accent for Live, amber for a draft, grey for a version) and its name.
14. **Phone.** No dock. A page's bar leads with the menu glyph where the sidebar would stand, and a
    Pane that stands before another (a record opened over its list) leads with its back, the menu
    glyph one back away. The menu glyph opens the sidebar as a layer over the whole screen (the slate, the same rows, a
    close glyph at the bar's end), closed by a place, the close glyph or Escape. Rows 44 px, the
    body 16; a row with meta parts takes two lines, on a desktop too where its container is under 765 px (a list beside an open record), the width a one-line name, meta and end group need; a definition's value stands under its label
    at the row's width, its acts on the value's line. The sheets stand at the 16 px inset, 24 px apart; the toolbar is
    one row, the search leading and the filters a glyph.
15. **Empty.** One form everywhere: one sentence in the meta ink over its act as an outlined
    button, both centred, at a sheet's inset where the rows would stand (inside the list's or
    form's own sheet, or on a sheet of its own where no part draws one: a section's or a pane's
    empty read). Absent facts say nothing. A first run is a Gate.
16. **Motion.** None on a navigation, a read landing or a list changing. Hover and press ease on
    `instant`. A layer enters and leaves on its rung. A wait is the spinner or the pulse.
17. **Widths.** A Pane that stands before another holds 520 px, giving way to 340 px, and the last Pane holds 520 px beside one, yielding to that floor, so a Place stands two Panes from `tablet` (768 px, the first 340 px and the last 428 px) and three from `wide` (1200 px, the two before the last at 340 px each), never more, the oldest folding first; a record's parts stand within
    720 px; a list page is `wide`; running text keeps its 58-character measure.
18. **Accent.** One blue (hue 264), on the primary act, the current bar, the focus ring, links and
    checked controls. Status hues are fixed: `ok` green, `warn` amber, `danger` red.

## Floors

Checked by looking at the render at 320, 1280 and 1920, light and dark: text at 4.5:1 and a
control's glyph or a mark at 3:1 (a control's edge is the hairline: its label and its fill tell it apart); a target 24 px, 44 px for a primary act on touch; no
horizontal overflow; Tab reaches every control with a visible ring, Escape closes a layer and
returns focus; no console error.

## How the face is held

The face lives on the specimen (the showcase's `Specimen` story): every control, pill, tab,
field, row, band, the frame and the dock, light and dark, on one page. A change to a cell or a
token is judged on the specimen first, as one family, and reaches a screen only after. A screen
is then shown beside the anchor's screen of its pattern with one question, which looks better;
"theirs" is answered with the three largest differences, each a composition finding (the app's)
or a specimen finding (stack's). The owner answers; no number replaces the eye.
