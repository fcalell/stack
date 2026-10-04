---
id: 004-09
status: backlog
sessions: {}
---
# react-ui, native-ui: a set of meters from data draws its own four states

## Goal
A plan's limits are `Meter`s repeated over data in a Group, and their pending form is fixture
data: `(usage?.meters ?? METERS).map((meter) => <Meter {...meter} loading={!usage} />)` in
`showcase/layout/usage.tsx`. The skeleton's count and shape come from stand-in values, and the
set has no failed or empty form.

## Approach
Group's data form (004-04) takes a `meter` map in place of `row`, over `Meter`'s slots:
`label`, `value`, `max`, `unit`, `meta`, each `(item) => …`. One Group holds one item kind.

- **Pending**: `Meter`'s own loading form per item, the meta line's bar only if `meta` is
  declared; the count follows the rule List's data form sets.
- **Failed** (query form): the failed `EmptyState` with `sentence` and Retry, in the Section's
  frame.
- **Empty**: `empty`, an `EmptyState` (no limits on this plan).
- **Loaded**: the meters in the card.

Web and phone take the same props. Needs a query (a plan's usage) and `items` (a slice of a
page's one query, its pending drawn by `loading`). Depends on 004-04.

## Acceptance criteria
- [ ] (test) both plugins' `Group` take `meter` as an item map, and a Group given `row` and `meter` together fails the type-check.
- [ ] (live) the usage page's meters pass data with no fixture stand-in, and draw their four states under `&query=loading|error`.
