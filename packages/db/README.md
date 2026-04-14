# @fcalell/db

Drizzle ORM toolkit for Cloudflare D1 and SQLite. Type-safe client factories and an optional Better Auth integration — all driven by `stack.config.ts`. Database tooling (dev, deploy, reset) is provided by the `stack` CLI (`@fcalell/cli`).

## Install

```bash
pnpm add @fcalell/db
```

Feature-specific dependencies (`better-auth`, `better-sqlite3`) are optional peer deps — install only if you use auth or SQLite.

## Quick start

### 1. Scaffold with `stack`

```bash
stack init        # interactive — select Database layer
# or
stack add db      # add database to an existing project
```

Creates `stack.config.ts`, `src/schema/index.ts`, `src/migrations/`, and adds `.db-kit` to `.gitignore`.

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
// stack.config.ts
import { defineConfig } from "@fcalell/config";
import * as schema from "./src/schema";

export default defineConfig({
  db: {
    dialect: "d1",
    databaseId: "9a619a0b-...",
    schema,
  },
});
```

`schema` accepts a module object directly. The CLI resolves the file path by convention (`./src/schema`). Migrations default to `./src/migrations`.

For non-standard layouts, use the escape hatch: `schema: { path: "./custom/path", module: schema }`.

Or for a plain SQLite project:

```ts
export default defineConfig({
  db: {
    dialect: "sqlite",
    path: "./data/app.sqlite",
    schema,
  },
});
```

### 4. Run the CLI

```bash
# Local development — push schema + watch for changes
stack dev

# With Drizzle Studio
stack dev --studio

# Production — generate migrations + apply
stack deploy

# Drop + recreate local database
stack db reset
```

See `@fcalell/cli` docs for the full CLI reference.

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

Optional [Better Auth](https://www.better-auth.com/) integration. Auth is configured as a section in `stack.config.ts` — the schema-time configuration that drives auth table generation. Runtime concerns (secrets, callbacks) are handled by `@fcalell/api`'s `defineApp()`.

### Auth config

```ts
import { defineConfig } from "@fcalell/config";
import { createAccessControl } from "@fcalell/db/auth/access";
import * as schema from "./src/schema";

const ac = createAccessControl({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "read", "update", "delete"],
});

export default defineConfig({
  db: {
    dialect: "d1",
    databaseId: "9a619a0b-...",
    schema,
  },
  auth: {
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
  },
});
```

Runtime secrets (`AUTH_SECRET`) and callbacks (`sendOTP`, `sendInvitation`) are provided in `defineApp()` — see `@fcalell/api` docs.

### Defaults

| Setting | Default |
|---------|---------|
| Database adapter | SQLite/Drizzle with `usePlural: true` |
| Session expiry | 7 days |
| Session refresh | 24 hours |
| OTP length | 6 digits |
| OTP expiry | 5 minutes |
| Invitation expiry | 48 hours |
| Secure cookies | Enabled when `baseURL` is HTTPS |

## Type utilities

Derive user/session types from your config for use in shared types or frontend code:

```ts
import type { InferUser, InferSession } from "@fcalell/db/auth/infer";
import type config from "./stack.config";

type User = InferUser<typeof config>;
type Session = InferSession<typeof config>;
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

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/db` | `DatabaseConfig`, `getSchemaPath()`, `getSchemaModule()`, `getMigrationsPath()` |
| `@fcalell/db/orm` | Drizzle table/column builders, operators, relations, aggregates |
| `@fcalell/db/d1` | `createClient()` for Cloudflare D1 |
| `@fcalell/db/sqlite` | `createClient()` for SQLite |
| `@fcalell/db/auth/access` | `createAccessControl()`, `getStatements()`, `role()`, `defaultOrgRoles` |
| `@fcalell/db/auth/infer` | `InferUser<T>`, `InferSession<T>` — type utilities derived from config |

## License

MIT
