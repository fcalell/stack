---
id: 003-326
status: review
sessions: {}
---
# react-ui: a loading Section draws no count

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c5) found a loading `Section` drawing "0" in its count chip: the waiting form was a skeleton chip one figure wide around an unseen "0" (`COUNT_WAIT`, `FIGURE_WAIT`), a number nobody knows yet standing in the head. The waiting form should omit the count.

## Approach
A Section whose body waits draws no tally (`section/index.tsx`): neither the skeleton chip nor its figure. The count (the Section's own, or the body's lists' sum) arrives at the title's end, where it moves neither the title nor the head's height. `COUNT_WAIT` and `FIGURE_WAIT` go from the web Section.

## Acceptance criteria
- [x] A loading Section's head has no count text and no chip, "0" included.
- [x] Its title stands where the loaded Section's stands, at the same height.
- [ ] Native the same.

## Built
`plugins/react-ui/src/ui/components/section/index.tsx`. Story `SectionHoldsNoCountWhileWaiting` (`behaviour/waiting.stories.tsx`, a loaded and a loading Section of the same slider body): the loaded head says 12; the loading head has no "0" text (before: a `span` holding it), no chip, and its title's left, top and height equal the loaded one's. The waiting stories (38 of 38) and the Section stories pass in Chromium. `ItemHeader` keeps its own waiting count chip (not reported); `ui-core.md` says so.
Native unrendered: the phone's Section still stands the skeleton chip; its box stays open.
