# @fcalell/db

Drizzle ORM toolkit for Cloudflare D1 and SQLite. Ships a unified CLI for schema management, type-safe client factories, and an optional Better Auth integration — all driven by a single config file.

## Install

```bash
pnpm add @fcalell/db
```

`drizzle-kit` and `tsx` are required peer dependencies and are auto-installed by pnpm. Feature-specific dependencies (`better-auth`, `@better-auth/cli`, `better-sqlite3`) are installed automatically by `db-kit` when your config requires them.

## Quick start

### 1. Scaffold with `db-kit init`

```bash
db-kit init
```

Interactive — asks for dialect (D1/SQLite), auth, and organizations. Creates `db.config.ts`, `src/schema/index.ts`, `src/migrations/`, and adds `.db-kit` to `.gitignore`.

### 2. Define your schema

All Drizzle ORM primitives are re-exported from `@fcalell/db/orm` — no need to install or import `drizzle-orm` directly:

```ts
import { sqliteTable, text, integer, relations } from "@fcalell/db/orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: text("organization_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### 3. Define your config

```ts
import { defineDatabase } from "@fcalell/db";
import * as schema from "./src/schema";

export default defineDatabase({
  dialect: "d1",
  schema,
  databaseId: "9a619a0b-...",
});
```

`schema` accepts a module object directly. The CLI resolves the file path by convention (`./src/schema`). Migrations default to `./src/migrations`.

For non-standard layouts, use the escape hatch: `schema: { path: "./custom/path", module: schema }`.

Or for a plain SQLite project:

```ts
export default defineDatabase({
  dialect: "sqlite",
  schema,
  path: "./data/app.sqlite",
});
```

### 4. Run the CLI

```bash
# Local development — push schema + watch for changes
db-kit dev

# With Drizzle Studio
db-kit dev --studio

# Production — generate migrations + apply
db-kit deploy

# Drop + recreate local database
db-kit reset
```

### 5. Query at runtime

When using `@fcalell/api`, the database client is created automatically by `defineApp`. For standalone use:

```ts
import { createClient } from "@fcalell/db/d1";
import * as schema from "./schema";

const db = createClient(env.DB_MAIN, schema);
const users = await db.query.users.findMany();
```

Query operators are also available from `@fcalell/db/orm`:

```ts
import { eq, and, desc } from "@fcalell/db/orm";

await db.delete(projects).where(eq(projects.id, id));
await db.select().from(projects).where(and(eq(projects.orgId, orgId))).orderBy(desc(projects.createdAt));
```

## CLI: `db-kit`

A single `db.config.ts` drives all database tooling. No manual Drizzle configs needed — the CLI generates them internally in a `.db-kit/` directory (auto-added to `.gitignore`).

### Commands

| Command | What it does |
|---------|-------------|
| `db-kit init` | Interactive scaffold — config, schema, migrations, .gitignore |
| `db-kit dev` | Push schema to local DB, watch for changes |
| `db-kit dev --studio` | Same, plus launch Drizzle Studio |
| `db-kit deploy` | Generate migrations, then apply them |
| `db-kit reset` | Drop + recreate local database from schema |

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--studio` | `false` | Launch Drizzle Studio alongside dev |
| `--config <path>` | `db.config.ts` | Path to config file |

### How it works

