---
id: 003-193
status: todo
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

## Ruled
Not a contract gap yet. The floor is `minWidth: ${floor}ch` on the `Path` element, which a flex item cannot undercut, and the row's free width goes to the path first. The first deliverable is a story composing Stead's review tree (`Place` > `Section` > `List` of `file` rows with `seen`, a chip and counts, and the same list in a `Group`); fix at the shared layer only if it fails. If it passes, the close is "by design, no stack code" and the cause is in Stead.

## Built
`apps/showcase/behaviour/row-meta.stories.tsx` gains `ReviewFloor320`, `ReviewFloor390`, `ReviewFloor768`, `ReviewGroupFloor320` and the touch forms `ReviewFloorTouch320`, `ReviewFloorTouch390`, `ReviewGroupFloorTouch390`. Each lists `biome.json`, `docs/flags.md` and a long `docs/billing/…` name, seen or not, with the `what the check reads` chip and counts. The play asserts no row overflow, the counts' right edge at the row's right inset, the chip-to-counts gap, the short names whole, the long name's tail whole with its stem at least four characters, and a cut chip label only once the path stands at its floor. The 18 stories of the file pass in a scoped run (peak 1638 MiB). No stack code changed.

Measured, in px, for `biome.json` (the other rows agree):

| Frame | Row | Path (floor) | Chip | Counts to the row's edge |
| --- | --- | --- | --- | --- |
| 320, desktop | 296 | 70 (70) | label cut | 12 (the inset) |
| 390, desktop | 366 | 115.8 (70) | 120.2 whole | 12 |
| 768, desktop | 744 | 493.8 (70) | 120.2 whole | 12 |
| 320, desktop, in a `Group` | 270 | 70 (70) | label cut | 16 |
| 320, touch | 320 | 90 (90) | label cut | 16 |
| 390, touch | 390 | 90 (90) | 132 | 16 |

The long name keeps its tail `ces.md` whole at every width and its stem grows with the room (28 at 320, 74 at 390, 196 at 768). "b…" is not drawn, and no width stands unused beside the counts, at any of these.

The native `FileRow` has the same structure (`pathCut` floor as `minWidth`, path `grow` with a 10^7 shrink weight, counts `shrink-0`); no phone render was run for it, so native is unverified.

## Owner ruling
The owner closes it: by design, no stack code. The reproduction stories in `behaviour/row-meta.stories.tsx` (`ReviewFloor*`) hold the floor and spend the row's width at 320, 390 and 768. Stead measures the row, its path span and its counts in its own 390 render to find the wrapper or width that narrows its row.

## Owner ruling
Reopened on Stead's measurement (stack 74a0e3d, 390x844 touch, IBM Plex Mono 15 px, chromium over CDP): the path span sits at its `min-width: 10ch`, computed 90.0006 px, but ten glyphs advance 90.0156 px; the tail "me.json" takes 63.0156, leaving 26.98 for a head "bio" that needs 27.0156, so `text-overflow` draws "b…". A `min-width` of `calc(10ch + 0.1px)` in the live DOM draws "biome.json" and "docs/flags.md" whole; 320 cuts "f… gs.md" the same way. The stack reproduction passes because Storybook's mono advance differs from Plex Mono's. The "80 px unused" is the counts' empty lane (36 + 8 gap), by design. To build: a floor that covers the glyph advance, and the `ReviewFloor` plays asserting the stem with the app's mono font loaded.
