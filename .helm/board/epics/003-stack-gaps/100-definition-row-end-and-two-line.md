---
id: 003-100
status: backlog
sessions: {}
---
# react-ui: DefinitionRows in one Group end their values at one x and align a two-line row's value

## Goal
In one Group, DefinitionRows with an end slot (the Stage row's chevron, the Branch row's copy act) end their value ~18 px short of plain rows (Time, Spend), a ragged right edge (`card-1440-light` Job group, `item-action-0-1440-light`). On a two-line row (label with a description) the value is top-aligned while the end act is centred (`sheet-review-1440-light`: "Under test/" against the pencil).

## Approach
`DEFINITION_ROW_CHEVRON` = `size-control-compact` (a square for a link's chevron) stands only where a row has one; plain rows end at the row's inset. `ROW` is `items-center` while a two-line text block starts at the top. Stead: `routes/work/-components/card.tsx`, the review sheet's answers.

## Acceptance criteria
- [ ] A Group's DefinitionRows end their values at one x whatever the end slot.
- [ ] On a two-line row the value shares a line with the label and the act is centred on the row.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
