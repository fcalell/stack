---
id: 003-304
status: backlog
sessions: {}
---
# react-ui: a touch Screen's acts share the title's row

## Goal
On touch, Stead's System, Repos, then a repo, opens a `beside` `Screen` with actions and more (`packages/server/src/app/routes/system/-components/repos.tsx:196`) whose bar (back, actions, more) stands on a row above its title. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "the split that opens has header and actions on 2 rows".

## Approach
003-181 (review) made a touch Place one row and ruled the Screen unchanged; `Screen` still draws the bar row over a title row (`plugins/react-ui/src/ui/components/screen/index.tsx:147-175`). 003-134 (review) is the single header at phone width, not the row count. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] At 320 and 390 px a touch `Screen` is one row (back, title wrapping, then its acts), as 181 made the Place, keeping 44 px targets.
- [ ] Native the same.

## Open questions
- [ ] Its shape: the stack session decides; it widens 181's ruling, so the owner signs off.
