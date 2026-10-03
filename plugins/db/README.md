# @fcalell/plugin-db

Database plugin for the `@fcalell/stack` framework. Wraps Drizzle ORM over Cloudflare D1 or a
SQLite file: the worker's `db` client, the `stack db` commands, the local dev push, the deploy's
migration gates and steps, and the test entry's per-boot D1.

## Install

```bash
pnpm add @fcalell/plugin-db
```

`better-sqlite3` ships with the plugin: `stack db push` and the sqlite runtime both use it.

## Guide

Configuring the dialect, writing the schema and the seed, the `stack db` commands, migration
safety and testing live in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`change-a-table.md`](./guide/change-a-table.md),
[`destructive-change.md`](./guide/destructive-change.md), [`schema.md`](./guide/schema.md),
[`seed.md`](./guide/seed.md), [`commands.md`](./guide/commands.md),
[`migration-safety.md`](./guide/migration-safety.md), [`config.md`](./guide/config.md) and
[`testing.md`](./guide/testing.md).

## Plugin implementation

Built with `plugin` from `@fcalell/cli`. Owns no slots; everything is a contribution to other
plugins' slots or to `cliSlots.*`.

```ts
import { plugin } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";

export const db = plugin("db", {
  label: "Database",
  schema: dbOptionsSchema,
  requires: ["api"],
  dependencies: { "drizzle-orm": "^0.45.2" },
  devDependencies: { "drizzle-kit": "^0.31.0", "better-sqlite3": "^13.0.0" },
  gitignore: [".db-kit"],
  guide: [/* change-a-table, destructive-change, schema, seed, … */],
  commands: { push, generate, apply, reset, create, check, seed },
  contributes: (self) => [
    cloudflare.slots.bindings.contribute(/* the D1 binding */),
    api.slots.pluginRuntimes.contribute(/* dbRuntime entry */),
    // env, worker and testing imports, testing entry, entities, dev, deploy, init, remove …
  ],
});
```

### Slot contributions

| Target slot | Behavior |
|-------------|----------|
| `cloudflare.slots.bindings` | D1 binding with its `migrationsDir` (d1, when `databaseId` is set) |
| `api.slots.env` | `{ name: fileVar, devDefault: path }` (sqlite only) |
| `api.slots.pluginRuntimes` | `dbRuntime({ binding, schema })` from `./runtime` (d1), `dbRuntime({ fileVar, schema })` from `./runtime/sqlite` (sqlite) |
| `api.slots.workerImports` | `import * as schema from "../src/schema/index.ts"` on both dialects (node, which runs the sqlite worker and the test entry's d1 worker, refuses a directory import), gated on the schema dir existing |
| `api.slots.testingEntries` | `dbTesting({ binding, migrations, compatibilityDate, schema })` from `./testing` (d1 only), the compatibility date resolved from `cloudflare.slots.compatibilityDate` |
| `api.slots.testingImports` | The same `schema` namespace import for the test entry (d1 only), gated on the schema dir existing |
| `api.slots.entities` | Sorted value-export names from `src/schema/index.ts` (both dialects); `export *` re-exports are skipped, so auth contributes its own table names |

### Lifecycle contributions

| `cliSlots` slot | Behavior |
|-----------------|----------|
| `initPrompts` | Asks for dialect, then database ID or SQLite path |
| `initScaffolds` | Writes `src/schema/index.ts` from `templates/schema.ts` |
| `devReadySetup` | Pushes the schema into the local database (sqlite's file, or the miniflare D1 `wrangler dev` reads), then seeds |
| `devWatchers` | Re-push on `src/schema/**` (both dialects); re-seed on `src/schema/seed.ts` (300ms debounce) |
| `deployChecks` | d1: a real `databaseId`, the destructive-migration gate, the drift gate, and the committed-migrations confirm |
| `deploySteps` | d1: `applyMigrationsRemote`, then the seed when `seed.ts` exists, both `pre` phase |
| `removeFiles` | `src/schema/`, `src/migrations/` |

### Runtime

`./runtime` is the D1 `RuntimePlugin` for the worker builder chain, taking plain options:
`dbRuntime({ binding: "DB_MAIN", schema })`. The sqlite runtime lives on `./runtime/sqlite` so a
Workers bundle never pulls in the native driver: `dbRuntime({ fileVar: "DB_FILE", schema })`
opens the file that env var names, once per process, and refuses a missing var by name. Both
return `{ db }` to downstream plugins through the builder's context accumulation; the clients
behind them (`./d1`, `./sqlite`) are cached per binding and per file path.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-db` | `db()`, `DbOptions` |
| `@fcalell/plugin-db/orm` | Drizzle table/column builders, table constraints, operators, `alias`, the `SQL` type, relations, aggregates, table and view introspection, row types, `defineSeed`/`seedTable` |
| `@fcalell/plugin-db/d1` | `createClient()` for Cloudflare D1 |
| `@fcalell/plugin-db/sqlite` | `createClient()` for SQLite (requires `better-sqlite3`) |
| `@fcalell/plugin-db/runtime` | `dbRuntime()`, the D1 runtime plugin factory |
| `@fcalell/plugin-db/runtime/sqlite` | `dbRuntime()`, the SQLite runtime plugin factory (node target) |
| `@fcalell/plugin-db/testing` | `dbTesting()`, the test entry's local D1 (node only; needs the `wrangler` peer) |

## License

MIT
