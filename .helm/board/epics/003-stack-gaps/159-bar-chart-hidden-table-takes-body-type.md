---
id: 003-159
status: done
sessions: {}
---
# react-ui: a bar chart's visually hidden data table takes the body type

## Goal
Stead's card Trend chart (`routes/work/-components/card.tsx`, the stalled item at 390): a type census over every text node counts the BarChart's `sr-only` data table at the browser's default type, 16/400 on CAPTION and TD and 16/700 on TH, outside the token set (title, heading, body, meta, caption) every visible node is in. The visible sizes are five; the hidden table adds a sixth style and a bold weight no token carries.

## Approach
`bar-chart/index.tsx` sets `TABLE = "sr-only"` and renders a bare `<table>` with `<caption>`, `<th scope>` and `<td>`, none with a type class, so the user-agent sheet's 16px and bold TH apply. Hidden text is read by assistive tech and by a style audit alike; setting the table's type to the body variant keeps the census to the tokens. Seen at stack f6563f6 in critique unit u3 (item screens), report-3.

## Acceptance criteria
- [ ] The hidden table's caption, headers and cells take the body type token, in every density.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.

## Ruled
Satisfied at stack `e289e52c`: screen readers are not a target, so `BarChart` draws no visually hidden table (no `sr-only`, `<table>`, `<caption>`, `<th>` or `<td>`); the plot is `role="img"` with its label. The census sees only the token sizes once Stead takes that stack.
