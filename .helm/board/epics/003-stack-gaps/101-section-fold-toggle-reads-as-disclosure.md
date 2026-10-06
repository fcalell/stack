---
id: 003-101
status: backlog
sessions: {}
---
# react-ui: a folded Section's toggle reads as a disclosure, not a heading

## Goal
Stead's item screens end in a folded Section ("Provenance", "Activity"; `item-default-1440-light`, `stalled-1440-light`, `knowledge-decision-375-light`). The toggle draws at the same size and weight as an open section's title with the chevron right after the word, so it reads as another heading.

## Approach
`SECTION_TOGGLE` = `gap-inside min-h-target px-inside rounded-row` (variants.ts) wraps the same title; section/index.tsx swaps only the chevron (`ChevronDown`/`ChevronRight`). A folded section has no distinct form.

## Acceptance criteria
- [ ] A folded Section's title is visibly a disclosure (meta size or weight, chevron at the start or end) apart from an open title.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
