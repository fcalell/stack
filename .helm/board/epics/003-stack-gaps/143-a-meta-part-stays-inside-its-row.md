---
id: 003-143
status: review
sessions: {}
---
# react-ui: a meta part's box stays inside its row

## Goal
At 390 px a Needs-you row's meta part " · 7 minutes ago" is a `span.truncate` whose box ends at x 393.7 where its parent ends at 374 and the viewport at 390 (scrollWidth 107 in a 36 px box), so the part passes its row by 19 px and the viewport edge by 3.7 px; it draws "…", nothing visible shifts, but the age has no room and the box is a wide target and a measuring artefact (github.com/fcalell/stead, `packages/server/src/app/routes/work/-components/board.tsx`; design/07-interface.md "A row's meta"). Evidence: critique unit u6, 390 px light (Stead scratchpad `critique/u6/`, stack at `5564217`).

## Approach
`LATER_TEXT` is `grow basis-0 min-w-figures truncate` in a slot `w-0 min-w-0 overflow-hidden` (list-row/index.tsx): `min-w-figures` is held by the text even where the slot has less room, so the box runs past the slot, and the slot's `overflow-hidden` clips it. Story 118 and 142 are about which part is cut; this is the box the cut part leaves. Seen at stack `5564217`.

## Acceptance criteria
- [x] No meta part's box ends past its row's box at any width, measured at 320 and 390 px.
- [x] A part with less than `figures` of room draws nothing, as the comment on `LATER` promises.

## Built
The later slot's text is a flex row with `basis-figures min-w-0` in place of `basis-0 min-w-figures`: the basis is still `figures`, so a slot with less room wraps the text under its one line and clips it, but the text can shrink on that line, so its box is no wider than the slot.
Evidence: `behaviour/row-meta.stories.tsx` `MetaYields` (every box in the row ends within it, at 320 and 360 px, both densities; the old classes fail it at 335 against 320.5) and `MetaStarved` (a later part with no room stands under the slot's line within its width).

## Open questions
- [x] Its shape: a basis and a shrinkable box, no new prop or token.
