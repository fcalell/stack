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
and the recipes [`add-a-role.md`](./guide/add-a-role.md) and
[`protect-by-scope.md`](./guide/protect-by-scope.md).

## Plugin implementation

Built with `plugin` from `@fcalell/cli`; requires `api` and `db`. Callbacks are declared with
`callback.optional<AuthCallbackPayloads[...]>()`, the payload types `AuthCallbacks` in
`./runtime` derives from too, so the two never drift. `sendOTP` is required at runtime while
`emailOtp` is on, `sendMagicLink` while `magicLink` is. The scaffolded stubs log in dev and throw
outside it, and a `deployChecks` contribution refuses `stack deploy` while a required callback
still carries its `// TODO` marker (`src/callback-stubs.ts`). The magic-link procedures hold
`callbackURL`, `newUserCallbackURL` and `errorCallbackURL` to a path on the app or a trusted
origin (`src/worker/callback-url.ts`), the check Better Auth's own skips for a call without a
request.

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
| `api.slots.callbacks` | The callback file, whenever it exists; its absence throws while `emailOtp` or `magicLink` is on |
| `api.slots.rbacStatements` | `ac`'s statements, else the default organization statements |
| `api.slots.entities` | The auth tables' export names (`account`, `session`, `user`, `verification`), organization, passkey and OAuth (`mcp`) tables when enabled; the `auth.*` procedures declare their `reads` and `writes` over them |
| `screens.slots.handlerModules` | `@fcalell/plugin-auth/screens`: MSW handlers answering `GET */api/auth/get-session` with a signed-in session typed by Better Auth's `Session` and `User`; unread without `screens` in the config |
| `screens.slots.fixtureModules` | `@fcalell/plugin-auth/screens-fixtures`: a fixtures tree answering `auth.session` with the same user and session (`src/screens-session.ts` holds them once); unread without `screens` in the config |
| `cliSlots.initPrompts` | Cookie prefix and organization toggle |
| `cliSlots.deployChecks` | Refuses the deploy while a required callback in the callback file still holds its scaffold `// TODO` marker |
| `cliSlots.initScaffolds`, `cliSlots.removeFiles` (auto) | `src/worker/plugins/auth.ts` from `templates/callbacks.ts` |

### Runtime

