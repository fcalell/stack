# Pages, streams and preload

Three reads beyond the plain one ([reads](./reads.md)), and a route's way to warm them.

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
failed. The viewer presses it below `VIRTUAL_FROM` rows; a collection that windows (a `Table` or
`Section` past that many rows) loads the next page as the end of the loaded rows nears, so nothing
asks for it. The frame is not busy for a next page, draws no count while more remain, and an empty
first page that has more fetches the next. A `Section`'s count is therefore the loaded rows only
once the last page is in.

`useMore(read)` is what that row builds on (`{ next, fetching, failed, fetch }`, `fetch` returning
its promise); reach for it only for a control of your own, since it never fetches by mounting. A
hand-written `read` with `kind: "pages"` must be an infinite query (`infiniteOptions`) over the
same envelope.

## Window procedures

A list of tens of thousands of rows is `paginated: "window"`: the input gains `offset` and `limit`
(no cursor), the handler answers `{ data, total, offset }`, and `total` is every row the filter
matches. Its utils have `.window(input)` (the input without `offset`), a read of `kind: "window"`
whose value is the rows loaded so far; give it to a `Table`:

```tsx
const requests = orpc.requests.list.window({ q });
<Table columns={COLUMNS} items={requests} row={{ id: (r) => r.id }} />
```

Under a scroller the `Table` is as long as `total`, mounts the rows in view and fetches the pages
the viewport and its overscan cover wherever the scrollbar lands (page-aligned, each page once),
draws a row not loaded yet as its painted form, and keeps pages in a bounded cache. A changed
input is a new key: the previous rows stay drawn until the new query's first page lands. A
procedure that declares `sort: [...columns]` takes `sort?: { column, direction }` in its input and
the `Table`'s header sort goes into the read's input, so the server orders the whole query; a
column the procedure does not name does not sort. The head tick of a `Table` with `choose` over a
window (or `pages`) read picks the query itself; see `selector()` in [utilities](./utilities.md).
`useWindow(read)` is what the `Table` builds on; reach for it only for a collection of your own.

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
`loader`, which gets the app's query client in its `context`. Write each handle once, as a function
both the loader and the component call, so the key is the same:

```tsx
const project = (id: string) => orpc.projects.get.read({ id });
export const Route = createFileRoute("/projects/$projectId")({
  loader: ({ context, params }) => preload(context.queryClient, project(params.projectId)),
  component: () => <ProjectPane id={Route.useParams().projectId} />,
});
```

`preload(client, ...selections)` starts each distinct read and returns at once, so navigation is never held;
the component builds its own handle and draws what landed, or paints and settles if it is still in
flight. A fresh read costs no request (`staleTime` decides), a `pages` read fetches its first page,
and a failed prefetch is dropped. Streams, idle reads (`skipToken`, `enabled: false`) and reads
whose input comes from another read's data are not preloaded. It warms the client it is given: on
the web the router's `context` carries the one `QueryProvider` holds, and on the phone a route
exports `preload` (`node_modules/@fcalell/plugin-expo/guide/routes.md`).

**Check:** `pnpm check` passes, and under `pnpm dev` the list shows "Show more" until the last page.
