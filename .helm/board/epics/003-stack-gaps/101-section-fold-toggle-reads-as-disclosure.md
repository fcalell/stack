---
id: 003-101
status: done
sessions: {}
---
# react-ui: a folded Section's toggle reads as a disclosure, not a heading

## Goal
Stead's item screens end in a folded Section ("Provenance", "Activity"; `item-default-1440-light`, `stalled-1440-light`, `knowledge-decision-375-light`). The toggle draws at the same size and weight as an open section's title with the chevron right after the word, so it reads as another heading.

## Approach
`SECTION_TOGGLE` = `gap-inside min-h-target px-inside rounded-row` (variants.ts) wraps the same title; section/index.tsx swaps only the chevron (`ChevronDown`/`ChevronRight`). A folded section has no distinct form.

## Acceptance criteria
- [x] A folded Section's title is visibly a disclosure (meta size or weight, chevron at the start or end) apart from an open title.

## Open questions
- [x] Its shape: the existing `SECTION_NESTED_TITLE` cell, no new variant, prop or size.

## Built
A folded Section (`folded` set) names itself at `SECTION_NESTED_TITLE` (body 600) in place of the heading role, and its chevron stands before the name, so the glyph, not the text, sits at the toggle's `-ms-inside` overhang on the page inset. The toggle keeps `min-h-target`. The chevron stays in the toggle's meta ink and steps to the body ink under the pointer or the press; the title stays in the nested title's body ink. Both plugins.
Owner render: `layout/Section` Rest, a folded one beside an open one.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/section/report.md`).
