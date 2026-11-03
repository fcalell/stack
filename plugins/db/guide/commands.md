# Database commands

Two paths carry a schema into a database. In dev, `stack dev` pushes `src/schema/index.ts`
straight into the local database at start and on every schema save, so a change is live with no
migration and no restart. Everywhere else (the deployed database) is built
from the committed migrations in `src/migrations/`, which `stack db generate` writes. So a
schema change is done only when its migration is generated and committed.

`push`, `generate`, the sqlite `apply` and `check` run the app's `drizzle-kit` (its devDependency,
which the plugin takes as an optional peer), never one from `PATH`.

| Command | Run it when |
| --- | --- |
| `stack db generate` | The schema changed: it writes the next migration (`.sql` plus drizzle's `meta/` snapshot) from the diff, or prints that nothing changed |
| `stack db generate --custom --name <n>` | A migration the schema cannot express: a backfill, a data fix, SQL no table declares. It writes an empty `.sql` (and its `meta/` entry) for you to fill |
| `stack db check` | Before committing a schema change; deploy runs the same checks. Page: [migration safety](./migration-safety.md) |
| `stack db push` | The local database lags the schema outside `stack dev` |
| `stack db apply` | Applying the committed migrations to the local database |
| `stack db apply --remote` | Applying them to the deployed D1 by hand; deploy does it on its own |
| `stack db seed [--remote]` | Re-running the seed. Page: [seed](./seed.md) |
| `stack db create [--name <n>]` | d1, once: creates the D1 database (named after the app's directory by default) and prints the `databaseId` to set |
| `stack db reset` | d1: the local D1 is in a state a push cannot fix. It deletes the local worker state, the D1 with it, and the next `stack dev` recreates it |

## Which sqlite file

On the sqlite dialect `push`, the local `apply` and `seed` work on the file the node server would
open: the `DB_FILE` env var (`fileVar` renames it) when it is set, else `db({ path })`, relative
to the project root. `DB_FILE=./scratch.sqlite stack db apply` migrates the scratch copy and
leaves the dev database alone; each command prints the file it uses. `generate` and `check` touch
no database. `stack dev` follows the same rule, so a `DB_FILE` exported in the shell is the file
its server, its schema push and its seed all use.

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
- Never create a migration file by hand or run `drizzle-kit` directly: `stack db generate` writes
  it with the config the plugin builds. Hand-written SQL goes into the empty file `generate
  --custom` made, which `apply` and deploy run in order with the rest; put
  `--> statement-breakpoint` between statements, and fill it before applying, since an empty
  one fails. A full-text index is declared, not written: [full-text search](./fts.md).
- `stack db generate` never asks whether a column or table is a rename: one added while another
  of the same table is dropped is written as an add and a drop, never an in-place rename (the
  live worker still reads the old name). Expand first, backfill, contract later:
  [make a destructive change](./destructive-change.md). A drizzle-kit failure (a schema that
  does not load, a missing driver) fails the command with its message; "No schema changes
  detected" means the diff is empty.
- `stack db create` and `--remote` need `wrangler login`.

**Check:** `stack db check` passes.
