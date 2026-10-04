---
id: 004-09
status: review
sessions: {}
---
# react-ui, native-ui: a set of meters from data draws its own four states

## Goal
A plan's limits are `Meter`s repeated over data in a Group, and their pending form is fixture
data: `(usage?.meters ?? METERS).map((meter) => <Meter {...meter} loading={!usage} />)` in
`showcase/layout/usage.tsx`. The skeleton's count and shape come from stand-in values, and the
set has no failed or empty form.

## Approach
`List`'s data form takes a `meter` map in place of `row` or `file`, over `Meter`'s slots:
`key`, `label`, `value`, `max`, `unit`, `meta`, each `(item) => …`; placed in a `Group` it draws
on the card (004-04). One List holds one item kind.

- **Pending**: `Meter`'s own waiting form per item, the meta line's bar only if `meta` is
  declared; the count follows the fixed-count rule.
- **Failed** (query form): the failed `EmptyState` with `sentence` and Retry.
- **Empty**: `empty` (no limits on this plan).
- **Loaded**: the meters.

Web and phone alike. Depends on 004-04.

## Acceptance criteria
- [x] (test) a `List` given `meter` and `row` together fails the type-check.
- [ ] (live) the usage page's meters pass data with no fixture stand-in, and draw their four states under `&query=loading|error`.

## Progress
Built on web and phone; `pnpm check` and `pnpm verify` pass. Open: the live criteria (web per batch, phone on the harness).
