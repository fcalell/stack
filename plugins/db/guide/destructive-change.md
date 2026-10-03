# Make a destructive change

Dropping or renaming a table, a column or a view takes two releases, so the worker that is live
during a deploy never meets a database missing a shape it uses. Work the steps in order; each
names the page it needs and ends with its check. Page for the why:
[migration safety](./migration-safety.md).

## 1. Expand

Add the new shape beside the old in `src/schema/index.ts` (for a rename, the new column,
nullable) and run `stack db generate`. Append to the `.sql` it wrote the backfill that copies
the old shape into the new:

```sql
--> statement-breakpoint
UPDATE `projects` SET `title` = `name` WHERE `title` IS NULL;
```

Keep the `--> statement-breakpoint` line above each added statement: the sqlite migrator runs
one statement per chunk.

Change the code to write both shapes and read the new one, falling back to the old. Pages:
[schema](./schema.md), [commands](./commands.md).

**Check:** `stack db check` passes and `pnpm check` passes.

## 2. Ship the expand release

Commit and deploy it.

**Check:** the deploy finished, and the live app reads the new shape.

## 3. Contract

Remove the old shape from the schema and from the code (a rename's fallback and its second
write go too), run `stack db generate`, and add `-- stack:allow-destructive` to the `.sql` it
wrote. Page: [migration safety](./migration-safety.md).

**Check:** `stack db check` passes, `pnpm check` passes, and `node --test` passes; then commit
and deploy.
