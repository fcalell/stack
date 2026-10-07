---
id: 003-89
status: backlog
sessions: {}
---
# react-ui: a code block that wraps

## Goal
Stead's Action item shows an act's arguments whole under the verb (design/07-interface.md "Item screens", Action; github.com/fcalell/stead). At 375 a URL argument is cut and scrolls sideways.

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), shots add-key, repo-390-light, repo-768-dark: Code never wraps, so the deploy key the operator must copy and paste (cut at "stead deploy key for") and git's failure text in a failed fetch's block read cut at rest on a phone.

## Approach
`Code` never wraps (`overflow-x-auto whitespace-pre` in code/index.tsx) and takes no wrap prop; arguments a decision rests on must read whole on a phone. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
