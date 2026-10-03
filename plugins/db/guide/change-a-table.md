# Add or change a table

A table change is the schema edit, its migration, and the check that the migration is safe to
ship. Work the steps in order; each names the page it needs and ends with its check. A change
that drops or renames anything follows [make a destructive change](./destructive-change.md)
instead.

## 1. Edit the schema

Add or change the table in `src/schema/index.ts`, with a primary key, imports from
`@fcalell/plugin-db/orm`. A new column on a table that has rows is nullable or has a default.
Under `stack dev` the local database takes the change on save. Page: [schema](./schema.md).

**Check:** `stack generate`, then `pnpm check` passes.

## 2. Generate the migration

Run `stack db generate` and read the `.sql` it wrote: it must say what you meant, and nothing
else. Page: [commands](./commands.md).

**Check:** `stack db check` passes.

## 3. Seed it, when it holds fixed rows

Add the table's rows to `src/schema/seed.ts`. Page: [seed](./seed.md).

**Check:** `stack db seed` prints `Seeded`.

## 4. Use it

Name the table in the `reads` and `writes` of the procedures that touch it, and cover them with a
test, which on d1 runs against the new migration. Page: [testing](./testing.md).

**Check:** `node --test` passes on the test file, then commit the schema, `src/migrations/` and
the code together.
