# Database commands

Two paths carry a schema into a database. In dev, `stack dev` pushes `src/schema/index.ts`
straight into the local database at start and on every schema save, so a change is live with no
migration and no restart. Everywhere else (the deployed database, the test database) is built
from the committed migrations in `src/migrations/`, which `stack db generate` writes. So a
schema change is done only when its migration is generated and committed.

`push`, `generate`, the sqlite `apply` and `check` run the plugin's own `drizzle-kit`, resolved
from the plugin's install, never one from the project.

| Command | Run it when |
| --- | --- |
| `stack db generate` | The schema changed: it writes the next migration (`.sql` plus drizzle's `meta/` snapshot) from the diff, or prints that nothing changed |
| `stack db check` | Before committing a schema change; deploy runs the same checks. Page: [migration safety](./migration-safety.md) |
| `stack db push` | The local database lags the schema outside `stack dev` |
| `stack db apply` | Applying the committed migrations to the local database |
| `stack db apply --remote` | Applying them to the deployed D1 by hand; deploy does it on its own |
| `stack db seed [--remote]` | Re-running the seed. Page: [seed](./seed.md) |
| `stack db create [--name <n>]` | d1, once: creates the D1 database (named after the app's directory by default) and prints the `databaseId` to set |
| `stack db reset` | d1: the local D1 is in a state a push cannot fix. It deletes the local worker state, the D1 with it, and the next `stack dev` recreates it |

## On deploy

On the d1 dialect, `stack deploy` refuses to start when `stack db check` would fail or the
`databaseId` is not a real one, lists the committed migrations for confirmation, applies the
pending ones to the remote database, then seeds, all before the new worker goes live. It never
generates a migration: only committed `.sql` files apply.

## Rules

- Commit `src/migrations/` whole, `meta/` included: `stack db check` diffs its snapshots.
- Never edit or delete a migration that has shipped; change the schema and generate the next
  one. Before it ships, a generated migration takes added statements only (a backfill, the
  marker in [migration safety](./migration-safety.md)), never edits to its generated DDL.
- Never write a migration file by hand or run `drizzle-kit` directly: `stack db generate` writes
  it with the config the plugin builds.
- `stack db create` and `--remote` need `wrangler login`.

**Check:** `stack db check` passes.
