# @fcalell/db

Drizzle ORM toolkit for Cloudflare D1 and SQLite. Ships a unified CLI for schema management, type-safe client factories, and an optional Better Auth integration — all driven by a single config file.

## Install

```bash
pnpm add @fcalell/db drizzle-orm
```

Depending on which features you use, install the relevant peer dependencies:

| Feature | Additional packages |
|---------|-------------------|
| D1 runtime client | — |
| SQLite runtime client | `better-sqlite3` |
| `db-kit` CLI | `drizzle-kit` `tsx` |
| Auth integration | `better-auth` `@better-auth/cli` `better-sqlite3` |

## Quick start

### 1. Define your config

Create a `db.config.ts` at the root of your database package:

```ts
import { defineDatabase } from "@fcalell/db/kit";

export default defineDatabase({
  dialect: "d1",
  schema: "./src/schema/index.ts",
  migrations: "./src/migrations",
  databaseId: "9a619a0b-...",
  binding: "DB_MAIN",
  wranglerDir: "../api/.wrangler",
});
```

Or for a plain SQLite project:

```ts
import { defineDatabase } from "@fcalell/db/kit";

export default defineDatabase({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  migrations: "./src/migrations",
  path: "./data/app.sqlite",
});
```

### 2. Run the CLI

```bash
# Local development — push schema + watch for changes
db-kit dev

# With Drizzle Studio
db-kit dev --studio

# Production — generate migrations + apply
db-kit deploy
```

### 3. Query at runtime

```ts
import { createClient } from "@fcalell/db/d1";
import * as schema from "./schema";

// Cloudflare Worker
export default {
  async fetch(request, env) {
    const db = createClient(env.DB_MAIN, schema);
    const users = await db.query.users.findMany();
    return Response.json(users);
  },
};
```

## CLI: `db-kit`

A single `db.config.ts` drives all database tooling. No manual Drizzle configs needed — the CLI generates them internally in a `.db-kit/` directory (add it to `.gitignore`).

### Commands

| Command | What it does |
|---------|-------------|
| `db-kit dev` | Push schema to local DB, watch for changes |
| `db-kit dev --studio` | Same, plus launch Drizzle Studio |
| `db-kit deploy` | Generate migrations, then apply them |

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--studio` | `false` | Launch Drizzle Studio alongside dev |
| `--config <path>` | `db.config.ts` | Path to config file |

### How it works

- **`dev`** runs `drizzle-kit push` against your local database (SQLite file or Wrangler's local D1), then watches your schema directory for `.ts` changes with a 300ms debounce.
- **`deploy`** runs `drizzle-kit generate` to create migration files, then `drizzle-kit migrate` to apply them. For D1, it connects via HTTP using `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_TOKEN` environment variables.

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

Optional [Better Auth](https://www.better-auth.com/) integration. Auth is configured declaratively in `db.config.ts` and instantiated at runtime with `createAuth()`.

### Config

The `auth` field in your config declares which plugins and custom fields to use. This drives schema generation — `db-kit` automatically runs `@better-auth/cli generate` and passes the resulting auth schema alongside your app schema to Drizzle Kit.

```ts
import { defineDatabase } from "@fcalell/db/kit";

export default defineDatabase({
  dialect: "d1",
  schema: "./src/schema/index.ts",
  migrations: "./src/migrations",
  databaseId: "9a619a0b-...",
  binding: "DB_MAIN",
  wranglerDir: "../api/.wrangler",
  auth: {
    emailOTP: true,
    organization: {
      additionalFields: {
        settings: { type: "string", required: false },
      },
    },
    session: {
      additionalFields: {
        activeProjectId: { type: "string", required: false },
      },
    },
    user: {
      additionalFields: {
        timezone: { type: "string", required: false },
      },
    },
  },
});
```

### Runtime

`createAuth()` takes your Drizzle client, the config, and runtime options (secrets, URLs, callbacks):

```ts
import { createAuth } from "@fcalell/db/auth";
import config from "./db.config";

const auth = createAuth(db, config, {
  secret: env.SECRET_BETTER_AUTH,
  baseURL: "https://api.example.com",
  appURL: "https://app.example.com",
  cookiePrefix: "myapp",
  cookieDomain: ".example.com",
  emailOTP: {
    sendOTP: async ({ email, otp, type }) => {
      await resend.emails.send({ to: email, subject: "Your code", text: otp });
    },
  },
  organization: {
    sendInvitation: async ({ email, organization, inviter, invitationId, role }) => {
      await resend.emails.send({ to: email, subject: `Join ${organization.name}`, /* ... */ });
    },
    ac,    // from better-auth/plugins/access
    roles, // from better-auth/plugins/access
  },
});
```

Permissions and roles are app-specific — define them in your project using Better Auth's `createAccessControl` and pass them via the `ac` and `roles` options.

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

All defaults can be overridden via the runtime options.

## Config reference

### D1

```ts
defineDatabase({
  dialect: "d1",
  schema: string,        // Path to Drizzle schema file or directory
  migrations: string,    // Output directory for migration files
  databaseId: string,    // Cloudflare D1 database ID
  binding: string,       // D1 binding name in wrangler.toml
  wranglerDir: string,   // Path to .wrangler directory
  studioPort?: number,   // Drizzle Studio port (default: 4983)
  auth?: AuthConfig,     // Optional Better Auth config
});
```

### SQLite

```ts
defineDatabase({
  dialect: "sqlite",
  schema: string,        // Path to Drizzle schema file or directory
  migrations: string,    // Output directory for migration files
  path: string,          // Path to SQLite database file
  studioPort?: number,   // Drizzle Studio port (default: 4983)
  auth?: AuthConfig,     // Optional Better Auth config
});
```

### AuthConfig

```ts
{
  emailOTP?: boolean,
  organization?: boolean | {
    additionalFields?: Record<string, { type: "string" | "number" | "boolean", required?: boolean }>,
  },
  session?: {
    additionalFields?: Record<string, { type: "string" | "number" | "boolean", required?: boolean }>,
  },
  user?: {
    additionalFields?: Record<string, { type: "string" | "number" | "boolean", required?: boolean }>,
  },
}
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/db/kit` | `defineDatabase()` config factory |
| `@fcalell/db/d1` | `createClient()` for Cloudflare D1 |
| `@fcalell/db/sqlite` | `createClient()` for SQLite |
| `@fcalell/db/auth` | `createAuth()` Better Auth factory |

## License

MIT
