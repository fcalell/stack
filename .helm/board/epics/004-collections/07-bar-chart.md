---
id: 004-07
status: review
sessions: {}
---
# react-ui, native-ui: a BarChart takes its query and draws failed and empty itself

## Goal
A `BarChart` repeats one item shape, a bar, and already declares its stack (`keys`) before the
data, so its pending form stands at the loaded size. It has no failed form and no empty form:
`series={[]}` draws an empty plot, and a failure is a boundary's around it
(`showcase/layout/usage.tsx`). Its bars are pre-projected `BarSeries`.

## Approach
BarChart takes `query` (with `sentence`) or `items`, plus a `bar` map over a bar's slots:
`label`, `value`, `parts` (by `keys`), `at`, each `(item) => …`. `keys`, `label` and `unit` stay
declared props. `series` goes.

- **Pending**: the skeleton it draws today at the loaded size, the legend's keys standing.
- **Failed** (query form): the failed `EmptyState` with `sentence` and Retry, at the chart's
  loaded height so the Section does not move.
- **Empty**: `empty`, an `EmptyState` at the same height (no requests this week).
- **Loaded**: the bars, as today.

Under a compound `QueryBoundary` (one query answering the usage page), it takes `items` and its
`loading` draws the same pending form. Each item's key follows 004-02's answer. Web and phone take the same props. Needs a query (a
chart's own metric) and `items` (a slice of a page's one query).

## Acceptance criteria
- [x] (test) both plugins' `BarChart` take `query`/`items` + `bar` + `sentence` + `empty`, `series` is gone from the roster entry, and it lists the `error` and `empty` states.
- [ ] (live) the usage page's charts draw their four states under `&query=loading|error`, and an empty week draws the empty form at the chart's height.

## Progress
Built on web and phone; `pnpm check` and `pnpm verify` pass. Each usage section reads its own query and its collection draws that query's states; a Cron runs section shows the empty week. On the phone the failed and empty forms lie over the boxes at the chart's height, so a taller EmptyState would overflow rather than grow it. Open: the live check (web per batch, phone on the harness).
