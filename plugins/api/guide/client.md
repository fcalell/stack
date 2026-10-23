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
hooks (`useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, `useQueryClient`). The
`QueryProvider` that wraps the app is on [the provider page](./provider.md); drawing a query on a
screen is [reads](./reads.md).

```tsx
const { data } = useQuery(orpc.projects.list.queryOptions({ input: { organizationId } }));
const create = useMutation(orpc.projects.create.mutationOptions());
```

## Scope

A procedure with a `scope` takes the scope's id in its input (`organizationId`, `projectId`) and
stamps the key on its meta as `scope`; `stack generate` writes it to `.stack/schema.ts` beside the
procedure's input schema. The route's boundary supplies the id: `ScopeBoundary` from
`@fcalell/plugin-api/tanstack-query` registers the ids the layout resolved from the URL slug for the
subtree it renders, and the utils `createApiQueryUtils` returns merge the registered id into the
input of every call whose procedure names that key, and only that key (an explicit id wins),
before the query key is built. The key carries the id, so two organizations' `projects.list`
never share a cache entry, and the input type makes the scope key optional, so a screen under the
boundary writes no id. The layout resolves the slug and wraps its outlet, one line per layout.

```tsx
<ScopeBoundary ids={{ organizationId: organization.id }}>
  <Outlet />
</ScopeBoundary>

useQuery(orpc.projects.list.queryOptions());
```

A boundary under another extends the outer ids (a project's `{ projectId }` joins the
organization's `{ organizationId }`) and puts them back when it unmounts. The registration is
ambient, per isolate: one client and one rendered route subtree. A call that names another scope
passes its id.

A route `loader` runs before the boundary renders, so it names the ids it resolved, in the input or
once with `scoped(orpc, { organizationId })` from the same module, which nests. A call of an
unscoped procedure keeps its input as it is under any boundary. A call of a scoped procedure with
no registered scope and no id throws before any request, naming the procedure and the key; a
procedure added since the last `stack generate` is not in the schema, so it is not scoped until
generate runs.

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

**Check:** `pnpm check` passes, and the screen shows the data under `pnpm dev`.
