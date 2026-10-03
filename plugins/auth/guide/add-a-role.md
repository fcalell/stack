# Add a role or a permission

A permission is an action on a resource in the access control; a role grants a set of them. Work
the steps in order; each names the page it needs and ends with its check.

## 1. Declare it

Add the action to its resource in `ac` (a new resource is a new key), then grant it to each role
that holds it, or add the role with `ac.newRole`. With `organization: true` still in the config,
move to `{ ac, roles }` first and copy the default roles you keep. Page:
[organizations](./organizations.md).

```ts
// src/shared/access.ts
export const ac = createAccessControl({ /* ... */ project: ["create", "update", "delete", "archive"] });
export const roles = { /* ... */ editor: ac.newRole({ project: ["create", "update", "archive"] }) };
```

**Check:** `stack generate`, then `pnpm check` passes.

## 2. Gate the procedure

Set `can: ["archive", "project"]` on the procedure, beside its `auth: true` and `scope`. Page:
api's procedures page (`node_modules/@fcalell/plugin-api/guide/procedures.md`).

**Check:** `pnpm check` passes, and the action and resource autocomplete in `can`.

## 3. Gate the screen

Show the control only when `useAbility(organizationId).can("archive", "project")` answers yes.
Page: api's client page (`node_modules/@fcalell/plugin-api/guide/client.md`).

**Check:** under `pnpm dev`, a member without the grant sees no control.

## 4. Test it

Call the procedure as a member of a role that holds the grant and as one that does not. Page:
[testing](./testing.md).

**Check:** `node --test` passes on the test file, the second call answering `FORBIDDEN`.
