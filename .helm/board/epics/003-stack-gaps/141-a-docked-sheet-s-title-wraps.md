---
id: 003-141
status: backlog
sessions: {}
---
# react-ui: a docked Sheet's title wraps whole

## Goal
Stead's question sheet docks in a conversation's foot titled by the question, and the head truncates it: "Should the rename go in the cha…" at 390 px, where the question is what the options below answer and the operator must read all of it (github.com/fcalell/stead, `packages/server/src/app/ui/question-sheet.tsx`; design/07-interface.md "The question sheet", the docked row: a `Section` titled by the question). Evidence: chats critique unit u5, shots `shots3/q-chosen-390-dark`, `shots/q1-390-light` (Stead scratchpad `critique/u5/shots/`, stack at `5564217`).

## Approach
`SheetDocked` (plugins/react-ui/src/ui/components/sheet/docked.tsx) sets the title in `TITLE = "grow min-w-0 truncate"` beside the close act, so any title longer than the row ends in an ellipsis. A docked title can be a sentence, so it should wrap to two or three lines, the close act staying at the first line's top, the description under it. 003-91 is the touch head of the modal `Sheet` beside its submit; 003-99 is the desktop head's rhythm; 003-129 is the body's floor, which a taller head makes harder, so the two are read together. The app cannot shorten a question (it is the agent's). Seen at stack `5564217`.

## Acceptance criteria
- [ ] A docked Sheet's title wraps to its whole text on touch and desktop, the close act aligned to the first line.
- [ ] A short title is unchanged.
- [ ] The Sheet showcase holds a docked Sheet with a two-line title and the critique measures the head and the body floor left.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the title wraps freely or clamps at a line count with the full text available.
