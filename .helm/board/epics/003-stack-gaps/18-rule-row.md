---
id: 003-18
status: backlog
sessions: {}
---
# ui-core: a rule row

## Goal
A Martechthings mapping's conditions are one compact row each: kind, fixed operator text, a value as a picker or removable chips, and remove ("Page type in [checkout] [cart]"). The roster has `Select`, `Picker` and `Chip` but no row composing them inline; `Toolbar` chips show applied filters and edit none.

## Approach
- References: Attio's workflow filter, field path · operator · value · menu in one ≈ 26 px row ([screen](https://mobbin.com/screens/18b15d0c-4871-479a-a174-1f1291b5bae2)); the Notion filter rule popover on the filters-and-toolbars page.

## Acceptance criteria
- [ ] One row of kind, operator words, a value picker or chips, and remove, 26 to 32 px tall.

## Shape
Built inside 003-16's `Rules` as its condition row `{ field, operator, value }`: the operator in `ink-meta`, a chips value `{ picks: MultiPick<V> }` drawn as a bar-fit field holding one removable `Chip` per value. `Picker` gains a multiple mode (ticked rows, stays open while picking), taken when its value is an array, never a second component.
