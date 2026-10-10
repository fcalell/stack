---
id: 003-200
status: done
sessions: {}
---
# react-ui: a Split's pane keeps its form's submit in reach

## Goal
Stead's workflow canvas stands the selected node's sheet in the `Split`'s pane, a `Form` of the node's fields with "Apply" and "Remove the node" (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/node-sheet.tsx`, the node form's `ActionBar`; design/07-interface.md "### A workflow: the canvas", A node's sheet: "the sheet's submit 'Apply' changes the draft"). An agent node's sheet is long, so at 390x844 Apply stands at y 1858 before scrolling, and at 1440 the pane scrolls 1266 to 1424 px against 771 px of client height with Apply at its end. Evidence: Stead's step 8 critique unit u11 at stack `74a0e3d` (Stead scratchpad `critique/u11/shots/`).

## Approach
A `Sheet` keeps its `submit` reachable: in the foot on the desktop and at the head's end on touch (`components/sheet/base.tsx`, `headSubmit`; rules.md on the sheet's foot). The pane is not a `Sheet` the app makes: `Split` draws it in the `aside` from `wide` and as its Details sheet below (`<SheetBase fit="pane" …>` in `components/split/index.tsx`) with no `submit` and no foot, and a `Form`'s `ActionBar` in the pane stands at the end of the body, parted by a hairline, scrolling with it. The app cannot pass the pane a submit, and making its own modal `Sheet` per node below `wide` rebuilds the Split's job. 003-192 (the app opening and closing the pane) leaves this as it was.

## Acceptance criteria
- [x] A form in a `Split`'s pane keeps its submit act in reach at every width: from `wide` in the pane, and in the Details sheet below it, as a `Sheet`'s submit stands, so a long form never puts it below the fold.
- [x] A pane with no form is unchanged.
- [x] The Split showcase holds a pane with a long form at 390 and 1440, measured by the critique.

## Open questions
- [x] Its shape (a `submit` on the Split's pane, the pane reading a `Form`'s `ActionBar`, or another): the stack session decides.

## Owner ruling
The owner rules 200 web-only as written; the phone's Details sheet reaching its submit is 003-292.

## Ruled
The pane reads the Form: a `Form` in the pane or in its Details sheet keeps its `ActionBar` stuck at the scroller's bottom edge. No prop on `Split`, no `submit` on the pane, nothing lifted out of the Form. A stuck bar is "in reach" as a desktop Sheet's foot is; the touch head-end placement is not asked. Web only; the phone is 003-292.

## Built
`Split` wraps the aside's pane in `FormStands` `pane` (`FORM in.pane`, uncapped like `sheet`); the Details sheet already provides `sheet`. The web `Form` wraps its `ActionBar` in `FORM_FOOT` plus a stuck overlay (`FOOT_STUCK`: `sticky`, a negative bottom offset, the host ground, and a negative margin with matching padding across the scroller's inset) in `pane` and `sheet`, for an unsectioned form too. A sticky box sticks inside the scroller's padding, so the offset is the negative inset. `FORM_FOOT` stays one shared constant (positioning and the bleed are platform overlays), so the phone is unchanged. The Split showcase frame's pane is a long `Form`.

Evidence: behaviour stories `PaneFormKeepsItsBar1440` (the aside) and `PaneFormKeepsItsBar390` (the Details sheet) assert the bar inside the scroller and flush with its bottom, left and right edges at scroll top and end; `PaneWithoutFormSticksNothing` holds a pane with no form. The split, sheet, action-bar, form-leave, waiting, text-area, gate, place and screen story files pass (122 tests) and the scoped screens run passes (180 tests).

The third box (the critique measuring the frame at 390 and 1440) waits on the critique; at 390 the frame's Details act opens the sheet.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique pass: the sticky bar is flush at both scroll extremes in the desktop pane and the touch sheet; hairline top, no shadow.
