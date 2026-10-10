---
id: 003-203
status: done
sessions: {}
---
# react-ui: an ItemHeader fact that goes to another route

## Goal
Stead's workflow canvas, showing a run parked on an item, carries "Run parked" and "Open the run" among its head's facts, so the canvas keeps the phone's height that a Banner would take (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/canvas.tsx`, the head's facts; design/07-interface.md "### A workflow: the canvas", the Head row: "Open the run" a fact of the head, never under more). "Open the run" goes to the run's own route.

## Approach
An `ItemHeader` fact is a string, a status, or `{ label, onOpen }`, which draws a chevron and marks itself as opening a dialog (`aria-haspopup="dialog"`): the form a fact that opens a sheet takes. No fact takes an `href`, and an `ItemHeader` holds no act of its own beside its facts. Stead now passes `{ label, onOpen }` with an `onOpen` that navigates, so the fact says it opens a dialog when it goes to a route. A Banner with a Link act costs the canvas about 114 px on the phone, which is why 07 moved it into the head.

## Acceptance criteria
- [x] An `ItemHeader` fact can name a route it goes to, drawn and announced as a link (a router navigation, its chevron as a row that opens draws one), at every width.
- [x] A fact that opens a sheet is unchanged.
- [x] The ItemHeader showcase holds a fact that goes to a route beside one that opens a sheet, measured by the critique.

## Open questions
- [x] Its shape (an `href` on a fact, or another): the stack session decides.

## Ruled

`{ label: Part; href: Route }` beside `{ label; onOpen }` on `ItemHeader`'s `Fact` (the `MessageDetail.row` precedent), typed so one of the two stands per fact. No new component. Web draws an anchor with the router's `follow`, the same box, meta label and trailing `ChevronRight` as the opening fact and no `aria-haspopup`. Native draws a `Pressable` with `accessibilityRole="link"` that navigates.

## Built

`Fact` gains `{ label: Part; href: Route; onOpen?: never }` in `plugins/react-ui/src/ui/components/item-header/index.tsx` and `plugins/native-ui/src/ui/components/item-header/index.tsx` (`FactPart`, `factKey`). The roster comment, both `rules.md` and `ui-core.md` describe it. Evidence: `behaviour/item-header.stories.tsx` `FactToARoute` (1280) and `FactToARouteTouch` (390) assert the route fact is an `a` with its `href`, has no `aria-haspopup`, draws the chevron, shares the radius and height of the sheet fact beside it, and the sheet fact is still a button with `aria-haspopup="dialog"`. The generated ItemHeader frame holds both facts; its Rest and Loading stories pass with axe. Left for the critique: the third box (the showcase measured by the critique).

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique pass: the route fact is an `<a href>`, the sheet fact a button with aria-haspopup; same radius, type and chevron; 28/44 tall.
