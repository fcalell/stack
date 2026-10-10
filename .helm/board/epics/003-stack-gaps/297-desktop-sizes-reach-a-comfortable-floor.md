---
id: 003-297
status: backlog
sessions: {}
---
# ui-core: the desktop's small sizes reach a comfortable floor

## Goal
On the desktop some of Stead's parts read too small. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "desktop density is too small for some of the components".

## Approach
Desktop body is 13 px (`packages/ui-core/src/tokens.ts:623`), meta about 12 px and caption about 11 px (`:670-705`); icon 14, checkbox 16, switch 28 by 16, slider thumb 12, chip 20 and target 24 (`:961-990`). 003-157 (done) set the touch sizes only. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] Caption, meta, icons and the small controls each rise a step on the desktop (or body moves to 14 px with the scale following), measured against the references in the guide.
- [ ] Touch sizes are unchanged.

## Open questions
- [ ] Which sizes move and by how much: the stack session proposes with measurements; the owner signs off.
