---
id: 003-217
status: done
sessions: {}
---
# react-ui: a Canvas node's lift does not log when the pulse is refused

## Goal
Stead's workflow canvas passes `onMove`, so a node held still on touch lifts (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/canvas.tsx`, `src/app/lib/workflow-draft.ts`; design/07-interface.md "### A workflow: the canvas"). A long press on a node at 390 px with touch input logs a console error, `Blocked call to navigator.vibrate because user hasn't tapped on the frame`, from `canvas/lift.ts` (line 178, `navigator.vibrate?.(10)`). Stead's interface review holds a floor of no console error, and the lift is the only thing that trips it on the canvas. Evidence: Stead's second workflow canvas critique, unit u11, at stack `8d7485d3` (shots `m/lp-held.png`, `m/lp-moving.png`, `m/lp-drag.png` in Stead's scratchpad `critique/u11/shots/`).

## Approach
The lift calls `navigator.vibrate?.(10)` as "a progressive enhancement": the optional call guards a device with no vibrate, not a browser that has it and refuses it. Chrome refuses the call until the frame has had a user activation and logs the refusal to the console as an error, so a viewer whose first gesture on the page is the long press sees one. A touch gesture that is still held gives no activation until it ends, so the first press on a freshly opened page is always refused. A synthetic touch (the review's driver) gives no activation at all; with a real finger the log appears only when nothing was tapped on the frame before, so the case is narrower than the review's, and the story is for the call to be harmless in both. The app cannot catch it: the call is inside the canvas's lift and fires on the node's own press timer, and wrapping `navigator.vibrate` in the app is a workaround on a stack module. Unchanged at stack `HEAD` (`4e78e011`: `canvas/lift.ts` line 178 holds the same call).

## Acceptance criteria
- [x] A lift on a page with no user activation draws and works as it does with one (the outline, the follow, one `onMove` on release) and logs nothing to the console.
- [x] A device that honours the pulse still gets it once per lift.
- [x] A behaviour story lifts a node in a frame with no activation and asserts no console error.

## Open questions
- [x] Its shape (the call gated on the page's activation, `navigator.userActivation?.hasBeenActive`, or the pulse dropped where the browser refuses it): the stack session decides.

## Ruled
The call is gated on `navigator.userActivation?.hasBeenActive`, the least surface: no wrapper on `navigator.vibrate`, no catch (Chrome logs the refusal itself, a `try` does not stop it). Where the browser has no `userActivation` the pulse is skipped too: those browsers (Firefox, older Safari) have no vibrate or refuse it. The lift is otherwise unchanged.

## Built
`lift.ts` calls `navigator.vibrate?.(10)` only when `navigator.userActivation?.hasBeenActive`; the outline, the follow and the one `onMove` on release do not read it. Behaviour stories (`apps/showcase/behaviour/canvas-touch.stories.tsx`): `LongPress*` now stubs `userActivation.hasBeenActive` true beside its vibrate stub and still asserts one pulse of 10; the new `LongPressUnactivated*` stubs it false, spies `console.error`, lifts and drops a node, and asserts the outline, one `onMove`, no vibrate call and no console error. Written and type-checked, not run: they await the batch browser run.
- Browser run: `canvas-touch.stories.tsx` 54/54 pass after the batch's fixes.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
