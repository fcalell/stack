---
id: 004-10
status: review
sessions: {}
---
# react-ui, native-ui: a Comparison declares its columns and draws its own four states

## Goal
A `Comparison` repeats one item shape, a compared fact, over data (a plan change's limits in
`showcase/layout/usage.tsx`). Its column heads come from the first row's cell labels, so before
the data it cannot know how many columns it has: its pending form is a fixed four rows of bars.
It has no failed or empty form.

## Approach
Comparison takes `columns`, the compared things' labels (`["Team", "Business"]`), declared
before the data, and `query` (with `sentence`) or `items`, plus a `row` map over a fact's slots:
`label`, `values` (one per column, in order), `chips`, each `(item) => …`. `ComparisonRow` and
`ComparisonCell` in `@fcalell/ui-core/descriptors` give way to the map; `rows` goes.

- **Pending**: the heads drawn from `columns`, over skeleton rows with a bar per declared column
  and a chips bar only if `chips` is declared.
- **Failed** (query form): the failed `EmptyState` with `sentence` and Retry.
- **Empty**: `empty`, an `EmptyState` (nothing changes).
- **Loaded**: the facts, as today.

Each item's key follows 004-02's answer. Web and phone take the same props; on the phone each label stands on its own line over the
values, as today. Needs `items` mostly (a slice of the page's query, its pending drawn by
`loading`) and a query for a comparison that loads alone.

## Acceptance criteria
- [x] (test) both plugins' `Comparison` take `columns` + `query`/`items` + `row` + `sentence` + `empty`, `rows` is gone from the roster entry, and it lists the `error` and `empty` states.
- [x] (test) a pending Comparison with three `columns` draws three bars per row.

## Progress
Built on web and phone; `pnpm check` and `pnpm verify` pass. The chips bar's width (`w-1/5`) is the implementer's choice, for the design critique. Open: the live check (web per batch, phone on the harness).
The web live criteria pass and the web design critique's findings are fixed, measured at 1440 and 375.
