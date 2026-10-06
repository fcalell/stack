---
id: 006-02
status: backlog
sessions: {}
---
# react-ui: the canvas draws a graph, selects a node and reads in path order

## Goal
A consumer passes nodes, edges and groups and gets a laid-out, pannable, zoomable graph it can
select from and read without a pointer. Read-only is the default: with no `onMove` and no
`onConnect` nothing changes the graph.

## Approach
- `@xyflow/react` draws the viewport, with custom node, edge and group types spelled from 01's
  cells; only its base stylesheet is imported. Arrow-key moves are off (`disableKeyboardA11y`).
- `elkjs` (layered, direction down, model order, groups as compound nodes, edge labels placed)
  runs in a worker and loads lazily, only when no node has a position. Computed positions are
  reported through `onMove` when it is passed.
- Edges are orthogonal with rounded corners and an arrowhead; back edges route up the side; a
  handoff edge is dashed with a glyph beside its label.
- The root is a `region` named by `label`; the nodes are a `list` in path order, each one button
  named by 01's spoken name. Tab walks the nodes, Enter calls `onSelect`, Escape clears it, and a
  focused node is panned into view. A `selected` changed from outside (a problem row) pans to
  its node.
- The zoom stack (Zoom in, Zoom out, Fit) stands at the bottom left; `act` at the foot's centre.
- In a `Split` main the canvas fills it without the measure (`data-fill`).
- The guide's reference page teaches the canvas, with a workflow and a journey as examples.

## Acceptance criteria
- [ ] Stories draw a Stead-shaped workflow (a loop group, a gate's upstream edge, a handoff) and a Martechthings-shaped journey (three legs, a rejoin, numbered nodes), at 1440 in both modes, and pass `pnpm stories:test`.
- [ ] With the keyboard alone, focus moves through the nodes in path order and Enter selects; a screen reader reads each node with its edges.
- [ ] The design critique judges both stories against the pattern page.
