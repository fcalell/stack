# Calling the API

`createClient` from `@fcalell/plugin-api/client` builds the typed client, on the web and the
phone alike, from the generated worker's `AppRouter`, imported type-only. The app's tsconfig
project references the worker's, so the import resolves to the router's declarations: each
procedure's caller-side input and output, and none of the worker's source.

```ts
// src/app/lib/api.ts
import { createClient } from "@fcalell/plugin-api/client";
import { createApiQueryUtils } from "@fcalell/plugin-api/tanstack-query";
import type { AppRouter } from "../../../.stack/worker";

export const api = createClient<AppRouter>(); // url "/rpc", credentials "include"
export const orpc = createApiQueryUtils(api);
```

A query made through `orpc.*.queryOptions` travels as `GET` (its input in the URL) and a mutation as `POST`. Build the utils with `createApiQueryUtils`: oRPC's own `createTanstackQueryUtils` sends queries as `POST`.

On the phone, pass an absolute `url` (`process.env.EXPO_PUBLIC_API_URL`). `headers` takes an
object or a function returning one.

## Queries

`@fcalell/plugin-api/tanstack-query` pairs the client with TanStack Query 5 and re-exports its
hooks (`useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, `useQueryClient`). With
react-ui on the web or native-ui on the phone, TanStack Query is installed and the app is already
wrapped in `QueryProvider`; never wrap it again. Without one, add `@tanstack/react-query` and
`@orpc/tanstack-query` and wrap the root route in `<QueryProvider>`.

```tsx
const { data } = useQuery(orpc.projects.list.queryOptions({ input: { organizationId } }));
const create = useMutation(orpc.projects.create.mutationOptions());
```

## Reads

`orpc.*.read(input)` is `queryOptions` as a `Read` handle: the same input (`skipToken`
included), the output typed, and how its failure reads as not found. A read is its own selection;
`read.at(fn)` selects from it, and `combine([a, b], fn)` selects from several. A selector runs
over a placeholder while its reads wait, so write it plainly (`d.steps.length`, `d.name`); one that
throws over a read with no data yet paints its slot and warns in dev, and one that throws over real
data is yours.

```tsx
const deploy = orpc.deploys.get.read({ id });
const title = deploy.at((d) => d.commit);
const summary = combine([deploy, orpc.usage.read()], (d, u) => `${d.commit}: ${u.used}`);
<Section read={deploy} title="Steps"><List items={deploy.at((d) => d.steps)} /></Section>
```

A component takes a `Datum<T>`, a constant or a selection, and draws a selection it cannot answer
yet as its painted form. Your own code never sees the placeholder:

- `useRead(selection)` is the value, or `undefined` while the read waits, is idle or failed.
- `useSelections([a, "fixed"] as const)` is what a component builds on: one `useQueries` for any
  count of values, each a `Drawn` (`{ painted, value }`; a painted `value` is the placeholder, so it
  is `unknown`). In dev it registers its reads as painted.
- `useFrameRead(read, derive)` is what a frame (Pane, Section, Sheet, Form) builds on: one
  subscription whose `derive(held)` runs in `combine`, so the frame renders when its derived state
  changes and never on a value change. It returns `{ state, retry }`; `retry` refetches the frame's
  reads. Pass a module-level `derive`, whose identity is the combine's. Given a read (`isRead`) the
  frame holds its root and draws its failure; given a selection it draws only waiting and empty.
- `useDraft(datum)` is a field's value: it follows its selection until the viewer edits it, then
  holds the edit (`edit(next)`); a selection over another read drops the edit. A constant is the
  initial value.

One read has one root holder. In dev, two frames given the same read raise `console.error` at mount
(give one of them a selection), and so does a read that fails with no data while a leaf paints it
and no frame holds it (give its Pane, Section, Sheet or Form `read`). A read you hold with your own
`useQuery` is not checked.

`QueryProvider` takes `settle`, which a UI plugin passes: a read's first answer (its first data,
its first failure with no data, a reset to waiting) is flushed through it, so the waiting form is
still on screen when the move to the answer starts. A refetch is not a first answer and flushes at
once. Never pass `settle` in an app on react-ui or native-ui, which already do.

## Not found

A procedure that throws `ApiError("NOT_FOUND")` reaches the screen as a failed query.
`isNotFound(error)` from `@fcalell/plugin-api/client` tells that error from any other, so the
screen draws its not-found state for it and its error state for the rest. A read's not found
travels as a 200 carrying `x-stack-not-found` (a browser logs every 404 fetch response as a
console error), and the client restores the 404 before decoding it; a client of `/rpc` that is
not stack's sees the 200. A mutation's not found stays a 404.

```tsx
const project = useQuery(orpc.projects.get.queryOptions({ input: { projectId } }));
if (project.isError) return isNotFound(project.error) ? <ProjectNotFound /> : <ProjectError />;
```

## Cache invalidation

Write no invalidation code. The client records each response's `x-stack-reads` and
`x-stack-writes` by procedure, and a successful mutation invalidates every cached query whose
reads meet its writes. So the procedures declare `reads` and `writes`, and the screens declare
nothing.

- A query that never declared `reads` never invalidates on its own.
- A mutation that owns every cache it changes opts out with `meta: { skipAutoInvalidation: true }`.
- A query outside the API declares its reads on its options, `meta: { reads: ["member"] }`, and
  then refetches on those writes like an API query.
- A write the API never answered (a socket frame, a webhook) calls
  `invalidateForWrites(queryClient, ["member"])` from `@fcalell/plugin-api/query-invalidation`.
- The names in `meta.reads` and `invalidateForWrites` are the app's `Entity` (the union in
  `.stack/procedure.ts`, also exported from `.stack/worker`), so a typo fails `tsc` on web and
  phone. The check is type-only and adds nothing to the bundle. Stack registers TanStack Query's
  `queryMeta`, so the app adds its own meta keys to a query directly and never registers
  `queryMeta` itself, which would conflict with `reads`.
- A custom `mutationCache` passed to `createQueryClient` turns auto-invalidation off: the app
  owns invalidation then.

## Abilities

`useAbility(organizationId)` answers what the caller may do in that organization, from the rules
of its role there, fetched once and cached per organization.

```tsx
const ability = useAbility(organizationId);
return ability.can("delete", "organization") ? <DeleteOrganization /> : null;
```

It denies everything while the rules load, while the id is `undefined`, and when the caller is no
member, so it never answers a false yes. To layer a record's own rules, return
`packAbility(ability)` from the procedure (`@fcalell/plugin-auth/ability`) and pass the packed
field through: `useAbility(organizationId, expense?.rules)`, then
`ability.can("update", subject("Expense", expense))`. A mutation that declares `writes` on an
organization subject (`writes: ["member"]` on a role change) invalidates every organization's
rules. Never read the ability instance out of the query cache: `useAbility` memoizes it, and a
copy from the cache is a new instance every render.

**Check:** `pnpm check` passes, and the screen shows the data under `pnpm dev`.
