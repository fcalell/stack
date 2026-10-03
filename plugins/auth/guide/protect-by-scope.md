# Protect a procedure by scope

A procedure that acts on a tenant's data takes its scope, so only members of the organization
above it reach the handler. Work the steps in order; each names the page it needs and ends with
its check.

## 1. Find or declare the scope

A procedure on an organization's own rows takes `organization`. A procedure on a row of a table
below it takes that table's scope: find it in `src/shared/scopes.ts`, or declare it with
`defineScope`. Page: [scopes](./scopes.md).

**Check:** `stack generate`, then `pnpm check` passes.

## 2. Set it on the procedure

Set `auth: true` and `scope`, give the procedure a `z.object` input, and read the rows from the
context, never from an id of the input's own. Add `can` when only some roles may act. Page: api's
procedures page (`node_modules/@fcalell/plugin-api/guide/procedures.md`).

```ts
rename: procedure({ auth: true, scope: project, can: ["update", "project"], writes: ["project"] })
  .input(z.object({ name: z.string().min(1) }))
  .mutation(async ({ input, context }) => {
    // update context.project through context.db
  }),
```

**Check:** `pnpm check` passes, and the procedure's input requires `projectId`.

## 3. Test it

Call it as a member and as a stranger. Page: [testing](./testing.md).

**Check:** `node --test` passes on the test file, the stranger's call answering `NOT_FOUND`.
