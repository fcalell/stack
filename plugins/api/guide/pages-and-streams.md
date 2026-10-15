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
failed. The viewer presses it; nothing loads by scrolling. The frame is not busy for a next page,
draws no count while more remain, and an empty first page that has more fetches the next. A
`Section`'s count is therefore the loaded rows only once the last page is in.

`useMore(read)` is what that row builds on (`{ next, fetching, failed, fetch }`, `fetch` returning
its promise); reach for it only for a control of your own, since it never fetches by mounting. A
hand-written `read` with `kind: "pages"` must be an infinite query (`infiniteOptions`) over the
same envelope.

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

**Check:** `pnpm check` passes, and under `pnpm dev` the list shows "Show more" until the last page.