`authRuntime(options)` from `./runtime` depends on `db`'s context and provides `{ auth }`, plus
`{ tenancy }` with organizations on and `{ oauth }` with `mcp` on (`verify(request)` and
`revokeGrant(id)`, see [`mcp-oauth.md`](./guide/mcp-oauth.md)). With `mcp` it adds `jwt()`,
`mcp()` and `cimd()` (profile `mcp-2026-07-28`, over the DoH transport in `worker/cimd-transport.ts`,
which cannot pin the checked address) with the pins `mcp-oauth.md` lists, closes `/token` and the
consent listing paths, and hands the discovery paths to Better Auth behind the IP limiter. It builds Better Auth once per `env` (a `WeakMap`), with
`session.cookieCache` at 5 minutes (off for a native consumer, which round-trips one cookie only)
and `cf-connecting-ip` as the client IP header. Its `routes()` registers the `auth.*` procedures (below), and `authRuntime` types them into the worker's `AppRouter`, following the options exactly: a procedure of an option that is off is a type error to name. `auth.scope` has one key per scope with a `slug`, so a scope without one is a type error to name. The schema subpaths are the
`@better-auth/cli generate` shape, ported (the OAuth tables carry no cascade and one unique index on
the consent's client, user and reference); re-run that and diff after a Better Auth bump.

### Procedures

A web app reads the session, signs in and out, and manages organizations, members and invitations
through `orpc.auth.*`, never through Better Auth's client. Each procedure runs one Better Auth server
endpoint with the request's headers, copies the `set-cookie` headers it returns onto the response,
and answers the endpoint's body; a Better Auth refusal becomes an `ORPCError` of the matching code
(`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `TOO_MANY_REQUESTS`, else
`INTERNAL_SERVER_ERROR`) with its message, and its `code` and `fieldErrors` as the error's `data`.
The input and output types are the endpoint's. The set depends on the options:

| Procedure | Option | Endpoint | Session | Declares |
| --- | --- | --- | --- | --- |
| `auth.session` (query) | always | `getSession` | no | reads `session` |
| `auth.signOut` | always | `signOut` | no | writes `session` |
| `auth.user.update` | always | `updateUser` | yes | writes `session`, `member` |
| `auth.signIn.sendOtp` | `emailOtp` (on by default) | `sendVerificationOTP`, type `sign-in` | no | |
| `auth.signIn.verifyOtp` | `emailOtp` | `signInEmailOTP` | no | writes `session` |
| `auth.signIn.magicLink` | `magicLink` | `signInMagicLink` | no | |
| `auth.organization.list` (query) | `organization` | `listOrganizations` | yes | reads `organization`, `member` |
| `auth.organization.create` | `organization` | `createOrganization` | yes | writes `organization`, `member`, `session` |
| `auth.organization.update` | `organization` | `updateOrganization` | yes | writes `organization` |
| `auth.organization.delete` | `organization` | `deleteOrganization` | yes | writes `organization`, `member`, `session` |
| `auth.organization.setActive` | `organization` | `setActiveOrganization` | yes | writes `session` |
| `auth.organization.activeMember` (query) | `organization` | `getActiveMember` | yes | reads `member`, `session` |
| `auth.organization.members.updateRole` | `organization` | `updateMemberRole` | yes | writes `member` |
| `auth.organization.members.remove` | `organization` | `removeMember` | yes | writes `member` |
| `auth.organization.invitations.create` | `organization` | `createInvitation` | yes | writes `invitation` |
| `auth.organization.invitations.cancel` | `organization` | `cancelInvitation` | yes | writes `invitation` |
| `auth.organization.invitations.accept` | `organization` | `acceptInvitation` | yes | writes `invitation`, `member`, `organization`, `session` |
| `auth.organization.invitations.reject` | `organization` | `rejectInvitation` | yes | writes `invitation` |
| `auth.oauth.client` (query) | `mcp` | `getOAuthClientPublic`, `{ clientId }` | yes | |
| `auth.oauth.consent` | `mcp` | `oauth2Consent`, `{ accept, scope?, oauthQuery? }` | yes | writes `oauthConsent` |
| `auth.orgRules` (query), `auth.scope.<name>.bySlug` (query) | `organization` | the tenancy | yes | reads `member` and the scope's tables |

The outputs that would name a package a consumer does not install are declared in `@fcalell/plugin-auth/runtime` (`OAuthClientPublic`, `Invitation`, `InvitationStatus`, `AcceptedInvitation`, `RejectedInvitation`, `ActiveOrganization`) and `@fcalell/plugin-auth/ability` (`PackedRuleSet`, the output of `auth.orgRules`), so the app's `AppRouter` types them without `better-auth`, `@better-auth/oauth-provider` or `@casl/ability`. Each procedure declares its type as its output, so the compiler checks the endpoint against it.

`sendOtp` and `magicLink` draw on the email limiter the `fetch` handler applies to the same two
sends (same bucket, same `emailKey`), answering `TOO_MANY_REQUESTS` when it refuses; both skip it
in dev and when no email limiter is bound. The emailed magic link is Better Auth's own GET endpoint,
a browser navigation. With `mcp`, `signIn.verifyOtp`, `signIn.magicLink` and `organization.setActive` also take `oauthQuery`, the authorization page's signed query, which they send as `oauth_query` (where Better Auth's OAuth client plugin puts it) and answer `{ redirect: true, url }` beside their result. The roles are the consumer's own, so `role` is a `string`.

The `auth.session` fixture of the screens workbench is the signed-in user (see the screens guide).

## License

MIT
