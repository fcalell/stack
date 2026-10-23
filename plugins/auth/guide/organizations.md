# Organizations and roles

`auth({ organization: true })` gives the app organizations, members with a role each, and
invitations. Re-export the organization tables (see [config](./config.md)). A procedure acts in
one organization by taking its `scope` (see [scopes](./scopes.md)), and checks the caller's role
with `can`.

## Roles

With `organization: true` the roles are Better Auth's `owner`, `admin` and `member`, over the
statements `organization: [update, delete]`, `member: [create, update, delete]`,
`invitation: [create, cancel]` and `team: [create, update, delete]`. An `owner` holds them all, an
`admin` all but deleting the organization, a `member` none.

Your own permissions take an access control and its roles, declared once in a module the config
and the web client both import:

```ts
// src/shared/access.ts
import { createAccessControl } from "@fcalell/plugin-auth/access";

export const ac = createAccessControl({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "update", "delete"],
});

export const roles = {
  owner: ac.newRole({
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    project: ["create", "update", "delete"],
  }),
  editor: ac.newRole({ project: ["create", "update"] }),
};
```

```ts
// stack.config.ts
import { ac, roles } from "./src/shared/access.ts";
auth({ organization: { ac, roles } }),

// src/app/lib/auth.ts
```

`roles` replaces the default roles. Its statements name what `procedure({ can })` autocompletes.
A role is a `string` in the calls below: the roles are yours, so a name Better Auth does not know
is refused by the server, not the type.

## Rules

- Keep an `owner` role: Better Auth makes an organization's creator its owner.
- Keep the `organization`, `member` and `invitation` statements, granted to whoever manages them:
  Better Auth's own endpoints check them.
- Gate a procedure with `can: [action, resource]`, never by reading `member.role` in the handler.
- Never read the session's active organization: the organization comes from the scope's input.
- Delete an organization through `orpc.auth.organization.delete`, which removes its members
  and invitations first; your tables that reference `organization.id` with
  `onDelete: "cascade"` go with it. A raw `DELETE` fails on the foreign keys.
- Never call `"all"` a resource or `"manage"` an action: both are wildcards to the ability layer
  and throw.

## Slugs

An organization is served at `/<slug>`, so the server refuses a slug the app holds: the reserved
words (`admin`, `api`, `system`, `auth`, `new`, `settings`) and every top-level route of the app.
`auth.organization.create` and an `auth.organization.update` that sets a slug
answer it with `BAD_REQUEST` whose `data` holds the code `ORGANIZATION_SLUG_RESERVED` and
`fieldErrors: { slug }`. A form with a
`slug` field shows it there; a form that derives the slug from a name maps it onto the name.

## The web app's calls

`orpc.auth.organization.*` is the web app's way to manage organizations, members and invitations; each
needs a session, and a mutation invalidates the queries that read what it writes.

| Procedure | Input | Answers |
| --- | --- | --- |
| `list` (query) | none | the caller's organizations; reads `organization`, `member` |
| `create` | `{ name, slug?, logo?, metadata?, keepCurrentActiveOrganization? }`; a missing `slug` is the name's lowercase words joined by hyphens | the organization; writes `organization`, `member`, `session` |
| `update` | `{ name?, slug?, logo?, metadata?, organizationId? }` | the organization; writes `organization` |
| `delete` | `{ organizationId }` | writes `organization`, `member`, `session` |
| `setActive` | `{ organizationId?, organizationSlug? }` | the organization with its members and invitations; writes `session` |
| `activeMember` (query) | none | the caller's member (with its `role`) in the active organization; reads `member`, `session` |
| `members.updateRole` | `{ memberId, role, organizationId? }` | the member; writes `member` |
| `members.remove` | `{ memberIdOrEmail, organizationId? }` | `{ member }`, the removed one; writes `member` |
| `invitations.create` | `{ email, role, organizationId?, resend? }` | the invitation; writes `invitation` |
| `invitations.cancel` | `{ invitationId }` | the invitation; writes `invitation` |
| `invitations.accept` | `{ invitationId }` | `{ invitation, member }`; writes `invitation`, `member`, `organization`, `session` |
| `invitations.reject` | `{ invitationId }` | `{ invitation, member: null }`; writes `invitation` |

```ts
const organizations = useQuery(orpc.auth.organization.list.queryOptions());
await orpc.auth.organization.create.call({ name });
await orpc.auth.organization.invitations.create.call({ email, role: "editor", organizationId });
```

Better Auth checks the caller's role against the statements on each call, and a refusal reaches the
app as an `ORPCError` (`FORBIDDEN`, with Better Auth's `data.code`).

## Abilities

`auth({ organization })` serves the caller's compiled rules per organization, and the client's
`useAbility(organizationId)` reads them (api's abilities page, `node_modules/@fcalell/plugin-api/guide/abilities.md`).
Rules from a record's own data are in [abilities](./abilities.md).

**Check:** `stack generate`, then `pnpm check` passes.
