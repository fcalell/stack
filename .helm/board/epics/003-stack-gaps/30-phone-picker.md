---
id: 003-30
status: backlog
sessions: {}
---
# ui-core: a full-screen searchable picker on the phone

## Goal
Martechthings' portal request form opens, without an object, on a picker: a full-screen searchable list at phone width, one row per object with its container muted, ending in a "Something new" row. picker-and-menu's range is a 215 to 300 px popover.

## Approach
- Reference: Base44's searchable related-app list with Skip ([flow](https://mobbin.com/flows/31396076-3e6b-42fc-b92a-9717a121a422)).

## Acceptance criteria
- [ ] A `Picker` at phone width opens full screen with search, two-line options and its closing act.

## Shape
No new prop. A pick sheet that searches (past `SEARCH_PAST` options) stands full height from its first frame on touch, derived in render as a TextArea's sheet is: on the phone `SheetBase` reads a searching menu as tall; on the web the touch sheet box takes the full height under its top inset. Same scrim and drag-down close.
