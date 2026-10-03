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

On the phone, pass an absolute `url` (`process.env.EXPO_PUBLIC_API_URL`). `headers` takes an
object or a function returning one.

## Queries

`@fcalell/plugin-api/tanstack-query` pairs the client with TanStack Query 5 and re-exports its
hooks (`useQuery`, `useMutation`, `useInfiniteQuery`, `useSuspenseQuery`, `useQueryClient`). On the
phone the app is already wrapped in `QueryProvider`; on the web, wrap the root route in
`<QueryProvider>`.

```tsx
const { data } = useQuery(orpc.projects.list.queryOptions({ input: { organizationId } }));
const create = useMutation(orpc.projects.create.mutationOptions());
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