- **`init`** interactively scaffolds `db.config.ts`, `src/schema/index.ts`, `src/migrations/`, and adds `.db-kit` to `.gitignore`. Asks for dialect, auth, and organization options.
- **`dev`** runs `drizzle-kit push` against your local database (SQLite file or Wrangler's local D1), then watches your schema directory for `.ts` changes with a 300ms debounce. The `.wrangler` state directory is auto-discovered from sibling/parent directories.
- **`deploy`** runs `drizzle-kit generate` to create migration files, then `drizzle-kit migrate` to apply them. For D1, it connects via HTTP using `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_TOKEN` environment variables.
- **`reset`** deletes the local database file and re-pushes the schema. Useful during development.

## Runtime clients

### D1 (Cloudflare Workers)

```ts
import { createClient } from "@fcalell/db/d1";
import * as schema from "./schema";

const db = createClient(env.DB_MAIN, schema);
```

Returns a Drizzle ORM client. Instances are cached per D1 binding via `WeakMap`, making it safe to call on every request in Cloudflare Workers without creating duplicate clients.

### SQLite (Node.js)

```ts
import { createClient } from "@fcalell/db/sqlite";
import * as schema from "./schema";

const db = createClient("./data/app.sqlite", schema);
```

Creates a Drizzle client backed by `better-sqlite3`. Useful for scripts, seeds, and tests.

## Auth integration

Optional [Better Auth](https://www.better-auth.com/) integration. `defineAuth()` defines the **policy** — the schema-time configuration that drives auth table generation. Runtime concerns (secrets, callbacks) are handled by `@fcalell/api`'s `defineApp()`.

### defineAuth

```ts
import { defineAuth } from "@fcalell/db/auth";
import { createAccessControl } from "@fcalell/db/auth/access";

const ac = createAccessControl({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "read", "update", "delete"],
});

const auth = defineAuth({
  cookies: { prefix: "myapp", domain: ".example.com" },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    additionalFields: {
      activeProjectId: { type: "string" },
    },
  },
  user: {
    additionalFields: {
      timezone: { type: "string" },
    },
  },
  organization: { ac, roles: { owner: ac.newRole({ ... }) } },
});

export default defineDatabase({
  dialect: "d1",
  schema,
  databaseId: "9a619a0b-...",
  auth,
});
```

Runtime secrets (`AUTH_SECRET`) and callbacks (`sendOTP`, `sendInvitation`) are provided in `defineApp()` — see `@fcalell/api` docs.

### Defaults

| Setting | Where | Default |
|---------|-------|---------|
| Database adapter | — | SQLite/Drizzle with `usePlural: true` |
| Session expiry | policy | 7 days |
| Session refresh | policy | 24 hours |
| OTP length | — | 6 digits |
| OTP expiry | — | 5 minutes |
| Invitation expiry | — | 48 hours |
| Secure cookies | — | Enabled when `baseURL` is HTTPS |

## Type utilities

Derive user/session types from your config for use in shared types or frontend code:

```ts
import type { InferUser, InferSession } from "@fcalell/db/auth/infer";
import type dbConfig from "./db.config";

type User = InferUser<typeof dbConfig>;
type Session = InferSession<typeof dbConfig>;
```

`InferUser` starts from the Better Auth base user (`id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`) and adds any `additionalFields` from `auth.user`. `InferSession` does the same for sessions, and includes `activeOrganizationId` when the organization plugin is configured.

## Access control

Define permissions and roles without installing Better Auth. The access control module is standalone.

```ts
import { createAccessControl, defaultOrgRoles } from "@fcalell/db/auth/access";

const ac = createAccessControl({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "read", "update", "delete"],
});
```

`ac.statements` is auto-derived by `defineApp` for RBAC autocomplete in the procedure builder.

## Config reference

### D1

```ts
defineDatabase({
  dialect: "d1",
  schema: Record<string, unknown>,   // Schema module (or { path, module } escape hatch)
  databaseId: string,                 // Cloudflare D1 database ID
  migrations?: string,                // Migration output directory (default: ./src/migrations)
  studioPort?: number,                // Drizzle Studio port (default: 4983)
  auth?: AuthPolicy,                  // From defineAuth()
});
```

### SQLite

```ts
defineDatabase({
  dialect: "sqlite",
  schema: Record<string, unknown>,
  path: string,                       // Path to SQLite database file
  migrations?: string,
  studioPort?: number,
  auth?: AuthPolicy,
});
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/db` | `defineDatabase()`, `getSchemaPath()`, `getSchemaModule()`, `getMigrationsPath()` |
| `@fcalell/db/orm` | Drizzle table/column builders, operators, relations, aggregates |
| `@fcalell/db/d1` | `createClient()` for Cloudflare D1 |
| `@fcalell/db/sqlite` | `createClient()` for SQLite |
| `@fcalell/db/auth` | `defineAuth()` — auth policy configuration |
| `@fcalell/db/auth/factory` | `createAuth()` — internal Better Auth factory |
| `@fcalell/db/auth/access` | `createAccessControl()`, `getStatements()`, `role()`, `defaultOrgRoles` |
| `@fcalell/db/auth/infer` | `InferUser<T>`, `InferSession<T>` — type utilities derived from config |

## License

MIT
