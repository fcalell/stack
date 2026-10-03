# Auth config

`auth()` in `stack.config.ts` turns on sign-in, sessions and, when asked, organizations. It needs
`api()` and `db()` in the config, and runs on Cloudflare and on Node alike.

```ts
// stack.config.ts
auth({
  cookies: { prefix: "my-app" },
  organization: true,
  passkey: {},
  socialProviders: { google: true },
}),
```

## Options

| Option | Default | Effect |
| --- | --- | --- |
| `cookies.prefix` / `cookies.domain` | `better-auth` / unset | The session cookie's name prefix and domain |
| `session.expiresIn` | 7 days | Session length, in seconds |
| `session.updateAge` | unset | How often, in seconds, a session's expiry is refreshed |
| `session.freshAge` | 1 day | How young a session must be to count as fresh. `0` turns the check off, so any stolen cookie can delete its account |
| `emailOtp` | `true` | Email one-time-code sign-in; `false` for an OAuth-only app |
| `socialProviders.google` / `.apple` | off | OAuth, see [sign-in](./sign-in.md) |
| `passkey` | `false` | `{}` turns passkeys on, see [sign-in](./sign-in.md) |
| `organization` | off | `true` or `{ ac, roles }`, see [organizations](./organizations.md) |
| `user.deleteUser` | `false` | Account deletion, see [callbacks](./callbacks.md). A native app on the App Store needs it |
| `expo` | off | A native client: trusts the deep-link scheme `expo()` registers; see `node_modules/@fcalell/plugin-expo/guide/native-auth.md` |
| `secretVar` / `appUrlVar` | `AUTH_SECRET` / `APP_URL` | The env var names below |
| `rateLimiter.ip` / `.email` | 100 and 3 per 60 s | Cloudflare rate-limiter `binding`, `limit` and `period` (10 or 60). Node has no limiter |

## Env vars

Auth declares its env vars, so each reaches `.dev.vars` on Cloudflare, the dev process on Node,
and the worker's check on its first request, which refuses to serve while one is missing.

| Var | Dev value | Production |
| --- | --- | --- |
| `AUTH_SECRET` | a 32-character placeholder | 32 characters or more |
| `APP_URL` | the first frontend dev origin, else the server's | the app's public URL; a non-local one while `STACK_DEV` is set refuses to serve |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | placeholders, per enabled provider | the provider's credentials |

## Schema

The identity tables are auth's. Re-export them from `src/schema/index.ts`, so they are migrated:
the adapter never creates a table.

```ts
// src/schema/index.ts
export * from "@fcalell/plugin-auth/schema"; // user, session, account, verification: always
export * from "@fcalell/plugin-auth/schema/organization"; // organization, member, invitation: with `organization`
export * from "@fcalell/plugin-auth/schema/passkey"; // passkey: with `passkey`
```

## Rules

- Migrate the auth tables with the db plugin's commands, never `@better-auth/cli migrate`.
- Never add a column to an auth table. Data kept per user or per organization lives in your own
  table keyed by `user.id` or `organization.id`, its reference `onDelete: "cascade"`.
- The auth tables' names are entities already: `reads: ["member"]` type-checks without your
  schema exporting them under its own names.
- The session's user has `id`, `name`, `email`, `emailVerified`, `image`, `createdAt` and
  `updatedAt`; type it with `SessionUser` from `@fcalell/plugin-auth/infer`.

**Check:** `stack generate`, then `pnpm check` passes.
