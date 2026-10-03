# Migration safety

`stack db check` refuses two things, and `stack deploy` on d1 refuses the same two before it
touches the cloud:

- **Drift**: `src/schema/index.ts` differs from what the committed migrations build. The fix is
  `stack db generate`, then commit the migration.
- **An unacknowledged drop**: the newest migration drops a table, a column or a view. A rename
  counts: the old name is gone. The check reads only the newest migration, so run it after every
  `stack db generate`.

A drop is refused because a deploy is not atomic. The migrations apply before the new worker goes
live, so for a while the old worker runs against the new database and still reads and writes the
dropped shape; its requests fail until the rollout finishes.

## Expand and contract

A destructive change ships in two releases. The expand release only adds: the new shape beside
the old, a backfill, code that writes both and reads the new. The contract release, once the
expand one is live, drops the old shape, which no running code reads any more. The old worker
never meets a database missing a shape it uses. The steps are
[make a destructive change](./destructive-change.md).

## The marker

A migration whose drop is intentional and safe carries this line anywhere in its `.sql`:

```sql
-- stack:allow-destructive
```

Add it only when no running code reads the dropped shape: the contract step, or a table no
release ever used. Never add it to make the check pass on a drop the expand step has not made
safe.

**Check:** `stack db check` passes.
