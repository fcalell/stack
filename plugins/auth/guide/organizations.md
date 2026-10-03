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
createAuthClient({ organization: { statements: ac.statements, roles } });
```

`roles` replaces the default roles. Its statements name what `procedure({ can })` autocompletes,
and its role names type the web client's `inviteMember({ role })` and the test helpers' `role`.

## Rules

- Keep an `owner` role: Better Auth makes an organization's creator its owner.
- Keep the `organization`, `member` and `invitation` statements, granted to whoever manages them:
  Better Auth's own endpoints check them.
- Gate a procedure with `can: [action, resource]`, never by reading `member.role` in the handler.
- Never read the session's active organization: the organization comes from the scope's input.
- Delete an organization through Better Auth's `organization.delete`, which removes its members
  and invitations first; your tables that reference `organization.id` with
  `onDelete: "cascade"` go with it. A raw `DELETE` fails on the foreign keys.
- Never call `"all"` a resource or `"manage"` an action: both are wildcards to the ability layer
  and throw.

## Slugs

An organization is served at `/<slug>`, so the server refuses a slug the app holds: the reserved
words (`admin`, `api`, `system`, `auth`, `new`, `settings`) and every top-level route of the app.
`organization.create`, an `organization.update` that sets a slug, and `organization.checkSlug`
answer it with a 400, code `ORGANIZATION_SLUG_RESERVED` and `fieldErrors: { slug }`. A form with a
`slug` field shows it there; a form that derives the slug from a name maps it onto the name.

## Abilities

`auth({ organization })` serves the caller's compiled rules per organization, and the client's
`useAbility(organizationId)` reads them (api's client page, `node_modules/@fcalell/plugin-api/guide/client.md`).
Rules from a record's own data are in [abilities](./abilities.md).

**Check:** `stack generate`, then `pnpm check` passes.
