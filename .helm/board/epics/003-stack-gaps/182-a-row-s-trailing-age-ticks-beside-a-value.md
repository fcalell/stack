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
- [ ] A row's trailing holds a live age and a short value (a spend) together: the age kept current from the shared clock, both whole or gone together as a trailing is today, on both platforms.
- [x] A trailing of one age, count, value or pick is unchanged.
- [ ] The ListRow showcase holds a live row with an age and a spend at 320 and 1440 px in a 335 px column, measured by the critique.

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
