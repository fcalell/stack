---
id: 003-216
status: done
sessions: {}
---
# react-ui: a List's trailing values keep one column whether a row has an act or not

## Goal
Stead's knowledge History lists a page's versions, each with its age in the row's trailing and "Revert to this" under a more act, except the Current version, which has no act (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/knowledge.tsx`, the History list). The Current row's age ends at x=374 at 390 px where the other rows' ages end at x=322, a 52 px step (252 vs 304 at 320, 34 px at 1440), and the Current chip moves with it, so the ages read as two ragged columns. Evidence: Stead's knowledge editor critique unit u10 (second pass) at stack `74a0e3d`, shots `gh-390-light`, `gh-320-light` (Stead scratchpad `critique/u10/r2/`).

## Approach
A ListRow draws its `more` act after its trailing value, and a row without one gives the trailing that space, so in a List where only some rows carry an act the trailing column shifts row by row. The app cannot reserve the act's square on a row with no act: no prop or slot holds the place, and an inert act would be a control that does nothing. 003-100 aligns a Group's DefinitionRow values to one edge; nothing does the same for a List's trailing beside acts.

## Acceptance criteria
- [x] In a List whose row map declares `more` (or another trailing act), every row's trailing value ends at one x whether or not that row has the act, at every density.
- [x] A List with no act on any row is unchanged.
- [x] The ListRow showcase holds a list with one actless row among rows with acts, measured by the critique at 320, 390 and 1440 (the story `TrailingKeepsItsColumn` is written, awaits the batch run and the critique).

## Open questions
- [x] Its shape: the stack session decides.

## Ruled
The List reserves the more act's square for the rows that have none: it reads its loaded items through the row map (`more` declared, any item with entries, a tree's folded branches counted) and hands the rows a context, `ActsRoom`; a row with no more act and no chevron of its own (the chevron already stands in that square) draws a blank, `aria-hidden` square of `ROW_CHEVRON`. No prop, slot or inert control. Only `more` is reserved: a labelled `act` has the label's own width, which no row can know of another, so rows with differing acts end their values where their acts begin (flagged, not built). Waiting rows are unchanged.

## Built
`plugins/react-ui/src/ui/lib/acts-room.ts` and `plugins/native-ui/src/ui/lib/acts-room.ts` (the context), `list/index.tsx` on both platforms (computes `room` once from the loaded items and wraps the frame), `list-row/index.tsx` on both (`blank`). The rules pages and `ui-core.md` say it. Story `TrailingKeepsItsColumn` (`apps/showcase/behaviour/list-acts.stories.tsx`) holds three versions, the first with no more act, and asserts the three ages end at one x; written, not run.
Native unrendered: the same blank square in a `View`, unchecked on a device.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique pass: trailing ages end on one x at every width and density; an actless row keeps a 28/44 blank square.
