---
id: 003-305
status: backlog
sessions: {}
---
# ui-core: a Split's list sizes to its content and the main fills the rest

## Goal
Stead's Splits hold their list and pane at fixed widths whatever they hold. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "splits should probably be sized based on the content, with the last one taking the whole remaining space (what auto-auto...1fr would do for grid)".

## Approach
`list: "360px"` and `pane: "320px"` (`packages/ui-core/src/tokens.ts:1083-1084`) feed `SPLIT_LIST` and `SPLIT_PANE` (`packages/ui-core/src/variants.ts:883,885`). 003-122 (done) builds its breakpoint arithmetic on the fixed 360 px list, so this moves it too. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] The list and pane size to their content between a floor and a ceiling; the main takes the rest.
- [ ] The breakpoints 003-122 set still hold at the widths they name.

## Open questions
- [ ] Its shape (content sizing, or a list width the app names): the stack session decides.
