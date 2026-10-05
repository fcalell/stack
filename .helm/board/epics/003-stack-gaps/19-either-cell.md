---
id: 003-19
status: done
sessions: {}
---
# ui-core: a cell holds a picked option or a typed value

## Goal
A Martechthings mapping parameter's source is a field by default, or a typed constant: the cell holds either, marked as which, with a way back. `Picker`'s `act` can switch to an `Input`, but no part holds either with its marker.

## Approach
- References: Attio's input box with "Use variable" under the value ([screen](https://mobbin.com/screens/011b0bc8-2ab9-4722-bef0-b598870d2811)); Jira's Value / Field tabs above a condition's value ([screen](https://mobbin.com/screens/46e3b5f1-1939-4aae-baa2-fb6c2d09aa1e)).

## Acceptance criteria
- [ ] A cell holds a picked option or a typed value, marks which, and switches back.

## Shape
Built inside 003-16's `Rules` as the `either` value: `EitherValue<V> = { picked: V } | { typed: string }`. Picked, a bar-fit `Picker` whose list ends with the act `typeValue`; typed, a bar-fit `Input` whose trailing icon act (word `pickValue`) switches back. A picked value leads with its option's icon (`Braces` when it has none); a typed value has no glyph.
