---
id: 003-164
status: backlog
sessions: {}
---
# ui-core: the docked Sheet's body floor and share are contract values, not restated per platform

## Goal
A docked Sheet's body scrolls past two fifths of its foot's region and keeps at least three rows (003-129). Both numbers are written out twice. On the web they are an arbitrary class, `BODY_DOCKED = "min-h-[calc(var(--spacing-row)_*_3)] max-h-[40cqh]"` (`plugin-react-ui/src/ui/components/sheet/docked.tsx:55`), whose comment says the contract's cells hold no arbitrary value, so the class restates the region fraction and the row size. On the phone they are `BODY_ROWS * row` and `BODY_SHARE * region` (`plugin-native-ui/src/ui/components/sheet/docked.tsx:84`). If one platform changes the floor or the share, the other drifts silently, and `DESIGN.md` does not show either value.

## Approach
Derive both bounds from the contract: `packages/ui-core/src/tokens.ts` names the floor in rows and the share as a fraction (for example a `sheet.docked` entry beside `row`). The web cell reads the floor from it as a size token, and the phone reads both numbers. The cost is a new public token (it appears in `DESIGN.md` and the token schema), so it lands only if a derived value is not enough. A derived value would be a size computed from `row` that the contract already emits.

## Acceptance criteria
- [ ] The floor in rows and the share of the region are each written once in `@fcalell/ui-core` and read by both platforms; neither platform's `docked.tsx` holds a literal 3 or 0.4.
- [ ] `DESIGN.md` states both values in the Sheet cell.
- [ ] `DockedBodyKeepsThreeRows` and `DockedWithRoomFitsItsPage` pass, and the native sheet type-checks and passes `verify`.

## Open questions
- [ ] A public token, or a value derived from `row` and kept internal to ui-core. Recommended: derived and internal, with no token added, unless the theme schema has to let an app change it.
