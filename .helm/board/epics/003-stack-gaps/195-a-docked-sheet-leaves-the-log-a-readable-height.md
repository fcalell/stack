---
id: 003-195
status: backlog
sessions: {}
---
# react-ui: a docked Sheet leaves the log above it a readable height

## Goal
Stead's question sheet docks in a conversation's foot and design/07-interface.md ("The question sheet") says the conversation stays readable above it (github.com/fcalell/stead, `packages/server/src/app/ui/question-sheet.tsx` in the Thread of `ui/conversation.tsx`). At 390 x 844 with the usage banner up the log above the docked sheet is 65 px, one line ("Code asked 2 questions · Answer 3:47 PM", cut at its top by the header's hairline), against a sheet of 372 px (shot `shotsB/B-sheet-390-light`; `G.out` line 6: `log [350,65]`, `sheet [415,372]`); after the first page it is 56 px. The operator answering a question cannot read what was asked. Evidence: Stead's chats critique unit u5 at stack `74a0e3d` (Stead scratchpad `critique/u5/`).

## Approach
003-129 ("Decided") holds the body's floor (three rows) and its share (two fifths of the region), and lets the log give way to the foot: `FOOT_DOCKED` is `max-h-full min-h-0`. That fixes the sheet's body and, by design, gives the log nothing: whatever the head, the foot line, the submit and the body leave is the log's, with no minimum, so at 844 px with a banner it is one line, and at shorter viewports it is zero (see 003-194). 003-129's acceptance names "the log giving way", so the floor of the log's own is a separate contract that nothing holds. The app cannot hold one: the log and the foot share the Thread's region, and a geometry class goes on host elements only.

## Acceptance criteria
- [ ] With a docked Sheet open in a filling Thread, the log keeps a floor (a stated number of its own lines or rows, in the contract beside `docked-floor`) at 390 x 844 under a banner, the body giving way down to its own floor before the log goes below it.
- [ ] A docked Sheet with room is unchanged.
- [ ] The Thread showcase holds the docked Sheet at 390 x 844 under a banner and the critique measures the log's height against the floor.

## Open questions
- [ ] Its shape (a log floor as a contract value like `docked-floor`, a lower body floor on touch, or the sheet's head collapsing): the stack session decides, with 003-194.
