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
