# Sign-in

Email one-time codes are on by default; magic links, OAuth and passkeys are options of `auth()`. A web
app reads the session and signs in and out through the `orpc.auth.*` procedures (see
[The web app's calls](#the-web-apps-calls)); Better Auth itself serves under `/api/auth` on the
worker, which the dev server proxies, for the emailed link's verification, OAuth and passkeys.

## Magic links

`magicLink: true` adds sign-in by emailed link and requires `sendMagicLink({ email, url, token, env })`
in the callbacks file (see [callbacks](./callbacks.md)). The token expires in 5 minutes, is stored
hashed and is spent on its first verification. The send is rate limited per email, sharing the
bucket of the code send. An address with no user signs up when its link is first opened.

```ts
auth({ magicLink: true }),
// a web app
await orpc.auth.signIn.magicLink.call({ email, callbackURL: "/home" });
```

`callbackURL` is relative or on a trusted origin; the verify redirect refuses any other. A
spent, unknown or expired link redirects to `callbackURL` with `error=INVALID_TOKEN`.

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

## The web app's calls

A web app never imports Better Auth's client for what the worker serves as procedures. Each is a
typed oRPC procedure under `auth`, present while its option is on and a type error to name
otherwise; a mutation invalidates the queries that read what it writes, with no code in the app.

```ts
const session = useQuery(orpc.auth.session.queryOptions()); // { user, session } | null
await orpc.auth.signIn.sendOtp.call({ email });
await orpc.auth.signIn.verifyOtp.call({ email, otp });
await orpc.auth.user.update.call({ name });
await orpc.auth.signOut.call();
```

| Procedure | Option | Input | Answers |
| --- | --- | --- | --- |
| `auth.session` (query) | always | `{ disableCookieCache? }`, optional | `{ user, session } \| null`; reads `session` |
| `auth.signOut` | always | none | `{ success }`; writes `session` |
| `auth.user.update` | always, session | `{ name?, image? }` | `{ status }`; writes `session`, `member` |
| `auth.signIn.sendOtp` | `emailOtp` | `{ email }` | `{ success }` |
| `auth.signIn.verifyOtp` | `emailOtp` | `{ email, otp (six digits), name?, image?, oauthQuery? }` | `{ token, user }`, or `{ redirect: true, url }` inside an MCP authorization; writes `session` |
| `auth.signIn.magicLink` | `magicLink` | `{ email, name?, callbackURL?, newUserCallbackURL?, errorCallbackURL?, oauthQuery? }` | `{ status }` |

Both sends take the per-email limit (`TOO_MANY_REQUESTS` when it refuses). A refusal is an
`ORPCError` whose `code` is the endpoint's (`BAD_REQUEST` for a wrong code or an invalid email) and
whose `data.code` is Better Auth's own (`INVALID_OTP`). The organization, member and invitation
calls are in [organizations](./organizations.md). `oauthQuery` exists only with `mcp`, and
with it the answer may be the redirect that resumes the authorization (see [mcp-oauth](./mcp-oauth.md)).

What has no procedure stays on `createAuthClient` from `@fcalell/plugin-auth/client`, Better Auth's
React client: social sign-in and passkeys. Pass the flags the config
sets, so the client offers what the server serves:

```ts
// src/app/lib/auth.ts
import { createAuthClient } from "@fcalell/plugin-auth/client";

export const authClient = createAuthClient({ passkey: true });

await authClient.signIn.social({ provider: "google" });
```

`baseURL` defaults to the page's origin.

## The native client

The phone signs in through `@fcalell/plugin-auth/expo`, set up by `auth({ expo: true })`: its
server option, scaffolded client and sign-in helpers are
`node_modules/@fcalell/plugin-expo/guide/native-auth.md`.

## Rules

- The server decides which providers exist: a call to a provider the config leaves off fails, and
  its procedure is absent from `AppRouter`.
- Read the session through `orpc.auth.session`, never `authClient.useSession()`, in a web app.

**Check:** `pnpm check` passes, and under `pnpm dev` a sign-in sets the session cookie.
