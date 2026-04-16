# @fcalell/plugin-auth

Authentication plugin for the `@fcalell/stack` framework. Wraps Better Auth with OTP login, organization RBAC, and session management -- all driven by config. Requires the `db` plugin.

## Install

```bash
pnpm add @fcalell/plugin-auth
```

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/config";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";
import * as schema from "./src/schema";

export default defineConfig({
  plugins: [
    db({ dialect: "d1", databaseId: "9a619a0b-...", schema }),
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

The `auth` plugin requires `db` -- the framework validates this at config time.

### 2. Define callbacks

Runtime secrets and email callbacks live in a separate file, scaffolded automatically:

```ts
// src/worker/plugins/auth.ts
import { defineAuthCallbacks } from "@fcalell/plugin-auth";

export default defineAuthCallbacks({
  async sendOTP({ email, otp }) {
    await resend.emails.send({ to: email, subject: "Your code", text: otp });
  },
  async sendInvitation({ email, organization, invitedBy }) {
    await resend.emails.send({
      to: email,
      subject: `Join ${organization.name}`,
    });
  },
});
```

`sendOTP` is required; `sendInvitation` is optional (only needed when organizations are enabled).

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

The plugin auto-declares four bindings:

| Binding | Type | Default name | Dev default |
|---------|------|--------------|-------------|
| Auth secret | `secret` | `AUTH_SECRET` | `"dev-secret-change-me"` |
| App URL | `secret` | `APP_URL` | `"http://localhost:3000"` |
| IP rate limiter | `rate_limiter` | `RATE_LIMITER_IP` | 100 req / 60s |
| Email rate limiter | `rate_limiter` | `RATE_LIMITER_EMAIL` | 5 req / 300s |

All binding names are customizable via config options.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-auth` | `auth()`, `AuthOptions`, `FieldConfig`, `defineAuthCallbacks`, `AuthCallbacks` |
| `@fcalell/plugin-auth/access` | `createAccessControl()`, `getStatements()`, `defaultOrgRoles` |
| `@fcalell/plugin-auth/infer` | `InferUser<T>`, `InferSession<T>` -- type utilities derived from config |
| `@fcalell/plugin-auth/runtime` | `authRuntime()` -- runtime plugin factory |
| `@fcalell/plugin-auth/cli` | CLI plugin (detect, scaffold, bindings, generate hooks) |

## For plugin authors / maintainers

### Runtime plugin

`authRuntime(pluginConfig, callbacks?)` returns a `RuntimePlugin` with:

- **`validateEnv(env)`** -- asserts the auth secret env var exists
- **`context(env, upstream)`** -- receives `{ db }` from the upstream db plugin, creates the Better Auth instance, and provides `{ auth }` to downstream plugins

The runtime depends on `{ db }` from the `db` plugin (enforced by `requires: ["db"]` in config).

### Callbacks

`defineAuthCallbacks()` is a typed identity function for the callback file at `src/worker/plugins/auth.ts`. The `AuthCallbacks` interface requires `sendOTP` and optionally accepts `sendInvitation`.

### CLI plugin hooks

| Hook | Behavior |
|------|----------|
| `detect` | Checks if `"auth"` is in the config's plugin list |
| `prompt` | Asks for cookie prefix and whether to include organizations |
| `scaffold` | Writes `src/worker/plugins/auth.ts` callback template, adds `@fcalell/plugin-auth` dependency |
| `bindings` | Returns 4 binding declarations: auth secret, app URL, IP rate limiter, email rate limiter |
| `generate` | No standalone generated files (auth schema generation is handled by the db plugin) |

### Worker contribution

The plugin contributes runtime context, callbacks, and routes:

```ts
worker: {
  runtime: {
    importFrom: "@fcalell/plugin-auth/runtime",
    factory: "authRuntime",
  },
  callbacks: {
    required: false,
    defineHelper: "defineAuthCallbacks",
    importFrom: "@fcalell/plugin-auth",
  },
  routes: true,
}
```

When `routes: true`, the auth plugin auto-generates auth procedures (getSession, signOut, sendOtp, verifyOtp, updateUser, setActiveOrganization) that are merged into the worker's router.

## License

MIT
