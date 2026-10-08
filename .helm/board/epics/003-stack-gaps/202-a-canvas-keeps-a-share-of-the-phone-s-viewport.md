---
id: 003-202
status: backlog
sessions: {}
---
# react-ui: a Canvas keeps a share of the phone's viewport while the head and banners scroll away above it

## Goal
Stead's workflow canvas stands in a `Split`'s main under an `ItemHeader` and, while a save is refused or the canvas is empty, a `Banner` (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/canvas.tsx`; design/07-interface.md "### A workflow: the canvas", Head, Problems and States). At 375x667 the canvas drew 250 to 454 px high with 114 to 180 px of Banners above it, a graph too small to pan and read. Stead moves the run and saved notes into the head's facts and the problems into a sheet, which shortens what stands above the canvas but cannot take the head away: the canvas needs a minimum share of the phone's viewport (about half of its height) whatever stands above it, the head and Banners scrolling away over it rather than shrinking it. Evidence: Stead's step 8 canvas review at stack `74a0e3d` (`packages/server/test/review/8-canvas.json`, shots `canvas-problems` and `canvas-run-parked`).

## Approach
`Canvas` fills the room its parent leaves (`canvas/index.tsx`), and a `Split`'s main on touch is one column that scrolls as a page, so the canvas takes what the head and Banners leave of the viewport and no more. Giving the app's wrapper a `min-height` is a class at a call site, and a `Canvas` that scrolls inside its own region would trap the one finger that pans it: the page cannot scroll past it by touch. A pushed `Screen` has the same column and no canvas-aware height. Nothing the roster ships keeps a region a share of the viewport while its siblings scroll away.

## Acceptance criteria
- [ ] Under `tablet` a `Canvas` keeps at least a share of the viewport's height whatever stands above it in its column (an `ItemHeader`, `Banner`s), the head and Banners scrolling away above it as the page scrolls.
- [ ] A touch pan on the canvas pans the graph and a touch pan on the head above it scrolls the page, at 375x667 and 390x844.
- [ ] From `tablet` the canvas is unchanged.
- [ ] The Canvas showcase holds a canvas under a head and two Banners at 375x667, measured by the critique.

## Open questions
- [ ] Its shape (a minimum-height prop on `Canvas`, a canvas-aware form of `Split`'s main, or another) and the share: the stack session decides.
