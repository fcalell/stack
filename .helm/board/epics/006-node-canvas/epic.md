---
sessions: {}
---
# Node canvas

## Goal
Stack's roster holds `Canvas`, one web molecule that draws a directed graph on a pannable,
zoomable ground: nodes, labelled edges, handoff edges, nested groups, selection, problems, an
off state and a run's taken path. Stead edits its workflows on it and Martechthings draws its
journey graph view on it, each passing data alone. It builds gap 003-110.

## Breakdown rationale
Evidence and design: `.helm/research/node-canvas.md`. The measured range:
`packages/ui-core/guide/patterns/node-canvas.md`.

Decided by fcalell (2026-10-06): the canvas owns its viewport: `d3-zoom` does pan, zoom and
pinch on one transformed layer, nodes are absolutely placed elements measured by a
`ResizeObserver`, and edges are the canvas's own SVG with its own orthogonal router. `elkjs`,
unmodified, lays it out in a worker. `@xyflow/react` is not used. A node holds no control; dashed means a handoff and inactive draws dimmed; no change-set
marks until filed; the phone pans and zooms at 375 px with no column fallback; web only
(`react-ui`), since both consumers run on the web.

One story per layer, in build order. 01 is pure ui-core and needs no render. 02 to 05 render, so
they start once the showcase's Storybook migration lands, and each adds its stories there.

- **01**: the contract: roster entry, cells, words, and the pure graph logic (path order,
  back edges).
- **02**: the canvas at rest: layout, drawing, selection, zoom, reading order, read-only.
- **03**: the canvas's states: off, problem, status, a run's taken path.
- **04**: editing by pointer: move, Arrange, a node landing at the centre, port connections.
- **05**: touch: long press, the 44 px floor at any zoom, glyph-only nodes.
