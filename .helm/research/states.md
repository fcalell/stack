# States: the design

Status: decided with the owner, 2026-10-14; the wait's two numbers are tuned live, nothing is
built. This page defines how every component of the roster reads, waits, fails, goes missing,
stays empty, refreshes, streams and acts, on both platforms, and how state is held so that a
change re-renders only what it changes. It supersedes `motion.md` §4.1 (one waiting path) and the
shape question of `skeleton-loading.md`; `motion.md` keeps the motion (the loaders' paint, the
settle, the decode). Once built it drains into `.helm/knowledge/architecture/ui-core.md` and the
guide (`packages/ui-core/guide/screen.md`, `patterns/loading-and-pending.md`).

## 0. Where we start

A read of the code as it stands (every component, both platforms; the per-component tables are
not kept, the findings are):

- **Five sources of waiting.** A collection's own `query` (List, Table, BarChart, Comparison,
  Thread, through `listState`); `QueryBoundary` with a hand-written `loading` tree; Section, Group
  and Form-group `loading`, fanned out by `LoadingContext`; a part's own `loading` (ItemHeader,
  ActionBar, Stats, Stat, Diff, ProseDiff, FileRow, Canvas, Message, Image, QrCode); and none
  (ListRow, Stages, Avatar, Status, Chip, Text, and every bare control: Input, Select, Switch,
  Picker, Checkbox, SegmentedControl, FileInput, InputOtp, MessageInput, TextArea).
- **One clock with four callers.** Only QueryBoundary, Section, Group and a Form group run
  `useWait` (delay, minimum, veil, settle). Everything else draws its waiting form on the first
  frame, so a bare `List query` flashes on a fast read. Apps work around it by stating a read
  twice (`Section loading={q.isPending}` around `List query={q}`, eight times in the showcase),
  and the two clocks can flip in different frames, the second snapping.
