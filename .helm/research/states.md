# States: the design

Status: decided with the owner, 2026-10-14, and revised the same day after an adversarial review
(§15). Phases 1 to 3 of §14 are built (the read; the frames and the paint; the states beyond the first read) and §15 records what changed in building them; long collections (§7) are phase 7, and phases 4 to 6 are not built. The wait's numbers are tuned live. This page defines how every component
of the roster reads, waits, fails, goes missing, stays empty, refreshes, streams and acts, on both
platforms, and how state is held so that a change re-renders only what it changes. It supersedes
`motion.md` §4.1 (one waiting path) and the shape question of `skeleton-loading.md`; `motion.md`
keeps the motion (the loaders' paint, the settle, the decode). Once built it drains into
`.helm/knowledge/architecture/ui-core.md` and the guide (`packages/ui-core/guide/screen.md`,
`patterns/loading-and-pending.md`).

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
- **Nothing virtualizes.** List, Table, Comparison and Thread draw every row on the web; the
  phone's Thread turns a ScrollView upside down (as `VirtualizedList` inverts) without recycling.

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
   draws it, a field's pending by the field, an act's pending by the host that runs it (a Button,
   an ActionBar, a Sheet, a field), the deepest component that has to know.
2. **Handles go down; the one value that goes down is an item to its row.** Props and context
   carry stable handles to reads; data and status reach a component only through its own
   subscription, except that a collection hands each row its item (structurally shared, so an
   unchanged item is the same reference). A data change never renders a parent above the leaf
   that draws it.
3. **Contexts carry identity, never state** (handles, words, theme, the Pane's scroller). A
   context never changes a child's form. Structure rule 11 classes every context and holds it.
4. **Every subscription is a slice:** one `useQueries` per leaf over the reads it draws, with
   tracked properties and structural sharing.
5. **Data flows down; nothing reports up.**
6. **The app's own code never receives a placeholder.** `useRead` returns real data only. A
   selector or a `combine` function the app writes does run over the placeholder, so it is pure
   and total; one that throws paints its slot at the kind's default size (and logs in dev).
7. **The app never branches on a state the framework can draw.**

## 2. The read

A read is a TanStack query, or anything with the same interface (a live channel, a streamed
reply), written to the cache. plugin-api's query utils build its handle:

```ts
const deploy = orpc.deploys.get.read({ id }); // typed: the query options and how not found reads
deploy.at((d) => d.commit);                   // a selection: the handle + a selector, typed
combine([deploy, files], (d, f) => …);        // a selection over several selections
```

A read is itself a selection (its whole value), so a collection takes a read or a selection
alike. The handle (`Read`, `Selection`) lives in plugin-api; a read's not found is `read.missing`,
plugin-api's `isNotFound` unless the read says otherwise. ui-core knows only an observer's result
(`ReadResult`), so it stays free of TanStack, and derives one state from it (`readState`),
framework-free and tested without rendering: one phase and the flags beside it.

| Phase | When |
| --- | --- |
| idle | not asked for yet (`enabled: false`, `skipToken`, a dependent read's parameter missing) |
| waiting | asked for, no data yet |
| ready | real data |
| failed | no data and the read failed |
| missing | failed with not found (the handle knows its error type; no duck typing) |

| Flag | When |
| --- | --- |
| busy | ready and refetching, or failed and retrying |
| stale | ready and the last refetch failed |
| more | an infinite read with a next page (`hasNextPage`) |
| streaming | a streamed read still writing |
| paused | the read waits for a connection (`networkMode` paused it) |

**Empty is the frame's, not the read's**: a frame's selection that is an empty array, `null` or
`undefined` on real data. A procedure answering `null` ("no current X") is ready, and its frame
draws empty.

A component's data prop takes a **selection** (it comes from a read: the leaf subscribes to it,
paints it while waiting, re-renders when it changes) or a **plain value** (a constant: drawn as
given, never painted). The type tells data from constants. A prop that chooses a form (a tone, a
variant, a metered meter) takes a selection where its component draws data, and paints from the
placeholder's value while waiting.

## 3. Frames own reads

A read's states are drawn once, by the frame that holds it: `Pane read`, `Section read`,
`Sheet read`, `Form read`, or a collection standing with no frame. QueryBoundary is deleted: each
of its jobs has a better home.

```tsx
const deploy = orpc.deploys.get.read({ id });
const steps = deploy.at((d) => d.steps);

<Pane read={deploy} title={deploy.at((d) => d.message)} back="/deploys">
  <ItemHeader facts={[deploy.at((d) => d.author), deploy.at((d) => d.age)]} />
  <Section title="Summary">
    <Group items={[
      { key: "commit", row: <DefinitionRow label="Commit" value={deploy.at((d) => d.commit)} copyable /> },
      { key: "region", row: <DefinitionRow label="Region" value="Frankfurt, eu-central-1" /> },
    ]} />
  </Section>
  <Section title="Steps" read={steps}>
    <List items={steps} row={…} />
  </Section>
</Pane>
```

- **The type says who draws what.** The frame given the read itself (the root) draws its phase
  and flags: failed, missing, busy, stale, paused. A frame given an array selection draws its
  count and its empty. A collection takes `items` explicitly, always; a standalone
  `List items={deploys}` holds a root, so it is its own frame. No claims and no items delivered
  through context: a context never changes what a child draws (rule 11).
- **One root holder per read.** A read's root is held by one frame; its selections go to frames
  and leaves beneath. The query cache's observer events count a read's mounted root holders: a failure with none, or a second
  root holder of one key, is a dev error, caught at run time where selections cross files as
  props. Busy and stale are drawn once, by the root holder.
- **One read per frame.** Two reads are two frames, nested, each drawing its own fit; a leaf that
  needs two at once takes `combine`. A frame never fills with one read's failure while throwing
  away another's leaves.
- **The frame draws in its own fit.** A Pane's failure fills the page with Back to its route; a
  Section's fills its body under its heading; a Sheet's its body over its acts. Retry refetches
  the frame's read and keeps the failed form with Retry pending (`motion.md` §4.3).
- **A Pane with a read** draws its title from a selection (painted while waiting) and paints its
  acts inert while waiting, in their loaded places, so its head never shifts.
- **Every frame of a read is named for the settle** (today only Section and Group roots are).

## 4. The waiting form is the loaded form, painted

There is no waiting tree. While its read waits, each leaf draws its loaded form from the
placeholder and paints its selected slots; constants draw as given. Each component defines only
how its loaded form paints:

| Slot | Paint |
| --- | --- |
| text (title, name, sentence, label from data) | the string's own line boxes as bars |
| figure, id | per the loader (`motion.md` §4.2): bars, or the scramble |
| mark (avatar, status dot, chip, icon from data) | the skeleton fill |
| block (meter track, chart plot, code, prose, diff, image, canvas node) | at its own size: a meter's track, a plot's height, code by its lines, an image box at its ratio |
| control (a field whose value is a selection) | its own box, value painted, inert |

No wrapper element is added: a `display: contents` wrapper breaks a parent's child rules. On the
phone a text bar is a nested `Text` with transparent ink over a background colour, which paints
each line fragment natively (no `onTextLayout`; to check on a device).

**The placeholder is one value, P**, the same for every read (a router procedure, a live
channel, a stream, the org's rules), so nothing is generated and a consumer writes nothing. P is a
frozen, callable Proxy that answers any property with itself:

- `P.a.b === P`, so an optional is present and a recursive type never ends; it is deterministic;
- comparisons are false and lookups miss (`d.state === "failed"`, `LABELS[d.state]`), so a
  selector takes its own default branch;
- as a number it is 0 (`new Date(P)` is the epoch, a figure formats as `0`); as a string it is one
  private-use character, so a string built from it (`` `${d.a} · ${d.b}` ``, `` `/d/${d.id}` ``)
  is recognised as a placeholder (`isPlaceholder`);
- iterating it yields nothing, `.map` and `.filter` return P, and `Object.entries(P)` is `[]`.

The paint's sizes are the leaf's, not the data's: a text slot's length comes from its role (a
title, a name, a sentence), and a collection draws its default count of painted rows, keyed
`waiting-0`, … each item P. P is given to each leaf's observer as `placeholderData`, never written
into the cache. There is no cache seed and no previous data: a record whose title should be there
before its read lands gets it from preload (§11), not from an invented write. A lookup that misses
can drop an optional slot while waiting; the shift check catches it and `LABELS[d.state] ?? d.state`
fixes it.

**Waiting forms are inert.** On the web the painted region is `inert`; on the phone it is not
pressable and hidden from assistive technology (`importantForAccessibility="no-hide-descendants"`).
No `href` is built from placeholder data, and an accessible name (a Pane title that a log or a
Columns region is labelled by) comes from real data only.

## 5. On TanStack's own observers

The read needs no store of stack's own: each part is a TanStack builtin.

- **A leaf** is one `useSelections([...])` over the data props it draws: one `useQueries` over
  their distinct reads (deduplicated by query key), each with P as `placeholderData`, whose
  `combine` runs each prop's selector and answers, per prop, `{ painted, value }`. Constants pass
  through unpainted, so the hook count is fixed whatever mix of selections and constants a leaf
  is given. A selector that throws over the placeholder answers P (logged in dev); a throw over
  real data is the app's bug and rethrows. Each observer renders only for the result properties
  its combine reads, and `useQueries` notifies only when the combined answer changes.
- **`useRead(selection)`** is the same `useQueries` without the placeholder: real data, or
  `undefined`.
- **`combine([a, b], fn)`** is a selection over selections, resolved by the same hook.
- **The phase and flags** are `readState(result, read.missing)` in ui-core, over the observer's
  result (`status`, `fetchStatus`, `isEnabled`, `isPlaceholderData`, `isRefetchError`,
  `hasNextPage`), tested without rendering.
- **One flip.** One cache write notifies every observer of the read in one batch, so every leaf,
  frame and `useRead` of the read changes in one commit, on both platforms.
- **The settle** sits where every batch is scheduled. `settleReads` (plugin-api) listens to the
  query cache and marks a batch that changes a read's form: its first data, its first failure with
  no data, or a reset to waiting, while the read has observers. TanStack calls the scheduler
  (`notifyManager.setScheduler`) synchronously right after that listener, so the mark binds to
  its own batch; a marked batch, and any batch scheduled while it is held, flushes through the
  platform's `settle`, every other batch as TanStack schedules it. `QueryProvider` takes the
  `settle`, and each UI plugin passes its own through the providers it already contributes, so a
  consumer writes nothing. `createSettle` moves to ui-core and serves both platforms: the web
  flushes inside a view transition (`startViewTransition(() => flushSync(flush))`), the phone
  after `LayoutAnimation.configureNext`, gaining the web's frame batching and running guard. The
  guards stay: reduced motion, a hidden page, a move already running, an editable with focus. It
  replaces `useWait`: every other waiting thing is an act (§9).
- **The delay is no clock.** A painted slot fades in `WAIT_DELAY` after it mounts (a CSS
  `animation-delay` on the web, Reanimated's `withDelay` on the phone), so a read that lands
  inside the delay never shows its paint. Constants draw at once.
- **No minimum.** The waiting form has the loaded form's geometry, so a form shown briefly
  changes paint, not layout, and the settle's crossfade carries it. The live tuning confirms it
  (the showcase's sliders: the delay, a minimum at 0, a simulated read time). If it flashes, the
  fallback holds a first load's cache write until the minimum has passed (still one write, so the
  read still flips at once); it counts from the fetch's start, which for a prefetched read comes
  before its leaves mount.
- **The root holder count** (§3) comes from the query cache's observer-added and -removed events,
  in dev only.
- **idle** and **paused** while waiting are one form, `still`: the loaded tree painted and inert,
  not busy; a paused root holder also shows one line ("Waiting for a connection").
- `aria-busy` is the root holder's. There is no live region: nothing is built for a screen reader
  alone (`philosophy.md`).
- **A failed read stays failed while it refetches.** Retry keeps the failed form with Retry
  pending; an automatic refetch (focus, reconnect) is a busy mark, never a flip back to waiting.
- `WAIT_DELAY` starts at 400 ms (from 200) and is tuned live.

## 6. Subscriptions and renders

| Who | Subscribes to | Renders when |
| --- | --- | --- |
| a frame | its own observer: the phase's properties (and its selection's length, if it holds one) | either changes |
| the root holder's busy mark | the busy flag | a refetch starts or ends |
| a leaf with a selection | its own observer's slice | its slice changes |
| a row | nothing: its item comes from its collection | its item's reference changes |
| the app (`useRead(selection)`) | its slice, real data only | its slice changes once real |
| an act's host or a control | its own promise | its own pending or failure |

- **Collections.** A List subscribes to its items. Structural sharing keeps every unchanged
  item's reference and each row is memoized by its item, so only changed rows render. The React
  Compiler does the memoizing where it reaches: plugin-react's generated Vite config compiles
  `@fcalell/*` under `node_modules` in a consumer's build (`e23d17fc`). It does not reach the web
  dev server, whose optimizer pre-bundles the packages, nor the phone, whose Expo preset never
  compiles `node_modules`; so rows keep their explicit `memo`, and the render-count stories run in
  the showcase.
- **Streams and live channels** are queries written with `setQueryData` (or `streamedQuery`). The
  turn being written has its own key; the thread's key changes only when a turn completes, so a
  token renders the streaming turn and nothing scans the thread. A live channel's connection is a
  read of its own (connected, reconnecting, lost), whose root holder draws the line. Stead's
  `Live<T>` and the hand-built Thread queries go away.

| Event | Renders |
| --- | --- |
| first answer | each leaf whose slice differs from the placeholder and each frame's phase, in one settle frame |
| refetch, same data | the busy mark, on and off |
| refetch, one field changed | the leaves selecting it; the rows whose item changed |
| refetch fails with data | the root holder (its stale line); leaves keep their data |
| stream token | the streaming turn |
| act pressed | that act's host |
| control saved | that control; then the leaves selecting what the write invalidates |

## 7. Long collections

Not built: its own phase (7, after phase 5; §15). Paging bounds what a list mounts and no list in the
showcase or Stead approaches a virtualizing count, so it waits for a consumer list that does. The
phone's design below is reopened (§15).

A collection past a fixed count virtualizes on both platforms, with no prop: List, Table,
Comparison and Thread mount only the rows on screen and a margin around them.

- **Web:** a virtualizer on the Pane's scroller, reached through context (identity). Find in page
  does not reach unmounted rows: the accepted cost.
- **Phone:** reopened. A recycling list cannot sit inside the Pane's ScrollView, and the Pane
  cannot know that a List deep in its children is long (rules 9, 11, 12). The spike decides
  between windowing on the Pane's own ScrollView through a scroller-identity context (mounts and
  unmounts, does not recycle) and a recycling list as the Pane's scroller, given as an explicit
  prop.
- **Waiting rows** are as many as fill the viewport (the placeholder's count, §4).
- **The settle and moves name only mounted rows**, so a view transition's snapshot stays bounded
  (`motion.md` §5, List).
- **Thread** keeps its reading position when history loads above (the virtualizer's anchor on the
  web, `maintainVisibleContentPosition` on the phone) and follows the end as it does today.

Open: the libraries (TanStack Virtual on the web; FlashList v2 on the phone, LegendList as the
fallback; none is installed) and the count (`VIRTUAL_FROM`, about 100), settled by a spike on both
platforms: the phone Pane first (1000 rows under a Section header, both designs), then the phone
Thread and the web.

## 8. States beyond the first read

Built (phase 3).

- **busy**: the root holder's quiet mark after the delay: the `Spinner` in meta ink after the
  frame's heading (a frame with no heading shows none), `aria-busy` for the first wait alone. The
  scramble glyph waits for `theme.loading`. The data stays.
- **stale** and **paused**: one line under the heading row, "Couldn't refresh." with Retry or
  "Waiting for a connection." with no act.
- **still**: idle, or paused while waiting; the loaded form painted, inert, no mark.
- **more**: stack's paginated envelope only (`.pages(input)`, a flat value). The collection draws
  "Show more", pressed by the viewer; the next page waits as painted rows after the loaded ones
  and does not run the frame's clock; a failed page is the collection's line. The frame draws no
  count while more remains, and an empty first page with more is not empty: the next page is
  fetched at once.
- **streaming**: the turn being written is a read the app declares (`Thread reply`), drawn by its
  own part; a stream that fails is data on its turn (the partial message, "The reply stopped." and
  Retry), never the thread's state. A WebSocket channel is one such read
  (`@fcalell/plugin-node/live`); a socket down past two seconds pauses its reads, so there is no
  connection read.
- **permissions**: the org's rules are an ambient read (`ability(orgId)`); a gated act in a head is
  a selection that paints inert while the rules load, never blocked, and a row's act is combined
  into its items. A failed rules read leaves its acts painted and inert.
- **the phone** wires TanStack's online and focus managers, or it would never pause or refetch on
  focus.

## 9. Acts and saves

- **One contract: `onAct` returns a promise.** The host that runs it (a Button standing alone, an
  ActionBar, a Sheet, a field) holds its pending and its failure: inert at the press, sibling
  acts inert with it and a Sheet's dismissal held while it runs, the busy glyph only after
  `ACT_DELAY`, and ready the moment its promise settles.
  ActionBar `running`, Sheet `busy`, `FormContext.setPending`, ConfirmSheet's swallowing and the
  app's `loading: m.isPending` go.
- **A failure is drawn by its host,** in its own slot (ActionBar's line, a Sheet's line over its
  acts, a field's error). A host with no slot (an IconButton in a row, a Switch standing alone)
  raises a toast whose Retry runs `onAct` again, the rest of the app's act included (a navigate, a
  sheet closing). Stead's `useAct` and `actFailed` go; there is no MutationCache failure handler,
  which runs before the caller's promise rejects and cannot know whether the host drew it.
- **A control's `onChange`/`onCommit` may return a promise.** The control holds its optimistic
  value, shows saving and rolls back with its reason inline on reject. The latest change wins:
  each save carries a sequence number, a settled save older than the latest is ignored, and the
  optimistic value holds until the selection matches it or the last save settles. A save cancels
  the in-flight fetches of its read, so an old refetch cannot land over it. The app's revert code
  goes.
- **Forms read like frames.** `Form read={deploy}` gives its fields their initial values through
  selections; a field follows its selection until the viewer edits it and never after, so a
  refetch never overwrites what is being typed. Each field saves through its own promise.
- **Writes need no mark of their own:** a mutation's invalidation refetches the reads it touched,
  and their busy flag already shows.
- **Names.** `loading` is retired: reads derive their state, acts theirs from the promise, and
  `pending` remains only for work started elsewhere (a deploy running on the server, PendingBar's
  `until`). Inert stays one encoding (`blocked` with a reason, focus kept) across Button,
  IconButton, Picker and SegmentedControl.

## 10. Copy

A frame's failed, missing and empty sentences are generic, in `words` ("This didn't load.",
"This no longer exists.", "Nothing here yet."), and a frame overrides any of them with its own
sentence. Sentences are not composed from nouns: procedures read several tables, so there is no
one entity to name, a composed sentence breaks gendered and inflected languages, and an empty
sentence depends on the filter the app applied.

## 11. Navigation

A route declares its reads once, `reads(params)`, and its components take their handles from it.
plugin-react wires it: the web router gets `defaultPreload: "intent"` and prefetches the route's
reads on a hovered or focused link; the phone prefetches on a link's press-in. A prefetch is never
awaited, so a navigation is immediate: most opens are cache hits and draw no waiting form, and a
read that is still on its way shows the painted waiting form. Waiting remains for cold deep links
and slow reads. The extra requests on hover are the accepted cost.

## 12. What goes away

- QueryBoundary; the `loading` prop on ~15 components; `LoadingContext`.
- Every hand-built waiting form, both platforms: RowWait, DefinitionWait, OptionWait, CanvasWait,
  MeterWait, FileWait, Table's SkeletonRow, the Stats, ItemHeader and ActionBar waiting forms,
  `field-wait`, `option-wait`, `slider-wait`.
- ui-core: `SKELETON_ROW`, `SKELETON_LANE`, `SKELETON_WIDTHS` and its b5 exception,
  `waitingBars`, `waitingDepth`, `WAITING_ROWS`; `SKELETON` shrinks to the paint's fills; most of
  `listState` and `ListInput` (`sectionLoading`, `hasEmpty`, `known`, `listBusy`), ActionBar's
  `waitCount`.
- Collection props: `query`, `count`, the common `empty`; `items` stays, explicit.
- In Stead: the `loading` props, every `XBody({ view, loading })` and `ready`, the empty checks,
  the list-cache seeding (`listed`, `known`; preload replaces it), `Live<T>`, `useAct`, and its
  two source checks (made unneeded, not moved).

## 13. Checks and tests

- **Verify:** no context carrying changing state or changing a child's form (rule 11).
- **At run time, in dev:** a failure with no root holder; two root holders of one key; a selector
  that throws over the placeholder.
- **ui-core unit tests:** the phase and flags from an observer's result (idle, paused, stale,
  more, missing; a placeholder waits; a retried failure stays failed and busy).
- **plugin-api tests:** P's traps (the epoch, a template string recognised), selections and
  `combine` resolved over real observer results, a throwing selector answering P; `.read` keys
  equal to `queryOptions` keys; `settleReads` flushing a form change through the settle once and
  every other batch as TanStack schedules it.
- **Screens per read.** The workbench forces one read at a time (deploy loads, steps fail), not
  one state per route. The waiting form comes from the placeholder, so every route's loading
  screen is real, and the shift check (stack's now) compares each leaf's box waiting and loaded
  at 320, 1280 and 1920 px. The scramble's randomness is seeded under tests.
- **Render counts.** Behaviour stories assert the §6 event table ("refetch with the same data
  renders one component"), in the showcase and in a consumer.

## 14. Build order

Each phase lands web and phone together, with the showcase migrated in the same change.

1. **The read.** plugin-api: `.read` on the utils, `combine`, `useSelections`, `useRead`, P,
   `settleReads` and `QueryProvider`'s `settle` (unwired). ui-core: `readState`. plugin-react: the
   compiler reaching `@fcalell/*`. Tests. Nothing consumes it yet.
2. **Frames and the paint.** react-ui depends on plugin-api, as native-ui does. `createSettle`
   moves to ui-core and each UI plugin passes its `settle`. `Pane`/`Section`/`Sheet`/`Form read`
   (the form's initial values as selections; its saves stay for phase 4), the root and selection
   rule, explicit `items`, each leaf's paint, inert waiting forms, the generic sentences;
   QueryBoundary, `loading`, `LoadingContext`, `useWait` and the waiting trees deleted; screens
   per read and the shift check.
3. **States beyond the first read** (built): busy, stale, more, streaming on its own key, still and
   paused, permissions; live channels as queries; the phone's managers. Long collections moved to
   phase 7.
4. **Acts and saves:** the host-held promise, controls with the latest change winning, a form's
   field saves.
5. **Navigation:** `reads(params)`, preload on intent and on press-in.
6. **Stead:** its screens moved to frame reads, its workarounds deleted, the pin moved; its six
   channels become `channelRead`s.
7. **Long collections:** the spike (§7), then virtualization on both platforms.

## 15. Decisions

Decided 2026-10-14: everything above. Selections are written `read.at(fn)` (a path proxy,
`read.$.commit`, was weighed and left: shorter, but magic; with no seed there is no per-slot
provenance a path would buy). The handle is built by plugin-api, ui-core knows only its interface.

Decided the same day, after the loader demo (`motion.md` §4.2): the paint per slot kind,
`theme.loading = { text, figure, id }`, each `"pulse"` or `"scramble"`, all `"pulse"` by default.

Revised the same day after an adversarial review, with the owner:

- the read runs on TanStack's own observers: a leaf is one `useQueries` with P as
  `placeholderData`, the settle is a scheduler hook on TanStack's notifications and the delay a
  fade on painted slots; there is no store of stack's own and no minimum hold (a store per read
  key, holding the value through a hold, was proposed by the review and dropped once the
  builtins covered it);
- the placeholder is one runtime value, P, for every read; the cache seed, the previous data,
  `.meta({ wait })` and a shape generated from the router's types (which would have needed the
  type checker at generate and covered router procedures only) are dropped;
- claims and items through context are dropped: the root holder draws the read's states, an array
  selection's holder its count and empty, and collections take `items`;
- the state is a phase with flags; idle and paused are drawn; empty belongs to the frame;
- acts are held by their host, failures drawn there or in a toast; the MutationCache failure home
  and writes marking frames busy are dropped;
- copy is generic sentences with an override; copy from entity nouns is dropped;
- a retried failure stays failed with Retry pending;
- route reads are declared once and prefetched, never awaited, on both platforms;
- the streaming turn has its own key, the second collection model is dropped;
- long collections virtualize (§7);
- the live region is dropped; waiting forms are inert;
- text decodes by crossfade; only figures and ids decode by character (`motion.md` §4.2).

Changed while building phase 2 (2026-10-15); where the sections above differ, this list wins:

1. Collections never hold a read; only frames do (Pane, Section, Sheet, Form and its groups). No
   context reaches a collection, so a List cannot know whether its Section holds the same root, and
   `<Section read={x}><List items={x}/></Section>` would make two root holders. List, Table, Thread,
   OptionList, BarChart and Comparison lose every state branch on both platforms; a list Pane's
   failure fills the page; a collection with no frame raises the dev no-holder error. Cut: a
   standalone `List items` as its own frame, and failure as a standalone frame.
2. `FormGroup.read` is added: each group is a frame (it replaces `FormGroup.loading`).
3. Gate takes no `read`: its body takes Sections, so `connect` uses a `Section read`.
4. Acts can be data: Pane `actions` and `more`, Section `act`, `more` and `description` take a
   `Datum`; a painted act is inert in its loaded place.
5. The paint is a still fill plus the delayed fade. The breathing loop (`pulse`, one shared clock),
   the scramble and `theme.loading` go to the motion phases; the phone has no fade, its fill snaps
   in after `WAIT_DELAY`.
6. One `PAINT_ROWS = 4` for every collection and every text block of unknown length.
7. A Section's count is never painted while it waits, on either platform.
8. Sentence overrides: `empty` and `failed?: string` on Pane, Section, Form and FormGroup; Sheet
   takes `empty` only until phase 4 (its `failed` is still the act's sentence). No `missing`
   override: the generic sentence stays and the public `Missing` covers a bespoke one.
9. `SKELETON` is replaced wholly by `PAINT` (`glyphs`, `box`, `control`); each component paints its
   own box.
10. The shift check compares Section heading tops, waiting against loaded, at 320, 1280 and 1920 px
    (Stead's method); per-leaf box equality is a showcase behaviour story; "screens per read" is
    deferred to phase 5 (`reads(params)`).
11. A row is wholly painted or wholly loaded: `RowStatus {loading: true}`, the List "known" hybrid
    and `waitingDepth` are gone, and a painted tree draws flat.
12. The dev no-holder error fires only for a read that a leaf paints (registered by
    `useSelections`); a read the app holds with its own `useQuery` is not checked.
13. Canvas keeps a painted stand-in (three painted node cards), since its layout has no geometry
    before the data: the one named exception to "no second tree".
14. FileRow takes no public `Datum`; it paints only through `List file`.
15. Retry pending lands now: the failed form's Retry shows `loading` while the read refetches.
16. The Pane's painted title is a `<p>` in the heading's look, not an empty `h1`; the real `h1`
    stands once the name lands.
17. The showcase routes were reshaped for the shift check: a Section no longer waits behind a
    Banner or a PendingBar (the deploy's conditions stand below every Section), Settings puts its
    Webhooks Section first, Connect lists as many workspaces as it paints, and a wrapping fact line
    or title is short enough to wrap the same painted and loaded.

Changed while building phase 3 (2026-10-15); where the sections above differ, this list wins:

1. **busy** is drawn by the root-holding frame, which renders when busy changes; its children are
   the same elements and bail out. The separate busy-mark subscription is cut. `aria-busy` is the
   first wait only. The glyph is the `Spinner` until `theme.loading` lands; a frame with no heading
   shows none.
2. **stale and paused are one line** under the frame's heading row (`StateLine`); paused has no act.
3. **idle and paused-while-waiting are one frame form**, `still` (`FrameForm` `idle` is renamed).
4. **more** covers stack's paginated envelope only and its value is flat. The more row is pressed
   by the viewer and is the collection's, as is a failed next page. A next-page fetch is not busy
   and the frame draws no count while more remains. Thread's earlier-history paging moves to the
   long-collections phase.
5. **streaming**: the turn is the app's declared read (`Thread reply`); stack builds no oRPC
   `.stream()` or `.live()`, adds `kind: "stream"` and re-exports `streamedQuery`. The turn holds
   its read and draws its failure, and hides once history holds its key.
6. **live channels**: the primitive is plugin-node's `channelRead`. There is no connection read: a
   lost socket pauses each channel read. Stead's connection banner is its own product choice.
7. **permissions**: the org's rules are an ambient read; gated head acts are `Datum` selections and
   row acts are combined into items. A failed rules read leaves its acts painted and inert.
8. **long collections** are phase 7, and §7's phone design is reopened: windowing on the Pane's
   ScrollView against the Pane given the list. The count is the spike's.
9. **the phone** wires the online and focus managers (`QueryProvider listen`).
10. `read(options, missing)` is `read(options, { missing, kind })`.

Deviations kept from the build: a failed next page is the collection's line, not the frame's stale
(`planFrame` presents the pages held as success); a `Table` paints its next page as a grid of its
own at the same columns, and the narrow list as rows in the same slots; the Thread roster's
`error` is the stopped turn.

Open: `WAIT_DELAY` and `ACT_DELAY` (tuned live), and whether a minimum is needed after all; the phone's text bar as a nested `Text`
(a device check); the virtualizing libraries, their count and the phone Pane's scroll with a long
collection (a spike, phase 7).
