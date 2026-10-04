---
id: 004-05
status: review
sessions: {}
---
# react-ui, native-ui: a Table takes its query and reads its cells from the item

## Goal
`Table` is already declared shape (`columns` before `rows`), so its pending rows need nothing
extra and its empty form is its own (`empty`). Two gaps remain against the rule:

- **Failed is not at the leaf.** A Table has no `query`, so the members page wraps it in a
  `QueryBoundary` and passes a twin as the boundary's loading form
  (`loading={<Table columns={COLUMNS} rows={[]} loading />}` in `showcase/layout/members.tsx`);
  the failure is the boundary's, not the Table's.
- **Rows are pre-projected.** `rows` takes `TableRow`s (`{ id, href, cells, locked }`), so the
  app writes a projection per table (`members.map(rowOf)`) beside the columns that already name
  each cell.

## Approach
Table takes `query` (with `sentence`) or `items`; each column reads its cell from the item
(`cell: (item) => TableCell` on `TableColumn`, which becomes generic over the item in
`@fcalell/ui-core/descriptors`), and the row's own slots come from a `row` map: `id`, `href`,
`locked`. `rows` of built `TableRow`s goes, so a Table has one data form. `onOpen`, `onEdit`
(`id`, column key, value), `selected`, sorting and the column descriptors' other fields are
unchanged. The touch path's `List` already takes `items` and a row map in 004-02; this story
moves the grid's projection onto the columns, so both forms read the same item.

- **Pending**: the header over the skeleton rows it draws today (grid from tablet, the touch
  list's two-line-trailing rows below it). In a Section, the Section's count waits.
- **Failed** (query form): the failed `EmptyState` with `sentence` and Retry in `TABLE_EMPTY`,
  under the header on the grid, alone on touch.
- **Empty**: `empty`, as today.
- **Loaded**: as today.

Web and phone take the same props. Needs a query (a record set is the table's common source) and
`items` (rows held in local state while they edit, as the members table does). Depends on 004-02.

## Acceptance criteria
- [x] (test) both plugins' `Table` take `query`/`items` + `row` + `sentence`, `TableColumn` reads its cell by `cell`, and `rows` is gone from the roster entry.
- [x] (test) a Table whose query failed draws the failed form with Retry, which refetches.
- [ ] (live) the members page passes its query to the Table, with no `QueryBoundary` or twin around it.

## Progress
Built on web and phone; `pnpm check` and `pnpm verify` pass. The web mounts the grid and the touch List together, so the touch List stands under an empty `SectionContext` to keep the Section from counting rows twice. Open: the live check (web per batch, phone on the harness).
The web live criteria pass and the web design critique's findings are fixed, measured at 1440 and 375.
