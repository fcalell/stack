---
id: 003-303
status: done
sessions: {}
---
# react-ui: a zoomed-out canvas zooms in finer steps and still names its nodes

## Goal
On Stead's workflow canvas one zoom-out step turns every node into its kind's glyph, and two agent nodes then look the same. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "zoom out steps should be smaller, the glyphs should somehow carry some information or they are not recognizable when zooming out".

## Approach
`STEP = 1.5` (`plugins/react-ui/src/ui/components/canvas/viewport.ts:45`); every zoom under 1 draws the glyph alone (`canvas/floor.ts`, `canvas/index.tsx:119`, `node.tsx:471-500`), the name only as a native `title`. Stead passes one icon per kind (`packages/server/src/app/lib/workflow-draft.ts:167-170`). Both are 006-02's and 006-05's rulings (done); this asks to revisit them. Seen at stack `226f48c`.

## Acceptance criteria
- [x] A zoom step is finer (about 1.2).
- [x] Between the full node and the glyph, an overview form keeps the node's name readable (at caption size, or beside the glyph); the glyph alone only at the far end. (Built; the behaviour stories await the batch browser run.)
- [x] Two nodes of one kind are told apart at every zoom the overview covers. (Each overview form draws its own `title`; the guard keeps the forms from overlapping.)

## Open questions
- [x] The step and the overview's floor: the stack session proposes, the owner rules (it reverses 006-02). See the owner ruling.

## Owner ruling
Reverses 006-02's "every zoom under 1 is the glyph alone" and its step; keeps 006-05's invariant (no text under the floor; the name is drawn unzoomed at the floor size).

- `STEP = 1.2` in `viewport.ts`; the wheel cap is `log2(1.2)`; the extent stays [0.1, 2]; fit and pinch are unchanged.
- Bands: zoom 1 and up the full node (`TEXT_FLOOR` unchanged); 0.5 up to 1 the overview; under 0.5 the glyph alone. New `OVERVIEW_FLOOR = 0.5` in `floor.ts`; the canvas holds a second flag beside `below`: `bare = k < OVERVIEW_FLOOR`.
- Overview form: the node's glyph unzoomed (`UNZOOM`) as today, with its name at the glyph's inline end, vertically centred, one line; caption role at the floor size, `ink-body` 500, cut at `measure-short`, on a `canvas`-ground chip so an edge never strikes through it. New ui-core cell `canvasNodeName`. Status and problem marks stay on the glyph. Edges still route to the glyph's square (`routeSide`).
- Glyph alone under 0.5 as today, with the native `title`.
- Collision guard: the graph's overview floor is the larger of 0.5 and the lowest zoom at which no two overview forms (glyph, the inside gap, the capped name) overlap, on the `minZoomFor` principle; at 1 or more the graph has no overview (today's behaviour). The rectangle maths is the stack session's.
- The name is `CanvasNode.title`; no new prop. Touch: the same thresholds with the touch caption and the 44 px glyph.
- Update `canvas/index.tsx`, `node.tsx`, `floor.ts`, `viewport.ts`, the canvas frame stories, the canvas lines in `ui-core.md` and `guide/canvas.md`.

## Ruled
- The step is 1.2 and a wheel tick moves at most that (`MOST = log2(STEP)`), as the stack does.
- The name is a child of the glyph's own button, so it scales with the glyph's `UNZOOM` and holds its size on screen at any zoom with no second variable; a click on the name is a click on the glyph (zoom to the node). It is absolutely placed at the glyph's inline end (`start-full`, `top-1/2`) and does not change the button's box, so the glyph's measured rect, the routes and the frames are as under 0.5.
- The gap after the glyph is a `pair`, not the ruling's inside gap: the status and problem dots straddle the glyph's right corners by `inside`, so an inside gap would abut them. The guard uses the same `pair` in the form's width, plus `2 * pair` of air between two forms (as `minZoomFor` leaves between two glyphs) so an edge has a stretch to run.
- The guard measures the cap, not the name: `nameCap` is `measure-short` characters at `SANS_ADVANCE` of the caption's size at the density, so a graph's floor depends on its layout and the density, not its words, and does not move as a title is edited. Pairs are tested on the nearer of the two axes (clear across by the form's width, or down by the glyph's height), since a name extends to the right only.
- A floor of 1 or more is clamped to 1, so `bare` equals `below` and the graph is the old two-band canvas.
- The title stays on the glyph button in both bands: the whole name where the overview cuts it, the only one under 0.5.
- The cell carries `tone` (rest body, off meta, dimmed disabled), as the node's words do; the frames draw it for the workflow, an off node and a run.

## Built
- `packages/ui-core`: `CANVAS_NODE_NAME` / `canvasNodeName` (`variant-tables.ts`, `variants.ts`), listed in the `Canvas` roster entry and `verify.ts`; `DESIGN.md` regenerated.
- `plugins/react-ui/src/ui/components/canvas`: `viewport.ts` (`STEP = 1.2`); `floor.ts` (`OVERVIEW_FLOOR`, `nameCap`, `overviewFloorFor`); `index.tsx` (the `overview` floor memo from the laid-out boxes, the `bare` flag, passed to each `NodeView`); `node.tsx` (the name in the glyph button while not `bare`, `data-name`).
- Frames: `showcase/frames/canvas.tsx` draws `CANVAS_NODE_NAME.tone.*` as the workflow, an off node and a run fitted in `OVERVIEW_STAGE`, where each glyph carries its name.
- Tests: `plugins/react-ui/test/canvas.test.ts` (the floor, the cap, the guard by hand and on the workflow at both densities, the new frames). Behaviour stories (`apps/showcase/behaviour`) written, not run: `canvas-overview.stories.tsx` (the overview walks the bands, a step is a fifth, the named form and the bare form, `NameFramesAtDesktop`), and the steps and counts of `canvas.stories.tsx` and `canvas-touch.stories.tsx` moved to 1.2 (30 zoom-outs to the lowest zoom, a pinch off the stack's lattice before the crossing, three zoom-ins to 2, the marks selectors skipping the name). Touch is covered by the stories' shared thresholds; no separate touch name story.
- Docs: the canvas lines of `ui-core.md` and `guide/canvas.md`.
- Evidence: `pnpm check` and `pnpm verify` in ui-core and react-ui (tails in the report). On the workflow's fixture sizes the overview floor is 0.5 at both densities. The behaviour stories and the critique of the name frames await the owner's batch browser run. The frame stage `OVERVIEW_STAGE` (60rem) is sized by estimate from the fixture's height, so its fit may land outside the band in a density: the story would say so.
- Native: not applicable (the canvas is web only).
- Browser run: `canvas-overview.stories.tsx` 21/21 pass. Fixed on the way: `minZoomFor` now counts the `pair` the routing boxes round up by (`routeSide`), so the route between the two nearest glyphs reads `2 * pair` at the lowest zoom (it read 10.6 against 12 on the workflow once 003-297 changed the node sizes; `RoutesFollowTheGlyphs`); its unit tests and the stories' `lowestZoom` follow. `NameFramesAtDesktop` excludes a dimmed name's button from axe as the state stories do for a dimmed node's text (`CANVAS_NODE_NAME.tone.dimmed`: disabled ink on an enabled button; `.storybook/state-stories.tsx` too). `PressDoesNotPan` presses with the browser's mouse held (`mouse.ts` `press`), since Chromium 141 does not read `focusVisible: false`, and reads the focus before the click that selects the node (a page's selection reveals it).

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
