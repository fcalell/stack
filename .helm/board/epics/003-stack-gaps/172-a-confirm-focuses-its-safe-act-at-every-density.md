---
id: 003-172
status: done
sessions: {}
---
# react-ui: a confirm opens on its safe act at every density

## Goal
The touch confirm opened with the destructive act focused ("Disconnect", 343 x 44, above Cancel) where the desktop one focuses Cancel; Enter on the touch confirm confirmed (critique `r2-sheet/report.md`, unit 3, `confirm-375touch-light`, pre-existing). `ActionBar` draws the filled act first on touch and holds the tree in drawn order, so the first tabbable differs by density.

## Approach
A decision (`SheetBase` given `acts`) with no `focus` of its own opens on its first act, the way out, by the same `initialFocus` function that finds a confirm's name field. A confirm that asks for a name keeps the field focused. Native has no focus move to make: its confirm moves focus only into the name field.

## Acceptance criteria
- [x] `Behaviour/Sheet` `Decision` and `DecisionTouch` assert Cancel holds focus once the confirm is open.
- [x] A real click on the trigger at 390 touch leaves Cancel focused, no ring (probe `r3/p2.json`: `confirmTouch` Cancel, `:focus-visible` false; desktop the same).

## Built
`plugins/react-ui/src/ui/components/sheet/base.tsx`: `Dialog.Popup`'s `initialFocus` finds the button named for `acts[0]` when `acts` is given and `focus` is not; the `focus` prop's comment says so. `apps/showcase/behaviour/sheet.stories.tsx`: `Decision` (and `DecisionTouch`, which spreads it) waits for Cancel to hold focus.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
