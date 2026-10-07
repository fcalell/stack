---
id: 003-153
status: backlog
sessions: {}
---
# react-ui: a List given its items waits in those rows, only their trailing values waiting

## Goal
Stead's System index lists fixed rows (Leads, Rules, Sinks, Memory) whose trailing counts arrive with the data (design/07-interface.md "Loading: the rows are fixed", lines 818 to 902; github.com/fcalell/stead, `system-index.tsx:135-139`, which passes `items` and `loading`). System critique unit u8 (Stead `948b7ec`, shot `s6-loading-status`): the loading index draws 4+4+4 skeleton rows (129 to 647 px) where the loaded index is 2+3+2 rows (129 to 439 px), so the page shrinks 208 px and the labels the viewer already knows blink out and back.

## Approach
A `List` with `loading` draws waiting rows "in the slots its map declares" (list/index.tsx doc) and ignores `items`. `ListRow` has no waiting form for a trailing value of its own (`trailing` is a word, count, age or pick; list-row/index.tsx). A row whose title is known and whose count is pending cannot be drawn; the app would have to build the loaded rows itself and invent a placeholder for the value, a local copy of what the List does.

## Acceptance criteria
- [ ] A List given `items` and `loading` draws those rows with their titles, each trailing value in a waiting form at the loaded value's size.
- [ ] A List without items waits as it did.
- [ ] The List showcase holds a list of known rows with pending counts beside the loaded one, measured at 390 and 1440.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
