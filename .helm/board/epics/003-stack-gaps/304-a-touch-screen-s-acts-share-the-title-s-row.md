---
id: 003-304
status: done
sessions: {}
---
# react-ui: a touch Screen's acts share the title's row

## Goal
On touch, Stead's System, Repos, then a repo, opens a `beside` `Screen` with actions and more (`packages/server/src/app/routes/system/-components/repos.tsx:196`) whose bar (back, actions, more) stands on a row above its title. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "the split that opens has header and actions on 2 rows".

## Approach
003-181 (review) made a touch Place one row and ruled the Screen unchanged; `Screen` still draws the bar row over a title row (`plugins/react-ui/src/ui/components/screen/index.tsx:147-175`). 003-134 (review) is the single header at phone width, not the row count. Seen at stack `226f48c`.

## Acceptance criteria
- [x] At 320 and 390 px a touch `Screen` is one row (back, title wrapping, then its acts), as 181 made the Place, keeping 44 px targets. (Code and stories type-check; the measured widths wait for the batch browser run.)
- [x] Native the same.

## Open questions
- [x] Its shape: the stack session decides; it widens 181's ruling, so the owner signs off.

## Owner ruling
181's ruling widens to the Screen. On touch a Screen, pushed or beside, is one row: back act (when shown), title, then one acts span (`actions`, Details, `more`). The back act takes `PAGE_TOP_BAR_START`, the acts span `PAGE_TOP_BAR_END`; the row drops `PAGE_TOP_BAR_TOUCH`; the title drops `PAGE_TITLE` and `truncate`, wraps with `TITLE_WRAP` and keeps a floor of two fifths of the row. The row wraps; the acts span is `shrink-0 ms-auto` and, when it does not fit beside the back act, the floor and the gaps, drops whole to a second line at the row's end at 44 px (the 003-198 shape): at 320 with three acts it wraps, at 390 it fits. Unchanged: the desktop strip, a beside Screen at a narrow desktop page (not touch), the shell's tab-bar cover. Native: the same row, Yoga flexWrap and percent minWidth.

## Ruled
The floor is one ui-core cell, `PAGE_TITLE_FLOOR` (`min-w-2/5`, a fraction, as `SHEET_HEAD_TITLE` is), listed in the Screen's roster `draws` in place of `PAGE_TOP_BAR_TOUCH` and `PAGE_TITLE`. The head is still one tree on both densities, so the acts are one span (`ACTS`) on the desktop too, and the back act sits in a span that carries `PAGE_TOP_BAR_START` on touch only. The touch row always stands (the title is in it), so the Screen no longer draws a marked, hidden row (`ROW_MARKED`) and the spacer. `TITLE_WRAP` is exported from the Place and shared.

## Built
react-ui `components/screen/index.tsx`: the touch head is one `flex-wrap` row (back, h1 with `TITLE_WRAP` and `PAGE_TITLE_FLOOR`, the acts span with `PAGE_TOP_BAR_END`); the desktop strip keeps its truncating title. native-ui `components/screen/index.tsx`: the same row (`flex-wrap`, `min-w-2/5`, `ms-auto` acts span, `PAGE_TOP_BAR_START` on the back act). ui-core `variants.ts` and `roster.ts` hold `PAGE_TITLE_FLOOR`; `DESIGN.md` regenerated. One clause each in both `rules.md` pages and `ui-core.md`. `apps/showcase/behaviour/screen.stories.tsx` holds `ActsShareTheTitleRow{1,3,4}At{320,390}`: title width against two fifths of the row, 44 px targets, acts inside the head, and the wrap (1 act inline at both widths, 3 acts wrap at 320 and fit at 390, 4 acts wrap at 320).
`pnpm check` turbo part 45/45; `verify` passes in ui-core (34/34), react-ui (13/13) and native-ui (19/19). The stories are written, type-check and were not run (the batch browser run measures them).

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone; Yoga's wrap with a percent `minWidth` is untested.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
