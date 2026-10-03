# Database config

`db()` in `stack.config.ts` picks the dialect: where the database lives in production and in
dev. Both dialects are SQLite underneath, so the schema, the queries and the migrations are the
same; only the commands that reach a remote database differ.

```ts
// stack.config.ts, a Cloudflare app
db({ dialect: "d1", databaseId: "9a619a0b-…" })

// stack.config.ts, an app on the node target
db({ dialect: "sqlite", path: "./data/app.sqlite" })
```

## Dialects

- **`d1`**: Cloudflare D1. The worker reads it through the `DB_MAIN` binding, which the plugin
  declares in the generated wrangler config. In dev, the schema is pushed into the local D1 that
  `stack dev` serves. On deploy, the committed migrations apply to the
  remote database, then the seed. `stack db create` makes the database and prints its id; a
  deploy refuses a `databaseId` that is still the placeholder or not a UUID.
- **`sqlite`**: a file opened with `better-sqlite3`, for a worker that runs under node. The
  runtime opens the file the `DB_FILE` env var names, and refuses a missing var by name; `path`
  is that var's dev default and the file `stack dev` and `stack db push` write. Nothing is remote:
  `--remote` is refused, and a deploy runs no database step.

## Options

| Option | Default | Effect |
| --- | --- | --- |
| `dialect` | required | `"d1"` or `"sqlite"` |
| `databaseId` | required for d1 | The D1 database's UUID |
| `path` | required for sqlite | The dev database file; its directory is created on push |
| `migrations` | `"./src/migrations"` | Where `stack db generate` writes migrations, and where deploy and tests read them |
| `binding` | `"DB_MAIN"` | d1: the binding name in the worker's env |
| `fileVar` | `"DB_FILE"` | sqlite: the env var holding the database file's path |

## Rules

- Never declare the D1 binding in a wrangler file by hand: the plugin declares it from these
  options.
- Never add `drizzle-kit` or `better-sqlite3` to `package.json`: the plugin depends on both and
  runs its own.
- Never bump `drizzle-orm` in `package.json` by hand: it must be the plugin's copy, or the
  schema's types and the test handle's split into two.

**Check:** `stack generate` exits cleanly, then `pnpm check` passes.
