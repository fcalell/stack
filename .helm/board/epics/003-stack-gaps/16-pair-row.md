---
id: 003-16
status: done
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
- [x] A `Table` picker cell kind or a pair-row component: the stack session decides.

## Shape
One new content molecule `Rules` serves 003-16, 18 and 19: aligned rows of inline terms (grid and subgrid), each with a remove `IconButton` (`X`, word `remove`), and an optional `add?: Act` at the foot. `Rule<V> = { id; terms: RuleTerms<V>; onRemove? }`; `RuleTerms` is either a pair `{ from: RuleValue<V>; to: RuleValue<V> }` (from, `ArrowRight`, to) or a condition `{ field: OptionPick<V>; operator: string; value: RuleValue<V> }`. `RuleValue<V>` is `{ pick }`, `{ picks }` (multi) or `{ either }`. Rows stand at `FIELD.fit.bar`; `Picker` gains a `bar` fit. The arrow is `ink-meta`, `ink-disabled` while a side is unset. On touch each row stacks its terms inside a Group card.

Review (accepted by fcalell): the desktop grid's template `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]` is structural, carrying no size or token value, and stays a web overlay under Rules.
