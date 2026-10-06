---
id: 003-89
status: backlog
sessions: {}
---
# react-ui: a code block that wraps

## Goal
Stead's Action item shows an act's arguments whole under the verb (design/07-interface.md "Item screens", Action; github.com/fcalell/stead). At 375 a URL argument is cut and scrolls sideways.

## Approach
`Code` never wraps (`overflow-x-auto whitespace-pre` in code/index.tsx) and takes no wrap prop; arguments a decision rests on must read whole on a phone. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
