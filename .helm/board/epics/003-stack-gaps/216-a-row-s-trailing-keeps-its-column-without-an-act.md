---
id: 003-216
status: backlog
sessions: {}
---
# react-ui: a List's trailing values keep one column whether a row has an act or not

## Goal
Stead's knowledge History lists a page's versions, each with its age in the row's trailing and "Revert to this" under a more act, except the Current version, which has no act (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/knowledge.tsx`, the History list). The Current row's age ends at x=374 at 390 px where the other rows' ages end at x=322, a 52 px step (252 vs 304 at 320, 34 px at 1440), and the Current chip moves with it, so the ages read as two ragged columns. Evidence: Stead's knowledge editor critique unit u10 (second pass) at stack `74a0e3d`, shots `gh-390-light`, `gh-320-light` (Stead scratchpad `critique/u10/r2/`).

## Approach
A ListRow draws its `more` act after its trailing value, and a row without one gives the trailing that space, so in a List where only some rows carry an act the trailing column shifts row by row. The app cannot reserve the act's square on a row with no act: no prop or slot holds the place, and an inert act would be a control that does nothing. 003-100 aligns a Group's DefinitionRow values to one edge; nothing does the same for a List's trailing beside acts.

## Acceptance criteria
- [ ] In a List whose row map declares `more` (or another trailing act), every row's trailing value ends at one x whether or not that row has the act, at every density.
- [ ] A List with no act on any row is unchanged.
- [ ] The ListRow showcase holds a list with one actless row among rows with acts, measured by the critique at 320, 390 and 1440.

## Open questions
- [ ] Its shape: the stack session decides.
