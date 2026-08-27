# @fcalell/plugin-auth

Authentication plugin for the `@fcalell/stack` framework. Wraps Better Auth with email-OTP login, OAuth social providers (Apple + Google), organization RBAC, and session management -- all driven by config. Ships the Better Auth identity schema (`@fcalell/plugin-auth/schema`) and native-client wiring (`expo` option). Requires the `api`, `cloudflare`, and `db` plugins; reads `api.slots.cors` to derive its `trustedOrigins` automatically.

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
import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

const callbacks: AuthCallbacks<Env> = {
  async sendOTP({ email, code, env }) {
    await env.EMAIL.send({ to: email, subject: "Your code", body: code });
  },
  sendInvitation({ email, orgName }) {
    // TODO: send invitation email
    console.log(`Invitation for ${email} to ${orgName}`);
  },
};

export default callbacks;
```

Every payload carries `env`, the same per-request bindings the worker sees, so a
callback sends through an email binding or a queue instead of reaching for module scope. Pass the
worker's `Env` as `AuthCallbacks<Env>` to type it; leave the parameter off and `env` is
`unknown`.

| Callback | Required | Runs when |
|----------|----------|-----------|
| `sendOTP` | yes, unless `emailOtp: false` | An email one-time password is issued |
| `sendInvitation` | no | An organization invitation is sent |
| `beforeDelete` | no | `user.deleteUser` is on and an account is about to be deleted. Throw to refuse: an `APIError` surfaces its own status, anything else is a 500. Revocation, storage cleanup, and PII scrubbing belong here |
| `sendDeleteVerification` | no | `user.deleteUser` is on and the consumer implements this callback. `deleteUser()` then emails `url` (a confirmation link) instead of deleting, the deletion happens when the link is opened, and no session freshness is required. This is the deletion path for passwordless apps |
| `generateOTP` | no | An OTP is about to be generated. Return a string to override it, or `undefined` to fall back to the default for that request, which is how a fixed review-account code coexists with real ones. Read synchronously, so it cannot be `async` |

This file is imported by the **worker**, so it must only pull in worker-safe modules -- `@fcalell/plugin-auth/runtime` is the runtime subpath, never the plugin's `.` entrypoint (that one drags in the Node-side CLI codegen toolchain). `AuthCallbacks` enforces the same callback shapes declared via `callback<T>()` in the plugin definition -- both derive from one shared type, so they can't drift apart.

When email-OTP is disabled (`emailOtp: false`, see OAuth-only below) there are no required callbacks -- the callback file is optional, and an OAuth-only app can omit it entirely.

### OAuth social providers (Apple + Google)

Enable social sign-in via the `socialProviders` option. `true` uses conventional
env-var names (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID` /
`APPLE_CLIENT_SECRET`); an object overrides them. The plugin contributes those
client-id / client-secret secrets to `.dev.vars`, and the runtime reads the
credentials from `env` at request time -- only the var **names** are baked into
the generated worker. Set `emailOtp: false` for an OAuth-only app (drops the
email-OTP plugin and its required callback file):

```ts
auth({
  emailOtp: false,
  socialProviders: {
    google: true,
    apple: true,
    // or override env-var names / add native Apple bundle id:
    // apple: { clientIdVar: "APPLE_ID", appBundleIdentifier: "com.example.app" },
  },
}),
```

The native client helpers `signInWith{Apple,Google}()` live on the `./expo`
subpath (see below). The server decides which providers are actually configured.

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

