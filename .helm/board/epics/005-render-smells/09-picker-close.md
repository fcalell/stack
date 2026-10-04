---
id: 005-09
status: backlog
sessions: {}
---
# react-ui, native-ui: a Picker's sheet resets on open and leaves with its animation

## Goal
- Phone `close()` clears the search, then closes (`components/picker/sheet.tsx:160-163`), on a
  pick, a swipe and the scrim: the rows re-expand to the full list and the sheet jumps while it
  slides out.
- Phone, in a table cell, closing calls `cell.done()` in the same handler
  (`picker/base.tsx:58-62`), so the edit ends and unmounts the sheet while gorhom still presents
  it: no leave animation.
- Web `search` and `focused` (`picker/base.tsx:617-618`) reset only in `SheetBase onClose`
  (`:662-666`); a pick (`:277-280`) and `PickAct` (`:723`) close another way, so the next open
  shows the stale filter.
- Web initial focus waits two `requestAnimationFrame`s and queries `[tabindex="0"]`
  (`:638-650`), a guess against Base UI's focus manager.
- Web, the form follows a data count mid-open: crossing `SEARCH_PAST` swaps `PickList` for
  `PickSearch` (`:365-391`), tearing down an open popup and its focus.

## Approach
The search and focus state lives in the rows rendered inside the sheet, or resets when the sheet
opens, so it dies with the sheet however it closes. A cell edit ends from the sheet's own
after-dismiss callback. `SheetBase` takes the element to focus first and hands it to Base UI's
`initialFocus`; the effect and its frames go. The Picker latches its form while open.

## Acceptance criteria
- [ ] (live) web, members' role Select at 375 and 1440: after a pick from a filtered list, the next open shows every option, focus on the chosen one.
- [ ] (live) phone, on the harness: a filtered list keeps its rows while the sheet leaves, and a cell picker's sheet plays its leave.
