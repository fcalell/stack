# MCP connections

`auth({ mcp: true })` makes the worker an authorization server for MCP clients: a member connects
a client by signing in, choosing an organization and approving it, and the client holds a 1-hour
access token bound to `${APP_URL}/mcp` and a rotating 30-day refresh token. It needs
`organization`. A client is known by its metadata document
(the URL it uses as its client id); one that only registers dynamically cannot connect.

```ts
// stack.config.ts
auth({ organization: true, mcp: true }),
// src/schema/index.ts
export * from "@fcalell/plugin-auth/schema/oauth"; // the grant and signing-key tables
// client: createAuthClient({ organization: true, mcp: true })
```

The worker serves the discovery documents (`/.well-known/oauth-authorization-server`,
`/.well-known/oauth-protected-resource`) and binds `RATE_LIMITER_AGENT` (120 calls per 60 s per
grant, `rateLimiter.agent`). On Cloudflare with a web build, the bare
`/.well-known/oauth-protected-resource` is a static asset; the challenge names the address with
`/mcp` inserted, which the worker serves. The scopes are `mcp` (the whole tool list) and
`offline_access` (the refresh token); a request without a `resource` gets a token the verifier
refuses.

## The pages the app builds

The authorization sends the member to three addresses, each carrying a signed query:

| Page | Does |
| --- | --- |
| `/sign-in` | Signs in by code; the client attaches the query to its calls, so the sign-in's response is `{ redirect: true, url }` and the client follows it |
| `/connect/organization` | Always `organization.setActive({ organizationId })`, the active one too: it resumes the authorization to consent. A member of none sees an empty state whose Deny calls `oauth2.consent({ accept: false })`, which answers the client `access_denied` |
| `/connect/consent` | Reads the client with `oauth2.publicClient`, shows the session's active organization, and calls `oauth2.consent({ accept })` |

Consent is asked on every authorization. A member of one organization skips the choice; a choice
the member's membership does not resolve (an expired external member, an unknown id, none) is
refused `403` with code `ORGANIZATION_NOT_RESOLVED`.

## Verifying a call

`context.oauth` is on a procedure's context beside `tenancy`. `verify(request)` reads only the
`Authorization` header and answers the grant's member, or the `Response` the client reads:

```ts
const verified = await context.oauth.verify(request);
if (verified instanceof Response) return verified; // 401, 403 or 429, with WWW-Authenticate
const { user, session, member, grant, tenancy } = verified;
```

`user` is the member's user row with `agent: true`. `session.id` is the grant's id and carries no
token. `tenancy` resolves the grant's organization for the member and no other. `grant` is
`{ id, clientId, organizationId, scopes }`. A token is refused when its signature, issuer,
audience (exactly the resource), `typ` (`at+jwt`) or expiry fails, when `mcp` is missing (`403`),
when its grant's consent no longer stands, when the member's membership no longer counts, or when
it was issued before the consent that now stands. The grant's id keys the limiter, except under
`STACK_DEV`.

`revokeGrant(id)` deletes a grant's consent and tokens and answers whether it existed.
Removing a member, a member leaving and deleting an organization end their grants there.
Reconnecting a revoked client starts a new grant; its older tokens stay refused.

## Rules

- One grant per client, member and organization; the same client connected twice to one
  organization shares it, and both connections' refresh tokens keep working.
- A client holds one token per server address, so connecting it to a second organization replaces
  the first in the client; both grants stand until revoked.
- A refresh token reused after its 30-second window revokes every refresh token of that client for
  the member.
- Test with `auth.oauth` ([testing](./testing.md)), which runs the flow through the worker.

**Check:** `stack generate`, `stack db generate`, then a test connects a member and `verify`
answers their organization.