These statements also drive `procedure({ can: [action, resource] })`'s type-level autocomplete on
the API side -- see `@fcalell/plugin-api`'s README for the procedure-config docs.

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
| `session.freshAge` | `number` | 1 day (better-auth's default) | How recently the session must have been created to count as fresh; deletion without email confirmation needs a fresh session. `0` disables the check, letting a stolen session cookie of any age delete the account. Prefer the `sendDeleteVerification` callback for passwordless apps |
| `session.additionalFields` | `Record<string, FieldConfig>` | -- | Extra session fields |
| `user.additionalFields` | `Record<string, FieldConfig>` | -- | Extra user fields |
| `user.deleteUser` | `boolean` | `false` | Enable account deletion (`authClient.deleteUser()`), gated by the `beforeDelete` callback. With `sendDeleteVerification` implemented, deletion goes through an emailed confirmation link; without it, better-auth requires a fresh session. App Store 5.1.1(v) requires it for a native app |
| `organization` | `boolean \| { ac, roles, additionalFields }` | -- | Enable organizations; requires re-exporting `@fcalell/plugin-auth/schema/organization` (see Database schema) |
| `emailOtp` | `boolean` | `true` | Email one-time-password sign-in; `false` for OAuth-only |
| `socialProviders.google` | `boolean \| { clientIdVar, clientSecretVar }` | -- | Enable Google OAuth (`true` = conventional var names) |
| `socialProviders.apple` | `boolean \| { clientIdVar, clientSecretVar, appBundleIdentifier }` | -- | Enable Apple OAuth (`true` = conventional var names) |
| `expo` | `boolean \| { scheme }` | -- | Native (Expo) consumer: adds the server-side `expo()` plugin + the app deep-link scheme (`${app.name}://` + wildcard, or an explicit `scheme`) to `trustedOrigins` |
| `secretVar` | `string` | `"AUTH_SECRET"` | Env variable name for the auth secret |
| `appUrlVar` | `string` | `"APP_URL"` | Env variable name for the app URL |
| `rateLimiter.ip.binding` | `string` | `"RATE_LIMITER_IP"` | IP rate limiter binding name |
| `rateLimiter.ip.limit` | `number` | `100` | Max requests per period (IP) |
| `rateLimiter.ip.period` | `number` | `60` | Period in seconds (IP) |
| `rateLimiter.email.binding` | `string` | `"RATE_LIMITER_EMAIL"` | Email rate limiter binding name |
| `rateLimiter.email.limit` | `number` | `3` | Max requests per period (email) |
| `rateLimiter.email.period` | `number` | `60` | Period in seconds (email) |

`FieldConfig` shape: `{ type: "string" | "number" | "boolean", required?: boolean, defaultValue?: unknown, input?: boolean }`.

## Bindings

The plugin auto-declares four bindings (contributed via `cloudflare.slots.bindings` and `cloudflare.slots.secrets`), plus a client-id + client-secret secret per enabled OAuth provider:

| Binding | Type | Default name | Dev default |
|---------|------|--------------|-------------|
| Auth secret | `secret` | `AUTH_SECRET` | `"dev-secret-change-me"` |
| App URL | `secret` | `APP_URL` | first local dev origin, else `https://<domain>` |
| IP rate limiter | `rate_limiter` | `RATE_LIMITER_IP` | 100 req / 60s |
| Email rate limiter | `rate_limiter` | `RATE_LIMITER_EMAIL` | 3 req / 60s |
| OAuth client id | `secret` | `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` | `"dev-oauth-client-id"` (per enabled provider) |
| OAuth client secret | `secret` | `GOOGLE_CLIENT_SECRET` / `APPLE_CLIENT_SECRET` | `"dev-oauth-client-secret"` (per enabled provider) |

All binding names are customizable via config options.

## Database schema

Better Auth's core identity tables (`user` / `session` / `account` / `verification`) ship as Drizzle SQLite tables from the `@fcalell/plugin-auth/schema` subpath — the canonical `@better-auth/cli generate` shape, ported verbatim. The Drizzle adapter never issues DDL, so a consumer must re-export them so they are migrated and registered:

```ts
// src/schema/index.ts
export * from "@fcalell/plugin-auth/schema";
// ...your own tables
```

The worker runtime passes these tables to `drizzleAdapter({ schema })` explicitly, so model resolution does not depend on the consumer's export names. Migrate with `plugin-db`'s drizzle-kit flow (`stack db push` / `generate` / `apply`) — **never** `@better-auth/cli migrate` (it is Kysely-only and no-ops for Drizzle). Re-run `@better-auth/cli generate` and diff after a Better Auth bump or when a table-bearing plugin (organization, …) is enabled.

When `organization` is enabled, the organization plugin's own tables (`organization` / `member` / `invitation`) ship separately from the `@fcalell/plugin-auth/schema/organization` subpath — re-export them alongside the base schema:

```ts
// src/schema/index.ts
export * from "@fcalell/plugin-auth/schema";
export * from "@fcalell/plugin-auth/schema/organization";
// ...your own tables
```

The worker runtime only references these tables in `drizzleAdapter({ schema })` when `organization` is actually configured, so an app that never enables it never needs this re-export.

These `export *`s only wire migrations/model resolution -- they don't add the tables' names to `procedure({ reads, writes })`'s entity vocabulary (`plugin-db` can't see through a re-export). `auth` contributes its own table names (`account`/`session`/`user`/`verification`, plus `invitation`/`member`/`organization` when `organization` is enabled) to that vocabulary directly, so `reads`/`writes` against them autocomplete and type-check with no extra config.

