---
id: 006-05
status: backlog
sessions: {}
---
# react-ui: the canvas on touch at 375

## Goal
Stead's phone pans and zooms the same canvas: one finger pans, a pinch zooms, a long press lifts
a node, and every node and port keeps the 44 px floor at any zoom.

## Approach
- React Flow pans on one finger and zooms on a pinch. It has no long press: a node lifts after a
  long press built over its drag start, and before that a drag pans.
- On touch, ports hit at 44 px and the zoom stack's buttons are 44 px.
- A node drawn under 44 px at the current zoom draws its glyph alone at 44 px, and a tap on one
  zooms to it. The node reads a below-floor flag the canvas derives once per threshold crossing,
  so crossing re-renders and zooming within a side does not.

## Acceptance criteria
- [ ] With real touch at 375 on the workflow story: a drag pans, a pinch zooms, a long press then a drag moves a node, and no gesture takes another's.
- [ ] Zoomed out past the floor, every node is a 44 px glyph and a tap zooms to it.
- [ ] `pnpm stories:test` passes at 375 in both modes.
