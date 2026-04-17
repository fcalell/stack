# @fcalell/plugin-db

Database plugin for the `@fcalell/stack` framework. Wraps Drizzle ORM for Cloudflare D1 and SQLite with WeakMap-cached clients, schema helpers, and event-driven CLI hooks for dev/deploy workflows.

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

Built with `createPlugin` from `@fcalell/cli`:

```ts
import { createPlugin } from "@fcalell/cli";
import { Init, Generate, Remove, Dev, Deploy } from "@fcalell/cli/events";

export const db = createPlugin("db", {
  label: "Database",
  events: ["SchemaReady"],
  commands: { push: { ... }, generate: { ... }, apply: { ... }, status: { ... }, reset: { ... } },
  config(options) { ... },
  register(ctx, bus, events) {
    bus.on(Init.Scaffold, (p) => { ... });
    bus.on(Generate, (p) => { ... });
    bus.on(Remove, (p) => { ... });
    bus.on(Dev.Ready, (p) => { ... });
    bus.on(Deploy.Plan, (p) => { ... });
  },
});
```

### Event handlers

| Event | Behavior |
|-------|----------|
| `Init.Prompt` | Asks for dialect (D1/SQLite), then database ID or file path |
| `Init.Scaffold` | Writes `src/schema/index.ts` template, creates `src/migrations/`, adds deps, gitignores `.db-kit` |
| `Generate` | Pushes D1 binding declaration onto the payload |
| `Remove` | Declares `src/schema/`, `src/migrations/`, and package deps for cleanup |
| `Dev.Ready` | Pushes schema to local database on start, watches `src/schema/` for changes (300ms debounce) |
| `Deploy.Plan` | Generates and registers pending migration checks for remote D1 |

### Events emitted

| Event | When |
|-------|------|
| `db.events.SchemaReady` | After schema push completes (startup or watch trigger) |

Other plugins (e.g. `auth`) depend on `db.events.SchemaReady` via `depends: [db.events.SchemaReady]`.

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