## Runtime defaults

The worker enables `session.cookieCache` (5 min) so most `getSession` calls skip a DB read, and sets `advanced.ipAddress.ipAddressHeaders: ["cf-connecting-ip"]` for the correct client IP behind Cloudflare.

## Native (Expo)

`auth({ expo: true })` adds Better Auth's server-side `expo()` plugin (required for the `@better-auth/expo` client) and the app deep-link scheme to `trustedOrigins` (`${app.name}://` + `${app.name}://*`, or pass `{ scheme }` to override) — the CSRF origin check runs even for native ID-token sign-in. `@better-auth/expo`'s server entry is worker-safe, so it is a plain dependency and the plugin is only added when `expo` is set.

## Record-scoped abilities

`@fcalell/plugin-auth/ability` covers the authorization layer below org roles: per-record
permissions built from domain data (a `bookings.role` row, an ownership column). CASL powers it
under the hood but stays wrapped, the same rule as drizzle/hono/zod: never install or import
`@casl/ability` directly. Everything you need is re-exported from this subpath.

Declare your subject vocabulary once. Instance-checked subjects list the row fields their
conditions may read; abstract subjects map to `never` and take no conditions:

```ts
// src/worker/lib/ability.ts
import { defineAbility, subject } from "@fcalell/plugin-auth/ability";

type Subjects = {
  Expense: { paidById: string };   // instance-checked: conditions read these fields
  Report: { authorId: string };
  Billing: never;                  // abstract: string-only checks, conditions are a type error
};

// The documented handler pattern: a helper that loads the caller's seat in
// the record (their row in the domain table) and builds the ability from it.
// Ability construction stays in handlers on purpose; the rules depend on
// domain data only the handler's queries know.
export async function abilityFor(db: Db, userId: string, tripId: string) {
  const seat = await db.query.bookings.findFirst({ /* userId + tripId */ });
  const { can, build } = defineAbility<Subjects, "create" | "read" | "update" | "delete">();
  if (seat?.role === "organizer") can("update", "Expense");
  can("update", "Expense", { paidById: userId });   // ownership condition
  can("read", "Report");
  return { seat, ability: build() };
}
```

In a handler, gate with `assertCan`. It returns when allowed and throws
`ORPCError("FORBIDDEN")` when denied; pass `{ cloak: true }` at sites that must not reveal the
resource exists, which throws `NOT_FOUND` instead. `{ message }` replaces the default English
denial copy (cloaked sites ignore it). Tag a row with `subject()` for instance checks:

