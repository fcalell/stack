---
id: 003-212
status: done
sessions: {}
---
# react-ui: a Sheet opened from a pick's closing act returns focus to the pick

## Goal
Stead's Work toolbar offers "New epic" as the Repo picker's closing act, which opens the New epic `Sheet` (github.com/fcalell/stead, `packages/server/src/app/routes/work/route.tsx` and `-components/sheets.tsx`; design/07-interface.md "### Work"). When the sheet closes (Escape, Cancel, or its submit opening the epic's thread) `document.activeElement` is the body: the act that opened it unmounted with the picker's popup, so the sheet has no trigger to return focus to, and a keyboard operator starts again from the page's top. Evidence: Stead's Work critique unit u6 (second pass) at stack `74a0e3d`, shot `ne-picked-1280l.png` (Stead scratchpad `critique/u6/shots/`).

## Approach
A `Sheet` returns focus to the element that opened it. A pick's closing act (`Picker`'s and `Menu`'s act rows) lives in the popup, which closes as the act runs, so by the time the sheet closes the opener is gone. 003-114 returns focus from a docked sheet's foot, not from a sheet opened by a popup's act. The app cannot name the picker's trigger as the sheet's return target: neither `Sheet` nor the pick's act takes one.

## Acceptance criteria
- [x] A Sheet opened from a Picker's or a Menu's act returns focus to that picker's or menu's trigger when it closes without leaving the page, at every density.
- [x] A Sheet whose submit navigates leaves focus where the destination's rules put it, not on the body.
- [x] The showcase holds a Picker whose closing act opens a Sheet, checked by a behaviour story on close.

## Open questions
- [x] Its shape: the stack session decides.

## Ruled
- Shape: derived. An act row of a `Picker` or `Menu` records the popup's trigger (the open `aria-expanded` element with `aria-haspopup` or the combobox role) as it runs; the next `SheetBase` to open within a second claims it as its return target. `SheetBase` hands focus there when it closes with focus lost, else to the page's first control.
- `Sheet` and the pick's act take no new prop.

## Built
- `rememberOpener`, `claimOpener`, `expandedTrigger`, `focusPage`, `useReturnFocus` in `plugins/react-ui/src/ui/lib/focus.ts`; `SheetBase` (`components/sheet/base.tsx`) calls `useReturnFocus`; `PickAct` (`components/picker/base.tsx`) and `MenuBase` (`components/menu/base.tsx`, both densities) call `rememberOpener`.
- Hold is read from the page's focus and press events (`trackHold`), as `useFootFocus` does, so a press on the scrim is left alone. The return waits for the sheet's leave to play.
- A submit that navigates: the opener is gone or the old page's, so focus falls to the destination page's first control (`focusPage`, retried for 0.5 s while the route draws), not the body.
- Tests: `plugins/react-ui/test/focus.test.ts` (`claimOpener`, `expandedTrigger`). Story `OpenedByAPicksAct` in `apps/showcase/behaviour/sheet.stories.tsx`, written, not run.

Native unrendered: native-ui has no keyboard focus order to move (touch and screen reader focus follow the platform), so the web mechanism has no native twin.
- Browser run: `apps/showcase/behaviour/sheet.stories.tsx` 32 of 32 pass (`OpenedByAPicksAct` among them; its Escape step needed the tooltip fix of 003-301 below).

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
