---
id: 003-120
status: backlog
sessions: {}
---
# react-ui: a DefinitionRow value keeps its word space where the stem and the tail meet

## Goal
Stead's item screens end DefinitionRow and Decision values that read "Keep thenote", "2 secondsago", "This machine" as "This mac|hine" and "No" as "N|o": the value's two parts meet with no space between them, so words run together on screen (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx` decision section and facts rows; design/07-interface.md "Items"). Evidence: item screens critique unit u3, shot `decided-1280-light` and DOM dump `outE.txt` (Stead scratchpad `critique/u3/`, stack at `5564217`); a value also reaches assistive tech and copy as two text nodes.

## Approach
`DefinitionRow` draws a string value as `<span STEM>` (`min-w-0 truncate`, which is `white-space: nowrap; overflow: hidden`) and `<span TAIL>` (`shrink-0`), cut by `valueCut` (ui-core/src/list-state.ts) at the last `VALUE_TAIL` characters, at most half the value. The cut falls anywhere, a space included, and a space that ends the stem's line is removed by the nowrap box, so "Keep the " + "note" draws "Keep thenote". The same cut splits a word in two nodes ("N|o") for a value of two characters. Not 003-100 (end alignment of values in a Group). Seen at stack `5564217`.

## Acceptance criteria
- [ ] A value short enough to fit draws as one text run with every space it has, whatever `valueCut` returns, and its text is one node.
- [ ] A value cut for a narrow row keeps the space at its cut, or does not cut at a space.
- [ ] The DefinitionRow showcase holds a multi-word value ending at a space-adjacent cut.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the stem keeps its trailing space (`white-space: pre`), the cut moves off a space, or a value that fits is not cut.
