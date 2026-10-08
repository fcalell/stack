---
id: 003-181
status: backlog
sessions: {}
---
# react-ui: a touch Place's more act shares the title's row

## Goal
Stead's Now page is a `Place` titled "Now" with its `more` (github.com/fcalell/stead, `packages/server/src/app/routes/_now/route.tsx:96`). At 390 px the "⋯" stands alone on a strip above the title, about 44 px of chrome holding one glyph, and with the shell's banner above it the page spends about 160 px before its first section. Evidence: Stead's Now critique unit u2 at stack `74a0e3d`, shots `/tmp/claude-1000/-home-fcalell-projects-stead/b4731445-cb1e-4c58-8388-ae8329ae98ea/scratchpad/critique/u2/shots/now-390-light.png` and `/tmp/claude-1000/-home-fcalell-projects-stead/b4731445-cb1e-4c58-8388-ae8329ae98ea/scratchpad/critique/u2/shots/end-390-light.png`.

## Approach
003-95 (done) aligned the touch top bar's acts to the gutter, and 82f53e58 drew no strip for a Screen with nothing in its bar. A Place whose bar holds only its `more` still draws the full strip over its title. The app passes the title and the act; it has no say in the bar's rows.

## Acceptance criteria
- [ ] At 320 and 390 px, a touch `Place` with no back act stands its `more` on the title's row, with the title wrapping before them, and keeps the 44 px targets.
- [ ] A Place or Screen with a back act is unchanged.
- [ ] The Place showcase holds both, measured by the critique.

## Open questions
- [ ] Its shape: the stack session decides.
