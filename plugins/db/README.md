# @fcalell/plugin-db

Database plugin for the `@fcalell/stack` framework. Wraps Drizzle ORM for Cloudflare D1 and SQLite with WeakMap-cached clients, schema helpers, and slot-driven CLI hooks for dev/deploy workflows.

## Install

```bash
pnpm add @fcalell/plugin-db
```

Feature-specific dependencies (`better-sqlite3`) are optional peer deps -- install only if you use SQLite.

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";

export default defineConfig({
  plugins: [
    db({
      dialect: "d1",
      databaseId: "9a619a0b-...",
    }),
  ],
});
```

Or for SQLite:

```ts
db({
  dialect: "sqlite",
  path: "./data/app.sqlite",
})
```

Schema is no longer passed in config options. The generated worker imports `src/schema` by convention.

### 2. Define your schema

All Drizzle ORM primitives are re-exported from `@fcalell/plugin-db/orm` -- no need to install or import `drizzle-orm` directly:

```ts
// src/schema/index.ts
import { sqliteTable, text, integer } from "@fcalell/plugin-db/orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### 3. Query at runtime

When using `@fcalell/plugin-api`, the database client is provided automatically via the runtime plugin. For standalone use:

```ts
import { createClient } from "@fcalell/plugin-db/d1";
import * as schema from "./src/schema";

const db = createClient(env.DB_MAIN, schema);
const users = await db.query.users.findMany();
```

Query operators are also available from `@fcalell/plugin-db/orm`:

```ts
import { eq, and, desc } from "@fcalell/plugin-db/orm";

await db.delete(projects).where(eq(projects.id, id));
```

For SQLite (scripts, seeds, tests):

```ts
import { createClient } from "@fcalell/plugin-db/sqlite";
import * as schema from "./src/schema";

const db = createClient("./data/app.sqlite", schema);
```

Both clients are cached (D1 via `WeakMap`, SQLite via `Map`) so it is safe to call `createClient` on every request without creating duplicate instances.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dialect` | `"d1" \| "sqlite"` | -- | Required. Database dialect. |
| `databaseId` | `string` | -- | Required for D1. |
| `path` | `string` | -- | Required for SQLite. |
| `migrations` | `string` | `"./src/migrations"` | Migrations directory. |
| `binding` | `string` | `"DB_MAIN"` | D1 binding name in `wrangler.toml` / env. |

## Commands

The plugin registers subcommands accessible via `stack db <command>`:

| Command | Description |
|---------|-------------|
| `stack db push` | Push schema to local database |
| `stack db generate` | Generate migration files from schema diff |
| `stack db apply [--remote]` | Apply pending migrations (local or remote D1) |
| `stack db status` | Show applied vs pending migrations |
| `stack db reset` | Reset local database (all data will be lost) |

## Bindings

When `dialect` is `"d1"`, the plugin auto-declares one binding:

| Binding | Type | Default name |
|---------|------|--------------|
| D1 database | `d1` | `DB_MAIN` |

Customize via the `binding` option.

## Plugin implementation

Built with `plugin` from `@fcalell/cli`. Has no owned slots; everything is a contribution to other plugins' slots or to `cliSlots.*`.

```ts
import { plugin } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { api } from "@fcalell/plugin-api";

export const db = plugin("db", {
  label: "Database",
  schema: dbOptionsSchema,
  requires: ["cloudflare", "api"],
  commands: { push: { /* ... */ }, generate: { /* ... */ }, apply: { /* ... */ }, reset: { /* ... */ } },
  dependencies: { "@fcalell/plugin-db": "workspace:*" },
  devDependencies: { "drizzle-kit": "^0.31.0", tsx: "^4.19.0" },
  gitignore: [".db-kit"],
  contributes: [
    cloudflare.slots.bindings.contribute((ctx) => {
      if (ctx.options.dialect !== "d1") return undefined;
      return { kind: "d1", binding: ctx.options.binding ?? "DB_MAIN", databaseId: ctx.options.databaseId };
    }),
    api.slots.pluginRuntimes.contribute(async (ctx) => /* dbRuntime entry */),
    cliSlots.devReadySetup.contribute((ctx) => ({ name: "db-schema-push", run: async () => { /* ... */ } })),
    cliSlots.devWatchers.contribute((ctx) => ({ name: "schema", paths: "src/schema/**", /* ... */ })),
    cliSlots.deployChecks.contribute(async (ctx) => /* pending migrations */),
    cliSlots.deploySteps.contribute((ctx) => /* applyMigrationsRemote */),
    cliSlots.initPrompts.contribute(/* dialect + databaseId/path */),
    cliSlots.initScaffolds.contribute((ctx) => ctx.scaffold("schema.ts", "src/schema/index.ts")),
    cliSlots.removeFiles.contribute(() => ["src/schema/", "src/migrations/"]),
  ],
});
```

### Slot contributions

| Target slot | Behavior |
|-------------|----------|
| `cloudflare.slots.bindings` | D1 binding (when `dialect: "d1"` and `databaseId` set) |
| `api.slots.pluginRuntimes` | `dbRuntime({ binding, schema })` runtime entry (d1 only) |
| `api.slots.workerImports` | `import * as schema from "../src/schema"` (gated on schema dir existing) |
| `cliSlots.initPrompts` | Asks for dialect, then database ID or SQLite path |
| `cliSlots.initScaffolds` | Writes `src/schema/index.ts` from `templates/schema.ts` |
| `cliSlots.devReadySetup` | Pushes schema to local DB once on start (serialized) |
| `cliSlots.devWatchers` | Re-pushes on `src/schema/**` change (300ms debounce) |
| `cliSlots.deployChecks` | Reports pending D1 migrations |
| `cliSlots.deploySteps` | `applyMigrationsRemote` in the `pre` phase |
| `cliSlots.removeFiles` | `src/schema/`, `src/migrations/` |

### Runtime

The `./runtime` export provides a `RuntimePlugin` for the worker builder chain:

```ts
import dbRuntime from "@fcalell/plugin-db/runtime";

// Takes plain options -- no config dependency
dbRuntime({ binding: "DB_MAIN", schema })
```

Returns `{ db }` to downstream plugins via the builder's context accumulation.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-db` | `db()`, `DbOptions` |
| `@fcalell/plugin-db/orm` | Drizzle table/column builders, operators, relations, aggregates |
| `@fcalell/plugin-db/d1` | `createClient()` for Cloudflare D1 |
| `@fcalell/plugin-db/sqlite` | `createClient()` for SQLite (requires `better-sqlite3`) |
| `@fcalell/plugin-db/runtime` | `dbRuntime()` -- runtime plugin factory |

## License

MIT
