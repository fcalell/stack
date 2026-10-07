---
id: 003-136
status: review
sessions: {}
---
# react-ui: a TextArea's height can be asked for, or fill the free height of its page

## Goal
Stead's knowledge editor edits a page's source in one `TextArea` with `kind="source"` in a `Form` in a page (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/edit-text.tsx`; design/07-interface.md "The knowledge editor"). At 1440 px the box is 72 px high (four lines) in a 1200 px main, so a page of a few hundred lines is edited through a four-line window and the rest of the main stays empty. Evidence: knowledge editor critique unit u10, shot `i-edit-1440-light` (Stead scratchpad `critique/u10/shots/`, stack at `5564217`). Width is 003-117 and the double ring 003-105.

Evidence, System critique unit u8 (Stead `948b7ec`, shot `s11-note-edit`): a note's editor draws a 60 px high `TextArea` (`kind="source"`) in a 792 px measure at 1440, a note of several paragraphs behind a three-line window, with Save and Discard right-aligned under it.

## Approach
`TEXT_AREA_VALUE` is `min-h-text-area`, three body lines (`3 * leadingOf(density, "body")`, ui-core/src/scales.ts line 70), and the box grows with its value (text-area/index.tsx), so the height is the text's, never a size the app can ask for: there is no `rows`, no height prop and no fill. A source page is edited as a document, and a field that is a document's size at the start of the edit and grows by a line per line typed loses the page's context. The app cannot add a height to the roster's box (geometry classes go on host elements only). Seen at stack `5564217`.

## Acceptance criteria
- [x] A `kind="source"` TextArea in a page's Form fills the free height of the page, three lines at least, and scrolls inside (ruled: no `rows`, no `fill` prop).
- [x] Elsewhere (prose, a Section, a sheet) a TextArea is unchanged: it grows with its value.
- [ ] The TextArea showcase holds a source field that fills a page's height (the `FIELD_VALUE.kind.code` frame, a Place with a Form and 40 lines); the critique measures it at 390 and 1440 (web only; the phone keeps growing, see Built).

## Open questions
- [x] Its shape: derived, no option (ruled).

## Built
react-ui `text-area/index.tsx`: a `source` TextArea with `ThreadRoom` true (a Place's body without a foot, a Split's main; false in a Section) and `FormStands` `page` marks its box `data-fill`, grows, and gives its value `grow basis-0`, so the box's least height is the value's three lines and the value scrolls inside. The `Form` and `FormField` roots read the mark (`HOLDS_FILL`, `has-data-fill:grow` in `lib/form.ts`) and grow with it. Native keeps growing with its value: the phone's keyboard takes the lower half and a ScrollView page has no free height to fill; the ruling is read as the web page's. Evidence: `Behaviour/TextArea` (source fills the page with Save in view and the long value scrolling inside; empty source fills; prose and a Section's source grow) and the TextArea and Form stories pass.
