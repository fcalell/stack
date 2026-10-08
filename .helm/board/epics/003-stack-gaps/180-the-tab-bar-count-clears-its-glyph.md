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
- [x] At 320, 390 and 768 px, light and dark, a one-, two- and three-figure tab count stands clear of its glyph by a named spacing step, and the tab's label stays centred under the glyph.
- [ ] The Shell showcase holds a tab bar with a two-figure count, measured by the critique.

## Open questions
- [x] Its shape (where the count stands relative to the glyph, and the step between them): the stack session decides.

## Ruled
`TAB_COUNT` takes `ms-inside`: the count starts one `inside` step (8 px on touch) right of the glyph's edge. The overlay stays absolute, so the glyph's box and the label's centring do not move. No pill, no change to `Count`. A three-figure count on the last tab at 320 is a limit to report, not decide.

## Built
`ms-inside` on `TAB_COUNT` in react-ui and native-ui `components/shell/index.tsx`. The Shell frame's Activity count is 44 (a two-figure count in the sidebar and the tab bar). `behaviour/shell.stories.tsx` `TabCountClearsItsGlyph` (320 px, touch) draws counts of 4, 44 and 444 and asserts the gap equals the `ms-inside` step and the label is centred under the glyph.
Evidence at 320: gap 8 px for 4, 44 and 444; the label's centre equals the glyph's. Limit: the three-figure count on the last (fifth) tab ends 7.2 px past the bar's right edge (it clips); the one- and two-figure counts on the first and second tabs end 258 and 188 px inside it. A compact-count rule is a design call: a contract gap, not decided here.

## Owner ruling
The owner rules a compact count: past 99 a tab count reads "99+", on both platforms, so a three-figure count stays clear of the bar's edge on the last tab at 320. To build.

## Built (owner ruling)
A tab count past `TAB_COUNT_MAX` (99) reads "99+" on both platforms: the slot word `countOver` ("{max}+") in `words`, drawn through `tabCount(words, count)` in ui-core `tokens.ts`; the Shell's tab bar on each platform hands it to `Count`, whose `value` is now `number | string` (the shell may not spell `COUNT`, a cell `Count` holds). The sidebar's `Count` draws the number whole. `behaviour/shell.stories.tsx` holds `TabCountClearsItsGlyph` at 320, 390 and 768 px, light and dark (six stories), with counts 4, 44 and 444 (drawn "99+"): gap 8 px (the `ms-inside` step) for each, in all six, and the label centred under the glyph. Gates: `pnpm check` turbo part, the three verifies and Biome pass; the six stories pass.
Distance from the count's end to the bar's end on the last tab: 320, -7.2 px for "99+" (4: 258.7, 44: 188.1); 390, -0.2 px for "99+" (4: 321.7, 44: 237.1); 768 inside. "99+" is three characters at one width, as wide as "444", so the ruling does not move the 320 overshoot.

## Open
- "99+" is as wide as "444" (three characters at one width): on the last of five tabs the count still ends 7.2 px past the bar at 320 and 0.2 px past it at 390, so the ruling's aim (the count clears the bar's edge at 320) is not met. At 320 the last tab is 64 px, its glyph ends at 44 and "99+" is 19.2 px, so with an 8 px step no cap length fits ("9+" ends 0.8 px past). Recommended answer: the count stands on the glyph's top-right corner, its start half a count-width inside the glyph's edge, a badge, with the label unmoved. The owner decides.
- The critique has not measured the Shell frame (the second acceptance box).
