---
id: 006-04
status: backlog
sessions: {}
---
# react-ui: a pointer moves nodes, arranges the graph and connects ports

## Goal
Stead edits its workflow's layout and, as a pointer shortcut, its edges on the canvas. Every
edit also has a way without a drag.

## Approach
- **Move**: with `onMove`, a pointer drags a node at once; release reports its position.
- **Arrange**: with `onMove`, an Arrange act joins the zoom stack, reruns the layout and reports
  every position. It is the single-pointer alternative to dragging (WCAG 2.5.7).
- **Landing**: a node without a position among placed ones lands at the viewport's centre.
- **Connect**: with `onConnect`, ports show (8 px drawn, 24 px hit); dragging port to port calls
  `onConnect(from, to)`, and release on the ground calls `onConnect(from, null)`. The canvas
  never adds the edge: the consumer does, from its data.

## Acceptance criteria
- [ ] With real pointer input at 1440: a drag moves a node and reports once; Arrange restores the computed layout; a port drag to a node and to the ground each call `onConnect` as set out.
- [ ] Without `onMove` and `onConnect`, no port, no Arrange and no drag exist.
- [ ] `pnpm stories:test` passes.
