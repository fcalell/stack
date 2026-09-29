# PRD: Tenancy, web auth and scopes

Source: the Martechthings migration onto stack (`martechthings/.helm/research/stack-migration.md`,
items S2, S3 and S10). Martechthings is a multi-tenant SaaS: organizations own projects, projects
own pages, and every screen and procedure acts inside one of them. Stack today ties the
organization to the session (`org: true` compares the input `organizationId` with
`session.activeOrganizationId`, and `auth.orgRules` reads the session's active member), covers no
consumer table, and gives the web no auth integration beyond a vanilla better-auth client whose
flags the consumer matches by hand.

This PRD makes tenancy stateless and URL-addressed at every level, and gives the web the session,
guard and organization client a SaaS needs. The two halves ship together because they share
surfaces: the web client, the org rules behind `useAbility`, and the boundary that resolves a URL
slug to a row.

## Scope

**In:**

- A web auth client generated from the `auth` options, with `organizationClient()` when
  `organization` is on, so no flag is matched by hand.
- A SolidJS session accessor and a `SessionBoundary` that guards a layout.
- Scopes: the organization as the root scope, `defineScope` for a consumer table nested under it
  or under another scope, and `procedure({ scope })` resolving and verifying the whole chain per
  request. `org: true` is removed; `procedure({ scope: organization })` replaces it.
- A generated `bySlug` lookup per scope with a slug, a `ScopeBoundary` that resolves a URL slug to
  its row, and `useScope(scope)` returning that row to every child.
- Org rules per organization: `auth.orgRules` and `useAbility` take the scope's organization,
  never the session's.
- The last-visited scope per viewer, for the "open where I left off" redirect.

**Out:**

- Per-scope membership (project members). The model admits it as a scope with its own membership
  table; nothing here builds it.
- Typed route params and search params (Martechthings S5). `ScopeBoundary` reads its slug from
  `useParams()` until that lands.
- Organization CRUD screens, invitation screens, a login screen. Those are consumer screens built
  from the roster.
- The native side of scopes. `useAbility` in `@fcalell/plugin-api/tanstack-query` follows the org
  rules contract change and nothing more.

## Surfaces touched

- `plugins/auth/src/client.ts`: `createAuthClient` builds on `better-auth/solid` so `useSession()`
  is a Solid accessor, and adds `organizationClient()` under `organization: true`.
- `plugins/auth/src/index.ts`: a `clientFlags` value slot (passkey, emailOtp, organization); the
  consumer's `src/shared/scopes.ts` wired into the runtime entry, as the callbacks file is.
- `plugins/auth/src/worker/index.ts`: the scope resolver and membership check on the request
  context; `bySlug` routes per consumer scope; `orgRules` keyed by organization.
- New `plugins/auth/src/scope.ts` (`./scope` subpath, isomorphic): `defineScope`, the
  `organization` root scope, the `Scope` type.
- `plugins/api/src/procedure.ts`: `org` option removed; a `scope` option that takes a descriptor
  and calls the resolver the request context carries, both typed structurally, so api never
  imports auth. `can` and `rbac` require a scope and check against its organization.
- `plugins/api/src/ability-client.ts`, `src/tanstack-query.tsx`: org rules fetched per
  organization id.
- `plugins/solid-ui`: emits `.stack/auth-client.ts` from `auth.slots.clientFlags`; new
  `SessionBoundary`, `ScopeBoundary`, `useScope`; `useAbility` takes the organization id explicitly.
- `.helm/knowledge/architecture/slot-catalog.md`, `runtime.md`, `consumer-project.md`, both
  plugin READMEs.

## Design

### Web auth client

`auth.slots.clientFlags` resolves to `{ passkey, emailOtp, organization }` from the auth options
(null when auth is absent). solid-ui derives `.stack/auth-client.ts` from it:

```ts
// .stack/auth-client.ts (generated)
import { createAuthClient } from "@fcalell/plugin-auth/client";
export const authClient = createAuthClient({ passkey: false, emailOtp: true, organization: true });
```

The consumer imports `authClient` from there, as it imports `AppRouter` from `.stack/worker.ts`.
The literal flags keep `createAuthClient`'s conditional plugin types exact. A web frontend without
auth gets no file.

### Session

`SessionBoundary` (`lib/session`) wraps a layout and takes the generated client's
`useSession()` accessor, so solid-ui depends on no auth runtime. It draws nothing while the first
answer is pending, renders its children with a session, and otherwise navigates to its `signIn`
path with the current location in `redirect`.

```tsx
// src/app/pages/(app)/_layout.tsx
export default (props) => (
  <SessionBoundary session={authClient.useSession()} signIn="/login">
    {props.children}
  </SessionBoundary>
);
```

### Scopes on the server

A scope is one tenancy level. Its row is found by id, its parent by a column on that row, and the
chain ends at the organization, where the user's `member` row decides access.

```ts
// src/shared/scopes.ts
import { defineScope, organization } from "@fcalell/plugin-auth/scope";
import * as schema from "../schema";

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

`procedure({ auth: true, scope: page })`:

- adds `pageId` to the input schema;
- loads the page, then its project, then the organization and the caller's `member` row, one
  indexed lookup per level;
- answers `NOT_FOUND` when any level is absent or the caller is no member, so a guessed id never
  confirms that a row exists;
- types `context.page`, `context.project`, `context.organization` as rows and `context.member` as
  the membership.

Only the leaf id travels. The parents come from the rows, so a client cannot pair a page with a
project it does not belong to, and there is no consistency check to forget. `can` evaluates the
caller's role locally from `context.member`, against the roles `auth({ organization })` declares.
Roles live on the organization; every nested scope inherits them.

`defineScope` builds a descriptor and nothing else: a name, a table, a parent, a slug column. It
imports no worker code, so the scopes module is isomorphic and the web imports the same objects.
The auth runtime resolves descriptors and puts that capability on the request context. api owns
the `scope` option and knows scopes only structurally (a descriptor with a `name`, and the
context's resolver), so the dependency stays auth → api.

### Scopes on the web

Each scope with a `slug` gets a generated `scope.<name>.bySlug` procedure. Its input is the parent
id and the slug (slugs are unique per parent), its output is the row, and it answers `NOT_FOUND` on
a missing row or a non-member. The organization's lookup also returns the caller's role.

```tsx
// src/app/pages/(app)/[org]/_layout.tsx
import { organization } from "@fcalell/plugin-auth/scope";

export default (props) => (
  <ScopeBoundary scope={organization} slug={useParams().org}>{props.children}</ScopeBoundary>
);

// any child
import { project } from "../../shared/scopes.ts";
const row = useScope(project); // Accessor<ProjectRow>, defined for every child
```

The web names a scope by its descriptor, so the row type comes from the table with no generated
map. The cost is that the schema's drizzle table definitions ship in the web bundle; the first
consumer build measures it.

`ScopeBoundary` reads its parent's id from the enclosing boundary, draws the consumer's `notFound`
element on `NOT_FOUND` (every sentence is the consumer's), and provides the chain. Procedures
receive ids explicitly (`api.pages.list({ projectId: project().id })`), never by hidden injection,
so the schema validates them and cache invalidation sees them.

The deepest boundary that resolved records its scope's address (the URL up to its slug) in browser
storage under the signed-in user's id, which `SessionBoundary` provides, and
`useLastScope().address()` returns it for the `/` redirect: two users on one browser never read
each other's, and the session ending (a sign-out, an expiry, another user signing in) forgets the
one that user left. A boundary that resolves to `NOT_FOUND` forgets that address when it is its
own or under it, and `useLastScope().forget()` forgets it when the viewer deletes or leaves the
scope, so `/` never leads back to a scope that is gone. A boundary on a route that passes through
a scope (an onboarding step) takes `remember={false}` and records nothing, nor lets a boundary
above it record; a scope descriptor names no route, and one scope is served at more than one
address (`/acme`, `/onboarding/acme`), so only the route knows whether it is a place to return
to.

An organization is served at `/<slug>`, so plugin-auth refuses, on the server, an organization
slug the app holds: plugin-api's `RESERVED_SLUGS` and every top-level route of the pages, which
plugin-solid derives and solid-ui hands to `auth.slots.reservedSlugs`. The refusal is a field
error on `slug`. Nothing about scopes is stored in the session; better-auth still owns
`session.activeOrganizationId`, and stack stops reading it.

### Org rules

`auth.orgRules` becomes `procedure({ auth: true, scope: organization })`: its rules are the
caller's role in the organization the input names. `useAbility` takes that organization's id
explicitly (`useAbility(() => org().id)` on the web), as procedures take their ids, so rules follow
the URL; they are cached per organization, and a role change invalidates them through
`writes: ["member"]` as today.

## Milestones

All five are built and green in `pnpm check`. One check is open: what the scopes module adds to the
web bundle needs a consumer's production build, and Martechthings epic 001 takes it. Retire this
PRD into `.helm/knowledge/` once that lands.

### M1: web auth client

`createAuthClient` on `better-auth/solid` with `organizationClient()`; `auth.slots.clientFlags`;
solid-ui emits `.stack/auth-client.ts`.

**Verify.** Graph tests (solid-ui `auth-client.test.ts`): `auth({ organization: true })` generates
the call with `organization: true`; `passkey` and `emailOtp` follow their options; no auth, no file.
Type tests (auth `client.test.ts`): the organization flag adds `organization.create` and
`organization.acceptInvitation`, and without it `organization` is absent from the type.

### M2: session boundary

`SessionBoundary` over the pure `sessionGate`.

**Verify.** `sessionGate` tests: a session renders, a pending first answer waits, no session sends
the viewer to `/login?redirect=<path>`. A type test proves the generated client's `useSession()`
accessor fits the boundary's `session` prop. Node tests run without JSX, so the component itself
is covered by type-check only.

### M3: the organization scope

The `scope` option in api, the resolver, membership check and `organization` scope in auth, `org`
removed, `can`/`rbac` against `context.member`, `orgRules` per organization.

**Verify.** Worker tests (auth `tenancy.test.ts`): a member reaches their organization by id with
their role in context; another organization and an unknown id answer the same `NOT_FOUND`; `can`
admits the owner and refuses the plain member; `orgRules` for two organizations differ in one
session with no active organization.

### M4: consumer scopes

`defineScope` and chained resolution. The resolver reads the descriptor the procedure config
carries, so resolution needs no wiring of the scopes module; `bySlug` (M5) does.

**Verify.** Worker tests over a project/page chain: a page resolves its project and organization
from the rows; a page of an organization the caller is no member of answers `NOT_FOUND`; a parent
column from another table is refused. The resolver issues one select per level by construction
(the organization level joins `member` to `organization`); no test counts the queries.

### M5: bySlug and the web boundary

Generated `bySlug` procedures, `ScopeBoundary`, `useScope`, `useMember`, `useLastScope`. The scopes
module is wired into the runtime entry here, so the runtime knows which scopes to serve lookups
for.

**Verify.** Worker tests: the organization's slug resolves to it and the caller's membership, and
a non-member gets `NOT_FOUND`; a project slug resolves within its parent; a scope without a slug
has no lookup. Codegen tests (auth `codegen.test.ts`): with organizations the generated worker
imports `src/shared/scopes.ts` and hands it to the runtime, without them it does not. `scopeLookup`
tests: the organization is looked up by slug alone, a nested scope sends its parent's id, a missing
parent boundary has no lookup, and only `NOT_FOUND` is the boundary's to draw; two viewers'
remembered addresses stay apart, a boundary records only as a resolved place (`remember` not
false) for a signed-in viewer, and `nextViewer` signs out the held viewer when the session ends
(`session-gate.test.ts`). Worker tests: a reserved or top-level-route slug is refused on create and
update as a field error; codegen and graph tests bake the list from the pages. The components are
covered by type-check only. The lookup is called by path on the registered client, so its row type
comes from the descriptor, not from `AppRouter`.

## Decisions

- [x] **Scope identity on the web.** By descriptor: `useScope(project)`, imported from the
  isomorphic `src/shared/scopes.ts`. The drizzle table definitions ship to the web in exchange for
  no generated scope map.
- [x] **Leaf id only.** A scoped procedure takes only its own scope's id and derives the parents.
- [x] **`org: true` removed.** `scope: organization` is the one spelling.
- [x] **Web wiring in solid-ui**, mirroring native-ui, reading `auth.slots.clientFlags`.
