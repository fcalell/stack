# Sign-in

Email one-time codes are on by default; OAuth and passkeys are options of `auth()`. Better Auth
serves every sign-in under `/api/auth` on the worker, and the dev server proxies that path, so in
dev the web client calls the page's own origin.

## OAuth

`socialProviders.google` and `.apple` take `true` for the conventional var names
(`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET`) or
`{ clientIdVar, clientSecretVar }` to rename them. Apple takes `appBundleIdentifier` for native
ID-token sign-in. Only the names reach the worker; it reads the credentials from env per request.

```ts
auth({ emailOtp: false, socialProviders: { google: true, apple: true } }),
```

`emailOtp: false` makes an OAuth-only app: no code sign-in and no required `sendOTP`.

## Passkeys

`passkey: {}` turns them on with every setting derived: `rpID` from `app.domain`, `rpName` from
`app.name`, the accepted origins from the production CORS list. Set any of them, or
`authenticatorSelection`, on the same object. Re-export the `passkey` table (see
[config](./config.md)). Under `stack dev` the ceremony runs on `localhost`, so a passkey enrolled
in dev works only in dev. Enrolling needs a session younger than `session.freshAge`: the user
signs in another way first, calls `passkey.addPasskey()`, and signs in with `signIn.passkey()`
after.

## The web client

`createAuthClient` from `@fcalell/plugin-auth/client` is Better Auth's React client, so
`authClient.useSession()` is a hook. Pass the flags the config sets, so the client offers what
the server serves:

```ts
// src/app/lib/auth.ts
import { createAuthClient } from "@fcalell/plugin-auth/client";

export const authClient = createAuthClient({ passkey: true, organization: true });

await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
await authClient.signIn.emailOtp({ email, otp });
await authClient.signIn.social({ provider: "google" });
```

`emailOtp` defaults to `true` on both sides. `organization` takes `true`, or
`{ statements, roles }` from your access control (see [organizations](./organizations.md)), and
then `organization.inviteMember({ role })` takes only your role names. `baseURL` defaults to the
page's origin.

## The native client

The phone signs in through `@fcalell/plugin-auth/expo`, set up by `auth({ expo: true })`: its
server option, scaffolded client and sign-in helpers are
`node_modules/@fcalell/plugin-expo/guide/native-auth.md`.

## Rules

- The server decides which providers exist: a client call to a provider the config leaves off
  fails.

**Check:** `pnpm check` passes, and under `pnpm dev` a sign-in sets the session cookie.
