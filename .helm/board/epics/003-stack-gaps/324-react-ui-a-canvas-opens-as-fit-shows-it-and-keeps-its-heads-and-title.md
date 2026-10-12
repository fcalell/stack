---
id: 003-324
status: review
sessions: {}
---
# react-ui: a Canvas opens as Fit shows it and keeps its group heads, its 12 px floor and its node titles

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c5) found three looks in the node canvas (the Knowledge graph, a repo's pages):
1. it opens at zoom 1 with the groups cut at the edge at every width; only Fit shows the whole graph;
2. after Fit the group heads vanish and the node names drop to about 11 px (the rubric's floor is 12: "body type never below 12 at any density");
3. a node's status word ("May be out of date") takes about 100 of its 240 px and cuts the title to "Gl…".

## Approach
1. The opening view is Fit's (`fitTransform`): centred at its own size where the graph fits the room the zoom stack and the act leave, else at the scale that holds the whole graph. This replaces `openTransform`, the text-floor-first opening of 003-189 (its `first` node whole at the top, the rest a pan away), which the owner has now ruled against.
2. Under the text floor a group's head stays: drawn at its own size on screen (the layer's scale taken back about the frame's top left, its width the frame's on screen, still a button and a Tab stop), and the frames' head band and padding grow in the flow by the zoom's inverse so the head does not cover the glyphs. A node's name in the overview is the meta role (12.9 px) in place of the caption (11.8).
3. A node's status is its dot, named by the label (and a native tooltip); a `short` word, which `StatusMark` already carries for a row, draws beside the dot.

## Acceptance criteria
- [x] A graph larger than the room opens whole in the room (every glyph and group frame inside the pane, clear of the zoom stack), at the scale Fit gives (scale and position within a pixel of pressing Fit).
- [x] Under the floor each group head is drawn, a button at its own on-screen height (its layout height), its text 12 px or more; a node's name beside its glyph is 12 px or more.
- [x] A node with a long status word keeps its title whole; the word is the dot's name; a `short` word draws beside the dot.
- [x] Frames keep their padding round the glyphs by the on-screen padding at any zoom (`routesFollowTheGlyphs`).
- [x] A graph that fits at 1 (the wait's three-node chain) opens at 1 centred as before; the arrival of a loaded chain moves nothing (003-314's stories hold).

## Built
`canvas/view.ts` (`openTransform` is gone; `fitTransform` is the one view), `canvas/layout.ts` (`routeAt`, `fitted`, `fit`: under the floor the bounds depend on the scale they are fitted to, so the fit is taken again at the scale it gave, down until the bounds at that scale fit it, at most six rounds; the lowest scale is set from the boxes before the view is, since a stale one from the transient first commit clamped the first view to 1; `viewport.fit` is gone, the Fit act and Arrange call `fit`), `canvas/geometry.ts` (a group's left inset is never under the grown padding), `canvas/group.tsx` (the head under the floor), `canvas/node.tsx` (the status), `canvas/floor.ts` (`nameCap` reads the meta role), `canvas/wait.tsx`, `canvas/zoom.tsx`, `ui-core` `CANVAS_NODE_NAME` (`text-meta leading-meta`; `DESIGN.md` regenerated), `StatusMark.short`'s comment, `guide/canvas.md` and `ui-core.md`.

Stories: `canvas.stories.tsx` `OpensFitted` (workflow in a pane too small for it: scale under 1, every glyph and frame in the pane and the room, the head visible at its own height and 12 px or more, Fit moves the view by under a pixel and the scale by under 0.01) and `LongStatusKeepsTheTitle` (the title of a 240 px node with "May be out of date": whole, where before the title's 137 px of text stood in a 68 px box); `canvas-overview` (`bareForm` now finds the group heads as the only text, 12 px or more; names 12 px or more; tab order starts with the heads), `canvas-fit*` (the loop frames open fitted with their heads drawn, `opensFitted` in `canvas-fit.ts`; the second group is whole at the first view where it was a pan away), and the unit tests of `fitTransform` and `nameCap` (141, was 130). The behaviour stories that need cards at their own size now stand in a stage that holds the graph (`WORKFLOW_STAGE`) or bring a node's card forward by a tap on its glyph (`canvas-touch`, `canvas-group-kit`); the status stories read the dot's accessible name. Chromium: `behaviour/canvas*` and `stories/Canvas` 151 of 151 (touch project included).

Measured, before and after: workflow in the 896 x 640 stage opened at scale 1 with groups past the pane; now the scale is under 1 with every frame inside the pane. The overview name was 11.84 px (caption) and is 12.92 (meta); a group head under the floor drew nothing and is now a button as tall as at zoom 1.
Cost, flagged: a graph that fits at 0.95 opens as the overview (glyphs and names) because the text floor is 1; the old view held a nearly-fitting graph at 1 with a pan. An empty (hollow) group's frame keeps its flow height under the floor, so its head, drawn at its own size, can stand taller than the frame at low zoom. A node's status word is not drawn without a `short` (Stead's status words are sentences; the dot with its tooltip carries them).
No native half: the phone has no node canvas.
