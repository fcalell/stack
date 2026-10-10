---
id: 003-303
status: backlog
sessions: {}
---
# react-ui: a zoomed-out canvas zooms in finer steps and still names its nodes

## Goal
On Stead's workflow canvas one zoom-out step turns every node into its kind's glyph, and two agent nodes then look the same. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "zoom out steps should be smaller, the glyphs should somehow carry some information or they are not recognizable when zooming out".

## Approach
`STEP = 1.5` (`plugins/react-ui/src/ui/components/canvas/viewport.ts:45`); every zoom under 1 draws the glyph alone (`canvas/floor.ts`, `canvas/index.tsx:119`, `node.tsx:471-500`), the name only as a native `title`. Stead passes one icon per kind (`packages/server/src/app/lib/workflow-draft.ts:167-170`). Both are 006-02's and 006-05's rulings (done); this asks to revisit them. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A zoom step is finer (about 1.2).
- [ ] Between the full node and the glyph, an overview form keeps the node's name readable (at caption size, or beside the glyph); the glyph alone only at the far end.
- [ ] Two nodes of one kind are told apart at every zoom the overview covers.

## Open questions
- [ ] The step and the overview's floor: the stack session proposes, the owner rules (it reverses 006-02).
