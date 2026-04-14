# @fcalell/config

Unified configuration for the `@fcalell/stack` framework. A single `stack.config.ts` drives the CLI, API, and build tooling.

## Install

```bash
pnpm add @fcalell/config
```

## Usage

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

That's the minimal config. Add sections as needed:

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
    organization: { ac },
  },
  api: {
    cors: ["https://app.example.com"],
    prefix: "/rpc",
  },
  dev: {
    studioPort: 4983,
  },
});
```

## Config sections

### `db` (required)

Database configuration. Either D1 or SQLite.

```ts
// D1
db: {
  dialect: "d1",
  databaseId: string,
  schema: Record<string, unknown>,
  migrations?: string,  // default: "./src/migrations"
}

// SQLite
db: {
  dialect: "sqlite",
  path: string,
  schema: Record<string, unknown>,
  migrations?: string,
}
```

`schema` accepts a module object directly. For non-standard layouts, use the escape hatch: `schema: { path: "./custom/path", module: schema }`.

### `auth` (optional)

Authentication policy. Drives Better Auth schema generation and runtime behavior.

```ts
auth: {
  cookies?: { prefix?: string; domain?: string },
  session?: {
    expiresIn?: number,
    updateAge?: number,
    additionalFields?: Record<string, FieldConfig>,
  },
  user?: {
    additionalFields?: Record<string, FieldConfig>,
  },
  organization?: boolean | {
    ac?: AccessControl,
    roles?: Record<string, Role>,
    additionalFields?: Record<string, FieldConfig>,
  },
}
```

Runtime secrets (`AUTH_SECRET`) and callbacks (`sendOTP`, `sendInvitation`) are provided in `defineApp()` — see `@fcalell/api` docs.

### `api` (optional)

Static API configuration.

```ts
api: {
  cors?: string | string[],
  prefix?: `/${string}`,  // default: "/rpc"
}
```

### `dev` (optional)

Development workflow configuration.

```ts
dev: {
  studioPort?: number,  // default: 4983
}
```

## What consumes this config

| Consumer | Reads |
|----------|-------|
| `stack` CLI | `db`, `auth`, `dev` — for schema push, auth generation, studio |
| `defineApp()` | `db`, `auth`, `api` — for runtime wiring |
| Type utilities | `auth` — for `InferUser<T>`, `InferSession<T>` |

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/config` | `defineConfig()`, `StackConfig`, `AuthPolicy`, `FieldConfig`, `DatabaseConfig` |

## License

MIT
