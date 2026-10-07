# @fcalell/plugin-auth

Authentication for `@fcalell/stack`: Better Auth with email codes and magic links, OAuth (Apple, Google),
passkeys, organizations with roles, tenancy scopes and record abilities, on either deploy target.

## Install

```bash
stack add auth
```

## Guide

Using auth in an app lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`config.md`](./guide/config.md), [`callbacks.md`](./guide/callbacks.md),
[`sign-in.md`](./guide/sign-in.md), [`mcp-oauth.md`](./guide/mcp-oauth.md),
[`organizations.md`](./guide/organizations.md),
[`scopes.md`](./guide/scopes.md), [`abilities.md`](./guide/abilities.md),
[`testing.md`](./guide/testing.md), and the recipes [`add-a-role.md`](./guide/add-a-role.md) and
[`protect-by-scope.md`](./guide/protect-by-scope.md).

## Plugin implementation

Built with `plugin` from `@fcalell/cli`; requires `api` and `db`. Callbacks are declared with
`callback.optional<AuthCallbackPayloads[...]>()`, the payload types `AuthCallbacks` in
`./runtime` derives from too, so the two never drift. `sendOTP` is required at runtime while
`emailOtp` is on, `sendMagicLink` while `magicLink` is.

### Owned slots

| Slot | Kind | Purpose |
| --- | --- | --- |
| `runtimeOptions` | derived | The `authRuntime({ ... })` options. Reads `api.slots.cors`, `devCorsOrigins`, `devTargetOrigins`, `reservedSlugs` and `api.slots.nativeScheme`, so `trustedOrigins` is computed against the resolved CORS list; dev origins ride in `devTrustedOrigins`, applied only under `STACK_DEV`. Throws when the CORS list is empty |
| `appUrlDevDefault` | derived | `APP_URL`'s dev default: the first frontend dev origin, else the deploy target's, else `https://<domain>` |
| `callbackFile` | value | The callback file, `src/worker/plugins/auth.ts`; an override must stay under `src/` |
| `cookiePrefix` | value | The resolved cookie prefix (`better-auth` unset), read by native-ui's generated constants |
| `clientFlags` | value | The web client's flags (`passkey`, `emailOtp`, `magicLink`, `organization`, `mcp`), null without auth |
| `reservedSlugs` | list | A frontend's top-level routes, baked beside `RESERVED_SLUGS` as the organization slugs the runtime refuses |

`sameSite: "none"` is baked for a native consumer; the runtime widens web cookies to `none` in
dev, where the frontend and the worker are cross-origin.

### Slot contributions

| Target slot | Behaviour |
| --- | --- |
| `cloudflare.slots.compatibilityFlags` | `nodejs_compat` |
| `cloudflare.slots.bindings` | The IP and email rate limiters, and with `mcp` the agent one (`RATE_LIMITER_AGENT`, 120 per 60 s) |
| `api.slots.env` | `AUTH_SECRET` (`minLength: 32`), `APP_URL` (`url`, `devLocalhost`), and a client id and secret per OAuth provider |
| `api.slots.routePrefixes` | `/api/auth`, and with `mcp` the two `/.well-known/oauth-*` discovery prefixes |
| `api.slots.workerImports` | `src/shared/scopes.ts` as a namespace, with organizations on and the file present |
| `api.slots.pluginRuntimes` | `authRuntime(...)` from `runtimeOptions` |
| `api.slots.testingEntries` | `authTesting({ cookiePrefix, secretVar, appUrlVar, expiresIn?, roles?, mcp? })` |
| `api.slots.callbacks` | The callback file, whenever it exists; its absence throws while `emailOtp` or `magicLink` is on |
| `api.slots.rbacStatements` | `ac`'s statements, else the default organization statements |
| `api.slots.entities` | The auth tables' export names, organization, passkey and OAuth (`mcp`) tables when enabled |
| `screens.slots.handlerModules` | `@fcalell/plugin-auth/screens`: MSW handlers answering `GET */api/auth/get-session` with a signed-in session typed by Better Auth's `Session` and `User`; unread without `screens` in the config |
| `cliSlots.initPrompts` | Cookie prefix and organization toggle |
| `cliSlots.initScaffolds`, `cliSlots.removeFiles` (auto) | `src/worker/plugins/auth.ts` from `templates/callbacks.ts` |

### Runtime

`authRuntime(options)` from `./runtime` depends on `db`'s context and provides `{ auth }`, plus
`{ tenancy }` with organizations on and `{ oauth }` with `mcp` on (`verify(request)` and
`revokeGrant(id)`, see [`mcp-oauth.md`](./guide/mcp-oauth.md)). With `mcp` it adds `jwt()`,
`mcp()` and `cimd()` (profile `mcp-2026-07-28`, over the DoH transport in `worker/cimd-transport.ts`,
which cannot pin the checked address) with the pins `mcp-oauth.md` lists, closes `/token` and the
consent listing paths, and hands the discovery paths to Better Auth behind the IP limiter. It builds Better Auth once per `env` (a `WeakMap`), with
`session.cookieCache` at 5 minutes (off for a native consumer, which round-trips one cookie only)
and `cf-connecting-ip` as the client IP header. With organizations on, its `routes()` registers
`auth.orgRules` and `auth.scope.<name>.bySlug`. The schema subpaths are the
`@better-auth/cli generate` shape, ported (the OAuth tables carry no cascade and one unique index on
the consent's client, user and reference); re-run that and diff after a Better Auth bump.

## License

MIT
