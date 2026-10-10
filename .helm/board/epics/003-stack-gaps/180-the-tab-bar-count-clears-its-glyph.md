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
- [ ] At 320, 390 and 768 px, light and dark, a one-, two- and three-figure ("99+") tab count stands above its glyph box's top-right corner (its bottom edge at the box's top, its start at the box's right edge, at most 2 px left of it), paints nothing inside the glyph's box, so a pixel diff of the glyph's region with and without the count is 0 px; "44" does not read "#4"; the last tab's count ends 0 px or more inside the bar; the tab and its label do not grow in height (the owner's round-2 ruling, which replaces the ring).
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

## Built (rework)
The count no longer starts half its width inside the glyph. `TAB_COUNT` is `absolute top-0 left-full -ms-hairline flex` on both platforms and the count stands on `SHELL_TAB_COUNT` (new ui-core cell, `rounded-full bg-canvas outline-2 outline-canvas`, in Shell's draws; Shell owns radius `full`): its start is the glyph box's edge pulled in by one hairline, so a "99+" on the last tab at 320 keeps inside the bar, and a 2 px ring of the bar's own ground sits under it so contact never reads as ink on ink. The 99+ cap and the label's centring are unmoved. `ui-core.md` states it; `DESIGN.md` regenerated.
`behaviour/shell.stories.tsx` `TabCountClearsItsGlyph` (six stories: 320, 390 and 768 px, light and dark; counts 4, 44 and 444 drawn "99+") now asserts: the count's left edge is at or right of the glyph's ink right edge (the strokes' union plus half a stroke, within 0.25 px of antialiasing), within 2 px of the glyph box's edge, its top at the glyph's top, its right edge inside the bar's, a 2 px `outline` and a `background` both equal to the bar's ground, and the label centred under the glyph. The six stories pass (shell file 10 of 10 with the Picker file).
Measured at 320 (before the hairline step, start at the box edge): ink gap 1.67 px for "4" (House), 0.83 px for "44" (Users) and "99+" (Activity); "99+" on the last tab ended 0.45 px past the bar, and the hairline step brings it 0.55 px inside. The owner's aim of at least 4 px inside at 320 is not reached: the glyph's ink stands 0.83 px inside its box, so stepping toward it any further would put the count over the ink. At 390 the end is 8.8 px inside, at 768 far inside. "44" no longer reads "#4": it starts clear of the glyph.
Native unrendered: the native-ui change (`SHELL_TAB_COUNT` with the same offsets) is type-checked and verified, not rendered on a phone; whether nativewind draws the `outline` ring is unchecked.

## Review (re-critique)
Rework not accepted. The 2 px ground ring and fill erase part of the glyph's ink in every tab with a count: House's right wall cut flat, Users' right shoulder lost leaving a stray dot, Activity's right tail lost; the ring reaches 1.3-2.2 px into the glyph's box edge, which is ink. Text no longer reads ink on ink and "44" no longer reads "#4". "99+" on the last tab at 320 ends 0.55 px inside the bar (floor 0 met, aim 4 not).

## Owner ruling
Round 2: the ring fixes "#4" but erases glyph ink; ink is the harder constraint. Remove the glyph-overlapping ring; the count's ground fill or ring may paint only outside the glyph's box. Place the count on the glyph box's top-right corner so its box and the glyph box overlap by 0 px on at least one axis: lift it so its bottom edge is at or above the glyph box top, its left edge at most 2 px left of the glyph box right edge (the space above the glyph box holds no ink). Spend the horizontal slack on the bar's end: on the last tab at 320 "99+" ends 0 px or more inside the bar (move it left along the glyph box top, never down into the box). The 99+ cap and the unmoved label stay. The aim of 4 px is dropped (floor 0 is the rule). Acceptance: 4, 44, 99+ at 320/390/768, light and dark: a pixel diff of the glyph region with and without the count is 0 px (House wall, Users shoulder, Activity tail intact); "44" does not read "#4"; the last-tab count ends 0 px or more inside the bar; the tab and its label do not grow in height. To build.

## Built (rework 2)
The ring is gone: `SHELL_TAB_COUNT` (ui-core cell, roster entry and `DESIGN.md` line) is removed, and `TAB_COUNT` is `absolute bottom-full left-full -ms-hairline` (react-ui adds `flex`) on both platforms, so the count's bottom edge sits at the glyph box's top and its start one hairline in from the box's right edge: it paints nothing inside the glyph's box, and the overlay stays absolute so the glyph, the label's centring and the tab's height do not move. `bottom-full` joins the react-ui overlay allowlist and the native-ui allowlist (verify b5). `ui-core.md` states it; `DESIGN.md` regenerated.
`behaviour/shell.stories.tsx` `TabCountClearsItsGlyph` (six stories: 320, 390, 768 px, light and dark; counts 4, 44 and 444 drawn "99+") asserts per count: the count's bottom at or above the glyph box's top (0.01 px), its left within 2 px of and not right of the box's right edge, its right inside the bar's, top inside the viewport, no outline and no background; the tab's height unchanged with the count hidden; the label centred; and a pixel check: `page.elementLocator(glyph).screenshot` (Chromium) of the glyph box with and without the count (`visibility: hidden`), diffed in the play through `createImageBitmap` and an `OffscreenCanvas`, must differ in 0 pixels. Mutating the cell back to `top-0` makes the six stories fail.
Evidence: bottom 0 px from the glyph box's top, start -1 px (a hairline in), ink gap 0.67 px for "4" (8.55 px wide); "99+" on the last tab keeps the earlier 0.55 px inside the bar at 320 (390: 8.8 px, 768 far inside), since its x is unchanged. Gates: shell stories 10 of 10 (shell and Picker files), `stack screens test --all` 180 of 180, `pnpm verify` in ui-core (34/34), react-ui (13/13), native-ui (19/19), Biome on the changed paths.
Open for the critique: the count now rises one count height above the glyph box into the tab bar's top padding and hairline, so it may draw over the bar's top border; the critique judges that. Native unrendered: the native-ui change (`bottom-full` on the absolute count) is type-checked and verified, not rendered on a phone.
