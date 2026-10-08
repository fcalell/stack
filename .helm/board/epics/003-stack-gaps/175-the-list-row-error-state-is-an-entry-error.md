---
id: 003-175
status: review
sessions: {}
---
# react-ui: the ListRow error story draws a row that differs from rest

## Goal
`shared-listrow--error` drew its first row identical to `rest` (a Failed dot and a "Rolled back" chip, both already in the rest story), so the declared `error` state was invisible (critique `rows/report.md`, pre-existing).

## Approach
A row's `error` state is its entry's error line (`FIELD.state.error`, `FIELD_ERROR_LINE`, `ink-error`, `edge-error`); a failed status is rest content. Every cell of the `error` state draws the entry rows that carry an error line.

## Acceptance criteria
- [x] Every `error` cell of the ListRow draws a row whose entry shows its error line and its error border.
- [x] A part no longer carries a `failing` filter: the frame has one error draw.

## Built
`plugins/react-ui/src/ui/showcase/frames/list-row.tsx`: `drawListRow` draws the `SOURCES` rows with an `error` in the `error` state, and `part()` lost its `failing` argument and field with the five filters that fed it. Evidence: `shared/ListRow` Error story in the browser run.
