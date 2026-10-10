---
id: 003-182
status: review
sessions: {}
---
# react-ui: a row's trailing age keeps ticking beside a value

## Goal
Stead's Underway rows read a run's node and its spend so far, with the age since it started at the row's end: "Morning summary · Stead · at Collect · $0.12", status "Waiting on an item", age "3 min" (github.com/fcalell/stead, `packages/server/src/app/routes/_now/-components/now-list.tsx`, the run and loop rows; design/07-interface.md "### Now", Underway row). At 1440 px in the 335 px list column the spend is cut to "$0.…" beside the status. Evidence: Stead's Now critique unit u2 at stack `74a0e3d`, shot `info-1440-light` (Stead scratchpad `critique/u2/shots/`).

## Approach
003-142 ruled that an age and a spend that must read go in the row's `trailing`, its Built frame passing "18 min · $0.42" as one `trailing` value. `RowTrailing` (`ui-core/src/descriptors.ts`) is exactly one of `age`, `count`, `value` or `pick`, and only `age` stays current from the shared clock. So a row whose age must tick (a running run, a live job) can carry its spend in `trailing` only by freezing the age as a word, and left in `meta` the spend is the plain later part the line cuts. Moving the spend ahead of the node cuts the node instead, which 07 also asks to read. Seen at stack `74a0e3d`.

## Acceptance criteria
- [x] A row's trailing holds a live age and a short value (a spend) together: the age kept current from the shared clock, both whole or gone together as a trailing is today, on both platforms.
- [x] A trailing of one age, count, value or pick is unchanged.
- [x] The ListRow showcase holds a live row with an age and a spend at 320 (the frame's 256 px column) and 1440 (335 px), measured by the critique.

## Open questions
- [x] Its shape (a value beside an age in `trailing`, or another): the stack session decides.

## Ruled
`RowTrailing`'s `age` form gains one optional field: `{ age: string; beside?: string }`. `beside` is a short value (a spend) drawn after the live age, whole or gone with it. Not a new trailing kind, not a node-taking `value`, not a second trailing slot. A waiting row draws the same `TRAILING_BAR` for it.

## Built
- `packages/ui-core/src/descriptors.ts`: `RowTrailing`'s `age` gains `beside?`; the doc comment says a waiting row draws the same bar.
- `plugins/react-ui` and `plugins/native-ui` `list-row/index.tsx`: `trailingWord` for an `age` returns the live `Age` then ` · beside`. `Age` and the clock are unchanged, so only the age node redraws on a tick; an `age` without `beside` renders as before.
- `rules.md` (both platforms) and `ui-core.md` name `{ age, beside }`.
- Showcase: the ListRow `works` frame and `behaviour/row-meta.stories.tsx` pass `{ age, beside }` in place of a frozen `value` string; `TrailingBeside` (and a touch twin) holds a live age and spend in a 335 px column and checks they are whole or gone together.
Native unrendered: live age beside a value, on both platforms.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique: the trailing "3 min · $0.12" stands whole beside the chevron and is live (clock +5 min reads 8 min), but the ListRow showcase (`shared-listrow--rest`) does not draw the `works` age+spend row (ROW_META_LINE, frames/list-row.tsx:269); only the behaviour story renders it. A showcase gap.

## Owner ruling
The owner rules rework: add the `works` age+spend row (ROW_META_LINE) to the `shared-listrow--rest` showcase frame (`plugins/react-ui/src/ui/showcase/frames/list-row.tsx`) at 320 and 1440 in a 335 px column. The native box stays open.

## Built (rework)
`ROW_META_LINE` is no family cell, so the showcase drew no frame for it (the `["ROW_META_LINE", "works"]` mapping in `frames/list-row.tsx` never matched). The `ROW.lines.two` frame in the `rest` state now draws the `works` part after its own rows: the work items with a live age and spend in the trailing (`{ age, beside }`), in a 335 px column (`w-[335px] max-w-full`, so it narrows to a 320 screen); the dead mapping is removed and the part's column is 335 px, not the pane's 320. `behaviour/row-meta.stories.tsx` `ShowcaseHoldsAgeBesideSpend` (desktop) and `ShowcaseHoldsAgeBesideSpendTouch` (320 px, touch) draw that frame through `Frame` and `drawListRow` and assert the trailing reads "N min · $0.42" whole inside a column of at most 335 px. Both pass with the rest of the row-meta file.
Native box stays open.

## Re-review
Web accepted 2026-10-10; waits on the native render. The frame draws the age and spend row whole; at 320 the column is the frame's 256 px (insets), the stricter case, at 1440 the 335 px column holds it; both rows are whole or gone. The native box stays open.