- **Hand-built waiting forms.** About twelve in the collections alone (~850 lines on the web:
  RowWait 222, OptionWait 129, DefinitionWait ~120, CanvasWait 95, Table's SkeletonRow ~70, …),
  each repeating its loaded layout's classes and mirrored on the phone. Their row counts disagree
  (3, 4, 5, 8); OptionList draws four rows even for a static option set.
- **States not modelled.** `isFetching`, `isPlaceholderData` and `hasNextPage` are never read:
  "busy" means the first load, a failed refetch replaces rows already shown with the failed form,
  there is no stale, no more-pages and no stream-failed form. List with no `empty` draws a blank
  box, Comparison nothing, BarChart an empty plot.
- **Acts are a second system.** Button `loading`, ActionBar `running`, Sheet `busy`, PendingBar,
  ConfirmSheet and toast each re-implement "pending, then ready", with no delay. A control's save
  (Switch, Select, Slider, `onCommit`) has no saving, saved or failed state; act failure has three
  homes the app feeds; ConfirmSheet swallows a rejection. `loading` means four things (an act
  running, a code being checked, a read on its way, a count of acts).
- **The app carries the rest.** Stead: ~50 `loading?: boolean` props, a `ready` in every screen
  body, ~18 `length === 0 && !loading ? { sentence } : undefined`, ~28 `loading: m.isPending`,
  its own `useAct`/`actFailed` (~45 sites), hand-built query objects for live channels and the
  Thread, list-cache seeding (`listed`/`known`), and two source checks (no Section gated on its
  data's length, no QueryBoundary waiting on a hand-built tree) plus the shift review that stack
  documents but does not ship. Pane titles, heads and sheets read `query.data` outside any
  boundary.
- **The phone.** Each settle runs its own `LayoutAnimation`: no frame batching, no guard for one
  already running.

The spike (2026-10-14, web, the showcase's deploys list and record; not kept) drew the loaded
body from TanStack placeholder data with each text slot painted as a bar. The record's Section
headings stood at the same y waiting and loaded (Summary 283, Domains 503, Steps 627 at 1280 px)
where master's record waits as a lone ItemHeader skeleton. It also showed what this design
removes: a `display: contents` wrapper broke the Pane's child sizing (a width shift); invented
data leaked wherever app code read it (a Pane title of `xxxx`, a Banner and PendingBar fired by
an invented `active` state, a count of the invented array); constants inside the boundary
painted as waiting; generated ids collided as keys.

## 1. Principles

1. **State lives in the deepest leaf that needs it.** A value is subscribed by the component that
   draws it, a field's pending by the field, an act's pending by its button.
2. **Handles go down, values never.** Props and context carry stable handles to reads; data and
   status reach a component only through its own subscription. A parent's render never cascades
   on data; a data change never renders a parent.
3. **Contexts carry identity, never state** (handles, words, theme). Structure rule 11 classes
   every context and holds it.
4. **Every subscription is a slice:** one `select`, TanStack's tracked properties, structural
   sharing.
5. **Data flows down; nothing reports up.**
6. **The app never sees invented data, and never branches on a state the framework can draw.**

## 2. The read

A read is a TanStack query, or anything with the same interface (a live channel, a streamed
reply), written to the cache. plugin-api's query utils build its handle:

```ts
const deploy = orpc.deploys.get.read({ id }); // stable, typed: query options + output shape + entity
deploy.at((d) => d.commit);                   // a selection: the handle + a selector, typed
```

ui-core knows only the handle's interface, so it stays free of TanStack. It derives one state
from a read, framework-free and tested without rendering:

| State | When |
| --- | --- |
| waiting | no real data yet (pending, or showing a placeholder) |
| ready | real data |
| busy | ready and refetching |
| stale | ready and the last refetch failed |
| failed | no real data and the read failed |
| missing | failed with not found (the handle knows its error type; no duck typing) |
| empty | ready and the frame's selection is an empty array |
| partial | ready with more to fetch (`hasNextPage`) or still streaming |

A component's data prop takes a **selection** (it comes from a read: the leaf subscribes to it,
paints it while waiting, re-renders when it changes) or a **plain value** (a constant: drawn as
given, never painted). The type tells data from constants.

## 3. Frames own reads

A read's states are drawn once, by the frame that owns it: `Pane read`, `Section read`,
`Sheet read`, `Form read`, or a collection standing with no frame for its read. QueryBoundary is
deleted: each of its jobs has a better home.

```tsx
const deploy = orpc.deploys.get.read({ id });

<Pane read={deploy} title={deploy.at((d) => d.message)} back="/deploys">
  <ItemHeader facts={[deploy.at((d) => d.author), deploy.at((d) => d.age)]} />
  <Section title="Summary">
    <Group items={[
      { key: "commit", row: <DefinitionRow label="Commit" value={deploy.at((d) => d.commit)} copyable /> },
      { key: "region", row: <DefinitionRow label="Region" value="Frankfurt, eu-central-1" /> },
    ]} />
  </Section>
  <Section title="Steps" read={deploy.at((d) => d.steps)}>
    <List row={…} />
  </Section>
</Pane>
```

- **A frame takes a read or a selection.** Given an array selection, a Section knows its count
  (the length), its empty (none) and its waiting (the count withheld); the collection in it takes
  its items from the frame through the frame's handle (identity, not state). No `count`, no
  `items`, no length check in app code, and a read cannot be stated twice.
- **The frame draws in its own fit.** A Pane's failure fills the page with Back to its route; a
  Section's fills its body under its heading; a Sheet's its body over its acts. Retry refetches
  the frame's read.
- **A Pane with a read** draws its title from a selection (painted while waiting) and withholds
  its acts until ready.
- **Several reads.** A frame takes `read={[deploy, files]}`; a leaf that needs two at once takes
  `combine(deploy, files, (d, f) => …)`.
- **Claims.** A frame puts its read's key in a stable context. A leaf whose read an enclosing
  frame claims draws only its value; a collection with no claim for its read is its own frame. A
  selection no frame claims and that is no collection is a dev error, and verify fails it
  wherever the source shows it.
- **Every frame of a read is named for the settle** (today only Section and Group roots are).

## 4. The waiting form is the loaded form, painted

There is no waiting tree. While its read waits, each leaf draws its loaded form from a placeholder
and paints its selected slots; constants draw as given. Each component defines only how its
loaded form paints:

| Slot | Paint |
| --- | --- |
| text (title, name, sentence, label from data) | the string's own line boxes as bars |
| figure, id | per the loader (`motion.md` §4.2): bars, or the scramble |
| mark (avatar, status dot, chip, icon from data) | the skeleton fill |
| block (meter track, chart plot, code, prose, diff, image, canvas node) | at its own size: a meter's track, a plot's height, code by its lines, an image box at its ratio |
| control (a field whose value is a selection) | its own box, value painted, inert |

No wrapper element is added: a `display: contents` wrapper breaks a parent's child rules.

**The placeholder,** in order:

1. **The cache seed.** When a list answers, plugin-api writes each item into its record's cache
   as a seed, by entity and id (the registry invalidation already uses). A record opened from its
   list waits with its real title and state, and the app writes no seeding.
2. **The previous data** of the same query (a record switched to another).
3. **The output's shape**, emitted by plugin-api's codegen from the zod output schema: a string's
   typical length (`max`, format, or `.meta({ wait })`), an enum's neutral member (`.meta({ wait
   })`, else the first), an array's typical count, ids unique per item.

It is computed once per read key, kept in the wait store, and added to the library's own
subscriptions only (TanStack's `placeholderData` is per observer). An app's `useRead` returns
`undefined` while waiting, so an app branch (`state === "failed" ? <Banner/> : null`) renders only
on real data.

## 5. One clock

The wait is one store per read key in ui-core (framework-free): `delay → drawn → hold → gone`,
with the veil during the delay and the settle at the end. Every leaf and frame of a read reads its
phase through `useSyncExternalStore` with a selector, so all of them flip in one store write, in
one frame, on both platforms (the phone gains the batching and the running guard the web's settle
already has). `aria-busy` and the live region are the frame's. A refetch after a failure runs the
clock like a first read. The two numbers (`WAIT_DELAY`, `WAIT_MIN`) are tuned live in the
showcase with sliders for the delay, the minimum and a simulated read time.

## 6. Subscriptions and renders

| Who | Subscribes to | Renders when |
| --- | --- | --- |
| a frame | its read's state only (no data) | the state changes |
| a frame's busy mark | `fetchStatus` alone | a refetch starts or ends |
| a leaf with a selection | its slice, with the placeholder | its slice changes |
| the wait store | one phase per read key | the phase changes |
| the app (`useRead(selection)`) | its slice, real data only | its slice changes once real |
| an act or a control | its own promise | its own pending or failure |

- **Collections.** A List subscribes to its items. Structural sharing keeps every unchanged
  item's reference and the React Compiler (on through `plugin-react`) memoizes each row by its
  item, so only changed rows render; the build confirms the compiler covers the ui packages,
  which ship as source, else rows get an explicit `memo`. A live collection (a feed, a running
  job's steps) subscribes the List to keys and each row to its item.
- **Streams and live channels** are queries written with `setQueryData` (or `streamedQuery`). The
  Thread subscribes to turn keys and each turn to its content, so a token renders the last turn.
  Stead's `Live<T>` and the hand-built Thread queries go away.

| Event | Renders |
| --- | --- |
| first answer | each leaf whose slice differs from the placeholder and each frame's state, in one settle frame |
| refetch, same data | the busy mark, on and off |
| refetch, one field changed | the leaves selecting it; the rows whose item changed |
| refetch fails with data | the frame (its stale line); leaves keep their data |
| stream token | the streaming turn |
| act pressed | that act |
| control saved | that control; then the leaves selecting what the write invalidates |

## 7. States beyond the first read

- **busy**: the frame's quiet mark after the delay (the Section heading's busy glyph, the Pane
  bar's); the data stays.
- **stale**: the data stays under one line, "Couldn't refresh · Retry".
- **partial, more**: an infinite read gives its collection a more row; the next page waits as
  painted rows after the loaded ones.
- **partial, streaming**: the Thread's streaming slot is driven by the data; a stream that fails
  marks its own turn, never the thread.
- **permissions**: the org's rules are a read like any other; an act gated on rules still loading
  paints as waiting, never as blocked.

## 8. Acts and saves

- **One contract: `onAct` returns a promise.** The act derives its pending (the give at once, the
  busy glyph only after the delay) and its failure, held in its own state. ActionBar `running`,
  Sheet `busy`, ConfirmSheet's swallowing and the app's `loading: m.isPending` go.
- **A control's `onChange`/`onCommit` may return a promise:** the control holds its optimistic
  value, shows saving, rolls back on reject with its reason inline. The app's revert code goes.
- **One failure home.** plugin-api's MutationCache `onError` draws a failed toast with Retry
  (re-running the mutation) unless the act's leaf handled the rejection; Stead's `useAct` and
  `actFailed` move into stack and away from call sites.
- **Writes show on the page.** A mutation's declared `writes` mark every frame whose read it
  invalidates busy until the refetch lands.
- **Names.** `loading` is retired: reads derive their state, acts theirs from the promise, and
  `pending` remains only for work started elsewhere (a deploy running on the server, PendingBar's
  `until`). Inert stays one encoding (`blocked` with a reason, focus kept) across Button,
  IconButton, Picker and SegmentedControl.
- **Forms read like frames.** `Form read={deploy}` gives its fields their initial values through
  selections; each field saves through its own promise.

## 9. Copy from the entity

plugin-api knows each procedure's entity. With a noun per entity in `words`, a frame's failed
("The deploy did not load."), empty ("No deploys yet.") and missing ("This deploy no longer
exists.") sentences are derived; a prop remains only to override. The `sentence` prop on every
read and the common `empty` go.

## 10. Navigation

A route declares the reads its Panes take as its loader (`ensureQueryData`), and the router gets
`defaultPreload: "intent"`: a row's link hovered or focused reads its record before the press, so
most opens are cache hits and draw no waiting form. Waiting remains for cold deep links and slow
reads. The extra requests on hover are the accepted cost.

## 11. What goes away

- QueryBoundary; the `loading` prop on ~15 components; `LoadingContext`.
- Every hand-built waiting form, both platforms: RowWait, DefinitionWait, OptionWait, CanvasWait,
  MeterWait, FileWait, Table's SkeletonRow, the Stats, ItemHeader and ActionBar waiting forms,
  `field-wait`, `option-wait`, `slider-wait`.
- ui-core: `SKELETON_ROW`, `SKELETON_LANE`, `SKELETON_WIDTHS` and its b5 exception,
  `waitingBars`, `waitingDepth`, `WAITING_ROWS`; `SKELETON` shrinks to the paint's fills; most of
  `listState` and `ListInput` (`sectionLoading`, `hasEmpty`, `known`, `listBusy`), ActionBar's
  `waitCount`.
- Collection props inside a frame: `query`, `items`, `count`, `sentence`, the common `empty`.
- In Stead: the `loading` props, every `XBody({ view, loading })` and `ready`, the empty checks,
  the seeding, `Live<T>`, `useAct`, and its two source checks (made unneeded, not moved).

## 12. Checks and tests

- **Verify:** no `useQuery` without `select` in the ui packages; no context carrying changing
  state (rule 11); a selection no frame claims; a frame's selection never also passed to its
  collection.
- **ui-core unit tests:** the state derivation, the wait store, the placeholder fill from a shape,
  the claims.
- **Screens per read.** The workbench forces one read at a time (deploy loads, steps fail), not
  one state per route. The waiting form comes from the placeholder, so every route's loading
  screen is real, and the shift check (stack's now) compares each leaf's box waiting and loaded
  at 320, 1280 and 1920 px.
- **Render counts.** Behaviour stories assert the §6 event table ("refetch with the same data
  renders one component").

## 13. Build order

Each phase lands web and phone together, with the showcase migrated in the same change.

1. **The read.** plugin-api: `read()`, `at`, `combine`, `useRead`, output-shape codegen, list
   seeding. ui-core: the state derivation, the wait store, the placeholder fill. Tests.
2. **Frames and the paint.** `Pane`/`Section`/`Sheet read`, claims, collections from frames, each
   leaf's paint, copy from entity nouns; QueryBoundary, `loading`, `LoadingContext` and the
   waiting trees deleted; screens per read and the shift check.
3. **States beyond the first read:** busy, stale, more, streaming, permissions; live channels as
   queries.
4. **Acts and saves:** the promise contract, controls, `Form read`, the MutationCache failure
   home, writes marking frames busy.
5. **Navigation:** route loaders and preload on intent.
6. **Stead:** its screens moved to frame reads, its workarounds deleted, the pin moved.

## 14. Decisions

Decided 2026-10-14: everything above. Selections are written `read.at(fn)` (a path proxy,
`read.$.commit`, was weighed and left: shorter, but magic). The handle is built by plugin-api,
ui-core knows only its interface.

Open: the two wait numbers (tuned live); the loaders' paint and its configuration (`motion.md`
§4.2: one skeleton plus the scramble, chosen per slot kind); on the phone, the text bar's paint
without CSS line boxes (the slot measures its lines with `onTextLayout`).
