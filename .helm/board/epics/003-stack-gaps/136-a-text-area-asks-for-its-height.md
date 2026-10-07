---
id: 003-136
status: backlog
sessions: {}
---
# react-ui: a TextArea's height can be asked for, or fill the free height of its page

## Goal
Stead's knowledge editor edits a page's source in one `TextArea` with `kind="source"` in a `Form` in a page (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/edit-text.tsx`; design/07-interface.md "The knowledge editor"). At 1440 px the box is 72 px high (four lines) in a 1200 px main, so a page of a few hundred lines is edited through a four-line window and the rest of the main stays empty. Evidence: knowledge editor critique unit u10, shot `i-edit-1440-light` (Stead scratchpad `critique/u10/shots/`, stack at `5564217`). Width is 003-117 and the double ring 003-105.

## Approach
`TEXT_AREA_VALUE` is `min-h-text-area`, three body lines (`3 * leadingOf(density, "body")`, ui-core/src/scales.ts line 70), and the box grows with its value (text-area/index.tsx), so the height is the text's, never a size the app can ask for: there is no `rows`, no height prop and no fill. A source page is edited as a document, and a field that is a document's size at the start of the edit and grows by a line per line typed loses the page's context. The app cannot add a height to the roster's box (geometry classes go on host elements only). Seen at stack `5564217`.

## Acceptance criteria
- [ ] A TextArea can stand a given number of lines tall at rest, or fill the free height of the page it stands in and scroll inside.
- [ ] Without it a TextArea is unchanged.
- [ ] The TextArea showcase holds a source field that fills a page's height and the critique measures it at 390 and 1440.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether a `rows` count, a `fill` form for `kind="source"`, or a size variant.
