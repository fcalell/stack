# @fcalell/plugin-auth

Authentication plugin for the `@fcalell/stack` framework. Wraps Better Auth with OTP login, organization RBAC, and session management -- all driven by config. Depends on the `db` plugin via `db.events.SchemaReady`.

## Install

```bash
pnpm add @fcalell/plugin-auth
```

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";

export default defineConfig({
  plugins: [
    db({ dialect: "d1", databaseId: "9a619a0b-..." }),
    auth({
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
    }),
  ],
});
```

The `auth` plugin depends on `db` -- the CLI validates this via `after: [db.events.SchemaReady]`.

### 2. Define callbacks

Runtime secrets and email callbacks live in a separate file, scaffolded automatically:

```ts
// src/worker/plugins/auth.ts
import { auth } from "@fcalell/plugin-auth";

export default auth.defineCallbacks({
  sendOTP({ email, code }) {
    // TODO: send OTP email
    console.log(`OTP for ${email}: ${code}`);
  },
  sendInvitation({ email, orgName }) {
    // TODO: send invitation email
    console.log(`Invitation for ${email} to ${orgName}`);
  },
});
```

`auth.defineCallbacks()` is a typed identity function -- it enforces the callback shapes declared via `callback<T>()` in the plugin definition. `sendOTP` is required; `sendInvitation` is optional (only needed when organizations are enabled).

### 3. Organizations and RBAC

```ts
import { createAccessControl } from "@fcalell/plugin-auth/access";

const ac = createAccessControl({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "read", "update", "delete"],
});

// In config:
auth({
  organization: {
    ac,
    roles: {
      owner: ac.newRole({
        organization: ["update", "delete"],
        member: ["create", "update", "delete"],
        invitation: ["create", "cancel"],
        project: ["create", "read", "update", "delete"],
      }),
    },
  },
})
```

Default roles (`owner`, `admin`, `member`) are available from `@fcalell/plugin-auth/access`:

```ts
import { defaultOrgRoles } from "@fcalell/plugin-auth/access";
```

### 4. Type inference

Derive user/session types from your config:

```ts
import type { InferUser, InferSession } from "@fcalell/plugin-auth/infer";
import type config from "./stack.config";

type User = InferUser<typeof config>;
type Session = InferSession<typeof config>;
```

`InferUser` starts from the Better Auth base user (`id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`) and adds any `additionalFields` from `auth.user`. `InferSession` does the same for sessions, and includes `activeOrganizationId` when the organization plugin is configured.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookies.prefix` | `string` | -- | Cookie name prefix |
| `cookies.domain` | `string` | -- | Cookie domain |
| `session.expiresIn` | `number` | 7 days | Session expiry in seconds |
| `session.updateAge` | `number` | -- | Session refresh interval in seconds |
| `session.additionalFields` | `Record<string, FieldConfig>` | -- | Extra session fields |
| `user.additionalFields` | `Record<string, FieldConfig>` | -- | Extra user fields |
| `organization` | `boolean \| { ac, roles, additionalFields }` | -- | Enable organizations |
| `secretVar` | `string` | `"AUTH_SECRET"` | Env variable name for the auth secret |
| `appUrlVar` | `string` | `"APP_URL"` | Env variable name for the app URL |
| `rateLimiter.ip.binding` | `string` | `"RATE_LIMITER_IP"` | IP rate limiter binding name |
| `rateLimiter.ip.limit` | `number` | `100` | Max requests per period (IP) |
| `rateLimiter.ip.period` | `number` | `60` | Period in seconds (IP) |
| `rateLimiter.email.binding` | `string` | `"RATE_LIMITER_EMAIL"` | Email rate limiter binding name |
| `rateLimiter.email.limit` | `number` | `5` | Max requests per period (email) |
| `rateLimiter.email.period` | `number` | `300` | Period in seconds (email) |

`FieldConfig` shape: `{ type: "string" | "number" | "boolean", required?: boolean, defaultValue?: unknown, input?: boolean }`.

## Bindings

The plugin auto-declares four bindings (pushed onto the `Generate` payload):

| Binding | Type | Default name | Dev default |
|---------|------|--------------|-------------|
| Auth secret | `secret` | `AUTH_SECRET` | `"dev-secret-change-me"` |
| App URL | `secret` | `APP_URL` | `"http://localhost:3000"` |
| IP rate limiter | `rate_limiter` | `RATE_LIMITER_IP` | 100 req / 60s |
| Email rate limiter | `rate_limiter` | `RATE_LIMITER_EMAIL` | 5 req / 300s |

All binding names are customizable via config options.

## Plugin implementation

Built with `createPlugin` from `@fcalell/cli`:

```ts
import { createPlugin, callback } from "@fcalell/cli";
import { Init, Generate, Remove } from "@fcalell/cli/events";
import { db } from "@fcalell/plugin-db";

export const auth = createPlugin("auth", {
  label: "Auth",
  after: [db.events.SchemaReady],
  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
    sendInvitation: callback<{ email: string; orgName: string }>(),
  },
  schema: authOptionsSchema,
  register(ctx, bus) { ... },
});
```

### Event handlers

| Event | Behavior |
|-------|----------|
| `Init.Prompt` | Asks for cookie prefix and whether to include organizations |
| `Init.Scaffold` | Writes `src/worker/plugins/auth.ts` callback template, adds `@fcalell/plugin-auth` dependency |
| `Generate` | Pushes 4 binding declarations (auth secret, app URL, IP rate limiter, email rate limiter) |
| `Remove` | Declares `src/worker/plugins/auth.ts` and `@fcalell/plugin-auth` for cleanup |

### Runtime

The `./runtime` export provides `authRuntime()` for the worker builder chain:

```ts
import authRuntime from "@fcalell/plugin-auth/runtime";

authRuntime({ secretVar: "AUTH_SECRET", ... }, callbacks)
```

Receives `{ db }` from the upstream db plugin and provides `{ auth }` to downstream plugins.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-auth` | `auth()`, `AuthOptions` |
| `@fcalell/plugin-auth/access` | `createAccessControl()`, `getStatements()`, `defaultOrgRoles` |
| `@fcalell/plugin-auth/infer` | `InferUser<T>`, `InferSession<T>` -- type utilities derived from config |
| `@fcalell/plugin-auth/runtime` | `authRuntime()` -- runtime plugin factory |

## License

MIT
