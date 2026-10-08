---
id: 003-180
status: backlog
sessions: {}
---
# react-ui: the tab bar's count clears its glyph

## Goal
Stead's shell passes `Shell` a count on its Now place (github.com/fcalell/stead, `packages/server/src/app/routes/__root.tsx`). At 390 px the tab bar draws the count "44" against the home glyph's right edge, with no gap between the glyph and the first digit, so the number reads as part of the icon. Evidence: Stead's Now critique unit u2 at stack `74a0e3d`, shot `/tmp/claude-1000/-home-fcalell-projects-stead/b4731445-cb1e-4c58-8388-ae8329ae98ea/scratchpad/critique/u2/shots/now-390-light.png` (the Now tab, bottom left).

## Approach
003-92 (done) named this seam ("the Now count crowds the glyph") and its Built note stands the plain number "at the glyph's top end" through the Shell's `TAB_COUNT` overlay. As a plain number without the pill's ground, a two-figure count now starts where the glyph ends. The app passes only the count, so it cannot place it.

## Acceptance criteria
- [ ] At 320, 390 and 768 px, light and dark, a one-, two- and three-figure tab count stands clear of its glyph by a named spacing step, and the tab's label stays centred under the glyph.
- [ ] The Shell showcase holds a tab bar with a two-figure count, measured by the critique.

## Open questions
- [ ] Its shape (where the count stands relative to the glyph, and the step between them): the stack session decides.
