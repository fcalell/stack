# Pagination and slugs

Two helpers a procedure handler imports: cursor pagination over a Drizzle query, and slugs for a
URL segment.

## Cursor pagination

A `paginated: true` procedure ([procedures](./procedures.md)) takes `input.cursor` and
`input.limit`; hand both to `paginate` with a relational query whose rows have `id` and
`createdAt`:

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
cursor encodes the last row's `createdAt` and `id`, so the next page continues past that row.
`nextCursor` is `null` on the last page. `clampLimit(limit)` keeps a limit within 1 to
`MAX_LIMIT` (100), defaulting to `DEFAULT_LIMIT` (20).

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

**Check:** `pnpm check` passes, and a test pages past the first `nextCursor`.