```ts
const { ability } = await abilityFor(db, context.user.id, input.tripId);
assertCan(ability, "update", subject("Expense", expenseRow));
assertCan(ability, "read", subject("Report", reportRow), { cloak: true });
assertCan(ability, "delete", subject("Expense", expenseRow), {
  message: "Only the author can delete an expense",
});
```

To drive UI affordances from the same rules, ship the ability on a query output with
`packAbility` and rebuild it client-side with `unpackAbility`. The packed form is a plain JSON
array; type the wire field with `PackedRules` (a type-only export, safe in client bundles):

```ts
// server: procedure output
return { trip, rules: packAbility(ability) };

// client
const ability = unpackAbility<AbilityFor<Subjects>>(data.rules);
ability.can("update", subject("Expense", expense));
```

`compileStatements(grants)` converts an org role's statements record (`resource → actions`)
into unconditional rules for the same ability model, so org-level and record-level checks share
one vocabulary. The compile is one-directional: statements stay the source of truth for org
roles, and better-auth's organization endpoints keep consulting them internally.

**Forbidden names:** a resource named `"all"` or an action named `"manage"` throws. CASL reserves
both as wildcards (`can("manage", "all")` grants everything); better-auth's statements model has no
such concept and would treat them as literal names, silently over-granting client-side once
compiled. Pick a specific resource/action name instead.

### Org rules endpoint

`auth({ organization: true })` registers a framework-owned `auth.orgRules` procedure: it reads the
caller's active member, compiles their role's statements into rules the same way
`compileStatements` does above, and ships them packed (`{ rules: PackedRules<...> }`). No active
organization, or no membership, returns `{ rules: [] }` rather than an error. `@fcalell/plugin-api`'s
`useAbility` client hook consumes it directly; you never call it yourself.

## Plugin implementation

