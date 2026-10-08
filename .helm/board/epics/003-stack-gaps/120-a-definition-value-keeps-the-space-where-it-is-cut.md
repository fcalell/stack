---
id: 003-120
status: done
sessions: {}
---
# react-ui: a DefinitionRow value keeps its word space where the stem and the tail meet

## Goal
Stead's item screens end DefinitionRow and Decision values that read "Keep thenote", "2 secondsago", "This machine" as "This mac|hine" and "No" as "N|o": the value's two parts meet with no space between them, so words run together on screen (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx` decision section and facts rows; design/07-interface.md "Items"). Evidence: item screens critique unit u3, shot `decided-1280-light` and DOM dump `outE.txt` (Stead scratchpad `critique/u3/`, stack at `5564217`); a value also reaches assistive tech and copy as two text nodes.

Re-measured by the item screens critique at Stead `54deb15` (unit u3, shots `bot-brief-390-dark`, `i-decided-390-dark`): Brief's "Expected spend" value "No history yet" draws "No historyyet" at 390 and 768, and every decided item's Decision row "1 minute ago" draws "1 minuteago" at 390. DOM: `<span class="min-w-0 truncate">No history</span><span class="shrink-0"> yet</span>`, the tail's leading space collapsing in the flex item.

Evidence, card critique unit u7 (Stead `c9c9e5a`, shots `y/job-sort-1440-light`, `i-details-sheet-1440-light`): "No outside host" on the job view's Reaches row draws "No outsidehost" (spans `truncate` "No outside " and shrink-0 "host"); in the 333 px pane "the working tree, the branc… raft" and "the knowle...hain" cut mid-word with a stray tail.

Evidence, System critique unit u8 (Stead `948b7ec`, shots `usage-1440-light`, Status): plain DefinitionRow values draw "7.4 GBleft" (`status.tsx:59`), "Neverheld" and "Notheld" (`usage.tsx:284`, `290`); DOM `<span class="truncate">7.4 GB </span><span class="shrink-0">left</span>`, so the stem's trailing space is lost.

## Approach
`DefinitionRow` draws a string value as `<span STEM>` (`min-w-0 truncate`, which is `white-space: nowrap; overflow: hidden`) and `<span TAIL>` (`shrink-0`), cut by `valueCut` (ui-core/src/list-state.ts) at the last `VALUE_TAIL` characters, at most half the value. The cut falls anywhere, a space included, and a space that ends the stem's line is removed by the nowrap box, so "Keep the " + "note" draws "Keep thenote". The same cut splits a word in two nodes ("N|o") for a value of two characters. Not 003-100 (end alignment of values in a Group). Seen at stack `5564217`.

## Acceptance criteria
- [x] A value short enough to fit draws as one text run with every space it has, whatever `valueCut` returns, and its text is one node.
- [x] A value cut for a narrow row keeps the space at its cut, or does not cut at a space.
- [x] The DefinitionRow showcase holds a multi-word value ending at a space-adjacent cut.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether the stem keeps its trailing space (`white-space: pre`), the cut moves off a space, or a value that fits is not cut.

## Built
`valueCut` (ui-core/src/list-state.ts) cuts only a value of one word longer than eight characters (twice the four-character tail); a value with a space, or eight characters or fewer, is one stem with no tail, so no space ends a node and no word is split in two. Both DefinitionRows draw the tail only when it exists, so a value of words is one text node that truncates at its end. `ui-core/test/list-state.test.ts` pins the cut; `apps/showcase/behaviour/definition-row.stories.tsx` (`ValueWords`, desktop and touch) asserts "No history yet", "7.4 GB left", "This machine" and "No" are one node and whole, a long sentence truncates at its end and an identifier keeps `k3Qz`. The General frame holds "No history yet".

## Critique
Ship, by a fresh critic at 1280, 768, 1440 and 390, light and dark (scratchpad `critique/fields/report.md`).
