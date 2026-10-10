---
id: 003-180
status: review
sessions: {}
---
# react-ui: the tab bar's count clears its glyph

## Goal
Stead's shell passes `Shell` a count on its Now place (github.com/fcalell/stead, `packages/server/src/app/routes/__root.tsx`). At 390 px the tab bar draws the count "44" against the home glyph's right edge, with no gap between the glyph and the first digit, so the number reads as part of the icon. Evidence: Stead's Now critique unit u2 at stack `74a0e3d`, shot `/tmp/claude-1000/-home-fcalell-projects-stead/b4731445-cb1e-4c58-8388-ae8329ae98ea/scratchpad/critique/u2/shots/now-390-light.png` (the Now tab, bottom left).

## Approach
003-92 (done) named this seam ("the Now count crowds the glyph") and its Built note stands the plain number "at the glyph's top end" through the Shell's `TAB_COUNT` overlay. As a plain number without the pill's ground, a two-figure count now starts where the glyph ends. The app passes only the count, so it cannot place it.

## Acceptance criteria
- [ ] At 320, 390 and 768 px, light and dark, a one-, two- and three-figure tab count stands on its glyph's top-right corner as a badge (the owner's second ruling), its start half its width inside the glyph's edge and its end inside the bar, and the tab's label stays centred under the glyph.
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

## Owner ruling
Second ruling: "99+" is as wide as "444" and still overruns the last tab at 320 (even "9+" would, by 0.8 px). The tab count stands on the glyph's top-right corner as a badge, its start half the count's width inside the glyph's edge, the label unmoved; the 99+ cap stays. To build.

## Built (second ruling)
`TAB_COUNT` is `absolute top-0 left-full -translate-x-1/2` on both platforms (react-ui and native-ui `components/shell/index.tsx`): the count's start sits half its own width inside the glyph's edge, the overlay stays absolute so the glyph and the label do not move, and the 99+ cap stays. `ui-core.md` states it. `behaviour/shell.stories.tsx` `TabCountClearsItsGlyph` (six stories: 320, 390 and 768 px, light and dark; counts 4, 44 and 444 drawn "99+") asserts the count's start is half its width left of the glyph's right edge, its right edge is inside the bar's, and the label is centred under the glyph.
Evidence (identical in light and dark): the start is -4.07, -8.14 and -12.21 px past the glyph's edge (half the widths 8.14, 16.28 and 24.42). The distance from the count's end to the bar's end on the last tab: 320, 12.99 px for "99+" (4 and 44 on the first two tabs: 270.7 and 204.3); 390, 19.99 px (333.7, 253.3); 768, 57.79 px (673.9, 517.9). The six stories pass with the rest of the Shell and Picker files (17 of 17 in the run; peak 2442 MiB). The first acceptance box's "named spacing step" is the earlier ruling's shape; the second ruling replaces it with the badge offset.

## Open
- The critique has not measured the Shell frame (the second acceptance box).

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique (blocker, legibility): the tab count overlaps the glyph's strokes by 4.3 px ("4"), 8.5 ("44") and 12.8 ("99+") at 320 and 390, same ink, no ground or gap; "44" reads "#4". Cause: the second ruling (start half the count's width inside the glyph edge). The count stays inside the bar (13 px from the end at 320). The first box was ticked on the second ruling and is unticked.

## Owner ruling
The owner withdraws the second ruling (start half the count's width inside the glyph edge): it overlaps the glyph's ink by 4.3, 8.5 and 12.8 px. New rule: the count never touches the glyph's ink; it stands on the glyph's top-right corner starting at the glyph box's edge (overlap 0-2 px at most); it sits on a ground-coloured ring (the bar's ground, at least 2 px) so contact never reads as ink on ink; the bar's end is the second limit: on the last tab at 320 "99+" ends at least 0 px (aim at least 4) inside the bar, and if not the count steps toward the glyph, never past the ink. The 99+ cap and the unmoved label stay. Acceptance: 4, 44 and 99+ at 320, 390 and 768, light and dark: overlap with the glyph ink 0 px; "44" does not read "#4".
