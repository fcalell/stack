---
id: 003-15
status: review
sessions: {}
---
# ui-core: a cell draws a value before and after

## Goal
Martechthings' change set diff shows each changed attribute as Current → New in the collapsed row. `Comparison` sets facts in columns and serves the unfolded row, not one cell.

## Approach
- References: Jira's "Current (Jira) → New" column ([screen](https://mobbin.com/screens/29e2f1b6-8fb3-434a-9714-1a21e2440393)); Railway's Old and New Value cells tinted by the change ([screen](https://mobbin.com/screens/131e5390-18b7-4eb6-9715-bb5d9497c7fb)).

## Acceptance criteria
- [ ] A `Table` cell draws an old value, an arrow and the new value, the new value tinted by the change, and reads as "from X to Y".

## Shape
A `TableColumn` kind `"change"` with cell `{ before: string | null; after: string | null }`, read-only, sorting by `after`, read aloud by the slot word `changed` ("from {before} to {after}"), or the existing `added`/`removed`. One hue mapping with 003-07: a changed value draws `before` in `ink-meta`, an `ArrowRight` at `icon-meta`, and `after` in `ink-body` with no tint; an added value (`before: null`) draws `after` on `ok-soft`; a removed value (`after: null`) draws `before` struck on `danger-soft`. The touch form spells it as a meta part "X → Y".
