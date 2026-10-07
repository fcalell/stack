---
id: 003-125
status: backlog
sessions: {}
---
# react-ui: a DefinitionRow's label wraps before it runs under a control at its end

## Goal
Stead's review screen holds a Group row, "Only what changed since you last looked" with "2 files changed" under it and a `Switch` as its value (github.com/fcalell/stead, `packages/server/src/app/ui/review.tsx`; design/07-interface.md "Review"). At 390 and 320 px the label is cut: 296 px of text in a 246 px box at 320 px, ending beside and under the Switch, so the row names half of what it toggles. Evidence: item screens critique unit u4, shots `review-320-light` and `review-390-light` (Stead scratchpad `critique/u4/shots/`, stack at `5564217`).

## Approach
`DefinitionRow`'s label is `truncate` on the title line beside the value (plugins/react-ui/src/ui/components/definition-row/index.tsx: `LABEL = "truncate"`), and the value takes `basis-0 grow min-w-0` with a control at its end; a label that needs more than the room the control leaves is cut on one line, with no wrap. 003-107 asks for the prop's JSDoc to say a label truncates, which documents this; it does not draw a wrapped label. Not 003-100 (the end x of values and a two-line row's alignment), not 003-120 (a string value's space at its cut), not 003-118 (a ListRow's status). 003-55 let a ListRow title wrap; a row naming a setting has no such form. Seen at stack `5564217`.

## Acceptance criteria
- [ ] A DefinitionRow whose label needs more than the room its value leaves wraps it to as many lines as it needs, the value and the control staying whole at the row's end and centred on it.
- [ ] A short label draws on one line as now, at the same row height.
- [ ] The DefinitionRow showcase holds a sentence label with a `Switch` value at the phone's narrowest width and the critique measures the label's lines.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the label wraps by default when the value is a control, or a `wrap` choice as 003-55 gave a ListRow.
