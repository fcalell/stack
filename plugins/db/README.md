# @fcalell/plugin-db

Database plugin for the `@fcalell/stack` framework. Wraps Drizzle ORM for Cloudflare D1 and SQLite with WeakMap-cached clients, schema helpers, and CLI hooks for dev/deploy workflows.

## Install

```bash
pnpm add @fcalell/plugin-db
```

Feature-specific dependencies (`better-sqlite3`) are optional peer deps -- install only if you use SQLite.

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/config";
import { db } from "@fcalell/plugin-db";
import * as schema from "./src/schema";

export default defineConfig({
  plugins: [
    db({
      dialect: "d1",
      databaseId: "9a619a0b-...",
      schema,
    }),
  ],
});
```

Or for SQLite:

```ts
db({
  dialect: "sqlite",
  path: "./data/app.sqlite",
  schema,
})
```

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
| `schema` | `TSchema \| { path, module }` | -- | Required. Schema module or `{ path, module }` for non-standard layouts. |
| `migrations` | `string` | `"./src/migrations"` | Migrations directory. |
| `binding` | `string` | `"DB_MAIN"` | D1 binding name in `wrangler.toml` / env. |

## Bindings

When `dialect` is `"d1"`, the plugin auto-declares one binding:

| Binding | Type | Default name |
|---------|------|--------------|
| D1 database | `d1` | `DB_MAIN` |

Customize via the `binding` option.

## Helper functions

```ts
import { getSchemaPath, getSchemaModule, getMigrationsPath } from "@fcalell/plugin-db";

getSchemaPath(options)      // "./src/schema" or custom path
getSchemaModule(options)    // the schema module object
getMigrationsPath(options)  // "./src/migrations" or custom path
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-db` | `db()`, `DbOptions`, `FieldConfig`, `getSchemaPath()`, `getSchemaModule()`, `getMigrationsPath()` |
| `@fcalell/plugin-db/orm` | Drizzle table/column builders, operators, relations, aggregates |
| `@fcalell/plugin-db/d1` | `createClient()` for Cloudflare D1 |
| `@fcalell/plugin-db/sqlite` | `createClient()` for SQLite (requires `better-sqlite3`) |
| `@fcalell/plugin-db/runtime` | `dbRuntime()` -- runtime plugin factory |
| `@fcalell/plugin-db/cli` | CLI plugin (detect, scaffold, dev, deploy hooks) |

## For plugin authors / maintainers

### Runtime plugin

`dbRuntime(pluginConfig)` returns a `RuntimePlugin` with:

- **`validateEnv(env)`** -- asserts the D1 binding exists in the environment
- **`context(env)`** -- reads the D1 binding from `env`, creates a WeakMap-cached Drizzle client, and provides `{ db }` to downstream plugins

### CLI plugin hooks

| Hook | Behavior |
|------|----------|
| `detect` | Checks if `"db"` is in the config's plugin list |
| `prompt` | Asks for dialect (D1/SQLite), then database ID or file path |
| `scaffold` | Writes `src/schema/index.ts` template, creates `src/migrations/`, adds deps (`@fcalell/plugin-db`, `drizzle-kit`, `tsx`), gitignores `.db-kit` |
| `bindings` | Returns a D1 binding declaration (for D1 dialect only) |
| `generate` | No standalone generated files |
| `dev` | Pushes schema to local database on start, watches `src/schema/` (300ms debounce) for changes |
| `deploy` | Generates and applies database migrations via drizzle-kit |

### Worker contribution

The plugin contributes only a runtime context provider (no routes, middleware, or handlers):

```ts
worker: {
  runtime: {
    importFrom: "@fcalell/plugin-db/runtime",
    factory: "dbRuntime",
  },
}
```

## License

MIT
