---
id: 003-193
status: backlog
sessions: {}
---
# react-ui: a file row holds its path floor beside a chip in a page's list

## Goal
Stead's review screen lists its sensitive files as `List` `file` rows with a chip saying why each is listed (github.com/fcalell/stead, `packages/server/src/app/ui/review.tsx`; design/07-interface.md "The review screen"). At 390 px, light and dark, the rows still draw "b… me.json" for `biome.json` and "do… flags.md" for `docs/flags.md`, the chip cut too ("what the check …"), while about 80 px stand unused between the counts and the row's end. Evidence: Stead's review screen critique unit u4 at stack `74a0e3d`, shots `r-mid-390-light` and `r-top-390-light` (Stead scratchpad `critique/u4/shots2/`); the same at 320.

## Approach
003-116 (done) shipped with no change to `FileRow`: its frame and `behaviour/row-meta.stories.tsx` `FilePathFloor` and `FilePathFloorTouch` hold the floor (at least the first three characters, an ellipsis and the tail, the chip's label truncated) at 320 and 360 px in the showcase. In Stead's page the floor does not hold: one character of `biome.json` before the ellipsis, so the showcase's row and the page's row differ in what they are given or where they stand (a sensitive row is checked, carries a counts trailing, and stands in a page Section under a Group, not the frame's list). The app passes `path`, `chip` and the counts as FileRow's props ask.

## Acceptance criteria
- [ ] A file row with a chip and counts, in a `Section` of a page at 320, 390 and 768 px, draws its path at no less than the floor 003-116 states, and spends the row's free width before cutting the path or the chip.
- [ ] The showcase's file path floor stories hold a checked row with counts in a page Section, measured by the critique at 320 and 390.

## Open questions
- [ ] Why the floor holds in the frame and not in the page: the stack session finds it.
