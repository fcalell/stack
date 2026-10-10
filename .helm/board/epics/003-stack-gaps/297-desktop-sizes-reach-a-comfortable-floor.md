---
id: 003-297
status: review
sessions: {}
---
# ui-core: the desktop's small sizes reach a comfortable floor

## Goal
On the desktop some of Stead's parts read too small. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "desktop density is too small for some of the components".

## Approach
Desktop body is 13 px (`packages/ui-core/src/tokens.ts:623`), meta about 12 px and caption about 11 px (`:670-705`); icon 14, checkbox 16, switch 28 by 16, slider thumb 12, chip 20 and target 24 (`:961-990`). 003-157 (done) set the touch sizes only. Seen at stack `226f48c`.

## Acceptance criteria
- [x] Caption, meta, icons and the small controls each rise a step on the desktop (or body moves to 14 px with the scale following), measured against the references in the guide.
- [x] Touch sizes are unchanged.

## Open questions
- [x] Which sizes move and by how much: the stack session proposes with measurements; the owner signs off.

## Ruled
The owner's ruling: the whole desktop scale steps up one rung, `BODY_SIZE.desktop` 13 -> 14, and the ratios carry the rest (meta 13, caption 12, code 13, heading 16, title 19, figure 24, display 39; line boxes body 22, meta 20, caption 18, code 20).
- Row-2 is 52, confirmed by line-box arithmetic: a two-line row is the body line (22) plus the meta line (20) plus 5 px above and below, the same 5 the old row held (20 + 18 + 10 = 48). 22 + 20 + 10 = 52.
- Row stays 32 as ruled. A body line (22) now sits in it with 5 px over and under, but a row that adds `py-inside` (6) to a body line (the comparison row) reads 34: the verify check "line plus inside = row" no longer holds and asserts the line fits the row instead.
- Touch and room are untouched (`BODY_SIZE.touch`, `TOUCH_SIZES`).

## Built
- `packages/ui-core/src/tokens.ts`: `BODY_SIZE.desktop` 14; `SIZE_PX.desktop` icon-meta 14, icon 16, icon-control 18, check 18, switch 32 x 18, thumb 14, chip 22, target 28, row-2 52. Derived: line-body 22, measure 488 (measure-inset 536), chips-inset 2, switch-travel 14, text-area 66, message-input 176, image-tile 88, image-cap 440, figures 32, icon-inset 7. Comments restated (the stroke note: the meta icon is 14 at both densities, `line` 1.17 px, `mark` 2.04 px).
- `packages/ui-core/src/design-md.ts`: the density sentence says desktop body 14. `DESIGN.md` regenerated.
- Rubric constants (`packages/ui-core/guide/rubric.md`): body 13-14, muted second size 12-13, chip 16-24 tall with 11-12 type, kbd plain muted 12; the touch ratio example reads body 14 -> 16, chip 22 -> 24. `packages/ui-core/README.md` and `.helm/knowledge/architecture/ui-core.md` state the new numbers (body 14, target 28/44, line-body 22/24, measure 488, row-2 52/64).
- Hard-coded desktop numbers moved so they still hold: `apps/showcase/behaviour/sheet.stories.tsx` (heading 16/600, body 14/600), `packages/ui-core/test/chart.test.ts` (top tick reach 10), `plugins/react-ui/test/canvas.test.ts` (text floor 12, name cap 130), `plugins/react-ui/test/graph.test.ts` (desktop display 39), `packages/ui-core/scripts/verify.ts` (desktop target 28; the one-line row check).
- Evidence: `pnpm check` and `pnpm verify` in ui-core (34/34), react-ui and native-ui pass. Native unrendered: the phone keeps the touch set, so nothing changes there.
- Any frame that now clips (a 52 row, a 28 target in a dense toolbar, a 488 measure) is a new gap for the critique. Browser runs (stories, screens) await the batch.
