---
id: 003-103
status: backlog
sessions: {}
---
# react-ui: a blocked Button's label reads, and a full-width blocked act is not a grey placeholder

## Goal
A blocked/disabled Button's label sits at ~2:1 against its grey `fill-disabled` fill, and on touch a full-width blocked act reads as a grey placeholder bar ("Accept the pages", `knowledge-decision-375-light`; `item-stopped-answer-375-light`). Stead: `app/ui/item-screen.tsx`.

## Approach
`BUTTON` primary (variant-tables.ts) takes `ink-disabled` on a 0.06-alpha veil; the label is not held at a contrast. A blocked act also carries its reason beside it elsewhere, but here the bar is the only signal.

## Acceptance criteria
- [ ] A blocked Button's label holds a legible contrast (stack decides the floor) in light and dark.
- [ ] A blocked full-width act on touch keeps its shape as an act (outline or hairline), not a bare grey slab.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
