# Pagination and slugs

Helpers a procedure handler imports: cursor and window pagination over a Drizzle query, a
selection resolved to a where clause, and slugs for a URL segment.

## Cursor pagination

A `paginated: true` procedure ([procedures](./procedures.md)) takes `input.cursor` and
`input.limit`; hand both to `paginate` with a relational query whose rows have `id` and
`createdAt` (or the order columns you name):

```ts
import { paginate } from "@fcalell/plugin-api/lib/cursor";

return paginate(db.query.projects, {
  where: eq(projects.organizationId, input.organizationId),
  orderBy: { column: projects.createdAt, direction: "desc" },
  idColumn: projects.id,
  cursor: input.cursor,
  limit: input.limit,
});
// { data: Project[], nextCursor: string | null }
```

Rows order by the order column in the direction given, then by `id` in the same direction, so a
`desc` page is the newest rows and rows sharing a moment page in a stable order by `id`. The
cursor encodes the last row's order-column values and `id`, so the next page continues past that row.
`nextCursor` is `null` on the last page.

`orderBy` takes one column or an array of them (`[{ column: tracks.title, direction: "asc" }, ...]`),
and `sort: input.sort` (the caller's, from a procedure declaring `sort`) replaces it; `id` is always
the last tiebreak. The cursor encodes the order columns' values and the id, so a keyset runs on any
column (a nullable column is not a key: order by a `notNull` one). A cursor with another
number of order columns answers `BAD_REQUEST`.

`columns` is Drizzle's relational `columns` config narrowed to exclusion: the row's keys other than
`id` and the order columns, each `false` (`columns: { body: false }`). The answer's row type omits each
key it names, and `id` and the order columns always stay because the cursor reads them. A malformed
cursor (not base64, no separator, a non-numeric time, an empty id) answers `BAD_REQUEST`, before
any query. `clampLimit(limit)` keeps a limit within 1 to
`MAX_LIMIT` (100), defaulting to `DEFAULT_LIMIT` (20).

## Window pagination

A `paginated: "window"` procedure answers a page at an offset and the filter's total, both from
the one `where`:

```ts
import { paginateWindow } from "@fcalell/plugin-api/lib/window";

return paginateWindow(db.query.tracks, {
  where: input.q ? like(tracks.title, `%${input.q}%`) : undefined,
  orderBy: { column: tracks.createdAt, direction: "desc" },
  idColumn: tracks.id,
  sort: input.sort,
  offset: input.offset,
  limit: input.limit,
  db,
});
// { data: Track[], total: number, offset: number }
```

Order follows the same rules as `paginate`. Keep the filter's columns indexed: the count scans the
matches.

## Selection over a query

A `Table` with `choose` over a window or `pages` read can hold "every row the query matches but
these". The mutation takes that as a field, `selector(query)` from `@fcalell/plugin-api/schema`
(`{ ids } | { query, except }`, the query typed as the list's filter), and resolves it:

```ts
import { selectionWhere } from "@fcalell/plugin-api/lib/selection";

const query = z.object({ q: z.string().optional() });
const where = ({ q }: z.infer<typeof query>) => (q ? like(tracks.title, `%${q}%`) : undefined);

remove: procedure({ auth: true, writes: ["tracks"] })
  .input(z.object({ tracks: selector(query) }))
  .mutation(({ input, context }) =>
    context.db.delete(tracks).where(selectionWhere(input.tracks, { id: tracks.id, where })),
  ),
```

Build the list's `where` from the same `query` function, so the selection and the table mean the
same rows. `selectedIds(db, selection, options)` returns the ids instead, for work that is not one
statement. The client passes the table's `picked` whole: `mutateAsync({ tracks: picked })`.

## Slugs

```ts
import { isReservedSlug, slugify } from "@fcalell/plugin-api/lib/slugify";

slugify("My Project");       // "my-project"
slugify("shop.example.com"); // "shop-example-com": a dot is a word boundary
isReservedSlug("admin");     // true
```

`slugify` never refuses. A procedure checks `isReservedSlug(slug)` and answers a reserved slug as
its own field error. `RESERVED_SLUGS` is `admin`, `api`, `system`, `auth`, `new`, `settings`;
`createSlugify(reserved)` returns `{ slugify, isReserved }` over your own list. An organization's
slug is refused on the server by auth: these words, plus every top-level route of the app.

**Check:** `pnpm check` passes, and a list call pages past the first `nextCursor`.
