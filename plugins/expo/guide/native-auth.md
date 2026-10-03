# Signing in on the phone

The phone signs in against the same worker as the web, through `@fcalell/plugin-auth/expo`. The
server side is one option; the client is a scaffolded file; a screen calls one helper per way of
signing in.

## The server

`auth({ expo: true })` adds Better Auth's Expo plugin to the worker, trusts the app's deep-link
scheme (`<scheme>://` and `<scheme>://*`) and sets the session cookies to `sameSite: "none"`,
since a phone client is always cross-site. Its scheme is `app.name` as written, while `expo()`'s
is the slug of `app.name`; when the two differ (a name with capitals or spaces), give both the
same one: `expo({ scheme: "acme" })` and `auth({ expo: { scheme: "acme" } })`.

## The client

`nativeUi()` scaffolds `src/lib/auth.ts` once, and the generated entry wraps the app in
`AuthProvider` with it:

```ts
// src/lib/auth.ts
import { type AuthClient, createAuthClient } from "@fcalell/plugin-auth/expo";
import * as SecureStore from "expo-secure-store";
import { cookiePrefix, scheme } from "../../.stack/native-auth";

export const authClient: AuthClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787",
  scheme,
  cookiePrefix,
  storage: SecureStore,
});
```

Keep `scheme` and `cookiePrefix` imported from `.stack/native-auth.ts`: it holds the scheme the app
config carries and the prefix the worker sets its cookies under. The client keeps only the
cookies under that prefix, so a hand-typed one that differs drops every session, silently, and
the app reads as signed out. `baseURL` is the worker's origin, the same `EXPO_PUBLIC_API_URL` as
[the API client](./api-client.md).

## A sign-in screen

A screen reads the client with `useAuthClient()` and calls a helper with it.

```tsx
const client = useAuthClient();
await sendEmailOtp(client, email);
await signInWithEmailOtp(client, { email, otp });
```

| Helper | What it does |
| --- | --- |
| `sendEmailOtp(client, email)`, `signInWithEmailOtp(client, { email, otp, name? })` | Emails a code, then signs in with it; `name` is used only when the address registers. Needs the server's `emailOtp` (on by default) and a `sendOTP` callback in `src/worker/plugins/auth.ts`. Needs no scheme and no native module. |
| `signInWithGoogle(client, { callbackURL? })`, `signInWithApple(client, { callbackURL? })` | Opens the system browser for the provider, returning to `callbackURL` in the app. |
| `signInWithGoogleNative(client, { webClientId, iosClientId?, scopes?, offlineAccess? })` | The OS account sheet through `@react-native-google-signin/google-signin`, then the ID token to the worker. `webClientId` is the worker's `GOOGLE_CLIENT_ID`. |
| `signInWithAppleNative(client, { nonce?, requestedScopes? })` | The iOS Apple sheet through `expo-apple-authentication`, forwarding the name and email Apple sends only on the first sign-in; on Android it opens the browser flow. |

The two native helpers need their module installed and listed in `expo({ configPlugins })`, and
so a development build ([builds](./builds.md)). Which providers the worker accepts is the
server's `socialProviders`. The code step draws with `InputOtp` inside a `FormField`; its
measured range is ui-core's `patterns/login-and-otp.md`.
