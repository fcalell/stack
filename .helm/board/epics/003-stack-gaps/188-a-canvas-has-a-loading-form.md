---
id: 003-188
status: backlog
sessions: {}
---
# react-ui: a Canvas has a loading form

## Goal
design/07-interface.md "### A workflow: the canvas", States: "Loading: the head and the canvas's frame stand, the nodes in skeleton." Stead (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/canvas.tsx:329`) stands `<ItemHeader title="" loading />` in the whole main while the workflow reads, so the canvas's frame (its ground and its foot) is absent until the nodes arrive. It costs Stead a layout jump: the ground and the foot appear and the page below the head changes at once, where the spec has the frame stand throughout.

## Approach
`CanvasProps` (`plugin-react-ui/src/ui/components/canvas/index.tsx:51-72`) has `label`, `nodes`, `edges`, `groups`, `selected`, `onSelect`, `path`, `onMove`, `onConnect` and `act`, and no `loading`; the component never draws a skeleton (no `loading` or skeleton in `components/canvas/`). Things tried:
- `Canvas nodes={[]}` draws an empty ground, not skeleton nodes, and reads as an empty graph, the very state 07 draws differently.
- `QueryBoundary` (`components/query-boundary`) gives list-shaped waiting rows, not a ground with node-shaped skeletons.
- Placeholder nodes passed as real `CanvasNode`s would be laid out and made buttons, and are a local copy of the skeleton the roster draws for other parts.
The canvas guide (`plugin-react-ui/guide/canvas.md`) names no loading form.

## Acceptance criteria
- [ ] A Canvas can stand loading: its ground, grid, zoom stack and foot as loaded, and node-shaped skeletons at a believable layout, with no node button, drag or connection while it waits.
- [ ] The loading form announces itself as busy to assistive technology and is not read as an empty graph.
- [ ] A Canvas given nodes is unchanged.
- [ ] The Canvas showcase holds the loading form at 375, 768 and 1440 px in both modes, measured by the critique against the loaded canvas's frame.

## Open questions
- [ ] Its shape (a `loading` prop, or a skeleton export the app places in the same frame): the stack session decides.
- [ ] Whether the `act` stands, disabled, while loading: the stack session decides.
