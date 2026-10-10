---
id: 003-291
status: done
sessions: {}
---
# react-ui: a Canvas draws a group with an empty body

## Goal
A Canvas group holding no present node gets no frame (`groupBoxes` in `canvas/geometry.ts`, and the ELK layout in `canvas/elk.ts`), so it is not drawn. Stead's loop is a group (design/07-interface.md "### A workflow: the canvas"); a loop whose body is empty cannot be seen or chosen, and with 003-191 a group is chosen by its head. Seen at stack `a3ff4ef5`.

## Acceptance criteria
- [x] A group with no present node draws its frame and head at a size the layout gives an empty body, in its place in the path, and its edges meet it.
- [x] With `onSelect` its head is a button as any group's (003-191).
- [x] A Canvas whose groups all hold nodes is unchanged.
- [x] The Canvas showcase holds an empty group at 375 and 1440 px, measured by the critique.

## Open questions
- [x] Its shape (the empty body's size, and how ELK places it): the stack session decides; a narrowing goes to the owner before the build.

## Ruled
An empty group (no present node and no group) is a leaf of the graph: ELK lays it out as a leaf of a node's width and a head plus two paddings high, an edge may name it as `from` or `to`, it stands in `pathOrder`, its head is a button as any group's, and it takes no port, drag, connection or `onMove`. A group holding only empty groups frames them; an edge naming a group that holds a node is ignored.

## Built
`geometry.ts` (`emptyGroups`, `groupBoxes` frames a group by its own box, no port ring on an edge to a group), `elk.ts` (the leaves), `layout.ts` and `index.tsx` (the order, the boxes, placing, no `onMove`). Unit tests in `canvas.test.ts` (real ELK places it between its neighbours, edges meet it). Showcase: `HOLLOW` and `HOLLOW_ALONE` in the CANVAS_GROUP frames; stories `HollowGroup` (1440) and `HollowGroupLight`/`Dark` (375) check the frame size, its place between neighbours, both edges meeting it, the head choosing it, `onMove` never hearing it. Canvas stories (118 tests) pass. Canvas is web only. Where every node carries a `position` no layout runs, and `hollowRow` (`geometry.ts`, used by `layout.ts`) stands the empty groups the layout has not placed in one row `gaps.layer` below the nodes' bounds, left-aligned with them, `gaps.node` apart, in path order; a group the layout placed in this session keeps its place when `onMove`'s positions are stored. Unit test `hollowRow` in `canvas.test.ts`. Showcase: `HOLLOW_PLACED` (two empty groups, an edge naming one), a "Placed loop" canvas in the CANVAS_GROUP frames, stories `HollowGroupPlaced` (1440) and `HollowGroupPlacedLight`/`Dark` (375) check the row's place, the edge meeting the first frame, the head choosing a group, `onMove` never called. Canvas stories pass (101 tests, peak 2913 MiB). At 375 the row's second frame stands past the pane's right edge (pannable). The critique box (measured at 375 and 1440) waits on the critique.

## Owner ruling
When every node carries a `position` (no layout runs), the empty groups stand as one row below the positioned nodes' bounds, left-aligned, in path order. No new surface: an empty group takes no `position` and `onMove` never hears it. To build.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique (nit only): an empty group draws a 240x64 dashed frame and its edges meet it; at the 263 px pane (375) the second Placed loop and the Lone loop frames stand past the pane edge and the zoom stack sits 3 px from the Lone frame's bottom, which the fit ruled on 003-189 fixes.

## Built (rework)
The lone-box opening fit of 003-189 (`openTransform` in `canvas/view.ts`) stands a single frame the room cannot hold but the pane can inside the pane at 375, clear of the zoom stack. Covered by the unit test `a fit with a foot ...`; the critique re-measures the Placed and Lone loop frames.

## Re-review
Stays done: its own criterion is met. The fit defect at 375 (the Hollow and Placed loops clipped 8 px on the right, the Placed second group outside the pane, its group bottom 7 px past the zoom stack top, the Lone loop opening at scale 0.447) is carried by 003-189's round-2 rework, with 291's frames as its acceptance.
