---
id: 003-16
status: backlog
sessions: {}
---
# ui-core: a pair row maps a source to a target

## Goal
A Martechthings mapping's parameters are rows of a source (a field or a constant), an arrow, and a destination variable, with remove, aligned in columns across rows; an unpaired row shows both placeholders with the arrow faded. `Table` edits cells but has no picker cell or arrow lane; `Columns` scrolls board columns sideways.

## Approach
- Reference: Attio's import column mapper, source, →, a target select with its path and ×, ≈ 42 px rows ([screen](https://mobbin.com/screens/c1100b84-0dd6-4bee-9bc9-05a8a2ea3fec)).

## Acceptance criteria
- [ ] Rows of source picker, arrow, target picker and remove, aligned across rows, with an empty row's placeholders.

## Open questions
- [ ] A `Table` picker cell kind or a pair-row component: the stack session decides.
