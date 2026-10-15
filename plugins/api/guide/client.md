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
included), the output typed, and how its failure reads as not found. For a query of your own,
`read(options, { missing, kind })` from `@fcalell/plugin-api/tanstack-query` makes the handle:
`missing` tells the error that reads as not found (default `isNotFound`) and `kind` is `"query"`,
`"pages"` or `"stream"` (below). A read is its own selection;
`read.at(fn)` selects from it, and `combine([a, b], fn)` selects from several. A selector runs
over a placeholder while its reads wait, so write it plainly (`d.steps.length`, `d.name`); one that
throws over a read with no data yet paints its slot and warns in dev, and one that throws over real
data is yours.

```tsx
const deploy = orpc.deploys.get.read({ id });
const title = deploy.at((d) => d.commit);
const summary = combine([deploy, orpc.usage.read()], (d, u) => `${d.commit}: ${u.used}`);
<Section read={deploy} title="Steps">
  <List items={deploy.at((d) => d.steps)} row={{ key: (s) => s.id, title: (s) => s.label }} />
</Section>
```

A component takes a `Datum<T>`, a constant or a selection, and draws a selection it cannot answer
yet as its painted form. Your own code never sees the placeholder:

- `useRead(selection)` is the value, or `undefined` while the read waits, is idle or failed.
- `useSelections([a, "fixed"] as const)` is what a component builds on: one `useQueries` for any
  count of values, each a `Drawn` (`{ painted, value }`; a painted `value` is the placeholder, so it
  is `unknown`). In dev it registers its reads as painted.
- `useFrameRead(read, derive)` is what a frame (Pane, Section, Sheet, Form) builds on: one
  subscription whose `derive(held)` runs in `combine`, so the frame renders when its derived state
  changes and never on a value change. It returns `{ state, retry, holding, holds }`; `retry`
  refetches the reads the frame holds, `holding` says it holds any and `holds` is their hashes with
  the enclosing frames' (publish it with `<FrameHolds holds={holds}>` around the body). Pass a
  module-level `derive`, whose identity is the combine's. The frame holds the reads of its `read`
  that no enclosing frame holds, and draws their failure.
- `useDraft(datum)` is a field's value: it follows its selection until the viewer edits it, then
  holds the edit (`change(next)`); a selection over another read drops the edit. A constant passes
  through unchanged: the app owns it, and a value it changes shows.

A frame draws more than the first wait of its root. While the data stays it marks a refetch
(`busy`, a spinner after the heading), says "Couldn't refresh." with Retry when a refetch failed
(`stale`) and "Waiting for a connection." when the read is paused offline. A read the app has not
asked for yet (`enabled: false`, `skipToken`) paints still, as a paused one does. All of it comes
with the frame's `read`; write nothing for it.

A frame holds the reads of its `read` that no enclosing frame holds, and draws their failure, stale
and paused lines. A Pane given `deploy` holds it, and a Section inside it given `deploy.at(...)`
holds nothing; a Section given `combine([inbox, jobs, board], f)` under a Pane with no `read` holds
all three, and draws the failed form when any of them fails with no data. Sibling frames may each
hold a read and draw its state in their own place. In dev a read that fails with no data while a
leaf paints it and no frame holds it raises `console.error` (give its Pane, Section, Sheet or Form
`read`). A read you hold with your own `useQuery` is not checked.

`QueryProvider` takes `settle`, which a UI plugin passes: a read's first answer (its first data,
its first failure with no data, a reset to waiting) is flushed through it, so the waiting form is
still on screen when the move to the answer starts. A refetch is not a first answer and flushes at
once. Never pass `settle` in an app on react-ui or native-ui, which already do.

## Paginated procedures

A procedure declared `paginated: true` answers `{ data, nextCursor }` and takes `cursor` and
`limit`. Beside `.read`, its utils have `.pages(input)` (the input without `cursor`), a read of
`kind: "pages"` whose value is the flat `data` of every page loaded, so it is held and drawn like
any read:

```tsx
const deploys = orpc.deploys.list.pages({ limit: 5 });
<Pane read={deploys} title="Deploys">
  <List items={deploys} row={{ key: (d) => d.id, title: (d) => d.commit }} />
</Pane>
```

The collection (`List`, `Group`, `Table`) draws the rest: a "Show more" row while a next page
remains, the next page painted while it loads, and "Couldn't load more." with Retry when it
failed. The viewer presses it; nothing loads by scrolling. The frame is not busy for a next page,
draws no count while more remain, and an empty first page that has more fetches the next. A
`Section`'s count is therefore the loaded rows only once the last page is in.

