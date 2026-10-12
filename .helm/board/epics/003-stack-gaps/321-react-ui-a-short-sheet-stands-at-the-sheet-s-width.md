---
id: 003-321
status: review
sessions: {}
---
# react-ui: a short sheet stands at the sheet's width

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c2 and c5) measured the desktop side sheet at 520 px at 1280 (Provenance, New request, Rename) against the sheet pattern's 610 to 730 (`packages/ui-core/guide/patterns/sheet-and-confirm.md`: Neon 610, Vapi 710, Airwallex 730). The 520 is the dialog's width: a desktop Sheet whose content fits is the centred card `SHEET_SIDE.fit.short`, which took `w-dialog`. A confirm at 520 is inside its own 365 to 590 range and stays.

## Approach
`SHEET_SIDE.fit.short` takes `w-sheet` (640, inside the range) in place of `w-dialog`; the full-height form sheet (`fit.form`) was already `w-sheet`. The decision's own centred cell (`SHEET_CENTERED`, a `confirm()`) keeps `w-dialog`.

## Acceptance criteria
- [x] A short desktop sheet (a card centred over the page) is the `sheet` token wide, within 610 to 730.
- [x] A confirm decision keeps the dialog's width.
- [x] The long-form side sheet and the pane sheet are unchanged.

## Built
`packages/ui-core/src/variant-tables.ts`: `short: "w-sheet border rounded-sheet"` (comment says why). `DESIGN.md` is unchanged (the cell's classes are not listed in it) and `pnpm design-md` lints. `ui-core.md`'s short-sheet entry says `w-sheet`. Story `ShortSheetIsACentredCard` (`apps/showcase/behaviour/sheet.stories.tsx`) now measures the card against a probe of `w-sheet` and the 610 to 730 range: 520 px before, 640 after. Sheet, popups, form-leave and not-found stories 49 of 49 in Chromium.
Native has no short desktop card (the phone's sheet is the bottom sheet), so the native box is not open.
