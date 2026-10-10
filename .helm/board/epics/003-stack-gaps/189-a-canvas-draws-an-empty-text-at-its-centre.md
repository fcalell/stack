---
id: 003-189
status: review
sessions: {}
---
# react-ui: a Canvas draws an empty text at its centre

## Goal
design/07-interface.md "### A workflow: the canvas", States: a new workflow holds the trigger alone, "and the canvas's centre reads \"Add a node, or drag from the trigger's port.\"" Stead (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/canvas.tsx:370-372`) stands that sentence as a `Banner` above the canvas. It costs Stead the sentence being a page-level notice, away from the trigger it speaks of and the port it names, and taking a row of the main's height from the canvas.

## Approach
`CanvasProps` (`plugin-react-ui/src/ui/components/canvas/index.tsx:51-72`) has no `empty` or children slot, and the section it draws (`index.tsx` around line 284) holds only the ground, the layer, the zoom stack and the `act` foot. Things tried:
- A `Banner` in the Place (the interim): a page notice with a tone and an act, not a caption on the ground.
- An absolutely positioned element over the canvas: a host element with tokens that stack's rules forbid, and it would not follow the pan, the zoom or the trigger's place.
- `EmptyState` (`components/empty-state`) replaces its region and would hide the trigger node, which the new workflow still holds and which the sentence points at.
A Canvas with one node and no edge has nowhere to say that the graph is not yet a graph.

## Acceptance criteria
- [x] A Canvas can carry a short text drawn at the centre of its view, over the ground and under the nodes' controls, in the meta ink, that takes no pointer, so a drag through it pans and a tap on the ground clears the selection.
- [x] The text is in the region's accessible description, and stays readable at the text floor whatever the zoom.
- [x] A Canvas without the text is unchanged.
- [ ] The Canvas showcase holds a canvas of one node with the text at 375 and 1440 px in both modes, measured by the critique.

## Open questions
- [x] Its shape (an `empty` sentence prop, or a slot): the stack session decides.
- [x] Whether it stands at the view's centre or at the nodes' centre, and whether it hides once a second node exists or the app does that: the stack session decides.

## Ruled
`empty?: string` on `CanvasProps`, a sentence of app copy (not a slot, not a `words` entry). Stack does not decide when it stands: the app passes it or `undefined`. It stands in the layer, centred on `routed.bounds` one `space.pair` under their bottom edge, so it speaks from under the node it points at and follows the pan and zoom (not the view's centre, where the lone trigger opens). It holds its size on screen through `--canvas-unzoom`, so it is the meta role at the text floor at any zoom, capped at `max-w-measure`. `pointer-events-none`: a drag through it pans and a tap on it reaches the ground. The region's `aria-describedby` names it.

## Built
`canvas/caption.tsx` mounted by `canvas/index.tsx`, the `empty` prop and state in the Canvas roster entry, `guide/canvas.md`, the `ui-core.md` Canvas paragraph, an `empty` showcase frame and the `EmptyText` behaviour story. `pnpm check` and the three verifies pass; the scoped browser run of `Canvas.stories.ts` and the three canvas behaviour files passes (115 tests, peak 2840 MiB).

## Owner ruling
The owner confirms the narrowing: the text stands under the graph's bounds, not at the view's centre, since a lone trigger node holds the centre.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique (rework): the empty text is 13 px meta ink under the node with aria-describedby; at 375 (263 px pane) the caption (max-w-measure 248) runs from 84 to 332 px, past the pane's 319 edge, so "...the trigger's port." is cut, as is the 240 px node. Nit: the gap under the node shrinks to 2 px when zoomed out.

## Owner ruling
The owner rules rework: caption width = min(measure, pane width - 2 page insets), and it wraps; the initial fit places the lone node and the caption wholly inside the canvas box. Acceptance at 375 (263 px pane) and 1440: caption and node edges inside the pane (0 px clipped), caption at the floor size. The same fit fixes the pane overflow of 003-291 at 375. Nit: the gap under the node never shrinks below `pair` when zoomed out (2 px now).

## Built (rework)
The sentence wraps within `min(measure, pane - 2 page insets)` (`100cqw` of the canvas region, now a container), keeps a `pair` of screen pixels under the node at any zoom (its top is the bounds' bottom plus `pair` times the unzoom variable, so it no longer shrinks to 2 px when zoomed out), and reserves its measured size on the viewport (`reserve`), so the opening view and Fit stand the node and the sentence whole in the pane (`footTransform` in `canvas/view.ts`: the node keeps scale 1 while the pane holds it, the sentence centres on the pane when it is as wide as the room, and the room ends above the zoom stack when they share a column). A lone box that the room cannot hold but the pane can opens by the same fit, which is the 003-291 overflow at 375. Stories `EmptyText` (56rem stage) and `EmptyTextInAPhonePane` (263 px pane, touch) assert node and sentence 0 px clipped at open and after Fit, scale 1 with the card (no glyph), the gap at least `pair` after zooming out, the text size unchanged; unit test `a fit with a foot ...` in `canvas.test.ts`. Browser run: `canvas.stories.tsx` 50/50, `canvas-overview` and `canvas-touch` 75/75, `stories/Canvas.stories.ts` 4/4. The critique box (375 and 1440) stays for the critique.

## Review
Re-critique after the rework: empty caption and node 0 px clipped at 375 and 1440, caption at floor size, gap 8. But 291's frames at 375: Hollow and Placed loops clip 8 px on the right; Placed's second group entirely outside the pane; Placed's group bottom passes the zoom stack top by 7 px; Lone loop now opens at scale 0.447 (text ~5.8 px, under the text floor) in a 224 px tall pane.

## Owner ruling
Round 2: initial fit, text floor first. Fit scale = max(text-floor scale, min(scale that fits all nodes and groups with the page insets)); the floor scale is the scale at which node text reaches the rubric text floor; the Lone loop's 0.447 (text ~5.8 px) must never be chosen. Content bounds include groups and loop edges, not only nodes. When the floor wins, anchor the first node and its group wholly inside the pane at the top-left page inset; anything else may sit beyond the right/bottom edge but is reachable by pan or zoom (add one story that pans to the Placed frame's second group). Grow a frame's pane height to the content at the floor scale where the frame allows it (Lone loop's 224 px is too short). A group's bottom stays >= 8 px clear of the zoom stack top. The gap under a node never shrinks below `pair` when zoomed out. Acceptance at 375 and 1440 in 291's Lone, Hollow and Placed frames, both modes: node text >= floor; the first node and group 0 px clipped; no group bottom under the zoom stack; the empty-canvas caption still 0 px clipped; where everything fits at the floor (1440) the whole content is inside the pane.

## Built (rework, round 2)
`openTransform` (`canvas/view.ts`) no longer has the lone-box branch that fitted a single frame above the zoom stack (the source of the 0.447 scale). A graph with no caption opens at scale 1, the node's own size and the text floor (a fit never exceeds 1, so the floor scale wins). It is centred in the room when it fits there. Else its first box stands at the top, `inset` below the pane's top, on the room's centre line clamped to a page inset on each side, and against the left inset when it is as wide as the pane (263 px against a 240 px card: the right edge then stands 7 px inside the pane). The first box is the first node in path order united with the frames of the groups that hold it, or the first empty group (`layout.ts`, with `groupTree` and the now exported `union` of `geometry.ts`); the bounds are the router's, which already hold groups, routes and chips. The caption's `footTransform` path is unchanged. Frames (`showcase/frames/canvas.tsx`): `ALONE_STAGE` 16rem to 22rem and a new `PLACED_STAGE` 44rem, so the stack leaves the first group 8 px clear at the floor; `HollowGroupPlaced` and `HollowGroupPlacedLight/Dark` draw the Placed loop in it. Docs: `guide/canvas.md` and the `ui-core.md` Canvas paragraph. Unit test `openTransform opens at the text floor ...` in `canvas.test.ts` (90 of 90).

Stories (new: `behaviour/canvas-fit.stories.tsx` at 1440 and `canvas-fit-touch.stories.tsx` at 375, with `canvas-fit-kit.tsx` and `canvas-fit.ts`, drawing the showcase's own CANVAS_GROUP and CANVAS_NODE empty frames in both modes). `LoopFramesAt1440Light/Dark` and `LoopFramesAt375Light/Dark` assert, in the Hollow, Placed and Lone loop frames: scale >= 1 and no glyph, the first node and the `loop` group 0 px clipped, no group frame's bottom under the zoom stack (8 px clear), and at 1440 every node and frame inside the pane. `EmptyCanvasAt1440Light/Dark` and `EmptyCanvasAt375Light/Dark` assert the node and the caption 0 px clipped, the caption at the floor size and the gap under the node at least `pair`. `PansToTheSecondGroupLight/Dark` (375) checks the Placed loop's `retry` frame stands past the pane, then pans on the ground and finds it whole in the pane at the same scale. The older story `OpensAtTheFirstNode` (a 288 px pane, a 240 px card) read the room's centre line to a pixel; the ruling's page insets now clamp it, so it reads the clamped line. Browser run: `canvas-fit` 10/10 (4 + 6), `canvas.stories` 50/50, `canvas-overview` and `canvas-touch` 75/75, `stories/Canvas.stories` 4/4 (139 of 139 together). The critique box (375 and 1440) stays for the critique. `pnpm verify` in react-ui passes 13 of 13.

## Review
Re-critique after round 2 (`## r2`): text floor met everywhere (scale 1, >= 12 px; the 0.447 gone); groups >= 8 px clear of the zoom stack (or beside it at 1440); at 1440 all content inside the pane; the Lone pane is 304 px; the empty canvas's caption and node 0 px clipped, gap 6 px. Finding from the rework: in the roster frames at 375 (263 px pane, desktop density, 24 px inset) the first node and the loop group stand at x=24-264, 1.0 px past the pane's 263 edge (Hollow, Placed, Lone, both modes): 24 + 240 > 263; the clamp should centre a box wider than pane - 2 insets. Placed's second group stands past the pane at 375 (ruled reachable by pan; `PansToTheSecondGroup` is unverifiable in the static build but passed in the vitest run).

## Owner ruling
Round 3: one-line fix. When the first node and its group are wider than pane - 2*inset (the floor scale wins), centre them instead of anchoring at the inset: left = max(0, (pane - width) / 2). Where pane - 2*inset >= width the inset still anchors (1440 and wider unchanged). Applied in the floor-wins anchor path of `canvas/view.ts`. Keep the text floor scale, the zoom-stack clearance >= 8 px, the gap under a node >= pair.
Acceptance at 375 (263 px pane, the roster frames' desktop density) in Lone, Hollow and Placed, light and dark:
- [x] the first node and the loop group fully in the pane: left >= 0 and right <= 263 (240 px box: x = 11.5 to 251.5, 0 px clipped);
- [x] wider panes unchanged: at 1440 the left edge still at the inset, all content inside;
- [x] node text >= floor, zoom-stack clearance as before, the empty-canvas caption 0 px clipped;
- [x] the Placed second group stays reachable by pan (existing story);
- [x] a pane-edge assertion in the Canvas behaviour stories (including a 263 px desktop-density pane like the roster frame's), not eyeballed.

## Built (rework, round 3)
`openTransform` (`canvas/view.ts`): in the floor-wins path the first box's left is `max(0, (pane.width - first.width) / 2)` when `low > high` (the box is wider than the pane less its two insets), else the room's centre line clamped to the insets as before; the unit tests `openTransform opens at the text floor ...` (the 263 px lone frame at x=11.5, the 280 px framed node at 0) and the story `OpensAtTheFirstNode` read the centred line. `guide/canvas.md` and `ui-core.md` say it. 003-291's frames are the acceptance (Hollow, Placed and Lone loop).
Stories: new `behaviour/canvas-fit-roster.stories.tsx` (`LoopFramesAt375DesktopLight/Dark`): the showcase's CANVAS_GROUP loop frames at the desktop density in a stage that leaves the canvas a 263 px pane (asserted: the pane is 263 px), Hollow, Placed and Lone loop: the loop group and the first node 0 px clipped, inside 0 to 263, the group 11.5 px from each edge (within the region's 1 px border). The 1440 stories (`canvas-fit`, 6) and the 375 touch stories (`canvas-fit-touch`, 6, with the pan to the Placed second group) are unchanged and pass.
Browser run: `canvas-fit-roster` 2/2, `canvas-fit` and `canvas-fit-touch` 12/12 and `shell`, `canvas` (50/50), `canvas-overview`, `canvas-touch`, `stories/Canvas` 153 of 153 together; `stack screens test --all` 180 of 180. `pnpm check` and the three verifies pass. Canvas is web only.

