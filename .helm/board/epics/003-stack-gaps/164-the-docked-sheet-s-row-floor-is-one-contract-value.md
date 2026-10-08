---
id: 003-164
status: done
sessions: {}
---
# ui-core: the docked Sheet's body floor and share are contract values, not restated per platform

## Goal
A docked Sheet's body scrolls past two fifths of its foot's region and keeps at least three rows (003-129). Both numbers are written out twice. On the web they are an arbitrary class, `BODY_DOCKED = "min-h-[calc(var(--spacing-row)_*_3)] max-h-[40cqh]"` (`plugin-react-ui/src/ui/components/sheet/docked.tsx:55`), whose comment says the contract's cells hold no arbitrary value, so the class restates the region fraction and the row size. On the phone they are `BODY_ROWS * row` and `BODY_SHARE * region` (`plugin-native-ui/src/ui/components/sheet/docked.tsx:84`). If one platform changes the floor or the share, the other drifts silently, and `DESIGN.md` does not show either value.

## Approach
Derive both bounds from the contract: `packages/ui-core/src/tokens.ts` names the floor in rows and the share as a fraction (for example a `sheet.docked` entry beside `row`). The web cell reads the floor from it as a size token, and the phone reads both numbers. The cost is a new public token (it appears in `DESIGN.md` and the token schema), so it lands only if a derived value is not enough. A derived value would be a size computed from `row` that the contract already emits.

## Acceptance criteria
- [x] The floor in rows and the share of the region are each written once in `@fcalell/ui-core` and read by both platforms; neither platform's `docked.tsx` holds a literal 3 or 0.4.
- [x] `DESIGN.md` states both values in the Sheet cell.
- [ ] `DockedBodyKeepsThreeRows` and `DockedWithRoomFitsItsPage` pass, and the native sheet type-checks and passes `verify`.

## Decided
The floor is a derived size, `docked-floor`, three `row`s at each density (not in the theme schema); the share is the proportion `SHEET_DOCKED_BODY_SHARE` beside `METER_NEAR`. Both platforms read them; neither `docked.tsx` holds a literal 3 or 0.4.

## Built
ui-core: `docked-floor` in `SIZES` and `DerivedSize` (`tokens.ts`, `scales.ts`), `SHEET_DOCKED_FLOOR = "min-h-docked-floor"` in `variants.ts` (the Sheet draws and owns it), `SHEET_DOCKED_BODY_SHARE` in `tokens.ts`, and `DESIGN.md` states both in the Components section (a test pins the sentence). Web `sheet/docked.tsx` takes the utility with the share of the measured region as its max height; native reads `--spacing-docked-floor` and the share. Evidence: `pnpm check` turbo part and the three `verify` runs; the docked sheet stories are run in the browser by the coordinator.

## Critique (second round)
Ship, by a fresh critic at 1280, 390 (touch) and the widths the story names, light and dark (scratchpad `critique/r2-sheet/report.md`).
