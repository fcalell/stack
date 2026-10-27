# Screen critique

The checklist a review of a screen runs, after the render walk (`stack screens test`) has
measured sizes, gaps, radii, clipping and overflow. Each item is a yes/no question; an answer
is `yes`, `no` or `n/a (why)`, and every `no` carries its evidence: the shot and the element
(its visible text) or the source `file:line`, the measured or observed value, the expected value
from the rule, and a one-line fix. A `yes` names the one place that was checked. No item is
skipped; an item that cannot be answered says why.

The rules are `voice.md` (V#), `structure.md` (S#) and `../../../plugins/screens/guide/screens.md`.

## 1. One shape per pattern

- 1a. Does the screen put its parts in the pattern's order (record: bar, kicker, name, pills,
  description, sections; list: toolbar bare on the table, band, rows on a sheet) with nothing
  out of order? (V11, V3)
- 1b. Does every row put the same kind of fact in the same slot: name first, meta after it on the
  same line, type pill then state pill, age or count last? Compare the rows of this screen with
  the rows of the other screens under review and name any slot that differs. (V9)
- 1c. Are a definition list's values all at the start of the value column, with no list on the
  screen right-aligning its values? (V11)
- 1d. Does every section heading carry the same form: uppercase label, count in the meta ink,
  an icon act at the end if any, one description sentence under it? (V10)

## 2. Every element earns its place

- 2a. Does any fact row draw a label with no value? Count them. (V15: absent facts say nothing.)
- 2b. Is any fact shown twice on the screen (the same value in two pills, a pill and a row, a
  mark on two parts of one row)? Name each pair.
- 2c. Does every count on the screen match what can be counted (a band's count against its rows,
  a footer's total against the list)?
- 2d. Does any row reserve room for a part it does not have (an empty end group, an empty cell,
  a blank indent)? (V9)

## 3. Truncation is the exception, never the layout

- 3a. Does a column or a row's meta line truncate on every row (or on more than half of them) at
  1280? Name the column and the count of truncating rows.
- 3b. Does a word of six letters or fewer truncate anywhere, at any width?
- 3c. Does a one-line row carry more than a name, one meta and one end group? List what each
  row of the main list carries. (V9)
- 3d. At 320, does a row with meta parts take two lines (meta under the name) rather than
  truncate on one? (V14)

## 4. One voice in the words

- 4a. Is every section description one sentence that says what the section is for, never help
  for one row and never an instruction? Quote any that is not.
- 4b. Are headings nouns, every sentence in sentence case and present tense, and every term one
  from the product's glossary? Quote any that is not.
- 4c. Is the empty state one sentence in the meta ink over at most one outlined act, centred, on
  the sheet where the rows would stand? (V15; the `empty` shots.)
- 4d. Is there any placeholder, label or help text that names a UI mechanic ("click", "dropdown",
  "button") instead of the thing?

## 5. Hierarchy from type and position, never from colour

- 5a. Is there one accent only, at most one filled (primary) act per bar, and status hues only on
  a state? (V5, V18)
- 5b. Is each pill style one meaning everywhere on the screen: a type pill with a dot, a state pill
  soft-filled under a hairline and led by its state's dot, a plain outlined pill for a fact or a
  neutral chip (a value of no type)? Name any two pills that share a
  meaning with different styles or share a style with different meanings. (V12)
- 5c. Does any colour carry hierarchy (a heading in the accent, a tinted row to look important)?
  (V8)

## 6. Marks mean one thing

- 6a. Does each glyph or dot style on the screen have exactly one meaning, and is that meaning
  stated (a legend, a tooltip, an accessible name)? List the dot and glyph styles with their
  meanings.
- 6b. Does a lock always mean held, a chevron always "opens here", an arrow always "leads
  elsewhere"? Does a row that opens draw a chevron? (V9: a row that opens draws no chevron.)
- 6c. Does anything that is not an act look like a control (a bordered pill-shaped box inside a
  fact row, a filled box that does nothing on press)?

## 7. Rhythm by eye

- 7a. Where a list and a record stand side by side, do their first rows and their section
  headings share a horizontal rhythm, or can the eye find two grids? Give the top of the first
  row of each pane at 1280.
- 7b. Is the label column of every definition list on the screen exactly as wide as that list's
  widest label, and do the lists on one screen read as one grid or several? (V11)
- 7c. Does a text area or a multi-line box hold its content's height, with no fixed height around
  one line of text?
- 7d. Does every section stand one sections-gap apart, and does nothing stand alone with a gap of
  its own (a stray helper line, a double gap)?

## 8. States and edges

- 8a. Does the waiting shot keep the loaded form's shape: the same sections, headings in the same
  place, a pulse where values will land, no second layout? (S15) Text above the first Section
  that wraps to more lines once it lands (a record head's name, facts or description, or prose)
  moves what stands under it by what it grew: the loading-shift floor accepts that move
  (`plugins/screens/guide/screens.md`), so it is no finding, at any width.
- 8b. Does the empty shot read as the data shot with the rows gone, the toolbar and bands still
  standing where they do in data?
- 8c. Do the not-found shot and the error shot each read as the frame's one form (one sentence
  and one act, no half-drawn record)?
- 8d. At 320, does the screen read as its own design: one-row toolbar, search leading, filters as
  a glyph, the sidebar behind the menu glyph, a definition's value under its label, nothing from
  the desktop squeezed? (V14)
- 8e. Does the dark shot read as drawn, not inverted: the sidebar the same slate, state fills soft,
  the sheet an edge lighter than the table, no pure white or pure black?
- 8f. In both modes, is every text at 4.5:1 and every glyph at 3:1 against what it stands on, as
  far as the eye can tell? Name any meta text or mark that reads as hard to see.

## 9. The anchor

- 9a. Beside the voice page's pinned screen of this pattern (`voice.md`, "The anchor"), what are
  the three largest differences in how much a row or a record carries and where parts stand?
  Each is a composition finding (the app's) or a roster finding (stack's).

## The report

One section per screen:

```
## <Screen title> (<route id>)
Shots read: <file names>
Source read: <files>

| Item | Answer | Evidence |
| --- | --- | --- |
| 1a | yes | data-1280.png: bar, kicker, name, pills, description, sections in order |
| 2a | no | data-1280.png "Details": Requester, Area, Brand empty (3 of 8); expected absent facts say nothing; fix: drop a row whose value is null in `src/.../index.tsx:NN` |
```

Then, for the screen, the three findings that most make it read as unfinished, in order.
