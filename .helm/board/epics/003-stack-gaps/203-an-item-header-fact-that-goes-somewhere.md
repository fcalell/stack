---
id: 003-203
status: backlog
sessions: {}
---
# react-ui: an ItemHeader fact that goes to another route

## Goal
Stead's workflow canvas, showing a run parked on an item, carries "Run parked" and "Open the run" among its head's facts, so the canvas keeps the phone's height that a Banner would take (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/canvas.tsx`, the head's facts; design/07-interface.md "### A workflow: the canvas", the Head row: "Open the run" a fact of the head, never under more). "Open the run" goes to the run's own route.

## Approach
An `ItemHeader` fact is a string, a status, or `{ label, onOpen }`, which draws a chevron and marks itself as opening a dialog (`aria-haspopup="dialog"`): the form a fact that opens a sheet takes. No fact takes an `href`, and an `ItemHeader` holds no act of its own beside its facts. Stead now passes `{ label, onOpen }` with an `onOpen` that navigates, so the fact says it opens a dialog when it goes to a route. A Banner with a Link act costs the canvas about 114 px on the phone, which is why 07 moved it into the head.

## Acceptance criteria
- [ ] An `ItemHeader` fact can name a route it goes to, drawn and announced as a link (a router navigation, its chevron as a row that opens draws one), at every width.
- [ ] A fact that opens a sheet is unchanged.
- [ ] The ItemHeader showcase holds a fact that goes to a route beside one that opens a sheet, measured by the critique.

## Open questions
- [ ] Its shape (an `href` on a fact, or another): the stack session decides.
