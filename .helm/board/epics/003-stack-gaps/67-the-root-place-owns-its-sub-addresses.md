---
id: 003-67
status: backlog
sessions: {}
---
# react-ui: the root place owns its sub-addresses

## Goal
Stead's Now is the root place, and its records live under it: /items/<id>, /jobs/<id> (design/07-interface.md "Addresses"; github.com/fcalell/stead). Below tablet an open item draws no back act to Now's list, a not-found form there loses its Back, and the Now tab is not drawn selected.

## Approach
`isCurrent` (lib/navigate.ts) makes "/" current only at exactly "/", so the Shell hands no PlaceRoute at a root place's sub-address.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
