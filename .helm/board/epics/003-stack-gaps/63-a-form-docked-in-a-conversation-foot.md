---
id: 003-63
status: backlog
sessions: {}
---
# react-ui: a form docked in a conversation's foot

## Goal
Stead's question sheet (github.com/fcalell/stead, packages/server/src/app/ui/question-sheet.tsx; design/decisions.md "Questions"; design/07-interface.md "The question sheet") docks in the conversation's input place, the conversation readable above it, when a round is opened from the conversation that asked. Until this ships the round opens in the modal Sheet instead.

## Approach
Thread's foot is "the MessageInput under the messages". A four-question page (options, a note field, Next) placed there measured 457 px in a 740 px viewport at 375 px wide with a banner up: the log shrank to 56 px and Next fell under the tab bar. Nothing bounds the foot's height or scrolls it, and no roster part docks a form there.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
