# Scopes

A scope is one tenancy level a procedure acts inside. The organization is the root scope, exported
as `organization` from `@fcalell/plugin-auth/scope`; a table of yours under it, or under another
scope, becomes one with `defineScope`. Scopes need `auth({ organization })`.

Declare every scope in `src/shared/scopes.ts`, a module the worker and the app both import:

```ts
// src/shared/scopes.ts
import { member } from "@fcalell/plugin-auth/schema/organization";
import { defineMembership, defineScope, organization } from "@fcalell/plugin-auth/scope";
import { sql } from "@fcalell/plugin-db/orm";
import * as schema from "../schema/index.ts";

const { membership } = schema;

export const unexpired = defineMembership(
  sql`not exists (select 1 from ${membership} where ${membership.memberId} = ${member.id}
    and ${membership.expiresAt} <= cast(unixepoch('subsecond') * 1000 as integer))`,
);

export const project = defineScope({
  name: "project",
  table: schema.project,
  parent: [organization, schema.project.organizationId],
  slug: schema.project.slug,
  where: (m) => sql`${schema.project.ownerId} = ${m.userId}`,
});

export const page = defineScope({
  name: "page",
  table: schema.page,
  parent: [project, schema.page.projectId],
});
```

`procedure({ auth: true, scope: page })` then takes `pageId` in its input and loads, per request,
the page, its project, its organization and the caller's `member` row into the context as `page`,
`project`, `organization` and `member`, one indexed lookup per level, plus one more for each level
that declares `where`. The parents come from the rows, so a client cannot pair a page with another
project's id. A missing row and a caller who is no member of the organization both answer
`NOT_FOUND`. `can` checks that member's role: roles live on the organization membership, and every
scope below inherits them.

## Who sees a row

Two optional predicates narrow resolution, both drizzle `sql` fragments so the module stays
isomorphic:

- `defineMembership(fragment)` decides which `member` rows count as a membership: a fragment over
  `member`, correlated to your own tables. Export at most one; two fail at startup.
- A scope's `where` takes the caller's `member` row and returns a fragment over the scope's table:
  whether that row is visible to them. Reuse the same function to filter your lists.

A failing predicate answers the same `NOT_FOUND` as a missing row, before `can` runs, in every
scoped procedure, `bySlug` and `auth.orgRules`. A level below an invisible one is refused with it.

## Lookup by slug

Each scope with a `slug`, the organization included, gets a procedure that resolves a URL's slug
to its chain: `auth.scope.<name>.bySlug`, taking `{ slug }` for the organization and
`{ slug, parentId }` below it. It answers the same rows a scoped procedure loads, or `NOT_FOUND`.
It declares `reads` on `member` and on each table of its chain by the table's SQL name, so a
mutation that declares `writes: ["project"]` refreshes it. A table only a predicate reads is not
among them.

In a handler, `context.tenancy.resolve(scope, id, userId)` and `bySlug(...)` answer the same rows
typed by the scope: `ScopeContext<typeof scope> | null`.

## Rules

- The table has an `id` primary key; the parent column and the slug column are its own.
- A slug is unique within its parent: give the table a unique index on the parent column and the
  slug.
- Export each scope's table from `src/schema/index.ts` under its SQL name (`project` for the table
  `project`), so its entity matches the lookup's reads.
- A scope name is never a key the procedure context already carries (`env`, `httpRequest`, `reqHeaders`, `resHeaders`, `executionCtx`, `_devMode`, `db`, `auth`, `tenancy`, `_rateLimiter`, `user`, `session`, `organization`, `member`): `defineScope` throws on one. Every scope name is unique.
- The parent column references the parent's `id` with `onDelete: "cascade"`, so a deleted
  organization takes its scopes with it.
- Never resolve a tenancy level by hand in a handler: declare the scope.

**Check:** `stack generate`, then `pnpm check` passes.
