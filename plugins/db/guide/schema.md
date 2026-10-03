# Schema

The app's tables are Drizzle SQLite tables exported from `src/schema/index.ts`, on both
dialects. The worker imports that file as its schema, every procedure gets a typed client over it
as `context.db`, and migrations are generated from it.

```ts
// src/schema/index.ts
import { index, integer, sqliteTable, text } from "@fcalell/plugin-db/orm";

export * from "@fcalell/plugin-auth/schema";

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("projects_organization_idx").on(t.organizationId)],
);
```

With auth installed, the file also re-exports auth's tables (`export * from
"@fcalell/plugin-auth/schema"`, plus its organization or passkey subpath when those are on), so
they are migrated with the app's own; the auth pages say which.

## Rules

- Import every Drizzle piece (tables, columns, constraints, operators, `sql`, `alias`,
  `relations`, row types such as `InferSelectModel`) from `@fcalell/plugin-db/orm`, never from
  `drizzle-orm`. A piece `/orm` lacks is a gap in stack, not a reason to import `drizzle-orm`.
- Keep every table in `src/schema/index.ts`: the worker, the migrations and the entity
  vocabulary all read that one file.
- Export one table per `export const`, and only tables, views and their relations: every value
  the file exports by name becomes an entity name.
- Give every table a primary key: the seed upserts by it.

## Export names are the entity vocabulary

Each value exported by name from `src/schema/index.ts` becomes an entity a procedure names in
`reads` and `writes`: `projects` above makes `reads: ["projects"]` type-check, and a misspelled
entity fails `pnpm check`. The vocabulary updates on `stack generate` (and at `stack dev`'s
start), not on a schema save. `export *` adds no names; auth contributes its own tables' names
itself, so `reads: ["member"]` works with no export here. Name an export for the entity it holds,
since the name is what the client's cache invalidation matches.

## Querying

Query through `context.db` in a procedure. Operators come from the same module:

```ts
import { and, desc, eq } from "@fcalell/plugin-db/orm";
import { projects } from "../../schema/index.ts";

const rows = await context.db
  .select()
  .from(projects)
  .where(and(eq(projects.organizationId, input.organizationId), eq(projects.archived, false)))
  .orderBy(desc(projects.createdAt));
```

`alias(table, "name")` gives a second reference to a table for a self-join or a correlated
subquery; its name must differ from the table's own, or the subquery silently correlates to
itself. A fragment built with `sql` is typed `SQL`.

**Check:** `stack generate`, then `pnpm check` passes.
