---
id: 003-180
status: todo
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
- [x] Its shape (where the count stands relative to the glyph, and the step between them): the stack session decides.

## Ruled
`TAB_COUNT` takes `ms-inside`: the count starts one `inside` step (8 px on touch) right of the glyph's edge. The overlay stays absolute, so the glyph's box and the label's centring do not move. No pill, no change to `Count`. A three-figure count on the last tab at 320 is a limit to report, not decide.

## Built
`ms-inside` on `TAB_COUNT` in react-ui and native-ui `components/shell/index.tsx`. The Shell frame's Activity count is 44 (a two-figure count in the sidebar and the tab bar). `behaviour/shell.stories.tsx` `TabCountClearsItsGlyph` (320 px, touch) draws counts of 4, 44 and 444 and asserts the gap equals the `ms-inside` step and the label is centred under the glyph.
Evidence at 320: gap 8 px for 4, 44 and 444; the label's centre equals the glyph's. Limit: the three-figure count on the last (fifth) tab ends 7.2 px past the bar's right edge (it clips); the one- and two-figure counts on the first and second tabs end 258 and 188 px inside it. A compact-count rule is a design call: a contract gap, not decided here.

## Open
- A three-figure count on the last tab at 320 px ends 7.2 px past the bar and clips: the acceptance is not met for it. The owner decides the shape (a compact count, or another).
- Measured at 320 px light only; 390, 768 and dark are not run. The critique has not measured the frame.
