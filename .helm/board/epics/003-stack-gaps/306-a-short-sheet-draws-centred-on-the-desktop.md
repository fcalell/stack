---
id: 003-306
status: done
sessions: {}
---
# react-ui: a short Sheet draws centred on the desktop

## Goal
Stead's "Add a node" on the workflow canvas (`packages/server/src/app/routes/system/-components/add-node.tsx:79`) and its other short picks draw as a card hung at the top end of the page. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "modals should be centered". The owner rules a short pick a card centred over the page on the desktop; a long form stays the side sheet. Stead's `design/07-interface.md` ("The shell") now says so.

## Approach
003-147 (done) made a short desktop side sheet its content's height, hung from the top at the end edge (`LAYER_SIDE` `items-start justify-end`, `plugins/react-ui/src/ui/components/sheet/base.tsx:65-69`), and stood its look for the owner's sign-off; this is that ruling reversed. `SheetCentered` exists in ui-core's variants. Seen at stack `226f48c`.

## Acceptance criteria
- [x] On the desktop a Sheet whose body fits the viewport draws as a card centred over the page, with its submit in reach (003-292).
- [x] A form past the viewport stays the full-height side sheet, its body scrolling.
- [x] Touch is unchanged.

## Open questions
- [x] Where the line between short and long falls, and whether it moves between the two as the form grows: the stack session decides.

## Ruled
The line falls at the viewport and is drawn once per open (owner ruling). A desktop Sheet at the default `fit` is a centred card when its content at natural height (head, body, foot, no cap) is at most the layer's height less the page inset above and below; otherwise the full-height side sheet. It is measured in the popup's first mount, before paint, and held until the sheet is gone: a form that grows stays a card with its body scrolling, a side sheet that shrinks stays one, a wizard keeps its first page's form. Touch, `fit="pane"` and `form="centred"` are unchanged. No prop: the card is a third `fit` (`short`) on `sheetSide`, outside the public `SheetFit`.

## Built
- `packages/ui-core/src/variant-tables.ts`: `SHEET_SIDE` gains `fit: short` (`w-dialog border rounded-sheet`); the border and radius move from the base into each fit. `variants.ts`: `SheetFit` excludes `short` (the Sheet's own choice), `SheetSideFit` is every key. `DESIGN.md` regenerated.
- `plugins/react-ui/src/ui/components/sheet/base.tsx`: `useShortOrSide` (a callback ref on the popup measures it with `max-height: none` against the layer less its `py-page` padding and holds `short` or `side` until the next open); the short sheet uses `LAYER_CENTRED` plus `py-page`, `CENTRED_MOTION`, `max-h-full`, the foot `rounded-b-sheet`; the side layer stretches so a side sheet is always the full height. Head over a hairline, body, foot under a hairline, submit after Cancel are the side sheet's regions. `scripts/overlays.ts` allowlist gains the two classes.
- `Sheet` JSDoc, `plugins/react-ui/guide/rules.md`, `.helm/knowledge/architecture/ui-core.md` say it; 003-147's Built note carries the reversal.
- `apps/showcase/behaviour/sheet.stories.tsx`: `SideSheetFitsItsContent` becomes `ShortSheetIsACentredCard` (centred on both axes, under half the viewport, foot inside, border on all sides) and `LongFormStaysASideSheet` (24 fields at 1440x900: full height, right edge, foot on screen). Written and type-checked, not run (they await the batch browser run, as does the measured line itself).
- Gate: `pnpm check` type-check and tests pass; its Biome step cannot see files under `.claude/worktrees` (every path ignored), so the changed files were format-checked by hand. `pnpm verify` passes in ui-core (34/34) and react-ui (13/13).
- Browser run: `apps/showcase/behaviour/sheet.stories.tsx` 32 of 32 pass (`ShortSheetIsACentredCard`, `LongFormStaysASideSheet`). The first browser run found the long form 4 px down mid-slide: the measuring frame mounted with the centred sheet's rise (`translate-y-pair`), which the switch to the side sheet inherited; `SheetBase` now plays no motion on the measuring frame (`measuring`), so the form it settles on is the one that enters.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
