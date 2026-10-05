# Testing as a signed-in user

Auth adds `auth` helpers to the test entry's handle, so a test signs in as a user or as a member
of a role in one call. Booting the entry and calling procedures is api's testing page
(`node_modules/@fcalell/plugin-api/guide/testing.md`); this page covers only the sign-in.

```ts
// src/worker/routes/projects.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ORPCError } from "@fcalell/plugin-api/testing";
import { testing } from "../../../.stack/testing.ts";

test("only a member lists the organization's projects", async () => {
  await using app = await testing.boot();
  const org = await app.auth.organization();
  const { cookie } = await app.auth.member({ organizationId: org.id, role: "editor" });
  await app.client({ cookie }).projects.list({ organizationId: org.id });

  const stranger = await app.auth.session((await app.auth.user()).id);
  await assert.rejects(
    app.client({ cookie: stranger }).projects.list({ organizationId: org.id }),
    (error) => error instanceof ORPCError && error.code === "NOT_FOUND",
  );
});
```

| Helper | Does |
| --- | --- |
| `auth.user({ email?, name? })` | Writes a user and answers it |
| `auth.session(userId)` | Signs that user in and answers the cookie header |
| `auth.organization({ name?, slug? })` | Writes an organization. Only with `organization` on |
| `auth.member({ organizationId, role, user? })` | Writes a member of `role`, creating the user unless one is given, signs it in, and answers `{ user, member, cookie }`. Only with `organization` on |
| `auth.oauth.register()` | Writes a public client of both scopes with a loopback redirect, and answers `{ clientId, redirectUri }`. Only with `mcp` on |
| `auth.oauth.connect({ member, organizationId, client })` | Runs the authorization for a signed-in member (authorize, the organization choice, consent, the PKCE exchange) and answers `{ accessToken, refreshToken, grantId }` |
| `auth.oauth.refresh(refreshToken, client)` | Answers the rotated `{ accessToken, refreshToken }` |

`role` is typed to the configured role names, so another name is a compile error. `cookie` is
what `client({ cookie })` sends. `connect` throws when the member's authorization resolves another
organization than `organizationId` (a member of one organization is granted that one), naming it.
A token reaches a route of your own through `context.oauth.verify` ([mcp-oauth](./mcp-oauth.md)).

## Rules

- Sign in with the helpers, never through a code or an OAuth flow (`auth.oauth` runs the flow
  with no network: its client is written to the database, never fetched by its metadata document): a session is a row written
  straight to the database and a cookie signed with the env's `AUTH_SECRET`.
- Write a scope's own rows (a project under the organization) through `app.db`, the test's
  drizzle client, before calling a procedure scoped to them.
- Test a scoped procedure twice at least: as a member who may act, and as a stranger or a member
  of another organization, who gets `NOT_FOUND`.
- The helpers write through the db testing plugin, which exists on the `d1` dialect only; a
  `sqlite` app's boot refuses them.
- `boot({ env: { APP_URL } })` changes the cookie's name: an `https` URL adds `__Secure-`.

A test holding its own drizzle client signs in with `mintSession(db, { secret, cookiePrefix,
secure }, userId)` from `@fcalell/plugin-auth/testing`, which answers `{ name, value }`.

**Check:** `node --test` passes on the test file.
