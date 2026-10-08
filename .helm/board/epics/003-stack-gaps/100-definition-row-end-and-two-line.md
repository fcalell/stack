---
id: 003-100
status: done
sessions: {}
---
# react-ui: DefinitionRows in one Group end their values at one x and align a two-line row's value

## Goal
In one Group, DefinitionRows with an end slot (the Stage row's chevron, the Branch row's copy act) end their value ~18 px short of plain rows (Time, Spend), a ragged right edge (`card-1440-light` Job group, `item-action-0-1440-light`). On a two-line row (label with a description) the value is top-aligned while the end act is centred (`sheet-review-1440-light`: "Under test/" against the pencil).

## Approach
`DEFINITION_ROW_CHEVRON` = `size-control-compact` (a square for a link's chevron) stands only where a row has one; plain rows end at the row's inset. `ROW` is `items-center` while a two-line text block starts at the top. Stead: `routes/work/-components/card.tsx`, the review sheet's answers.

## Acceptance criteria
- [x] A Group's DefinitionRows end their values at one x whatever the end slot.
- [x] On a two-line row the value shares a line with the label and the act is centred on the row.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Built
Every DefinitionRow ends in the end square (`DEFINITION_ROW_CHEVRON`): an act's, a link's chevron, or, on a row with neither, an empty one, so every value in a Group ends at one x; the waiting form draws the same square on every row. A two-line row's value already stands on the label's line (the title line holds label and value, the description sits under it) and its act is centred on the row (`ROW` is `items-center`). `apps/showcase/behaviour/definition-row.stories.tsx` (`ValuesEndTogether`, desktop and touch) asserts plain, linked, acted and copyable values end at one right edge, and the described row's value shares the label's middle with its act centred on the row. The cost is one empty square at the end of a Group whose rows all lack an act or link.

## Critique
Ship, by a fresh critic at 1280, 768, 1440 and 390, light and dark (scratchpad `critique/fields/report.md`).