Built with `plugin` from `@fcalell/cli`. Owns four slots: `runtimeOptions` (derived; reads `api.slots.cors` and `api.slots.devCorsOrigins` so `trustedOrigins` is always computed against the fully-resolved CORS list, with the dev-server origins kept in a separate `devTrustedOrigins` the runtime applies only under `STACK_DEV`), `appUrlDevDefault` (the `.dev.vars` default for `APP_URL`, derived from the first local dev origin), `callbackFile` (the consumer callback-file path), and `cookiePrefix` (the resolved session-cookie prefix native-ui's generated constants read). `sameSite: "none"` is baked for native consumers (always cross-site) and widened to `none` in dev, where the frontend origin and the worker are cross-origin.

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
    sendOTP: callback<{ email: string; code: string; env: unknown }>(),
    sendInvitation: callback.optional<{ email: string; orgName: string; env: unknown }>(),
    beforeDelete: callback.optional<{ user: AuthUser; request?: Request; env: unknown }>(),
    sendDeleteVerification:
      callback.optional<{ user: AuthUser; url: string; token: string; env: unknown }>(),
    // Second type argument: the handler's return type, for a callback the
    // framework reads synchronously instead of awaiting.
    generateOTP: callback.optional<
      { email: string; type: OtpType; env: unknown },
      string | undefined
    >(),
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
| `cloudflare.slots.secrets` | `AUTH_SECRET` + `APP_URL` + a client-id/secret pair per enabled OAuth provider (`.dev.vars` template) |
| `api.slots.pluginRuntimes` | `authRuntime({ ... })` runtime entry; options resolved from `auth.slots.runtimeOptions` |
| `api.slots.callbacks` | Wires `src/worker/plugins/auth.ts` onto the auth runtime when the file exists; required only when `emailOtp` is enabled |
| `cliSlots.initPrompts` | Cookie prefix + organization toggle |
| `cliSlots.initScaffolds` (auto) | Scaffolds `src/worker/plugins/auth.ts` from `templates/callbacks.ts` |
| `cliSlots.removeFiles` (auto) | `src/worker/plugins/auth.ts` |

### Runtime

The `./runtime` export provides `authRuntime()` for the worker builder chain:

```ts
import authRuntime from "@fcalell/plugin-auth/runtime";

authRuntime({ secretVar: "AUTH_SECRET", ... }, callbacks)
```

Receives `{ db }` from the upstream db plugin and provides `{ auth }` to downstream plugins. When
`organization` is enabled it also registers the `auth.orgRules` procedure (see "Org rules endpoint"
above) via the `routes()` hook of the `RuntimePlugin` contract.

### Native client (Expo)

The `./expo` subpath configures a `@better-auth/expo` client for React Native. It
ships no plugin contributions -- it is runtime-only, the native mirror of
`@fcalell/plugin-api/client`. (The provider is wired into the generated entry by
`@fcalell/plugin-native-ui`, which contributes it to `plugin-expo.slots.providers`.)

```tsx
import * as SecureStore from "expo-secure-store";
import {
  AuthProvider,
  createAuthClient,
  signInWithApple,
  signInWithGoogle,
  useAuthClient,
} from "@fcalell/plugin-auth/expo";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
  scheme: "wenauti",       // matches the Expo app scheme / plugin-expo `scheme`
  cookiePrefix: "wenauti", // matches `auth({ cookies: { prefix } })`
  // In a stack project, import both from the generated `.stack/native-auth.ts`
  // instead of hand-copying them (the native-ui scaffold already does).
  storage: SecureStore,    // the secure key-value store tokens persist in
});

// In a screen: const client = useAuthClient(); signInWithGoogle(client);
```

`cookiePrefix` must equal the `cookies.prefix` the worker is configured with. The client filters
the server's `Set-Cookie` by that prefix, so a mismatch drops the session cookie on every device,
silently, and the app reads as signed out. The generated `.stack/native-auth.ts` exports the
resolved `cookiePrefix` and `scheme`, so importing from there removes the sync burden.

`storage` is injected (not imported here) so this layer never pulls native modules
into Node/test importers; the consumer passes the secure-store module directly.
With `plugin-native-ui` this file is scaffolded for you at `src/lib/auth.ts`.

The client also wires `emailOTPClient()`, so a passwordless email option is
available alongside the social providers (works in Expo Go and before OAuth
credentials exist). It needs no scheme or native module — the worker emails a code
via the `sendOTP` callback, the user enters it, a session is issued:

```tsx
import { sendEmailOtp, signInWithEmailOtp } from "@fcalell/plugin-auth/expo";

await sendEmailOtp(client, email);                 // → user receives a code
await signInWithEmailOtp(client, { email, otp });  // → session issued
```

Requires the server `emailOtp` option (on by default) and a `sendOTP` callback in
`src/worker/plugins/auth.ts`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-auth` | `auth()`, `AuthOptions` |
| `@fcalell/plugin-auth/ability` | `defineAbility()`, `subject()`, `assertCan()`, `packAbility()` / `unpackAbility()` / `PackedRules`, `compileStatements()` -- record-scoped authorization (isomorphic) |
| `@fcalell/plugin-auth/access` | `createAccessControl()`, `getStatements()`, `defaultOrgRoles` |
| `@fcalell/plugin-auth/infer` | `InferUser<T>`, `InferSession<T>` -- type utilities derived from config |
| `@fcalell/plugin-auth/expo` | `createAuthClient()`, `AuthProvider`, `useAuthClient()`, `signInWith{Apple,Google}()`, `sendEmailOtp()` / `signInWithEmailOtp()` -- native client (runtime-only) |
| `@fcalell/plugin-auth/runtime` | `authRuntime()`, `AuthCallbacks` -- runtime plugin factory + worker-safe callback file typing |
| `@fcalell/plugin-auth/schema` | `user`, `session`, `account`, `verification` -- core identity tables (always re-exported) |
| `@fcalell/plugin-auth/schema/organization` | `organization`, `member`, `invitation` -- organization tables (re-exported only when `organization` is enabled) |

## License

MIT
