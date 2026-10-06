---
id: 003-105
status: backlog
sessions: {}
---
# react-ui: a focused TextArea draws one ring

## Goal
A focused TextArea draws a 2 px outline offset 2 px outside a still-visible 1 px border, which reads as a double ring (Stead's knowledge page editor, `page-edit-375-light`).

## Approach
text-area/index.tsx puts `has-focus-visible:outline-2 outline-offset-2 outline-ring` on the wrapper while `TEXT_AREA` keeps `border-edge`; the other fields' focus is the same ring over their border, so check them together.

## Acceptance criteria
- [ ] A focused TextArea shows one ring: the border takes the ring's colour, or the ring replaces the border.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
