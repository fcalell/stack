# @fcalell/plugin-auth

Authentication plugin for the `@fcalell/stack` framework. Wraps Better Auth with OTP login, organization RBAC, and session management -- all driven by config. Requires the `api`, `cloudflare`, and `db` plugins; reads `api.slots.cors` to derive its `trustedOrigins` automatically.

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

The `auth` plugin requires `api`, `cloudflare`, and `db`. The CLI validates the presence of each. `trustedOrigins` and other CORS-derived options are computed inside `auth.slots.runtimeOptions`, a derived slot whose inputs include `api.slots.cors` — so the dataflow guarantees every cors contributor (e.g. `vite`'s localhost origin) is resolved before the auth runtime is rendered.

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

The plugin auto-declares four bindings (contributed via `cloudflare.slots.bindings` and `cloudflare.slots.secrets`):

| Binding | Type | Default name | Dev default |
|---------|------|--------------|-------------|
| Auth secret | `secret` | `AUTH_SECRET` | `"dev-secret-change-me"` |
| App URL | `secret` | `APP_URL` | `"http://localhost:3000"` |
| IP rate limiter | `rate_limiter` | `RATE_LIMITER_IP` | 100 req / 60s |
| Email rate limiter | `rate_limiter` | `RATE_LIMITER_EMAIL` | 5 req / 300s |

All binding names are customizable via config options.

## Plugin implementation

Built with `plugin` from `@fcalell/cli`. Owns one slot — `auth.slots.runtimeOptions` — a derived slot that reads `api.slots.cors` so `trustedOrigins` and `sameSite` are always computed against the fully-resolved CORS list.

```ts
import { plugin, slot, callback } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";

const runtimeOptions = slot.derived({
  source: "auth",
  name: "runtimeOptions",
  inputs: { cors: api.slots.cors },
  compute: (inp, ctx) => /* compose Better Auth options from inp.cors + ctx.options */,
});

export const auth = plugin("auth", {
  label: "Auth",
  schema: authOptionsSchema,
  requires: ["api", "cloudflare", "db"],
  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
    sendInvitation: callback.optional<{ email: string; orgName: string }>(),
  },
  dependencies: { "@fcalell/plugin-auth": "workspace:*" },
  slots: { runtimeOptions },
  contributes: (self) => [
    cloudflare.slots.bindings.contribute(/* rate limiter bindings */),
    cloudflare.slots.secrets.contribute(/* AUTH_SECRET + APP_URL */),
    api.slots.pluginRuntimes.contribute(async (ctx) => ({
      plugin: "auth",
      import: { source: "@fcalell/plugin-auth/runtime", default: "authRuntime" },
      identifier: "authRuntime",
      options: await ctx.resolve(self.slots.runtimeOptions),
    })),
    api.slots.callbacks.contribute(async (ctx) => /* gated on src/worker/plugins/auth.ts */),
    cliSlots.initPrompts.contribute(/* cookie prefix + organization toggle */),
  ],
});
```

### Slot contributions

| Target slot | Behavior |
|-------------|----------|
| `cloudflare.slots.bindings` | IP + email rate-limiter bindings |
| `cloudflare.slots.secrets` | `AUTH_SECRET` + `APP_URL` (`.dev.vars` template) |
| `api.slots.pluginRuntimes` | `authRuntime({ ... })` runtime entry; options resolved from `auth.slots.runtimeOptions` |
| `api.slots.callbacks` | Wires `src/worker/plugins/auth.ts` onto the auth runtime when the file exists |
| `cliSlots.initPrompts` | Cookie prefix + organization toggle |
| `cliSlots.initScaffolds` (auto) | Scaffolds `src/worker/plugins/auth.ts` from `templates/callbacks.ts` |
| `cliSlots.removeFiles` (auto) | `src/worker/plugins/auth.ts` |

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
