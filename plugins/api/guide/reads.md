# Reads

`orpc.*.read(input)` is `queryOptions` as a `Read` handle: the same input (`skipToken` included),
the output typed, and how its failure reads as not found. For a query of your own,
`read(options, { missing, kind })` from `@fcalell/plugin-api/tanstack-query` makes it:
`missing` tells the error that reads as not found (default `isNotFound`) and `kind` is `"query"`,
`"pages"` or `"stream"` ([pages and streams](./pages-and-streams.md)). A read is its own selection;
`read.at(fn)` selects from it, and `combine([a, b], fn)` selects from several. A selector runs
over a placeholder while its reads wait, are idle or have failed with no data, so write it plainly
(`d.steps.length`, `d.name`); one that throws there paints its slot, silently, and one that
throws over real data is yours.

```tsx
const deploy = orpc.deploys.get.read({ id });
const title = deploy.at((d) => d.commit);
const summary = combine([deploy, orpc.usage.read()], (d, u) => `${d.commit}: ${u.used}`);
<Section read={deploy} title="Steps">
  <List items={deploy.at((d) => d.steps)} row={{ key: (s) => s.id, title: (s) => s.label }} />
</Section>
```

A component takes a `Datum<T>`, a constant or a selection, and draws a selection it cannot answer
yet as its painted form, and only while the read waits: a text or mark leaf whose read ended draws its
loaded-empty form (no line, nothing), and the frame that holds the read says why. Your own code never
sees the placeholder:

- `useRead(selection)` is the value, or `undefined` while the read waits, is idle or failed.
- `useSelections([a, "fixed"] as const)` is what a component builds on: one `useQueries` for any
  count of values, each a `Drawn` (`{ painted, value }`; a painted `value` is the placeholder, so it
  is `unknown`). In dev it registers its reads as painted.
- `useFrameRead(read, derive)` is what a frame (Pane, Section, Sheet, Form) builds on: one
  subscription whose `derive(held)` runs in `combine`, so the frame renders when its derived state
  changes and never on a value change. It returns `{ state, retry, holding, holds }`; `retry`
  refetches the reads the frame holds and returns that promise (so a Retry pends on it), `holding`
  says it holds any and `holds` is their hashes with the enclosing frames' (publish it with
  `<FrameHolds holds={holds}>` around the body). Pass a module-level `derive`, whose identity is
  the combine's.
- `useDraft(datum, failed?)` is a field's value: it follows its selection until the viewer edits it,
  then holds the edit; a selection over another read drops the edit. A constant passes through
  unchanged: the app owns it, and a value it changes shows. Saving a change is on
  [acts and saves](./acts.md).

## What a frame draws

A frame draws more than the first wait of its root. While the data stays it marks a refetch
(`busy`, a spinner after the heading), says "Couldn't refresh." with Retry when a refetch failed
(`stale`) and "Waiting for a connection." when the read is paused offline. A read the app has not
asked for yet (`enabled: false`, `skipToken`) paints still, as a paused one does. All of it comes
with the frame's `read`; write nothing for it.

A frame holds one read: the one read of its `read` that is neither quiet nor held by an enclosing
frame, and it draws that read's failure, stale and paused lines. A Pane given `deploy` holds it, and
a Section inside it given `deploy.at(...)` holds nothing. A second such read in one selection is a
dev `console.error` naming both keys (the frame holds the first); a leaf that needs two reads takes
`combine`, and a region that draws two reads is two frames. Sibling frames that draw the same read
each hold it and each fail in place, so a failure repeats in each; there is no lifting a shared read
to an outer frame. In dev a read that fails with no data while a leaf draws it and no frame holds it
raises `console.error` (give its Pane, Section, Sheet or Form `read`). A read you hold with your own
`useQuery` is not checked.

A read that only enriches (a name, a badge, a lane order, a link) is `selection.or(fallback)`: real
data when its reads have it and `fallback` in every other state. It never paints, holds or fails a
frame, and a read used only through `or` is quiet: subscribed, never held. A read whose rows,
options, facts or text a component draws is never `or`.

A read that a collection or an option control draws is that component's own: a `List`, `Table`,
`Thread`, `Picker` or `Select` given a selection shows that read's state in its own box, whatever
stands above it.

A query made with `read()` (and a channel made with `channelRead`) holds its first answer when the
paint has shown, until the paint has stood for the minimum (`QueryProvider hold`, which a UI plugin
passes from its live timings); a refetch or a later page is never held. A query built without
`read()` is not held.

**Check:** `pnpm check` passes, and the screen paints, then shows its data under `pnpm dev`.
