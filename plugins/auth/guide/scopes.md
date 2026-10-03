# Scopes

A scope is one tenancy level a procedure acts inside. The organization is the root scope, exported
as `organization` from `@fcalell/plugin-auth/scope`; a table of yours under it, or under another
scope, becomes one with `defineScope`. Scopes need `auth({ organization })`.

Declare every scope in `src/shared/scopes.ts`, a module the worker and the app both import:

```ts
// src/shared/scopes.ts
import { defineScope, organization } from "@fcalell/plugin-auth/scope";
import * as schema from "../schema/index.ts";

export const project = defineScope({
  name: "project",
  table: schema.project,
  parent: [organization, schema.project.organizationId],
  slug: schema.project.slug,
});

export const page = defineScope({
  name: "page",
  table: schema.page,
  parent: [project, schema.page.projectId],
});
```

`procedure({ auth: true, scope: page })` then takes `pageId` in its input and loads, per request,
the page, its project, its organization and the caller's `member` row into the context as `page`,
`project`, `organization` and `member`, one indexed lookup per level. The parents come from the
rows, so a client cannot pair a page with another project's id. A missing row and a caller who is
no member of the organization both answer `NOT_FOUND`. `can` checks that member's role: roles live
on the organization membership, and every scope below inherits them.

## Lookup by slug

Each scope with a `slug`, the organization included, gets a procedure that resolves a URL's slug
to its chain: `auth.scope.<name>.bySlug`, taking `{ slug }` for the organization and
`{ slug, parentId }` below it. It answers the same rows a scoped procedure loads, or `NOT_FOUND`.
It declares `reads` on `member` and on each table of its chain by the table's SQL name, so a
mutation that declares `writes: ["project"]` refreshes it.

## Rules

- The table has an `id` primary key; the parent column and the slug column are its own.
- A slug is unique within its parent: give the table a unique index on the parent column and the
  slug.
- Export each scope's table from `src/schema/index.ts` under its SQL name (`project` for the table
  `project`), so its entity matches the lookup's reads.
- `organization` and `member` are taken as scope names; every scope name is unique.
- The parent column references the parent's `id` with `onDelete: "cascade"`, so a deleted
  organization takes its scopes with it.
- Never resolve a tenancy level by hand in a handler: declare the scope.

**Check:** `stack generate`, then `pnpm check` passes.
