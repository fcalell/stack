---
id: 003-80
status: backlog
sessions: {}
---
# react-ui: a bar chart of a level, not a sum

## Goal
Stead's card draws a brief loop's open flags per round as a BarChart (design/07-interface.md "A card"; github.com/fcalell/stead, packages/server/src/app/routes/work/-components/card.tsx). It heads itself "5 flags" (3 + 1 + 1) beside "1, down from 3", and ticks its axis at 0.8 and 1.6 for a peak of 3.

## Approach
`BarChart` always heads with the sum of its bars, and `stepOf(peak)` has no whole-number step; a count per round is a level whose sum means nothing and whose ticks are integers. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
