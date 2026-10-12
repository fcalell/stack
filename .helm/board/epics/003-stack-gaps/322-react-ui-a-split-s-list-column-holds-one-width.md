---
id: 003-322
status: review
sessions: {}
---
# react-ui: a Split's list column holds one width

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c1, c2 and c5) measured a Split's list column at 215 to 273 px while loading and 348 to 360 loaded, and at 240, 288 and 360 from list to list, so the main reflowed about 120 px on every load and Refresh (chats, board, card, job, Now, Knowledge). 003-305 sized the list to its content between `region-min` and `list` and named the cost ("a list's width follows its rows"); the critique shows the cost is a visible jump.

## Approach
The list column is one width, the `list` token (360, the record-pane pattern's list), whatever it holds and whether it has loaded: `SPLIT_LIST` is `w-list` (the floor and ceiling classes go). The pane keeps its content sizing between `region-min` and `pane`. Below `tablet` the list is still the page's width. The breakpoints, reckoned against the list's ceiling, hold exactly.

## Acceptance criteria
- [x] At 1440 a list of three short rows, one of long rows and a loading one each stand `list` wide, the main taking the rest.
- [x] When a list's rows arrive (and change from long to short) the list's width and the main's left edge do not move.
- [x] Below `tablet` the list stands alone at the page's width, and the breakpoint stories hold.
- [ ] Native the same.

## Built
`packages/ui-core/src/variants.ts`: `SPLIT_LIST` is `w-list pb-page px-page border-r border-edge` (the comment says why); `tokens.ts` and the README say `list` is the column's one width. `plugins/react-ui/.../split/index.tsx`: `LIST_ALONE` loses its `max-w-none` (and the overlay allowlist the same entry). `rules.md`, `ui-core.md` (which keeps the 003-305 decision as history with the cost it found) and the Place comment follow.
Stories (`apps/showcase/behaviour/split-record.stories.tsx`): `ListHoldsOneWidth` (replaces `ListSizesToItsContent`) and `ListHoldsItsWidthWhileLoading` (a skeleton list, then long rows, then short rows: the list's width and the main's left edge equal throughout). Before: the short and the loading list measured 240 against the 360 token; after: 360. Split, place, thread-fill and screen stories 79 of 79 in Chromium; `pnpm verify` of ui-core passes.
Native unrendered and unaffected: the phone's Split does not read `SPLIT_LIST`; one region stands at a time, at the page's width.
