---
id: 003-13
status: review
sessions: {}
---
# ui-core: a comparison row carries its verdict

## Goal
Martechthings compares an observed data layer with the spec field by field (Expected beside Observed) and marks each failing row (missing, wrong type, differs). `ComparisonRow` has a label, cells and family chips, with no state.

## Approach
- References: Braintrust's experiment table, a failing row tinted across its width with an error icon ([screen](https://mobbin.com/screens/59703fe2-adea-407f-b6a4-4bb4748349fe)); Postman's monitor result, a PASS or FAIL word leading each assertion ([screen](https://mobbin.com/screens/17ad05ba-4835-4c81-8a18-1223ebc6cd25)).

## Acceptance criteria
- [ ] A `Comparison` row draws a failing or passing verdict on the row, read by assistive tech.

## Open questions
- [x] Tint, edge or a leading `Status`: the stack session decides.

## Shape
`FactSlots<T>.status?: (item: T) => StatusMark | undefined` on 004-10's `Comparison`: a `Status` (dot and word) in the label line after the label and its chips; on touch it sits on the label's own line. A passing fact returns `undefined` or a `done` mark. Declaring `status` adds a status bar to the waiting rows.
