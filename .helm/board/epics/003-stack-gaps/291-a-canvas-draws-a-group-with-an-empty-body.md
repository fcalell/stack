---
id: 003-291
status: todo
sessions: {}
---
# react-ui: a Canvas draws a group with an empty body

## Goal
A Canvas group holding no present node gets no frame (`groupBoxes` in `canvas/geometry.ts`, and the ELK layout in `canvas/elk.ts`), so it is not drawn. Stead's loop is a group (design/07-interface.md "### A workflow: the canvas"); a loop whose body is empty cannot be seen or chosen, and with 003-191 a group is chosen by its head. Seen at stack `a3ff4ef5`.

## Acceptance criteria
- [ ] A group with no present node draws its frame and head at a size the layout gives an empty body, in its place in the path, and its edges meet it.
- [x] With `onSelect` its head is a button as any group's (003-191).
- [x] A Canvas whose groups all hold nodes is unchanged.
- [ ] The Canvas showcase holds an empty group at 375 and 1440 px, measured by the critique.

## Open questions
- [x] Its shape (the empty body's size, and how ELK places it): the stack session decides; a narrowing goes to the owner before the build.

## Ruled
An empty group (no present node and no group) is a leaf of the graph: ELK lays it out as a leaf of a node's width and a head plus two paddings high, an edge may name it as `from` or `to`, it stands in `pathOrder`, its head is a button as any group's, and it takes no port, drag, connection or `onMove`. A group holding only empty groups frames them; an edge naming a group that holds a node is ignored.

## Built
`geometry.ts` (`emptyGroups`, `groupBoxes` frames a group by its own box, no port ring on an edge to a group), `elk.ts` (the leaves), `layout.ts` and `index.tsx` (the order, the boxes, placing, no `onMove`). Unit tests in `canvas.test.ts` (real ELK places it between its neighbours, edges meet it). Showcase: `HOLLOW` and `HOLLOW_ALONE` in the CANVAS_GROUP frames; stories `HollowGroup` (1440) and `HollowGroupLight`/`Dark` (375) check the frame size, its place between neighbours, both edges meeting it, the head choosing it, `onMove` never hearing it. Canvas stories (118 tests) pass. Canvas is web only. The critique box (measured at 375 and 1440) waits on the critique.

## Open
A graph whose nodes all carry a `position` runs no layout, so an empty group has no place and is not drawn; this is the state after a consumer stores `onMove`'s positions and reloads. Question for the owner: where does an empty group stand when the consumer places the nodes? Recommended: the layout places it as a leaf below the positioned nodes' bounds (one row, left-aligned, in path order), since the consumer cannot position it (no `onMove` for a group).
