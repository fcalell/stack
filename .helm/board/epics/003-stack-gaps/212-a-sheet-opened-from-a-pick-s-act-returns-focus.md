---
id: 003-212
status: backlog
sessions: {}
---
# react-ui: a Sheet opened from a pick's closing act returns focus to the pick

## Goal
Stead's Work toolbar offers "New epic" as the Repo picker's closing act, which opens the New epic `Sheet` (github.com/fcalell/stead, `packages/server/src/app/routes/work/route.tsx` and `-components/sheets.tsx`; design/07-interface.md "### Work"). When the sheet closes (Escape, Cancel, or its submit opening the epic's thread) `document.activeElement` is the body: the act that opened it unmounted with the picker's popup, so the sheet has no trigger to return focus to, and a keyboard operator starts again from the page's top. Evidence: Stead's Work critique unit u6 (second pass) at stack `74a0e3d`, shot `ne-picked-1280l.png` (Stead scratchpad `critique/u6/shots/`).

## Approach
A `Sheet` returns focus to the element that opened it. A pick's closing act (`Picker`'s and `Menu`'s act rows) lives in the popup, which closes as the act runs, so by the time the sheet closes the opener is gone. 003-114 returns focus from a docked sheet's foot, not from a sheet opened by a popup's act. The app cannot name the picker's trigger as the sheet's return target: neither `Sheet` nor the pick's act takes one.

## Acceptance criteria
- [ ] A Sheet opened from a Picker's or a Menu's act returns focus to that picker's or menu's trigger when it closes without leaving the page, at every density.
- [ ] A Sheet whose submit navigates leaves focus where the destination's rules put it, not on the body.
- [ ] The showcase holds a Picker whose closing act opens a Sheet, checked by a behaviour story on close.

## Open questions
- [ ] Its shape: the stack session decides.
