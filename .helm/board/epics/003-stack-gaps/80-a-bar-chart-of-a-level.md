---
id: 003-80
status: done
sessions: {}
---
# react-ui: a bar chart of a level, not a sum

## Goal
Stead's card draws a brief loop's open flags per round as a BarChart (design/07-interface.md "A card"; github.com/fcalell/stead, packages/server/src/app/routes/work/-components/card.tsx). It heads itself "5 flags" (3 + 1 + 1) beside "1, down from 3", and ticks its axis at 0.8 and 1.6 for a peak of 3.

## Approach
`BarChart` always heads with the sum of its bars, and `stepOf(peak)` has no whole-number step; a count per round is a level whose sum means nothing and whose ticks are integers. Seen at stack f6563f6.

## Shape
Ticks derive with no prop: when every bar value (and part) is an integer the step is at least 1, so a peak of 3 reads 4, 3, 2, 1. The head takes one prop, `BarChart.level?: boolean`: the bars are a level, not a flow, so the head draws the last bar's value (and each key the last bar's part), never their sum; only the app knows which it is. The spoken summary takes the same figure.
The scale lifts into new ui-core `@fcalell/ui-core/chart` (`chartScale(values)`, `chartHead(series, level)`), a pure compiled module like `clock`, replacing the two copies of `stepOf`. Both platforms; head anatomy unchanged.
Roster props, `DESIGN.md`, `b-roster` and `b7` change; both rules pages and the ui-core.md BarChart bullet follow.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/data/report.md`).
