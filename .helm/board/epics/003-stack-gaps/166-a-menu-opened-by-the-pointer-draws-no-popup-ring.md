---
id: 003-166
status: done
sessions: {}
---
# react-ui: a Menu opened by the pointer draws no focus ring on its popup

## Goal
Opened with the mouse, the Menu popup takes focus itself and draws a 2 px focus ring around the whole popup (240 x 153 `[role=menu]`); the Picker's popup draws none. Measured by the sheet critique (`critique/sheet/report.md`, Menu), pre-existing.

## Approach
The popup is not a control: its rows carry the keyboard's ring and wash. The popup takes `outline-none` (`menu/base.tsx`), as the Picker's options and the Select's rows do.

## Acceptance criteria
- [x] A Menu opened by a click draws no outline on its popup (`Behaviour/Menu` `PointerOpenDrawsNoRing`).
- [x] A Menu opened from the keyboard still rings the focused row (`Popover` unchanged).

## Built
`POPUP` in `plugins/react-ui/src/ui/components/menu/base.tsx` gains `outline-none`. `PointerOpenDrawsNoRing` asserts the popup's computed `outline-style`.

## Critique (second round)
Ship, by a fresh critic at 1280, 390 (touch) and the widths the story names, light and dark (scratchpad `critique/r2-sheet/report.md`).
