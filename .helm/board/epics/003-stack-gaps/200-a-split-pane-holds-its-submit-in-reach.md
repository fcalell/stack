---
id: 003-200
status: backlog
sessions: {}
---
# react-ui: a Split's pane keeps its form's submit in reach

## Goal
Stead's workflow canvas stands the selected node's sheet in the `Split`'s pane, a `Form` of the node's fields with "Apply" and "Remove the node" (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/node-sheet.tsx`, the node form's `ActionBar`; design/07-interface.md "### A workflow: the canvas", A node's sheet: "the sheet's submit 'Apply' changes the draft"). An agent node's sheet is long, so at 390x844 Apply stands at y 1858 before scrolling, and at 1440 the pane scrolls 1266 to 1424 px against 771 px of client height with Apply at its end. Evidence: Stead's step 8 critique unit u11 at stack `74a0e3d` (Stead scratchpad `critique/u11/shots/`).

## Approach
A `Sheet` keeps its `submit` reachable: in the foot on the desktop and at the head's end on touch (`components/sheet/base.tsx`, `headSubmit`; rules.md on the sheet's foot). The pane is not a `Sheet` the app makes: `Split` draws it in the `aside` from `wide` and as its Details sheet below (`<SheetBase fit="pane" …>` in `components/split/index.tsx`) with no `submit` and no foot, and a `Form`'s `ActionBar` in the pane stands at the end of the body, parted by a hairline, scrolling with it. The app cannot pass the pane a submit, and making its own modal `Sheet` per node below `wide` rebuilds the Split's job. 003-192 (the app opening and closing the pane) leaves this as it was.

## Acceptance criteria
- [ ] A form in a `Split`'s pane keeps its submit act in reach at every width: from `wide` in the pane, and in the Details sheet below it, as a `Sheet`'s submit stands, so a long form never puts it below the fold.
- [ ] A pane with no form is unchanged.
- [ ] The Split showcase holds a pane with a long form at 390 and 1440, measured by the critique.

## Open questions
- [ ] Its shape (a `submit` on the Split's pane, the pane reading a `Form`'s `ActionBar`, or another): the stack session decides.

## Owner ruling
The owner rules 200 web-only as written; the phone's Details sheet reaching its submit is 003-292.
