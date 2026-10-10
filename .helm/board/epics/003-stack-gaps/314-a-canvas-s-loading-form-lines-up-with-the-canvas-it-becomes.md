---
id: 003-314
status: review
sessions: {}
---
# react-ui: a canvas's loading form lines up with the canvas it becomes

## Goal
The Canvas loading skeleton centres its column while the loaded chain starts 20 px further right; at 375 the arrival moves everything 27.5 px sideways and 111 px down.

Found by the re-critique of 003-188.

## Acceptance criteria
- [x] At 375, 768 and 1440, light and dark, the first skeleton node's left and top edges equal the loaded chain's first node's within 1 px.
- [x] The skeleton keeps the loaded node size (240x74, touch 240x86), the loaded gap, the 592 px frame, `aria-busy`, and no zoom stack.
- [x] The arrival moves nothing: skeleton node boxes match the loaded boxes at every measured width.
- [x] The Canvas loading stories at 375, 768 and 1440 hold the check.

## Ruled
The wait takes the loaded canvas's own opening view, not a second placement: it measures its pane and its column and calls `openTransform` (the call `useLayout` makes for a graph with no foot), with the clearance `clearanceOf` reads (the function the viewport's `clearance` now is). The 20 px was the zoom stack's room, which the loaded view keeps clear of; the wait holds that room with an unseen `ZoomRoom` (the stack's frame round one icon act's box, `aria-hidden`, `invisible`, no button), so no zoom stack is drawn and nothing moves. No prop, no constant. The wait refits when its pane resizes. Only the stack's width is held: a loaded canvas with an `act` also clears the act's foot, which the wait does not draw, so a pane too short for the chain could differ there (not measured).

## Built
`canvas/wait.tsx` (column placed by `openTransform`, ResizeObserver refit), `canvas/zoom.tsx` (`ZoomRoom`), `canvas/viewport.ts` (`clearanceOf` extracted from the viewport, same behaviour), the `ui-core.md` Canvas paragraph and `guide/canvas.md` Loading. `Loading` in `behaviour/canvas.stories.tsx` drops the centred check (sizes and gap kept) and six `ArrivesInPlaceAt{375,768,1440}{Light,Dark}` stories compare each skeleton card's left, top, width and height with the loaded chain's node within 1 px. Chromium: `canvas.stories.tsx` 56/56, `canvas-overview`, `canvas-touch`, `canvas-fit*` and `stories/Canvas.stories.ts` 91/91. A fresh critique still measures the render.
