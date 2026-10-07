---
id: 003-149
status: backlog
sessions: {}
---
# react-ui: a ListRow that opens carries a trailing chevron like a DefinitionRow does

## Goal
Stead's job view lists its stages in a `List` of `ListRow`s with `href`; a finished or running stage opens its output (design/07-interface.md "The job view", "A stage's output"; `ui/job-view.tsx`). The rows show no mark that they open, only a hover fill (shot `i-hover-row-1440-light`), while the card's Stage `DefinitionRow` that opens the same job view ends in a chevron. Touch has no hover, so the row reads as a static fact. Evidence: card critique unit u7 (Stead scratchpad `critique/u7/shots/i1440/`, Stead `c9c9e5a`, stack `5564217`).

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), shot list-hover (1440): the repo list's rows open (`href`) and show no trailing chevron, while design/07-interface.md draws one on each repo row and the repo screen's own DefinitionRows carry one.

## Approach
`DefinitionRow` draws `<Icon name="ChevronRight" />` for a row that opens (definition-row/index.tsx:144). `ListRow` draws a chevron only as a tree's fold act (list-row/index.tsx:220); a row with `href` or `onOpen` gets a hit area and a wash (`PRESS`) and no trailing mark, and a `trailing` value ("pass 1 · 18 min") ends the row with no room for one. The same rows differ by part alone. Reference: state-rail.md, Deel's stages each opening their detail; Vercel's build steps.

## Acceptance criteria
- [ ] A `ListRow` that opens (href or onOpen) ends in a muted trailing chevron after its `trailing` value, the same mark `DefinitionRow` draws, in a Group and in a list.
- [ ] A row that does not open draws none.
- [ ] The ListRow showcase holds an opening row beside a static one.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether every opening row draws it or a prop asks.
