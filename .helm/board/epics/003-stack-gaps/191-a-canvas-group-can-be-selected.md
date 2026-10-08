---
id: 003-191
status: review
sessions: {}
---
# react-ui: a Canvas group can be selected

## Goal
design/07-interface.md "### A workflow: the canvas": a loop is a group framing its body with its bound on the group's head, and the loop is a node with its own sheet (its bound, its Next). Stead (github.com/fcalell/stead, `packages/server/src/app/lib/workflow-draft.ts:247-252` draws the loop as a `CanvasGroup`; `packages/server/src/app/routes/system/-components/node-sheet.tsx:534-546` and `:710-719`) shows the loop's bound and edges only as `LoopFields` inside each body node's sheet. It costs Stead the loop as an object: the viewer taps a frame and nothing happens, must know to open a body node, and a loop with an empty body cannot be reached at all.

## Approach
`CanvasGroup` (`ui-core/src/descriptors.ts`, line 683) holds `id`, `head` and `holds`. In `Canvas`, `onSelect` hears node ids only (`plugin-react-ui/src/ui/components/canvas/index.tsx:63`, passed to `NodeView` at `:334`), `selected` is a node id looked up by `nodeLook`, and `GroupFrame` (`components/canvas/group.tsx`) is `pointer-events-none` ("It takes no pointer, so a drag that starts on it pans"), with the head a plain `span`, no button, no selected look and no focus stop. Things tried:
- Drawing the loop as a node as well as a group duplicates it on the graph and misplaces its edges.
- A host overlay button on the head cannot follow the pan and zoom, and is a host element with tokens.
- The interim (the loop reached from its body nodes' sheets) is the shape above.
The canvas guide (`plugin-react-ui/guide/canvas.md`) says a group is a frame only.

## Acceptance criteria
- [x] With `onSelect`, a group's head is a button named by its text: a click or tap chooses the group's id through `onSelect`, `selected` may name a group and draws its frame in the selection's look, Escape or the ground clears it, and the head takes a tab stop in path order beside the nodes.
- [x] Dragging from the frame's body still pans, and the head is at least 44 px on touch at any zoom, as a node is.
- [x] ~~A group head under the text floor stays a 44 px target, as nodes do.~~ Rejected by the owner: under the floor the head draws nothing, and a target with no face is no control.
- [x] A Canvas with no `onSelect` or no group is unchanged.
- [ ] The Canvas showcase holds a selectable group at 375 and 1440 px in both modes, measured by the critique.

## Open questions
- [x] Its shape (group ids in the same `onSelect`, or a separate `onSelectGroup`; the head only, or the whole frame edge): the stack session decides.
- [x] Whether a group may take `onMove` for its holds as a unit: the stack session decides.

## Ruled
The same `onSelect` and `selected`, no `onSelectGroup`: node and group ids share one namespace. Only the head is the control, a `<button>` named by its text when `onSelect` is given, the head is non-empty and the canvas is at or above the text floor; the frame's body keeps `pointer-events-none` and pans. No `onMove` for a group (a frame follows its holds). `CANVAS_GROUP` is a one-axis `state` matrix (`rest` / `selected`, the outline's colour only; the dash stays), and `CANVAS_GROUP_HEAD` carries `min-h-target`, so the probe lays the frame out with the taller head. `reveal` reads a group's frame when `boxes` has no such id. Tab order: the heads first (outer before inner), then the nodes in path order. A group holding no present node has no frame (`groupBoxes`), so it is not drawn and is not part of this story.

## Built
`canvas/group.tsx`, `canvas/index.tsx`, `CANVAS_GROUP` in `variant-tables.ts` and `variants.ts`, `CANVAS_GROUP_HEAD`'s `min-h-target`, `guide/canvas.md`, the `ui-core.md` Canvas paragraph, the group frames in the showcase (`CANVAS_GROUP.state.rest` and `.selected`), the `GroupSelectAtDesktop` and `GroupSelectAtTouch` behaviour stories, and the tab-order stories updated for the heads. `pnpm check` and the three verifies pass; the scoped browser run of `Canvas.stories.ts` and the three canvas behaviour files passes (115 tests, peak 2840 MiB).

## Owner ruling
The owner confirms: no 44 px head under the text floor; heads take their tab stops first (outer before inner), then the nodes in path order. A loop with an empty body draws no frame and is reached by 003-291.
