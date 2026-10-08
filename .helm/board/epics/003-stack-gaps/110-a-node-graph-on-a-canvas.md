---
id: 003-110
status: done
sessions: {}
---
# ui-core: a node graph on a canvas

## Goal
Two consumers need one node canvas, and neither builds it outside the roster.

- **Stead** edits a workflow as a node graph at every width (`stead:design/07-interface.md`, "A workflow: the canvas"; `stead:design/decisions.md`, "The workflow canvas"), and shows a run's taken path on it from the run view (`/runs/<run>`). It draws: nodes with an eyebrow (the node's kind) and a one-line title, typed out-ports with labelled edges (one per answer or result), a loop as a group around its body with its back edge, an edge between two leads drawn dashed with a "Relay" label, a selected node, and problems from a save marked on the node they name. On the desktop the canvas takes `main` without the measure and the selected node's sheet stands in the pane; on the phone it pans and zooms.
- **Martechthings** plans a journey graph view beside its step list (`martechthings:.helm/research/ux/journey-steps.md`, "A later graph view"; `martechthings:.helm/knowledge/product/ux/screens.md`, Journey). It draws top to bottom in the list's reading order, numbers steps as the list does, labels each leg's first edge with its option, draws a rejoin as two edges into one node, and shows a scenario or run as the taken path at full contrast with the rest dimmed. The selected node opens the same option list and Sheet the list view uses.

Shared by both: a read-only mode (a run, a published version), a taken-path highlight with the rest dimmed, positions from the consumer's data, and a layout that is top to bottom by default.

## Approach
Nothing in the roster draws a graph: `List`, `ListRow`, `Section` and `Diff` are linear, and a list with indented legs draws a rejoin only by reference. The node-canvas pattern page (`packages/ui-core/guide/patterns/node-canvas.md`) already gives the measured range and its references (Twenty, Plain, Railway, Runway, AirOps): dot grid 14 to 20, nodes radius 6 to 10 on a hairline, eyebrow and title, 8 px hollow ports, 1 to 1.5 px grey edges with dashed for inactive, a 1.5 px accent outline for selection, a zoom stack, accent only on selection and run. AirOps draws a loop as a dashed group with a "Loop" tag; Twenty draws a run as the taken path with the rest dimmed.

Touch and the keyboard are the hard part. At 375 px, one-finger drag pans, a long press moves a node, and a port's drag is a pointer shortcut only; every node and port keeps the 44 px touch floor at any zoom, zoomed-out nodes collapsing to their glyph, a tap zooming to one. Edges are never made by dragging alone: both consumers set a node's out-edges from its sheet (Stead's Next pickers, Martechthings' option list), so the canvas takes edges as data and the keyboard reaches every edit through the sheet; the canvas itself moves focus through nodes in path order and reads them to assistive technology in that order.

## Acceptance criteria
- [x] Stack provides the part on every platform the apps run on (web: `react-ui`), drawing the node, port, labelled edge, dashed edge, group, selection, problem mark, read-only mode and taken-path highlight inside the pattern page's range, in both modes.
- [x] At 375 px with real touch it pans, zooms, selects and moves a node without one gesture taking another's, every target at 44 px or more.
- [x] With the keyboard alone, focus moves through the nodes in path order and selecting one opens the consumer's sheet; assistive technology reads the nodes in path order with their edges.

## Open questions
- [ ] Its shape (one molecule with node, edge and group parts, or a canvas atom with molecules over it), and whether layout is computed by stack or given as positions by the consumer: the stack session decides.
- [ ] Whether the library under it is one stack takes as a dependency or stack's own drawing.

## Progress
Researched and designed (`.helm/research/node-canvas.md`); the open questions are decided there. Built by epic 006 (`.helm/board/epics/006-node-canvas/`); this gap closes when 006 does.

## Closed
Epic 006 (node canvas) builds the part, and every one of its stories is done: 006-02 (the canvas at rest, its selection the 1 px border the owner ruled) and 006-05 (touch at 375 and the overview) ship by design critique (scratchpad `critique/canvas/report.md`, `critique/r2-components/report.md`).