`useMore(read)` is what that row builds on (`{ next, fetching, failed, fetch }`); reach for it
only for a control of your own, since it never fetches by mounting. A hand-written `read` with
`kind: "pages"` must be an infinite query (`infiniteOptions`) over the same envelope.

## Streams

A read that stays fetching while it writes is `kind: "stream"`: fetching with data is writing,
not busy. Build it on TanStack's `streamedQuery` (re-exported) and hand it to a `Thread`'s
`reply`; the oRPC form for a procedure that yields is
`read(orpc.x.experimental_streamedOptions({ input }), { kind: "stream" })`.

```tsx
const answer = read<Turn>(
  {
    queryKey: ["assistant", "answer", id],
    queryFn: streamedQuery<string, Turn>({
      streamFn: ({ signal }) => words(signal),
      reducer: (turn, word) => ({ ...turn, body: turn.body + word }),
      initialValue: { id, author: "other", body: "", at: new Date().toISOString() },
    }),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  },
  { kind: "stream" },
);
<Thread items={history} reply={answer} message={{ key: (t) => t.id, author: (t) => t.author, body: (t) => t.body }} />
```

A WebSocket channel is a stream read too: `channelRead` in `@fcalell/plugin-node/live`
(`plugins/node/guide/live.md`).

## Preloading a route

A route warms its reads before its components mount with `preload`, from its TanStack Router
`loader`. Write each handle once, as a function both the loader and the component call, so the key
is the same:

```tsx
const project = (id: string) => orpc.projects.get.read({ id });
export const Route = createFileRoute("/projects/$projectId")({
  loader: ({ params }) => preload(project(params.projectId)),
  component: () => <ProjectPane id={Route.useParams().projectId} />,
});
```

`preload(...selections)` starts each distinct read and returns at once, so navigation is never held;
the component builds its own handle and draws what landed, or paints and settles if it is still in
flight. A fresh read costs no request (`staleTime` decides), a `pages` read fetches its first page,
and a failed prefetch is dropped. Streams, idle reads (`skipToken`, `enabled: false`) and reads
whose input comes from another read's data are not preloaded. It uses the client `QueryProvider`
holds, so it does nothing before a provider has rendered.

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

`ability(organizationId, record?)` is what the caller may do in that organization as a selection
of a `MongoAbility`: the rules of its role there, fetched once and cached per organization, read
like any read. `useAbility(organizationId, recordRules?)` is the same as a hook.

```tsx
const ability = useAbility(organizationId);
return ability.can("delete", "organization") ? <DeleteOrganization /> : null;
```

Gate an act that stands in a frame's head as a selection, so it paints inert while the rules load
and is never blocked by a wait:

```tsx
const rules = ability(organizationId);
<Section
  title="Danger"
  act={rules.at((a) => (a.can("delete", "organization") ? remove : { ...remove, blocked: "Only an owner can delete this." }))}
/>
```

An act on each row combines the rules into the items, so the list waits for them:
`combine([items, rules], (rows, a) => rows.map((row) => ({ ...row, act: a.can("update", subject("Expense", row)) ? edit(row) : undefined })))`.
The rules read is ambient: no frame holds it, and one that fails leaves its acts painted and inert,
never a false yes.

The ability denies everything while the id is `undefined` (no request is made), when the caller is no
member, and, in the hook, while the rules load, so it never answers a false yes. To layer a
record's own rules, return `packAbility(ability)` from the procedure
(`@fcalell/plugin-auth/ability`) and pass the packed field through: `useAbility(organizationId,
expense?.rules)`, or `ability(organizationId, expense.at((e) => e.rules))`, then
`ability.can("update", subject("Expense", expense))`. A mutation that declares `writes` on an
organization subject (`writes: ["member"]` on a role change) invalidates every organization's
rules. Never read the ability instance out of the query cache: it is composed (memoized) outside
it, and a copy from the cache is a new instance every render.

## The phone's network and focus

`QueryProvider` takes `listen`, `{ online?, focus? }`, each given the manager's setter and
returning its cleanup, for a platform with no window events. native-ui passes the phone's
(`expo-network` and `AppState`), so a read pauses offline and refetches when the app returns;
the web needs nothing. Never pass `listen` in an app on native-ui.

**Check:** `pnpm check` passes, and the screen shows the data under `pnpm dev`.
