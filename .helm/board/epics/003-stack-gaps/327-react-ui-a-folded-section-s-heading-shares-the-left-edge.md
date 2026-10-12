---
id: 003-327
status: review
sessions: {}
---
# react-ui: a folded Section's heading shares the left edge

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c3, "Rules: folded Section headings indent 14px vs unfolded ones") found a foldable Section's heading standing right of an unfolded Section's: the toggle put its chevron before the title, so the title started a chevron and a gap in from the page edge the other headings start at.

## Approach
The chevron stands after the title and its count, inside the same toggle, so the title is the toggle's first thing: the toggle keeps its outdent (`-ms-inside` against its own `px-inside`), the title lands on the page edge and the whole row, chevron included, is still the hit and the wash.

## Acceptance criteria
- [x] The headings of a plain, a folded, an opened and a counted foldable Section share one left edge (to half a pixel).
- [x] The chevron stands after the title, inside the toggle, which still folds and unfolds.
- [ ] Native the same.

## Built
`plugins/react-ui/src/ui/components/section/index.tsx` (the order of the toggle's children). Story `HeadingsShareOneLeftEdge` (`behaviour/section-fold.stories.tsx`): before, the folded heading stood 22 px right of the plain one's; after, 0. Section, waiting and `stories/Section` stories 47 of 47 in Chromium. `ui-core.md` records it.
Native unrendered: the phone's Section keeps its leading chevron (the shared `SECTION_TOGGLE` cell is untouched); its box stays open.
