---
id: 003-302
status: review
sessions: {}
---
# react-ui: a canvas fills a Split's main to its edges

## Goal
Stead's workflow canvas opens in a Split's main (`packages/server/src/app/routes/system/-components/canvas.tsx`) and stands inside the page inset, under the record's header, rather than filling the pane. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "workflow canvas should fill the whole split pane".

## Approach
`Split` applies `splitMain({state:"rest"})` (`plugins/react-ui/src/ui/components/split/index.tsx:165-170`), `gap-sections p-page max-w-measure-inset` (`packages/ui-core/src/variant-tables.ts:1177`). The filled form (`thread/fill.ts:16-17`) lifts the gap, the bottom padding and the cap but keeps the side and top inset. 003-110 (done) took the measure off a canvas, not the inset; 003-202 (review) is the phone's height. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A canvas in a Split's main reaches the main's edges, with the record's header and acts over it, on the desktop and the tablet. (Built; the measure awaits the batch browser run.)
- [x] A Thread's filled form is unchanged.

## Open questions
- [x] Its shape (the `fills` state for a canvas, or the canvas lifting the inset): the stack session decides.

## Ruled
The canvas lifts the inset itself, as the Thread does, rather than a new `fills` state on `SPLIT_MAIN`: the main already reads the canvas's `data-fill` (no gap, no foot padding, no cap, fitted), so only the side and top inset was left, and the Thread bleeds the same way (`-mx-page` under a hairline). The canvas reads the same two contexts (`ThreadRoom`, `ThreadBleeds`), so it bleeds only as the main's direct fill; in a Place body it is unchanged. The Thread's form (`thread/fill.ts`, `THREAD_UNDER_HEAD`) is not touched, and `Split` and `SPLIT_MAIN` are not either.

## Built
`CANVAS_UNDER_HEAD` (`-mx-page mt-page border-t border-edge`, `packages/ui-core/src/variants.ts`) is the canvas's own cell, held and drawn by Canvas in the roster, which now owns `page` spacing; `DESIGN.md` regenerated. `useBleed()` (`plugins/react-ui/src/ui/components/canvas/ground.tsx`) returns it when `ThreadRoom` and `ThreadBleeds` hold, and both the loaded canvas and the waiting one (`index.tsx`, `wait.tsx`) apply it. The record's head and acts keep the main's page inset over the canvas, a page inset and a hairline above it; the canvas runs to the main's left, right and foot. The touch half-height floor is unchanged. Guide (`plugins/react-ui/guide/canvas.md`) and `ui-core.md` say it. Story `SplitMain` (`apps/showcase/behaviour/canvas.stories.tsx`) now stands an `ItemHeader` over the canvas and asserts the region reaches the main's left, right and bottom and stands under the head; written and type-checked, not run (awaits the batch browser run). Native has no canvas.
- Browser run: `SplitMain` failed because `headPaired` (`item-header/pair.tsx`) paired the record's head with the Canvas, as it does with any part after a factless head in the main, so the canvas was no direct child of the main and `MAIN_FILLED` (`max-w-none`) never applied: the region stood at the measure, 536 wide. A Canvas is now excepted as a Thread is, and the story passes (the region meets the main's left, right and bottom, under the head). The story's list-width line moved with 003-305: a list sizes to its content between `region-min` and `list`. Desktop only; the tablet half of the first criterion is not browser-run, so its box stays open.
