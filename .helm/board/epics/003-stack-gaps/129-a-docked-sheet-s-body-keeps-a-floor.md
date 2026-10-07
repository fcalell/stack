---
id: 003-129
status: backlog
sessions: {}
---
# react-ui: a docked Sheet's body keeps a floor of rows

## Goal
Stead's question sheet docks in a conversation's foot, and at 390 x 844 with the usage banner up (130 px) its body scroller is 358 x 84 on a question page (one option half cut), 46 on the review page and about 23 under the "Round n is ready." banner, so the operator answers through a slit (github.com/fcalell/stead, `packages/server/src/app/ui/question-sheet.tsx`; design/07-interface.md "The question sheet", the conversation readable above it). Evidence: chats critique unit u5, shots `D-q1-390l`, `D-failed-390l`, `D-ready-390l`, `q1-chosen-390l`, `D-q1-390d` (Stead scratchpad `critique/u5/shots/`, stack at `5564217`).

## Approach
`FOOT_DOCKED` caps the foot at `max-h-3/5` of the region and `SheetDocked` (sheet/docked.tsx) holds its head, foot line and submit at their height (`shrink-0`), so the body is whatever the cap leaves after them, with no minimum: a long head, a foot line, a stacked touch submit and a banner over the region together leave the body under two rows. The log keeps its two fifths, so it is not the log that gives way. The app cannot set a body minimum or drop the foot line from outside (geometry classes go on host elements only); it can shorten its own head, and Stead is doing that, but a floor is the sheet's. The same small log is where the Latest act floats over the last line ("Code asked 2 questions · Answer" half hidden at 390 dark): no room above the foot for it to stand clear. 003-63 built the docked sheet and left the half bound to the critique; 003-124 is a Split's list over a docked foot, a different case. Seen at stack `5564217`.

## Acceptance criteria
- [ ] A docked Sheet's body keeps room for at least three option rows on touch, whatever its head, foot line and banners hold, the log giving way (or the foot line moving into the body on touch).
- [ ] A docked Sheet with room is unchanged.
- [ ] The Thread showcase holds a two-page docked Sheet at 390 x 844 with a banner up and the critique measures the body and the Latest act's clearance.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the cap rises to keep a floor, the body gets a `min-h`, or the foot line leaves the foot on touch.
