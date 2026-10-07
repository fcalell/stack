---
id: 003-147
status: backlog
sessions: {}
---
# react-ui: a desktop side Sheet for a short form is not a full-height drawer

## Goal
Stead's New epic (three checkboxes) and Add a repo (one select) sheets draw at 1440 px as a 640 by 900 drawer with about 700 px of empty body under the field, and the blocked reason ("Pick a repo.") sits under the submit at 11 px (github.com/fcalell/stead, `packages/server/src/app/routes/work/-components/sheets.tsx`; design/07-interface.md "Work"). Evidence: critique unit u6, shots `new-epic-1440-light`, `addrepo-blocked-1440-light` (Stead scratchpad `critique/u6/shots/`, stack at `5564217`). Reference: Notion's "New workspace" and Linear's create dialogs in the sheet-and-confirm pattern page.

## Approach
`Sheet` with `fit` "form" (the default) is the full-height side sheet (`SHEET_SIDE`), whatever the form's length; `SheetCentered` exists in ui-core variants but the Sheet takes no way to say a short form. The app cannot size the sheet (geometry goes on host elements only). 003-129 is a docked sheet's body floor, 003-99 the head's rhythm; the reason's size is 003-140's. Seen at stack `5564217`.

## Acceptance criteria
- [ ] A Sheet whose body is short on the desktop sizes to its content (a floor and a ceiling) or draws centred, and keeps the full-height side form for a long one.
- [ ] The Sheet showcase holds a one-field form and the critique measures the empty body left.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether `fit` gains a value or the Sheet decides by its body.
