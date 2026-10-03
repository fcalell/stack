# Add a procedure

An endpoint the app calls is one procedure in a route file, its client call, and a test. Work
the steps in order; each names the page it needs and ends with its check.

## 1. Name what it reads and writes

Decide the entities the procedure reads or writes (the Drizzle tables by their export names), who
may call it (public, signed in, a member of a scope, a member who `can` act), and whether it pages.
Page: [procedures](./procedures.md), its options table.

**Check:** you can write its `procedure({ ... })` line.

## 2. Write it

Add the procedure to a file in `src/worker/routes/`, a new named export or a key of an existing
one. A new file joins the router when `stack generate` (or `stack dev`'s watcher) rewrites the
barrel. Page: [procedures](./procedures.md).

```ts
// src/worker/routes/projects.ts
export const projects = {
  rename: procedure({ auth: true, scope: organization, can: ["update", "project"], writes: ["projects"] })
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input, context }) => {
      // update the row through context.db
    }),
};
```

**Check:** `stack generate`, then `pnpm check` passes.

## 3. Call it from the app

Call it through the typed client, as a query or a mutation; the cache invalidates from its
`writes` on its own. Page: [client](./client.md).

```tsx
const rename = useMutation(orpc.projects.rename.mutationOptions());
```

**Check:** `pnpm check` passes, and the call answers under `pnpm dev`.

## 4. Test it

Boot the test entry and call it as a stranger and as a member. Page: [testing](./testing.md).

**Check:** `node --test` passes on the test file.
